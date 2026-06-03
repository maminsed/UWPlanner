"""Shared API response helpers."""

from flask import jsonify
from flask.typing import ResponseReturnValue


def error_payload(
    message: str,
    code: str,
    *,
    action: str | None = None,
) -> dict[str, str]:
    """Build a normalized API error payload."""
    payload = {"message": message, "code": code}
    if action:
        payload["action"] = action
    return payload


def api_error(
    message: str,
    status_code: int,
    code: str,
    *,
    action: str | None = None,
) -> ResponseReturnValue:
    """Return a normalized API error response."""
    return jsonify(error_payload(message, code, action=action)), status_code
