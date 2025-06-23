"""Module to work with School Information.

Adding Majors-Minors-Specializations.
Enroling Students in mms.
"""

from .endpoints import school_info_bp
from .majors import enrol_to_major

__all__ = ["school_info_bp", "enrol_to_major"]
