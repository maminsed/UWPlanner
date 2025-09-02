from flask import Blueprint, jsonify,g, request
from dotenv import load_dotenv
from .extraction import get_course_data
from backend.Auth import verify as verify_jwt
from ..Schema import Users, Schedule

load_dotenv()
courses_bp = Blueprint("Courses", __name__)

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
    section_ids = "-".join([schedule.sections for schedule in user.schedules if schedule.term_id == term_id])
    return jsonify({"sections": list(map(int, section_ids.split("-")))}), 200

