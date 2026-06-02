import os
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional, TypedDict

import jwt
from dotenv import load_dotenv
from flask import Response, g, jsonify, make_response, request
from jwt.exceptions import ExpiredSignatureError

from ..Schema import Users, db

load_dotenv()

ACCESS_TOKEN_SECONDS = 30 * 60
REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60


class AccessTokenPayload(TypedDict):
    """JSON payload returned to the frontend for access tokens."""

    token: str
    exp: str


def _token_secret(token_type: Literal["ACCESS", "REFRESH"]) -> str:
    key = os.getenv(f"{token_type}_TOKEN_SECRET")
    if not key:
        raise RuntimeError(f"{token_type}_TOKEN_SECRET is not configured")
    return key


def encode(
    username: str, kind: Literal["ACCESS", "REFRESH"]
) -> str | AccessTokenPayload:
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
    kind = kind.upper()
    key = _token_secret(kind)
    expires_in = ACCESS_TOKEN_SECONDS if kind == "ACCESS" else REFRESH_TOKEN_SECONDS
    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in)
    # creating and sending token
    if kind == "REFRESH":
        return jwt.encode(
            {
                "username": username,
                "exp": expires_at,
            },
            key,
            algorithm="HS256",
        )

    return {
        "token": jwt.encode(
            {
                "username": username,
                "exp": expires_at,
            },
            key,
            algorithm="HS256",
        ),
        "exp": expires_at.isoformat(),
    }


def verify() -> Optional[Response]:
    """Verifies that a user's Access Token is valid.

    Requires:
        Request to inlclude Authorization Header.

    Returns:
        None | Response in case of an error.

    """
    if request.method == "OPTIONS":
        return None
    # Getting the data
    req = request.headers.get("Authorization")
    if not req:
        return jsonify(
            {"message": "missing required field: authorization", "action": "logout"}
        ), 401
    auth_header_parts = req.split()
    if len(auth_header_parts) != 2 or auth_header_parts[0].lower() != "bearer":
        return jsonify(
            {"message": "invalid authorization header", "action": "logout"}
        ), 401
    auth_header = auth_header_parts[1]
    try:
        # Checking if it's valid, and adding to g
        res = jwt.decode(
            auth_header,
            _token_secret("ACCESS"),
            algorithms=["HS256"],
            options={"require": ["exp", "username"], "verify_exp": True},
        )
        g.username = res["username"]
        user = Users.query.filter_by(username=res["username"]).first()
        if not user:
            return make_response(
                jsonify({"message": "invalid authorization token", "action": "logout"}),
                403,
            )
        if not user.is_verified:
            return make_response(
                jsonify({"message": "user not verified", "action": "verify_code"}), 403
            )

        return None
    except ExpiredSignatureError:
        # In case of timing out
        return make_response(
            jsonify({"message": "access token has timed out", "action": "logout"}), 403
        )
    except Exception:
        # In case of tampering
        return make_response(
            jsonify(
                {
                    "message": "auth_header was tampered with",
                    "action": "logout",
                }
            ),
            403,
        )


def clean_up_jwt(username: str) -> None:
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
                _token_secret("REFRESH"),
                algorithms=["HS256"],
                options={
                    "require": ["exp", "username"],
                    "verify_exp": True,
                },
            )
        except ExpiredSignatureError:
            db.session.delete(rt)
        except Exception:
            db.session.delete(rt)
