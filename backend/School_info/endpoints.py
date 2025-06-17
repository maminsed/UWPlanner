from flask import Blueprint, jsonify

from .extraction import extract_majors, extract_minors, update_major_info

school_info_bp = Blueprint("school_info", __name__)


@school_info_bp.route("/extract_major", methods=["GET"])
def extract_majors_ep()->tuple[str,int]:
    """Endpoint to extract Majors."""
    res = extract_majors()
    if res is False:
        return "", 400
    return jsonify(res), 204


@school_info_bp.route("/update_major_info", methods=["GET"])
def update_major_info_ep()->tuple[str,int]:
    """Endpoint to update coop information for majors."""
    update_major_info()
    return "", 204


@school_info_bp.route("/extract_minors", methods=["GET"])
def extract_minors_ep()->tuple[str,int]:
    """Endpoint to extract Minors."""
    extract_minors()
    return "", 204
