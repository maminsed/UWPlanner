from flask import Blueprint, jsonify,g, request
from dotenv import load_dotenv

from backend.utils.path import translate_path
from .extraction import get_course_data
from backend.Auth import verify as verify_jwt
from ..Schema import Users, Schedule, db
import os
import requests
import bleach
from bs4 import BeautifulSoup

load_dotenv()
courses_bp = Blueprint("Courses", __name__)
ALLOWED_TAGS = {
    "table","thead","tbody","tfoot","tr","th","td","col","colgroup","caption",
}
GQL_URL = os.getenv("GQL_URL")

@courses_bp.before_request
def verify():
    return verify_jwt()

@courses_bp.route("/populate_course", methods=["GET"])
def populate_courses():
    """endpoint to populate the courses database. It's used in case UWFLOW is down"""
    return "", 204 #remove this incase anything broke
    errors = get_course_data()
    return jsonify({"errors": errors}), 200

@courses_bp.route("/get_user_sections", methods=["POST"])
def get_user_sections():
    data = request.get_json()
    term_id = data.get("term_id")
    if not term_id:
        return jsonify({"message": "term_id not specified"}), 400
    user = Users.query.filter_by(username=g.username).first()
    if not user: return jsonify({"message": "user not found"}), 500
    section_ids = "-".join([schedule.sections for schedule in user.schedules if schedule.term_id == term_id])
    sections = []
    if section_ids != '':
        sections = list(map(int, section_ids.split("-")))
    sem_dic = {0:5,1:9,2:1}
    return jsonify({"sections": sections, "start_sem": (user.started_year - 1900)*10 + sem_dic[user.started_month], "path": translate_path(user.path)}), 200

@courses_bp.route("/add_single", methods=["POST"])
def add_section_to_user():
    data = request.get_json()
    term_id = data.get("term_id")
    course_id = data.get("course_id")
    class_number = data.get("class_number")
    user = Users.query.filter_by(username=g.username).first()
    if not user or not term_id or not course_id or not class_number:
        return jsonify({"message": "please provide all fields"}), 400
    return enrol_user_in_section(user,class_number, term_id)

def enrol_user_in_section(user:Users, section_number:str, term_id:int):
    available_section = [s for s in user.schedules if s.term_id == term_id]
    try:
        if not len(available_section):
            available_section = Schedule(term_id=term_id, user=user, sections=str(section_number))
        else:
            available_section = available_section[0]
            index = available_section.sections.find(str(section_number))
            if index != -1:
                return jsonify({"message": "user already enroled in this semester"}), 409
            if available_section.sections == "":
                available_section.sections = str(section_number)
            else:
                available_section.sections += "-"+str(section_number)
        db.session.add(available_section)
        db.session.commit()
        return jsonify({"message": "user successfully enroled"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "error in backend"}), 500
    
def allowed_attr(tag, name, value):
    if name in {"class", "id", "role", "scope", "headers", "colspan", "rowspan", "span"}:
        return True
    return False

def get_int(value:str)-> int: 
    value = value.strip()
    if not value: return -1
    try:
        res = int(value)
        return res
    except ValueError:
        raise 


@courses_bp.route("/add_batch", methods=["POST"])
def add_batch():
    # Parse the incoming JSON request
    data = request.get_json()
    term_id: int = data.get("term_id")
    html: str = data.get("html")
    user = Users.query.filter_by(username=g.username).first()

    # Validate the input data
    if not html or not term_id or not user:
        return jsonify({"message": "We couldn't parse your information. If it persists please contact someone"}), 400


    # sanetizing incoming input
    cleaned = bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=allowed_attr,
        strip=True
    )
    soup = BeautifulSoup(cleaned, "lxml")
    tables = soup.find_all(class_="PSGROUPBOXWBO")
    if len(tables)<= 1:
        return jsonify({"message": "We couldn't parse your information. If it persists please contact someone"}), 400
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
                class_number = get_int(row.find("td").text) # getting the number
                
                #calling backend
                resp = s.post(
                    GQL_URL, 
                    json={"query": GQL_QUERY, "variables": {"term_id": term_id, "class_number": class_number}}
                )
                resp.raise_for_status()
                payload = resp.json()
                if "errors" in payload:
                    raise RuntimeError(payload["errors"])
                
                data = payload["data"]["course_section"]
                if len(data) == 0: raise RuntimeError("invalid class_number")
                _, code = enrol_user_in_section(user, class_number, term_id)
                if 200 <= code < 300:
                    added_sections.append(data[0]["course"]["name"] + " - " + data[0]["section_name"])
            except Exception as e:
                print("error:", e)
    return jsonify({"added_sections": added_sections}), 200
    