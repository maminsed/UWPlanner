"""Module to work with School Information.

Adding Majors-Minors-Specializations.
Enroling Students in mms.
"""

from .endpoints import school_info_bp
from .enrolement import enrol_to_majors, enrol_to_minors, enrol_to_seq, enrol_to_specs

__all__ = [
    "school_info_bp",
    "enrol_to_majors",
    "enrol_to_minors",
    "enrol_to_specs",
    "enrol_to_seq",
]
