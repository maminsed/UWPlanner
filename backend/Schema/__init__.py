"""The database module for connecting with NeonDB."""

from .db import (
    JwtToken,
    Link,
    LoginMethod,
    Major,
    Minor,
    Course,
    Sequence,
    Semester,
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
    "Course",
    "Link",
    "Sequence",
    "Specialization",
]
