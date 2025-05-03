from flask import Blueprint, g
from ..Auth import verify as verify_jwt

test_bp = Blueprint('test', __name__)

@test_bp.before_request
def verify():
    return verify_jwt()

@test_bp.route('/', methods=['GET', 'POST'])
def test():
    return {"message": f'HI {g.username}'}, 200