from typing import Optional

from flask import Blueprint, g, jsonify, make_response

from ..Auth import verify as verify_jwt
from ..request_schemas import TestRequest, parse_json_body

test_bp = Blueprint("test", __name__)


@test_bp.before_request
def verify() -> Optional[make_response]:
    """Verifies Users trying to access."""
    return verify_jwt()


@test_bp.route("/", methods=["GET", "POST"])
def test() -> tuple[str, int]:
    """Test route.

    Requires:

    Returns:
        - If users Body include error sends back error, else returns the username.

    """
    payload, error = parse_json_body(TestRequest)
    if error:
        return error
    if payload.error == "True":
        return {"message": "You asked for an error buddy"}, 402

    return jsonify({"message": f"HI {g.username} Stop obesity"}), 200
