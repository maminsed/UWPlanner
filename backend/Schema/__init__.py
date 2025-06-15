"""The database module for connecting with NeonDB."""

from .db import JwtToken, LoginMethod, Users, Major, Minor, db, migrate

__all__ = ["Users", "db", "LoginMethod", "migrate", "JwtToken", "Major", "Minor"]
