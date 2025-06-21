import os
from datetime import datetime, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from codename import codename
from flask import Blueprint, Response, jsonify, make_response, request
from jwt.exceptions import ExpiredSignatureError

from ..Schema import JwtToken, LoginMethod, Users, db
from .jwt import clean_up_jwt, encode
from .send_mail import send_verification_mail

auth_bp = Blueprint("auth", __name__)
ph = PasswordHasher()


@auth_bp.route("/signup", methods=["POST"])
def add_user() -> Response | tuple[str, int]:
    """Register a new user.

    Expects:
    JSON body with:
        email : str
            User's e-mail address (must be unique).
        password : str
            Plain-text password; will be Argon2-hashed before storage.

    Returns:
    The response

    """
    # getting the data
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"message": "missing email or password"}), 400

    # check for duplicates
    res = Users.query.filter_by(email=email).first()
    if res:
        return jsonify({"message": "user with email already exists"}), 409
    try:
        # getting a username for the user
        username = codename(separator="_")
        while Users.query.filter_by(username=username).first() is not None:
            username = codename(separator="_")
        # hashing password
        hashpass = ph.hash(password)
        user = Users(
            email=email,
            username=username,
            pass_hash=hashpass,
            login_method=LoginMethod.email,
        )
        # Adding to database
        db.session.add(user)
        db.session.commit()
        send_verification_mail(user)
        # Adding the tokens
        return add_tokens("user created", 201, user)
    except Exception as e:
        return jsonify({"message": "error in backend", "error": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def handle_login() -> Response | tuple[str, int]:
    """Logs In the user.

    Requires:
        - The request body to come with username or email field + the password field.
        - The user to exist in the database.

    Returns:
        The response with the username and appropriate tokens.

    """
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    if not password or (not username and not email):
        return jsonify({"message": "missing required fields"}), 400

    if email:
        user = Users.query.filter_by(email=email).first()
    elif username:
        user = Users.query.filter_by(username=username).first()

    if not user:
        return jsonify({"message": "user not found"}), 401
    try:
        if ph.verify(user.pass_hash, password):
            # Adding the tokens
            return add_tokens("login successfull", 202, user)
    except VerifyMismatchError:
        return jsonify({"message": "wrong password"}), 401
    except Exception as e:
        return jsonify({"message": "error in backend", "error": str(e)}), 500


def add_tokens(message: str, code: int, user: Users) -> Response:
    """Adds Refresh and Access Tokens to response.

    Requires:
        - Message (str):
            The message to be sent back.
        - Code (int):
            The status code for the response (100 - 599).
        - user (Users):
            The user that is requesting the codes.

    Returns:
        - The response + Access + Refresh Tokens
        - Saves the Refresh in the database

    """
    # generating the tokens
    access_token = encode(user.username, "ACCESS")
    refresh_token = encode(user.username, "REFRESH")
    # Saving the refresh token
    refresh_token_instance = JwtToken(
        refresh_token_string=refresh_token, user_id=user.id, user=user
    )
    db.session.add(refresh_token_instance)
    db.session.commit()
    # Generating the responses
    resp = make_response(
        jsonify(
            {
                "message": message,
                "username": user.username,
                "Access_Token": access_token,
            }
        ),
        code,
    )
    resp.set_cookie(
        "jwt",
        refresh_token,
        max_age=24 * 60 * 60 * 1000,
        httponly=True,
        secure=True,
        samesite="None",
    ) # PRODUCTION set: , secure=True, samesite=None
    return resp


@auth_bp.route("/refresh_veri", methods=["POST"])
def refresh_ver_code() -> tuple[str, int]:
    """Function to refresh verification code, or to get it in the first place.

    Requires:
        request to come with 'email' in body.

    Returns:
        The Response. Also adds it to database.

    """
    # Getting data and making sure it's valid
    data = request.get_json()
    email = data.get("email")
    username = data.get("username")
    if not email and not username:
        return jsonify({"message": "username or email not provided"}), 400
    if email:
        user = Users.query.filter_by(email=email).first()
    else:
        user = Users.query.filter_by(username=username).first()

    print("hieuvgiurwvgrwuvbw")
    if not user:
        return jsonify(
            {"message": "user with that email or username does not exist"}
        ), 401

    if user.is_verified:
        return jsonify({"message": "user already verified", "action": "main_page"}), 403

    # sending the code
    send_verification_mail(user)
    return jsonify({"message": "email sent", "email": user.email}), 200


@auth_bp.route("/confirm_veri", methods=["POST"])
def confirm_ver_code() -> tuple[str, int]:
    """Function to confirm verification code.

    Requires:
        The request to come with email and code parameters.

    Returns:
        The Response.

    """
    # Getting data and making sure it's valid
    data = request.get_json()
    username = data.get("username")
    code = data.get("code")
    if not username or not code:
        return jsonify({"message": "email or code not provided"}), 400

    user = Users.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "user does not exist"}), 401

    # Making sure the user isn't already verified
    if user.is_verified:
        return jsonify({"message": "user already verified"}), 200
    # if there is issue with verification code, ask to reverify
    if (
        user.verification_expiration < datetime.now(timezone.utc)
        or user.verification_code == 0
    ):
        return jsonify({"message": "code has timed out", "action": "verify_code"}), 401

    try:
        code = int(code)
    except ValueError:
        return jsonify({"message": "Wrong code"}), 403

    # Making sure the code is correct
    if user.verification_code != code:
        return jsonify({"message": "wrong code"}), 403

    # Adding to database and sending back the result.
    user.is_verified = True
    user.verification_code = 0
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "successfull"}), 200


@auth_bp.route("/refresh", methods=["GET"])
def refresh_token_handle() -> tuple[str, int]:
    """Returns the new Access_Token in case of success or error in case of error.

    Requires:
        - The request to have the jwt in the http only cookies.

    Returns:
        - Returns the new Access_Token in case of success
        - Error code in case of Error or wrong request

    """
    # Getting the refresh token from user.
    refresh_token = request.cookies.get("jwt") # PRODUCTION set: , secure=True, samesite=None
    if not refresh_token:
        return jsonify(
            {"message": "Refresh Cookie Token was not set", "action": "logout"}
        ), 401

    # getting the username based on the refresh token on database
    jwt_obj = JwtToken.query.filter_by(refresh_token_string=refresh_token).first()
    if not jwt_obj:
        return jsonify({"message": "token was not in databse", "action": "logout"}), 403
    user_table = jwt_obj.user
    try:
        # Getting the username based on refresh token
        username_jwt = jwt.decode(
            refresh_token,
            os.getenv("REFRESH_TOKEN_SECRET"),
            algorithms="HS256",
            options={"require": ["exp", "username"], "verify_exp": "verify_signature"},
        )["username"]
        # if the databse does not match the token, it sends an error.
        if username_jwt != user_table.username:
            return jsonify(
                {"message": "Token has been tampered with", "action": "logout"}
            ), 403
        # encoding a new token and sending it.
        access_token = encode(username_jwt, "ACCESS")
        return jsonify(
            {"Access_Token": access_token, "username": user_table.username}
        ), 200
    except ExpiredSignatureError:
        return jsonify(
            {"message": "Token has already expired.", "action": "logout"}
        ), 403
    except Exception as e:
        return jsonify(
            {"message": "Token has been tampered with", "error": str(e)}
        ), 403


@auth_bp.route("/logout", methods=["GET"])
def log_out() -> Response:
    """Logs Out the user.

    Requires:
        - The request to include jwt in httponly cookies

    Returns:
        - The response Code
        - Removes the jwt from the database

    """
    refresh_token = request.cookies.get("jwt") # PRODUCTION set: , secure=True, samesite=None
    if not refresh_token:
        return make_response("", 204)

    try:
        jwt_db = JwtToken.query.filter_by(refresh_token_string=refresh_token).first()
        if not jwt_db:
            resp = make_response(
                jsonify({"message": "refresh token not in database"}), 200
            )
            resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None") # PRODUCTION set: , secure=True, samesite=None
            return resp
        clean_up_jwt(jwt_db.user.username)
        db.session.delete(jwt_db)
        db.session.commit()
        resp = make_response(jsonify({"message": "logout successfull"}), 200)
        resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None") # PRODUCTION set: , secure=True, samesite=None
        return resp
    except Exception as e:
        return make_response(
            jsonify({"message": "error in backend", "error": str(e)}), 500
        )
