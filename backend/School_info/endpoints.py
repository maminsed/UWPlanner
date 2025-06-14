from flask import Blueprint

from .extraction import extract_majors

school_info_bp = Blueprint("school_info", __name__)

@school_info_bp.route("/extract_major", methods=["GET"])
def EM_fn():
    extract_majors()
    return "",204
