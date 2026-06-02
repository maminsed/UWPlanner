"""Runtime configuration helpers for the Flask app."""

import os

LOCAL_FRONTEND_ORIGINS = ("http://localhost:3000",)


def _split_csv(value: str | None) -> list[str]:
    """Split a comma-separated env var into non-empty values."""
    if not value:
        return []
    return [item.strip().rstrip("/") for item in value.split(",") if item.strip()]


def get_frontend_origins() -> list[str]:
    """Return the credentialed browser origins allowed to call the API."""
    configured_origins = _split_csv(os.getenv("FRONTEND_ORIGINS"))
    if configured_origins:
        return configured_origins
    return list(LOCAL_FRONTEND_ORIGINS)


def get_database_uri() -> str:
    """Build the SQLAlchemy database URI from production or local env vars."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    required = ("PGUSER", "PGPASSWORD", "PGHOST")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise RuntimeError(
            "Missing required database environment variables: " + ", ".join(missing)
        )

    return (
        f"postgresql://{os.getenv('PGUSER')}:{os.getenv('PGPASSWORD')}"
        f"@{os.getenv('PGHOST')}/neondb?sslmode=require"
    )


def validate_required_config() -> None:
    """Fail fast when release-critical auth/email settings are missing."""
    required = [
        "ACCESS_TOKEN_SECRET",
        "REFRESH_TOKEN_SECRET",
        "SMTP_SERVER",
        "SMTP_LOGIN",
        "SMTP_PASSWORD",
        "VERIFICATION_EMAIL",
        "GQL_URL",
        "SIGN_IN_W_GOOGLE_CLIENT_ID",
        "SIGN_IN_W_GOOGLE_CLIENT_SECRET",
    ]
    missing = [key for key in required if not os.getenv(key)]

    if not os.getenv("DATABASE_URL"):
        missing.extend(
            key for key in ("PGUSER", "PGPASSWORD", "PGHOST") if not os.getenv(key)
        )

    if missing:
        raise RuntimeError(
            "Missing required environment variables: " + ", ".join(sorted(set(missing)))
        )
