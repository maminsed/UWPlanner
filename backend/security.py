"""Request security helpers."""

from urllib.parse import urlparse

from flask import current_app, request
from flask.typing import ResponseReturnValue

from .responses import api_error


def _origin_from_referer(referer: str | None) -> str | None:
    """Extract an origin from a Referer header value."""
    if not referer:
        return None
    parsed = urlparse(referer)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def require_trusted_origin() -> ResponseReturnValue | None:
    """Reject cookie-authenticated browser requests from untrusted origins."""
    request_origin = request.headers.get("Origin") or _origin_from_referer(
        request.headers.get("Referer")
    )
    if not request_origin:
        return api_error("Missing request origin", 403, "MISSING_ORIGIN")

    allowed_origins = current_app.config.get("FRONTEND_ORIGINS", [])
    if request_origin.rstrip("/") not in allowed_origins:
        return api_error("Request origin is not allowed", 403, "ORIGIN_NOT_ALLOWED")

    return None
