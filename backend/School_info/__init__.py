"""Module to work with School Information.

Adding Majors-Minors-Specializations.
Enroling Students in mms.
"""

from .endpoints import school_info_bp
from .enrolement import enrol_to_major, enrol_to_minor, enrol_to_spec, enrol_to_seq

__all__ = ["school_info_bp", "enrol_to_major", "enrol_to_minor", "enrol_to_spec", "enrol_to_seq"]
