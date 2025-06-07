from typing import Optional

from flask import Blueprint, g, jsonify, make_response, request

from ..School_info.majors import add_major, enrol_to_major

from ..Auth import verify as verify_jwt

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
    data = request.get_json()
    error = data.get("error") or ""
    if error == "True":
        return {"message": "You asked for an error buddy"}, 402

    return jsonify({"message": f"HI {g.username} Stop obesity"}), 200

@test_bp.route("/add_major", methods=["POST"])
def create_major() -> tuple[str, int]:
    data = request.get_json()
    major = data.get("major")
    if not major:
        return jsonify({"message": "error"}), 400
    
    res = add_major(major)
    if not res[0]:
        return jsonify({"message": res[1]}), 400
    return jsonify({"message": res[1]}), 200

@test_bp.route("/add_user", methods=["UPDATE", "POST"])
def add_user_to_major():
    data = request.get_json()
    major = data.get("major")
    if not major:
        return jsonify({"message": "forgot to send a major"})

    res = enrol_to_major(major, g.username)
    if not res[0]:
        return jsonify({"message": res[1]}), 400
    
    return jsonify({"message": res[1]}), 200
