import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, TypedDict

import jwt
from dotenv import load_dotenv
from flask import g, request
from flask.typing import ResponseReturnValue
from jwt.exceptions import ExpiredSignatureError

from ..responses import api_error
from ..Schema import Users

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


def hash_refresh_token(refresh_token: str) -> str:
    """Return a non-reversible digest for refresh token storage and lookup."""
    secret = _token_secret("REFRESH").encode()
    return hmac.new(secret, refresh_token.encode(), hashlib.sha256).hexdigest()


def encode(
    username: str, kind: Literal["ACCESS", "REFRESH"]
) -> str | AccessTokenPayload:
    """Generate and sign a JWT."""
    kind = kind.upper()
    key = _token_secret(kind)
    expires_in = ACCESS_TOKEN_SECONDS if kind == "ACCESS" else REFRESH_TOKEN_SECONDS
    expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=expires_in)

    if kind == "REFRESH":
        return jwt.encode(
            {
                "username": username,
                "exp": expires_at,
                "jti": secrets.token_urlsafe(16),
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


def verify() -> ResponseReturnValue | None:
    """Verify that a user's access token is valid."""
    if request.method == "OPTIONS":
        return None

    req = request.headers.get("Authorization")
    if not req:
        return api_error(
            "missing required field: authorization",
            401,
            "AUTHORIZATION_MISSING",
            action="logout",
        )

    auth_header_parts = req.split()
    if len(auth_header_parts) != 2 or auth_header_parts[0].lower() != "bearer":
        return api_error(
            "invalid authorization header",
            401,
            "AUTHORIZATION_INVALID",
            action="logout",
        )

    auth_header = auth_header_parts[1]
    try:
        res = jwt.decode(
            auth_header,
            _token_secret("ACCESS"),
            algorithms=["HS256"],
            options={"require": ["exp", "username"], "verify_exp": True},
        )
        g.username = res["username"]
        user = Users.query.filter_by(username=res["username"]).first()
        if not user:
            return api_error(
                "invalid authorization token",
                403,
                "AUTHORIZATION_INVALID",
                action="logout",
            )
        if not user.is_verified:
            return api_error(
                "user not verified",
                403,
                "USER_NOT_VERIFIED",
                action="verify_code",
            )

        return None
    except ExpiredSignatureError:
        return api_error(
            "access token has timed out",
            403,
            "ACCESS_TOKEN_EXPIRED",
            action="logout",
        )
    except Exception:
        return api_error(
            "auth_header was tampered with",
            403,
            "AUTHORIZATION_INVALID",
            action="logout",
        )


def clean_up_jwt(username: str) -> None:
    """Validate that the user exists before token cleanup callers continue."""
    user = Users.query.filter_by(username=username).first()
    if not user:
        raise LookupError(f"{username} is not in the database")
    # Refresh tokens are stored as hashes, so their expiry cannot be decoded from
    # the database record. Expired presented tokens are deleted in the refresh flow.
    return None
