"""Disabled maintenance endpoints for school information refresh jobs."""

from flask import Blueprint, jsonify

school_info_bp = Blueprint("school_info", __name__)


def maintenance_endpoint_disabled() -> tuple[str, int]:
    """Return a safe response without running scraping or mutation work."""
    return jsonify({"message": "school information maintenance endpoint disabled"}), 404


@school_info_bp.route("/update_prereqs", methods=["GET"])
def update_prereqs_ep() -> tuple[str, int]:
    """Disabled endpoint to update prerequisite information. use get_course_reqs()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/get_programs", methods=["GET"])
def get_programs() -> tuple[str, int]:
    """Disabled endpoint to refresh program information. use get_program_reqs()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/extract_major", methods=["GET"])
def extract_majors_ep() -> tuple[str, int]:
    """Disabled endpoint to extract majors. use extract_majors()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/update_major_info", methods=["GET"])
def update_major_info_ep() -> tuple[str, int]:
    """Disabled endpoint to update major information. use update_major_info()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/extract_minors", methods=["GET"])
def extract_minors_ep() -> tuple[str, int]:
    """Disabled endpoint to extract minors. use extract_minors()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/extract_specializations", methods=["GET"])
def extract_specs_ep() -> tuple[str, int]:
    """Disabled endpoint to extract specializations. use extract_specializations()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/extract_sequences", methods=["GET"])
def extract_sequences_ep() -> tuple[str, int]:
    """Disabled endpoint to extract sequences. use scrape_sequences()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/extract_options", methods=["GET"])
def extract_options_ep() -> tuple[str, int]:
    """Disabled endpoint to extract options. use extract_options()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/count_majors", methods=["GET"])
def count_majors() -> tuple[str, int]:
    """Disabled endpoint to count majors. use major_checking()."""
    return maintenance_endpoint_disabled()


@school_info_bp.route("/extract_math_sequence", methods=["GET"])
def extract_math_seq() -> tuple[str, int]:
    """Disabled endpoint to extract math sequence data. use scrape_math()."""
    return maintenance_endpoint_disabled()
