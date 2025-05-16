from flask import Blueprint, g, make_response, request
from ..Auth import verify as verify_jwt

test_bp = Blueprint('test', __name__)

@test_bp.before_request
def verify():
    return verify_jwt()

@test_bp.route('/', methods=['GET', 'POST'])
def test():
    data = request.get_json()
    error = data.get("error") or ""
    if error == "True":
        return {"message": "You asked for an error buddy"}, 402

    return {"message": f'HI {g.username} Stop obesity'}, 200