from argon2 import PasswordHasher
from flask import Blueprint, request, jsonify
from ..Schema import db, Users, LoginMethod
from argon2 import PasswordHasher
from codename import codename


auth_bp = Blueprint("auth", __name__)
ph = PasswordHasher()

@auth_bp.route("/signup", methods=["POST"])
def add_user():
    #get the data
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"message": "missing email or password"}), 400

    #check for duplicates
    res = Users.query.filter_by(email=email).first()
    if res:
        return jsonify({"message": "user with email already exists"}), 409
    try:
        #getting a username for the user
        username = codename(separator="_")
        while Users.query.filter_by(username=username).first() != None:
            username = codename(separator="_")
        
        hashpass = ph.hash(password)
        user = Users(email=email, username=username, pass_hash=hashpass, login_method=LoginMethod.email)
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "user created", "username": username}), 201
    except Exception as e:
        return jsonify({"message":"error in backend", "error": str(e)}), 500