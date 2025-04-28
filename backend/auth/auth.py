from argon2 import PasswordHasher
from flask import Blueprint

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login/<user>:<pass>", methods=["POST"])
def login_user():
    pass