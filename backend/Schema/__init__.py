"""The database module for connecting with NeonDB."""

from .db import (
    JwtToken,
    LoginMethod,
    Major,
    Minor,
    Sequence,
    Specialization,
    Users,
    db,
    migrate,
)

__all__ = [
    "Users",
    "db",
    "LoginMethod",
    "migrate",
    "JwtToken",
    "Major",
    "Minor",
    "Sequence",
    "Specialization",
]
