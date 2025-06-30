from flask import Blueprint, jsonify

from .extraction import (
    extract_majors,
    extract_minors,
    extract_options,
    extract_specializations,
    update_major_info,
)
from .selenium.sequence_scraper import scrape_sequences

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

@school_info_bp.route("/extract_specializations", methods=["GET"])
def extract_specs_ep()->tuple[str,int]:
    """Endpoint to extract Specializations."""
    extract_specializations()
    return "", 204


@school_info_bp.route("/extract_sequences",methods=["GET"])
def extract_sequences_ep()->tuple[str,int]:
    """Endpoint to extract Sequences."""
    success,errors = scrape_sequences()
    return jsonify({"success": success, "errors": errors}), 200

  
@school_info_bp.route("/extract_options", methods=["GET"])
def extract_options_ep()->tuple[str,int]:
    """Endpoint to extract Options."""
    extract_options()
    return "", 204
