from flask import Blueprint, jsonify

from .extraction import extract_majors, update_major_info

school_info_bp = Blueprint("school_info", __name__)

@school_info_bp.route("/extract_major", methods=["GET"])
def EM_fn():
    res = extract_majors()
    if res is False:
        return "",400
    return jsonify(res), 204


@school_info_bp.route("/update_major_info", methods=["GET"])
def UMI_fn():
    update_major_info()
    return "", 204
