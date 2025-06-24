from typing import Optional
from flask import Blueprint, jsonify, make_response, g, request
from backend.Schema import Major, Minor, Specialization
from backend.Auth import verify as verify_jwt
from ..School_info import enrol_to_major, enrol_to_minor

from collections import defaultdict


update_info = Blueprint("UpdateInfo", __name__)

@update_info.before_request
def verify() -> Optional[make_response]:
    return verify_jwt()


@update_info.route("/majors", methods=["GET"])
def get_majors()->tuple[str,int]:
    """Endpoint to get all the majors grouped by their faculty."""
    try:
        majors = Major.query.all()
        res = defaultdict(list)
        for m in majors:
            res[m.faculty].append([m.name, m.id])
        return jsonify({"data": [[f,res[f]] for f in res.keys()]}), 200
    except Exception as e:
        return jsonify({"message": "error in Backend", "error": str(e)}), 500

@update_info.route("/majors", methods=["POST"])
def add_majors()->tuple[str,int]:
    """Endpoint that takes in the user and adds the users choices to it."""
    username = g.username
    data = request.get_json()
    majors = data.get("selected")
    if not username:
        return jsonify({"message": "Please sign in first"}), 401
    if not majors or len(majors) <= 0:
        return jsonify({"message":"Select at lease one major"}), 400
    
    #Checking for duplicates:
    visited = set()
    for m in majors:
        if m in visited:
            return jsonify({"message": "You have duplicate majors."}), 400
        visited.add(m)
    
    
    for m in visited:
        status,message = enrol_to_major(m, username)
        if status == 500:
            return jsonify({"message": "error in backend", "error": message}), status
        if status >= 400 and status <= 500:
            return jsonify({"message": message}), status
    return jsonify({"message": "user enroled!"}), 200

@update_info.route("/minors", methods=["GET"])
def get_minors() -> tuple[str,int]:
    try:
        minors = Minor.query.all()
        res = defaultdict(list)
        for m in minors:
            res[m.theme].append([m.name, m.id])
        return jsonify({"data": [[f,res[f]] for f in res.keys()]}), 200
    except Exception as e:
        return jsonify({"message": "error in backend", "error": str(e)}), 500
    
@update_info.route("/minors", methods=["POST"])
def add_minor() -> tuple[str,int]:
    username = g.username
    data = request.get_json()
    minors = data.get("selected")
    if not username:
        return jsonify({"message": "Please sign in first"}), 401
    if not minors or len(minors) == 0:
        return "", 204
    
    #Checking for duplicates:
    visited = set()
    for m in minors:
        if m in visited:
            return jsonify({"message": "You have duplicate minors."}), 400
        visited.add(m)
    
    
    for m in visited:
        status,message = enrol_to_minor(m, username)
        if status == 500:
            return jsonify({"message": "error in backend", "error": message}), status
        if status >= 400 and status <= 500:
            return jsonify({"message": message}), status
    return jsonify({"message": "user enroled!"}), 200

@update_info.route("/specializations", methods=["GET"])
def get_specializations() -> tuple[str,int]:
    # try:
    ss = Specialization.query.all()
    res = defaultdict(list)
    for s in ss:
        res[s.field].append([s.name, s.id])
    return jsonify({"data": [[f,res[f]] for f in res.keys()]}), 200
    # except Exception as e:
    #     print(e)
    #     return jsonify({"message": "error in backend", "error": str(e)}), 500
