from argon2 import PasswordHasher
from flask import Blueprint, request, jsonify, make_response
from ..Schema import db, Users, LoginMethod, JwtToken
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from codename import codename
from .jwt import encode


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
            #Getting refresh and access tokens
            access_token = encode(user.username, 'ACCESS')
            refresh_token = encode(user.username, 'REFRESH')
            #Saving the refresh token
            refresh_token_instance = JwtToken(refresh_token_string=refresh_token, user_id=user.id, user=user)
            db.session.add(refresh_token_instance)
            db.session.commit()
            resp = make_response(jsonify({"message": "logged in successfully!", 'username': user.username, 'Access_Token': access_token}), 202)
            resp.set_cookie('jwt', refresh_token, 24*60*60*1000, httponly=True)
            return resp
    except VerifyMismatchError:
        return jsonify({"message": "wrong password"}), 401
    except Exception as e:
        return jsonify({"message":"error in backend", "error": str(e)}), 500
    
def refresh_token_handle():
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        return jsonify({"message": "Refresh Cookie Token was not set"}), 401

    jwt_obj = JwtToken.query.filter_by(refresh_token=refresh_token).first()
    if not jwt_obj:
        return jsonify({"message": "token was not in databse"}), 403
    user = jwt_obj.user