from flask import Blueprint, jsonify,g, request
from dotenv import load_dotenv
from .extraction import get_course_data
from backend.Auth import verify as verify_jwt
from ..Schema import Users, Schedule, db

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
    if not user: return jsonify({"message": "user not found"}), 500
    section_ids = "-".join([schedule.sections for schedule in user.schedules if schedule.term_id == term_id])
    if section_ids == '':
        return jsonify({"sections": []}), 200
    size = 0
    if user.path != '':
        size = max(0,len(user.path.split('-'))-1)
    sem_dic = {0:5,1:9,2:1}
    return jsonify({"sections": list(map(int, section_ids.split("-"))), "start_sem": (user.started_year - 1900)*10 + sem_dic[user.started_month], "size": size}), 200

@courses_bp.route("/add", methods=["POST"])
def add_section_to_user():
    data = request.get_json()
    term_id = data.get("term_id")
    course_id = data.get("course_id")
    class_number = data.get("class_number")
    user = Users.query.filter_by(username=g.username).first()
    if not user or not term_id or not course_id or not class_number:
        return jsonify({"message": "please provide all fields"}), 400
    available_section = [s for s in user.schedules if s.term_id == term_id]
    try:
        if not len(available_section):
            available_section = Schedule(term_id=term_id, user=user, sections=str(course_id))
        else:
            available_section = available_section[0]
            index = available_section.sections.find(str(class_number))
            if index != -1:
                return jsonify({"message": "user already enroled in this semester"}), 409
            available_section.sections += "-"+str(class_number)
        db.session.add(available_section)
        db.session.commit()
        return jsonify({"message": "user successfully enroled"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "error in backend"}), 500
    
    