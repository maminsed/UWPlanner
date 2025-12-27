"""The database module for connecting with NeonDB."""

from .db import (
    Course,
    JwtToken,
    Link,
    LoginMethod,
    Major,
    Minor,
    Programs,
    Semester,
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
    "Semester",
    "Major",
    "Minor",
    "Programs",
    "Course",
    "Link",
    "Sequence",
    "Specialization",
]
