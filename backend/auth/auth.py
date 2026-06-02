import os
from datetime import datetime, timezone

import jwt
import requests
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from codename import codename
from flask import Blueprint, Response, current_app, g, jsonify, make_response, request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jwt.exceptions import ExpiredSignatureError

from ..rate_limit import client_ip, enforce_rate_limits, normalized_json_value
from ..request_schemas import (
    ConfirmVerificationRequest,
    GoogleAuthRequest,
    LoginRequest,
    RefreshVerificationRequest,
    SignupRequest,
    parse_json_body,
)
from ..Schema import JwtToken, LoginMethod, Sequence, Users, db
from ..security import require_trusted_origin
from .jwt import clean_up_jwt, encode
from .jwt import verify as verify_access_token
from .send_mail import (
    EmailDeliveryError,
    send_delete_account_mail,
    send_verification_mail,
)

auth_bp = Blueprint("auth", __name__)
ph = PasswordHasher()


class DefaultSequenceMissingError(RuntimeError):
    """Raised when required seed data is missing."""


def assign_default_sequence(user: Users) -> None:
    """Attach the required Default sequence to a new user."""
    default_seq = Sequence.query.filter_by(name="Default").first()
    if not default_seq:
        raise DefaultSequenceMissingError("Default sequence is not configured")
    user.sequence = default_seq
    user.path = default_seq.plan


@auth_bp.route("/delete_user", methods=["DELETE"])
def delete_account() -> Response:
    """Deletes the current user.

    Requires:
        - The request to include jwt in httponly cookies

    Returns:
        - The response Code
        - Removes the user and all associated data from the database

    """
    origin_error = require_trusted_origin()
    if origin_error:
        return origin_error

    auth_error = verify_access_token()
    if auth_error:
        return auth_error

    refresh_token = request.cookies.get("jwt")
    if not refresh_token:
        return make_response(jsonify({"message": "Not authenticated"}), 401)

    try:
        jwt_db = JwtToken.query.filter_by(refresh_token_string=refresh_token).first()
        if not jwt_db:
            resp = make_response(jsonify({"message": "Invalid token"}), 401)
            resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None")
            return resp

        user = jwt_db.user
        if user.username != g.username:
            return make_response(jsonify({"message": "Invalid token"}), 403)

        # Clean up JWTs
        clean_up_jwt(user.username)

        # Clear many-to-many relationships
        user.programs.clear()
        user.majors.clear()
        user.minors.clear()
        user.specializations.clear()

        # Note: links, semesters, and refresh_tokens are deleted automatically
        # due to cascade="all, delete-orphan" in the Users model.

        user_email = user.email

        # Delete user
        db.session.delete(user)
        db.session.commit()

        # Send deletion notification
        send_delete_account_mail(user_email)

        resp = make_response(jsonify({"message": "User deleted successfully"}), 200)
        resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None")
        return resp
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to delete user")
        return make_response(jsonify({"message": "error in backend"}), 500)


@auth_bp.route("/signup", methods=["POST"])
def add_user() -> Response:
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
    rate_limit_error = enforce_rate_limits(
        ("signup.ip.hour", 5, 60 * 60, client_ip),
        ("signup.email.hour", 5, 60 * 60, lambda: normalized_json_value("email")),
    )
    if rate_limit_error:
        return rate_limit_error

    payload, error = parse_json_body(SignupRequest)
    if error:
        return error
    email = payload.email
    password = payload.password

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
        assign_default_sequence(user)

        # Adding to database
        db.session.add(user)
        db.session.commit()
        try:
            send_verification_mail(user)
        except EmailDeliveryError:
            db.session.delete(user)
            db.session.commit()
            current_app.logger.exception("Failed to send signup verification email")
            return jsonify({"message": "could not send verification email"}), 502
        # Adding the tokens
        return add_tokens("user created", 201, user)
    except DefaultSequenceMissingError:
        db.session.rollback()
        current_app.logger.exception("Default sequence is missing")
        return jsonify({"message": "Default sequence is not configured"}), 500
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to create user")
        return jsonify({"message": "error in backend"}), 500


@auth_bp.route("/login", methods=["POST"])
def handle_login() -> Response | tuple[str, int]:
    """Logs In the user.

    Requires:
        - The request body to come with username or email field + the password field.
        - The user to exist in the database.

    Returns:
        The response with the username and appropriate tokens.

    """
    rate_limit_error = enforce_rate_limits(
        ("login.ip.minute", 5, 60, client_ip),
        (
            "login.email.minute",
            5,
            60,
            lambda: normalized_json_value("email", "username"),
        ),
        (
            "login.email.hour",
            20,
            60 * 60,
            lambda: normalized_json_value("email", "username"),
        ),
    )
    if rate_limit_error:
        return rate_limit_error

    payload, error = parse_json_body(LoginRequest)
    if error:
        return error
    username = payload.username
    password = payload.password
    email = payload.email

    if email:
        user: Users = Users.query.filter_by(email=email).first()
    elif username:
        user: Users = Users.query.filter_by(username=username).first()

    if not user:
        return jsonify({"message": "user not found"}), 401
    if user.login_method != LoginMethod.email:
        return jsonify(
            {"message": "Use an alternate sign-in method for this account"}
        ), 401
    try:
        if ph.verify(user.pass_hash, password):
            # Adding the tokens
            return add_tokens("login successfull", 202, user)
    except VerifyMismatchError:
        return jsonify({"message": "user does not exist or incorrect password"}), 401
    except Exception:
        current_app.logger.exception("Login failed unexpectedly")
        return jsonify({"message": "error in backend"}), 500


@auth_bp.route("/auth_with_google", methods=["POST"])
def handle_auth_with_google() -> Response:
    """Authenticate a user with Google OAuth.

    Expects:
    JSON body with:
        code : str
            Google OAuth authorization code from the frontend sign-in flow.

    Returns:
    The response with the username, redirect destination, and appropriate tokens.

    """
    rate_limit_error = enforce_rate_limits(
        ("google_auth.ip.minute", 10, 60, client_ip),
        ("google_auth.ip.hour", 60, 60 * 60, client_ip),
    )
    if rate_limit_error:
        return rate_limit_error

    payload, error = parse_json_body(GoogleAuthRequest)
    if error:
        return error
    code = payload.code
    google_client_id = os.getenv("SIGN_IN_W_GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("SIGN_IN_W_GOOGLE_CLIENT_SECRET")
    if not google_client_id or not google_client_secret:
        return jsonify({"message": "google sign in is not configured"}), 500

    try:
        token_res = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": google_client_id,
                "client_secret": google_client_secret,
                "redirect_uri": "postmessage",
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
        token_res.raise_for_status()

        tokens = token_res.json()
        google_id_token = tokens["id_token"]

        user_info = id_token.verify_oauth2_token(
            google_id_token,
            google_requests.Request(),
            google_client_id,
        )

        email = user_info.get("email")
        if not email:
            return jsonify({"message": "google account did not include an email"}), 400
        if not user_info.get("email_verified"):
            return jsonify({"message": "google email is not verified"}), 403
    except requests.exceptions.HTTPError:
        return jsonify({"message": "invalid google authorization code"}), 401
    except requests.exceptions.RequestException:
        return jsonify(
            {"message": "could not reach google authentication service"}
        ), 502
    except Exception:
        current_app.logger.exception("Error verifying Google account")
        return jsonify({"message": "error in verifying google account"}), 401

    try:
        user = Users.query.filter_by(email=email).first()
        payload = {"message": "auth successfull", "redirect": "main"}  # main or info
        if not user:
            # getting a username for the user
            username = codename(separator="_")
            while Users.query.filter_by(username=username).first() is not None:
                username = codename(separator="_")

            # creating the user
            user: Users = Users(
                email=email,
                username=username,
                pass_hash="",
                login_method=LoginMethod.google,
                is_verified=True,
            )

            assign_default_sequence(user)

            # Adding to database
            db.session.add(user)
            db.session.commit()
            payload["redirect"] = "info"
        elif not user.is_verified:
            user.is_verified = True
            db.session.add(user)
            db.session.commit()
        if not user.programs:
            payload["redirect"] = "info"
    except DefaultSequenceMissingError:
        db.session.rollback()
        current_app.logger.exception("Default sequence is missing")
        return jsonify({"message": "Default sequence is not configured"}), 500
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to create Google-authenticated user")
        return jsonify({"message": "error creating user"}), 500

    return add_tokens(payload, 202, user)


def add_tokens(payload: dict | str, code: int, user: Users) -> Response:
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
    if isinstance(payload, str):
        payload = {"message": payload}
    payload["username"] = user.username
    payload["Access_Token"] = access_token
    resp = make_response(jsonify(payload), code)

    resp.set_cookie(
        "jwt",
        refresh_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="None",
    )
    return resp


@auth_bp.route("/refresh_veri", methods=["POST"])
def refresh_ver_code() -> tuple[str, int]:
    """Function to refresh verification code, or to get it in the first place.

    Requires:
        request to come with 'email' in body.

    Returns:
        The Response. Also adds it to database.

    """
    rate_limit_error = enforce_rate_limits(
        ("refresh_veri.ip.ten_minutes", 6, 10 * 60, client_ip),
        (
            "refresh_veri.account.ten_minutes",
            3,
            10 * 60,
            lambda: normalized_json_value("email", "username"),
        ),
    )
    if rate_limit_error:
        return rate_limit_error

    # Getting data and making sure it's valid
    payload, error = parse_json_body(RefreshVerificationRequest)
    if error:
        return error
    email = payload.email
    username = payload.username
    if email:
        user = Users.query.filter_by(email=email).first()
    else:
        user = Users.query.filter_by(username=username).first()

    if not user:
        return jsonify(
            {"message": "user with that email or username does not exist"}
        ), 401

    if user.is_verified:
        return jsonify({"message": "user already verified", "action": "main_page"}), 403

    # sending the code
    try:
        sent = send_verification_mail(user)
    except EmailDeliveryError:
        current_app.logger.exception("Failed to send verification email")
        return jsonify({"message": "could not send verification email"}), 502

    message = "email sent" if sent else "verification email already sent recently"
    return jsonify({"message": message, "email": user.email}), 200


@auth_bp.route("/confirm_veri", methods=["POST"])
def confirm_ver_code() -> tuple[str, int]:
    """Function to confirm verification code.

    Requires:
        The request to come with username and code parameters.

    Returns:
        The Response.

    """
    rate_limit_error = enforce_rate_limits(
        ("confirm_veri.ip.ten_minutes", 15, 10 * 60, client_ip),
        (
            "confirm_veri.account.ten_minutes",
            10,
            10 * 60,
            lambda: normalized_json_value("username"),
        ),
    )
    if rate_limit_error:
        return rate_limit_error

    # Getting data and making sure it's valid
    payload, error = parse_json_body(ConfirmVerificationRequest)
    if error:
        return error
    username = payload.username
    code = payload.code

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
    if len(user.majors) != 0:
        return jsonify({"message": "successfull", "action": "main_page"}), 200
    return jsonify({"message": "successfull"}), 200


@auth_bp.route("/refresh", methods=["POST"])
def refresh_token_handle() -> tuple[str, int]:
    """Returns the new Access_Token in case of success or error in case of error.

    Requires:
        - The request to have the jwt in the http only cookies.

    Returns:
        - Returns the new Access_Token in case of success
        - Error code in case of Error or wrong request

    """
    origin_error = require_trusted_origin()
    if origin_error:
        return origin_error

    # Getting the refresh token from user.
    refresh_token = request.cookies.get("jwt")
    if not refresh_token:
        return jsonify(
            {"message": "Refresh Cookie Token was not set", "action": "logout"}
        ), 401

    # getting the username based on the refresh token on database
    jwt_obj = JwtToken.query.filter_by(refresh_token_string=refresh_token).first()
    if not jwt_obj:
        resp = make_response(
            jsonify({"message": "token was not in database", "action": "logout"}), 403
        )
        resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None")
        return resp
    user_table = jwt_obj.user
    try:
        # Getting the username based on refresh token
        username_jwt = jwt.decode(
            refresh_token,
            os.getenv("REFRESH_TOKEN_SECRET"),
            algorithms=["HS256"],
            options={"require": ["exp", "username"], "verify_exp": True},
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
        db.session.delete(jwt_obj)
        db.session.commit()
        resp = make_response(
            jsonify({"message": "Token has already expired.", "action": "logout"}), 403
        )
        resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None")
        return resp
    except Exception:
        resp = make_response(
            jsonify({"message": "Token has been tampered with", "action": "logout"}),
            403,
        )
        resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None")
        return resp


@auth_bp.route("/logout", methods=["POST"])
def log_out() -> Response:
    """Logs Out the user.

    Requires:
        - The request to include jwt in httponly cookies

    Returns:
        - The response Code
        - Removes the jwt from the database

    """
    origin_error = require_trusted_origin()
    if origin_error:
        return origin_error

    refresh_token = request.cookies.get("jwt")
    if not refresh_token:
        return make_response("", 204)

    try:
        jwt_db = JwtToken.query.filter_by(refresh_token_string=refresh_token).first()
        if not jwt_db:
            resp = make_response(
                jsonify({"message": "refresh token not in database"}), 200
            )
            resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None")

            return resp
        clean_up_jwt(jwt_db.user.username)
        db.session.delete(jwt_db)
        db.session.commit()
        resp = make_response(jsonify({"message": "logout successfull"}), 200)
        resp.delete_cookie("jwt", httponly=True, secure=True, samesite="None")
        return resp
    except Exception:
        current_app.logger.exception("Logout failed")
        return make_response(jsonify({"message": "error in backend"}), 500)
