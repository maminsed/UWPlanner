from flask import Blueprint, jsonify
from dotenv import load_dotenv
from .extraction import extract_prereq, get_course_data

load_dotenv()
courses_bp = Blueprint("Courses", __name__)

@courses_bp.route("/populate_course", methods=["GET"])
def populate_courses():
    """endpoint to populate the courses database. It's used in case UWFLOW is down"""
    errors = get_course_data()
    return jsonify({"errors": errors}), 200



