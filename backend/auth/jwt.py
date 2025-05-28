import os
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

import jwt
from dotenv import load_dotenv
from flask import g, jsonify, make_response, request
from jwt.exceptions import ExpiredSignatureError

from ..Schema import Users, db

load_dotenv()


def encode(username: str, type: Literal["ACCESS", "REFRESH"]) -> str:
    """Generate (encode and sign) a JWT.

    Requires:
        username (str):
            The user identifier to embed as the token’s subject (“sub” claim).
        token_type (ACCESS|REFRESH):
            Kind of token being generated — either `"ACCESS"` or `"REFRESH"`.

    Returns:
        The compact JWT string.

    """
    # Checking which token they need, and setting expiration time
    key = os.getenv(f"{type.upper()}_TOKEN_SECRET")
    if type.upper() == "ACCESS":
        expires_in = 30
    else:
        expires_in = 24 * 60 * 60
    # creating and sending token
    if type == "REFRESH":
        return jwt.encode(
            {
                "username": username,
                "exp": datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in),
            },
            key,
            algorithm="HS256",
        )

    return {
        "token": jwt.encode(
            {
                "username": username,
                "exp": datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in),
            },
            key,
            algorithm="HS256",
        ),
        "exp": datetime.now(tz=timezone.utc),
    }


def verify()->Optional[make_response]:
    """Verifies that a user's Access Token is valid.

    Requires:
        Request to inlclude Authorization Header.

    Returns:
        None | Response in case of an error.

    """
    if request.method == "OPTIONS":
        resp = make_response("", 204)
        origin = request.headers.get("Origin")
        resp.headers.update(
            {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Authorization,Content-Type",
                "Access-Control-Allow-Credentials": "true",
            }
        )
        return resp
    # Getting the data
    req = request.headers.get("Authorization")
    if not req:
        return jsonify(
            {"message": "missing required field: authorization", "action": "logout"}
        ), 401
    auth_header = req.split(" ")[1]
    try:
        # Checking if it's valid, and adding to g
        res = jwt.decode(
            auth_header,
            os.getenv("ACCESS_TOKEN_SECRET"),
            algorithms="HS256",
            options={"require": ["exp", "username"], "verify_exp": "verify_signature"},
        )
        g.username = res["username"]
        return None
    except ExpiredSignatureError:
        # In case of timing out
        return make_response(
            jsonify({"message": "access token has timed out", "action": "logout"}), 403
        )
    except Exception as e:
        # In case of tampering
        return make_response(
            jsonify(
                {
                    "message": "auth_header was tampered with",
                    "error": str(e),
                    "action": "logout",
                }
            ),
            403,
        )


def clean_up_jwt(username: str)->None:
    """For the user with username = username, removes any jwt that has expired.

    Requires:
        username (string):
            The username, the user has to exist in the database.

    Returns:
        None - But you should call db.session.commit() after it.

    """
    user = Users.query.filter_by(username=username).first()
    if not user:
        raise LookupError(f"{username} is not in the database")
    for rt in user.refresh_tokens:
        try:
            jwt.decode(
                rt.refresh_token_string,
                os.getenv("REFRESH_TOKEN_SECRET"),
                algorithms="HS256",
                options={
                    "require": ["exp", "username"],
                    "verify_exp": "verify_signature",
                },
            )
        except ExpiredSignatureError:
            db.session.delete(rt)
        except Exception as err:
            raise RuntimeError(
                f"token with {rt.id} has been tampered with in the database."
            ) from err
