from flask import Blueprint, jsonify,g
from dotenv import load_dotenv
from .extraction import get_course_data
from backend.Auth import verify as verify_jwt
from ..Schema import Users

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

@courses_bp.route("/get_user_sections", methods=["GET"])
def get_user_sections():
    user = Users.query.filter_by(username=g.username).first()
    return jsonify({"sections": list(map(int, user.section_ids.split("-")))}), 200

