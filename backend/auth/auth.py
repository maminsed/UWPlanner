from argon2 import PasswordHasher
from flask import Blueprint, request, jsonify
from ..Schema import db, Users, LoginMethod
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from codename import codename


auth_bp = Blueprint("auth", __name__)
ph = PasswordHasher()

@auth_bp.route("/signup", methods=["POST"])
def add_user():
    """
    Register a new user.

    Expects:
    JSON body with:
        email : str
            User’s e-mail address (must be unique).
        password : str
            Plain-text password; will be Argon2-hashed before storage.

    Returns:
    The response
    """
    #getting the data
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
        #hashing password
        hashpass = ph.hash(password)
        user = Users(email=email, username=username, pass_hash=hashpass, login_method=LoginMethod.email)
        #Adding to database
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "user created", "username": username}), 201
    except Exception as e:
        return jsonify({"message":"error in backend", "error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def handle_login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    if not password or (not username and not email):
        return jsonify({"message": "missing required fields"}), 400
    
    if email:
        user = Users.query.filter_by(email=email).first()
    else:
        user = Users.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({"message": "user not found"}), 401
    try:
        if ph.verify(user.pass_hash, password):
            return jsonify({"message": "logged in successfully!", 'username': user.username}), 202
    except VerifyMismatchError:
        return jsonify({"message": "wrong password"}), 401
    except Exception as e:
        return jsonify({"message":"error in backend", "error": str(e)}), 500