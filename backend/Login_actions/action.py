from collections import defaultdict
from typing import Optional

from flask import Blueprint, g, jsonify, make_response, request

from backend.Auth import verify as verify_jwt
from backend.Schema import Major, Minor, Sequence, Specialization, Users, db

from ..School_info import enrol_to_major, enrol_to_minor, enrol_to_seq, enrol_to_spec

update_info = Blueprint("UpdateInfo", __name__)


@update_info.before_request
def verify() -> Optional[make_response]:
    return verify_jwt()


@update_info.route("/majors", methods=["GET"])
def get_majors() -> tuple[str, int]:
    """Endpoint to get all the majors grouped by their faculty."""
    try:
        majors = Major.query.all()
        res = defaultdict(list)
        for m in majors:
            res[m.faculty].append([m.name, m.name, m.id])
        return jsonify({"data": [[f, res[f]] for f in res.keys()]}), 200
    except Exception as e:
        return jsonify({"message": "error in Backend", "error": str(e)}), 500


@update_info.route("/majors", methods=["POST"])
def add_majors() -> tuple[str, int]:
    """Endpoint that takes in the user and adds the users choices to it."""
    username = g.username
    data = request.get_json()
    majors = data.get("selected")
    if not username:
        return jsonify({"message": "Please sign in first"}), 401
    if not majors or len(majors) <= 0:
        return jsonify({"message": "Select at lease one major"}), 400

    # Checking for duplicates:
    visited = set()
    for m in majors:
        if m[2] in visited:
            return jsonify({"message": "You have duplicate majors."}), 400
        visited.add(m[2])

    for id in visited:
        status, message = enrol_to_major(id, username)
        if status == 500:
            return jsonify({"message": "error in backend", "error": message}), status
        if status >= 400 and status <= 500:
            return jsonify({"message": message}), status
    return jsonify({"message": "user enroled!"}), 200


@update_info.route("/minors", methods=["GET"])
def get_minors() -> tuple[str, int]:
    try:
        minors = Minor.query.all()
        res = defaultdict(list)
        for m in minors:
            res[m.theme].append([m.name, m.name, m.id])
        return jsonify({"data": [[f, res[f]] for f in res.keys()]}), 200
    except Exception as e:
        return jsonify({"message": "error in backend", "error": str(e)}), 500


@update_info.route("/minors", methods=["POST"])
def add_minor() -> tuple[str, int]:
    username = g.username
    data = request.get_json()
    minors = data.get("selected")
    if not username:
        return jsonify({"message": "Please sign in first"}), 401
    if not minors or len(minors) == 0:
        return "", 204

    # Checking for duplicates:
    visited = set()
    for m in minors:
        if m[2] in visited:
            return jsonify({"message": "You have duplicate minors."}), 400
        visited.add(m[2])

    for id in visited:
        status, message = enrol_to_minor(id, username)
        if status == 500:
            return jsonify({"message": "error in backend", "error": message}), status
        if status >= 400 and status <= 500:
            return jsonify({"message": message}), status
    return jsonify({"message": "user enroled!"}), 200


@update_info.route("/specializations", methods=["GET"])
def get_specializations() -> tuple[str, int]:
    try:
        ss = Specialization.query.all()
        username = g.username
        user = Users.query.filter_by(username=username).first()
        majors = []
        if user:
            majors = [m.name for m in user.majors] or []
        res = defaultdict(list)
        for s in ss:
            res[s.field].append([s.name, s.name, s.id])
        laterData = []
        data = []
        for field in res.keys():
            if field in majors:
                data.append([field, res[field]])
            else:
                laterData.append([field, res[field]])
        return jsonify({"data": data + laterData}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "error in backend", "error": str(e)}), 500


@update_info.route("/specializations", methods=["POST"])
def add_specializations() -> tuple[str, int]:
    username = g.username
    data = request.get_json()
    ss = data.get("selected")
    if not username:
        return jsonify({"message": "Please sign in first"}), 401
    if not ss or len(ss) == 0:
        return "", 204

    # Checking for duplicates:
    visited = set()
    for s in ss:
        if s[2] in visited:
            return jsonify({"message": "You have duplicate specializations."}), 400
        visited.add(s[2])

    for id in visited:
        status, message = enrol_to_spec(id, username)
        if status == 500:
            print(message)
            return jsonify({"message": "error in backend", "error": message}), status
        if status >= 400 and status <= 500:
            return jsonify({"message": message}), status
    return jsonify({"message": "user enroled!"}), 200


@update_info.route("/coop", methods=["GET"])
def get_coop() -> tuple[str, int]:
    return jsonify({"data": [["_", [["yes", "yes", 1], ["no", "no", 2]]]]}), 200


@update_info.route("/coop", methods=["POST"])
def add_coop() -> tuple[str, int]:
    username = g.username
    data = request.get_json()
    coop = data.get("selected")
    if not username:
        return jsonify({"message": "Please sign in first"}), 401
    if not coop or len(coop) != 1 or coop[0][0] not in ["yes", "no"]:
        return jsonify({"message": "Please select an option"}), 400
    try:
        user = Users.query.filter_by(username=username).first()
        user.coop = True if coop[0][0] == "yes" else False
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "coop option set"}), 204
    except Exception as e:
        print(e)
        return jsonify({"message": "error in backend", "error": str(e)}), 500


@update_info.route("/sequence", methods=["GET"])
def get_sequence():
    username = g.username
    if not username:
        return jsonify({"please sign in first"})
    try:
        user = Users.query.filter_by(username=username).first()
        if not user.majors:
            return jsonify({"You need to have a major first"}), 403
        res = {}
        default = Sequence.query.filter_by(name="Default").first()
        res[default.id] = ["Default", default.plan, default.id]

        # id: name, plan
        if user.coop:
            for m in user.majors:
                for seq in m.sequences:
                    if seq.id not in res:
                        res[seq.id] = (seq.name, seq.plan, seq.id)
        return jsonify({"data": [["_", [res[f] for f in res.keys()]]]})
    except Exception as e:
        print(e)
        return jsonify(
            {"message": "sign in and come back to this again", "error": str(e)}
        ), 400


@update_info.route("/sequence", methods=["POST"])
def add_sequence() -> tuple[str, int]:
    username = g.username
    seq = (request.get_json()).get("selected")
    if not seq or len(seq) == 0:
        return jsonify({"message": "please select an option first"}), 401
    if not username:
        return jsonify({"message": "please log in first"}), 403
    status, message = enrol_to_seq(seq[0][2], username)
    if status == 500:
        return jsonify({"message": "error in backend", "error": message}), 500
    return jsonify({"message": message}), status


"""
Format:
    [
        [field, [ [word,hover,id],[word,hover,id],[word,hover,id] ]]
        [field, [ [word,hover,id],[word,hover,id],[word,hover,id] ]]
    ]

"""
