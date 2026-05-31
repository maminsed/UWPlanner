import json
import os

import bleach
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from flask import Blueprint, g, jsonify

from backend.Auth import verify as verify_jwt
from backend.request_schemas import (
    AddBatchRequest,
    AddSingleRequest,
    DeleteCourseRequest,
    TermRequest,
    parse_json_body,
)
from backend.utils.path import term_distance, translate_path

from ..Schema import Semester, Users, db

load_dotenv()
courses_bp = Blueprint("Courses", __name__)
ALLOWED_TAGS = {
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "col",
    "colgroup",
    "caption",
}
GQL_URL = os.getenv("GQL_URL")


@courses_bp.before_request
def verify():
    return verify_jwt()


@courses_bp.route("/populate_course", methods=["GET"])
def populate_courses():
    """Endpoint to populate the courses database. It's used in case UWFLOW is down"""
    return "", 204  # remove this incase anything broke
    # errors = get_course_data()
    return jsonify({"errors": errors}), 200


@courses_bp.route("/get_user_sections", methods=["POST"])
def get_user_sections():
    """Endpoint to retrieve the sections a user is enrolled in for a specific term."""
    payload, error = parse_json_body(TermRequest)
    if error:
        return error
    term_id = payload.term_id

    # Retrieve the user from the database
    user: Users = Users.query.filter_by(username=g.username).first()
    if not user:
        return jsonify({"message": "user not found"}), 500

    # Get the sections for the specified term
    section_ids = [
        semester.sections for semester in user.semesters if semester.term_id == term_id
    ]
    sections = []
    if len(section_ids) > 0:
        sections = json.loads(section_ids[0])  # Parse the sections JSON

    course_ids = [
        semester.courses for semester in user.semesters if semester.term_id == term_id
    ]
    courses = []
    if len(course_ids) > 0:
        courses = json.loads(course_ids[0])

    # Return the sections, start semester, and user path
    return jsonify(
        {
            "sections": sections,
            "courses": courses,
            "start_sem": user.started_term,
            "path": translate_path(user.path),
        }
    ), 200


@courses_bp.route("/delete_single", methods=["POST"])
def delete_course():
    payload, error = parse_json_body(DeleteCourseRequest)
    if error:
        return error
    current_term = payload.current_term

    # GraphQL query to fetch course section details
    GQL_QUERY = """
    query Course_section($term_id: Int!, $course_ids: [Int!]) {
        course_section(
            limit: 10
            where: { term_id: { _eq: $term_id }, course_id: { _in: $course_ids } }
        ) {
            class_number
            course_id
        }
    }
    """
    courseDict = {}
    for course in payload.courses:
        if course.term_id not in courseDict:
            courseDict[course.term_id] = []
        courseDict[course.term_id].append(course.course_id)
    try:
        # Retrieve the user from the database
        user: Users = Users.query.filter_by(username=g.username).first()
        for term_id in courseDict:
            course_ids = courseDict[term_id]
            # Retrieve the user's semesters for the specified term
            sem = [sem for sem in user.semesters if sem.term_id == term_id][0]
            # Check if the term is within the allowed range for deletion
            if term_distance(term_id, current_term) < 2:
                # Initialize a session for making HTTP requests
                session = requests.Session()
                resp = session.post(
                    GQL_URL,
                    json={
                        "query": GQL_QUERY,
                        "variables": {"term_id": term_id, "course_ids": course_ids},
                    },
                )
                resp.raise_for_status()
                payload = resp.json()

                # Handle any errors returned by the GraphQL endpoint
                if "errors" in payload:
                    raise RuntimeError(payload["errors"])

                # Extract the class numbers to be removed
                removeSections: list[int] = [
                    sec["class_number"] for sec in payload["data"]["course_section"]
                ]

                # Update the sections by removing the ones associated with the course
                sections: list[int] = json.loads(sem.sections)
                sections = [sec for sec in sections if sec not in removeSections]
                sem.sections = json.dumps(sections)

            # Update the courses by removing the specified course
            courses = [
                course for course in json.loads(sem.courses) if course not in course_ids
            ]
            sem.courses = json.dumps(courses)

            # Save the updated semester to the database
            db.session.add(sem)
            db.session.flush()
        db.session.commit()

        # Return a success response
        return "", 204
    except Exception as e:
        # Handle any errors that occur during the process
        print(e)
        return jsonify({"message": "error in backend"}), 500


@courses_bp.route("/add_single", methods=["POST"])
def add_section_to_user():
    payload, error = parse_json_body(AddSingleRequest)
    if error:
        return error
    term_id = payload.term_id
    courses = payload.courses
    user = Users.query.filter_by(username=g.username).first()
    if not user:
        return jsonify({"message": "please provide all fields"}), 400
    if courses.course_ids is not None:
        course_ids = courses.course_ids
        for course_id in course_ids:
            enrol_user_in_section(user, [], term_id, course_id)
        return "", 200
    sections = courses.sections
    return enrol_user_in_section(
        user,
        sections.class_numbers,
        term_id,
        sections.course_id,
    )


def enrol_user_in_section(
    user: Users, section_numbers: list[int], term_id: int, course_id: int
):
    """Enroll a user in a specific course section for a given term.

    Args:
        user (Users): The user object representing the user to be enrolled.
        section_numbers list(int): The section number to enroll the user in.
        course_id (int): The course id of the section.
        term_id (int): The term ID for which the enrollment is being made.

    Returns:
        Response: A Flask JSON response indicating the result of the operation.

    """
    # Retrieve the user's schedule for the specified term
    # Update this to take course_ids as well
    available_semester = [s for s in user.semesters if s.term_id == term_id]
    try:
        # If no schedule exists for the term, create a new one
        if not len(available_semester):
            available_semester = Semester(
                term_id=term_id,
                user=user,
                sections=json.dumps(section_numbers),
                courses=json.dumps([course_id]),
            )
        else:
            # If a schedule exists, update it with the new section
            available_semester = available_semester[0]
            loSections: list[int] = json.loads(available_semester.sections)
            loCourses: list[int] = json.loads(available_semester.courses)
            # Check if the user is already enrolled in the section
            loSections.extend(
                section_number
                for section_number in section_numbers
                if section_number not in loSections
            )
            if course_id not in loCourses:
                loCourses.append(course_id)
            available_semester.sections = json.dumps(loSections)
            available_semester.courses = json.dumps(loCourses)

        # Save the updated schedule to the database
        db.session.add(available_semester)
        db.session.commit()
        return jsonify({"message": "user successfully enrolled"}), 200
    except Exception as e:
        # Handle any errors that occur during the process
        print(e)
        return jsonify({"message": "error in backend"}), 500


def allowed_attr(tag, name, value):
    if name in {
        "class",
        "id",
        "role",
        "scope",
        "headers",
        "colspan",
        "rowspan",
        "span",
    }:
        return True
    return False


def get_int(value: str) -> int:
    value = value.strip()
    if not value:
        return -1
    try:
        res = int(value)
        return res
    except ValueError:
        raise


@courses_bp.route("/add_batch", methods=["POST"])
def add_batch():
    payload, error = parse_json_body(AddBatchRequest)
    if error:
        return error
    term_id = payload.term_id
    html = payload.html
    user = Users.query.filter_by(username=g.username).first()

    # Validate the input data
    if not user:
        return jsonify(
            {
                "message": "We couldn't parse your information. If it persists please contact someone"
            }
        ), 400

    # sanetizing incoming input
    cleaned = bleach.clean(html, tags=ALLOWED_TAGS, attributes=allowed_attr, strip=True)
    soup = BeautifulSoup(cleaned, "lxml")
    tables = soup.find_all(class_="PSGROUPBOXWBO")
    if len(tables) <= 1:
        return jsonify(
            {
                "message": "We couldn't parse your information. If it persists please contact someone"
            }
        ), 400
    tables = tables[1:]
    # GraphQL endpoint and query to fetch course section details
    GQL_QUERY = """
    query Course_section($term_id: Int!, $class_number: Int!) {
        course_section(
            limit: 1
            where: { term_id: { _eq: $term_id }, class_number: { _eq: $class_number } }
        ) {
            class_number
            section_name
            id
            course_id
            term_id
            course {
                name
            }
        }
    }
    """
    # Initialize a session for making HTTP requests
    s = requests.Session()
    added_sections = []
    for table in tables:
        inner_tables = table.find_all("table", class_="PSLEVEL3GRID")
        if len(inner_tables) <= 1:
            continue
        rows = inner_tables[1].find_all("tr")
        if len(inner_tables) <= 1:
            continue
        for row in rows[1:]:
            try:
                class_number = get_int(row.find("td").text)  # getting the number
                # calling backend
                resp = s.post(
                    GQL_URL,
                    json={
                        "query": GQL_QUERY,
                        "variables": {"term_id": term_id, "class_number": class_number},
                    },
                )
                resp.raise_for_status()
                payload = resp.json()
                if "errors" in payload:
                    raise RuntimeError(payload["errors"])
                data = payload["data"]["course_section"]
                if len(data) == 0:
                    raise RuntimeError("invalid class_number")
                course_id = data[0]["course_id"]
                _, code = enrol_user_in_section(
                    user, [class_number], term_id, course_id
                )
                if 200 <= code < 300:
                    added_sections.append(
                        data[0]["course"]["name"] + " - " + data[0]["section_name"]
                    )
            except Exception as e:
                print("error:", e)
    return jsonify({"added_sections": added_sections}), 200
