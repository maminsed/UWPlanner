from argon2 import PasswordHasher
from flask import Blueprint, request, make_response, jsonify
from datetime import datetime
from ..Schema import db, Users
from argon2 import PasswordHasher

auth_bp = Blueprint("auth", __name__)
ph = PasswordHasher()

@auth_bp.route("/signup", methods=["POST"])
def add_user():
    #get the data
    data = request.get_json() or {}
    username = data.get("username")
    password = request.get("password")
    if not username or not password:
        return jsonify({"message": "missing username or password"}), 400

    #check for duplicates
    res = Users.query.filter_by(username=username).first()
    if res:
        return jsonify({"message": "user with username already exists"}), 409
    try:
        hashpass = ph.hash(password)
        user = Users(username=username, pass_hash=hashpass, login_method='email', created_at=datetime.now(), last_updated_at=datetime.now())
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "user created"}), 201
    except Exception as e:
        return jsonify({"message":"error in backend"}), 500