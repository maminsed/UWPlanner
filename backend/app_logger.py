"""Print-backed app logger with request context."""

import traceback
from datetime import datetime, timezone

from flask import g, has_request_context, request

SENSITIVE_KEYS = ("token", "password", "secret", "html", "code")


def _redact_context(context: dict[str, object]) -> dict[str, object]:
    """Redact sensitive context values before printing logs."""
    redacted = {}
    for key, value in context.items():
        if any(sensitive in key.lower() for sensitive in SENSITIVE_KEYS):
            redacted[key] = "[redacted]"
        else:
            redacted[key] = value
    return redacted


class AppLogger:
    """Small logger facade that can later be connected to external monitoring."""

    def _emit(self, level: str, message: str, **context: object) -> None:
        timestamp = datetime.now(timezone.utc).isoformat()
        parts = [f"[{timestamp}]", level.upper(), message]

        if has_request_context():
            request_id = getattr(g, "request_id", None)
            if request_id:
                parts.append(f"request_id={request_id}")
            parts.append(f"route={request.method} {request.path}")

        safe_context = _redact_context(context)
        if safe_context:
            parts.append(f"context={safe_context}")

        print(" | ".join(parts))  # noqa: T201

    def debug(self, message: str, **context: object) -> None:
        """Print a debug log line."""
        self._emit("debug", message, **context)

    def info(self, message: str, **context: object) -> None:
        """Print an info log line."""
        self._emit("info", message, **context)

    def warning(self, message: str, **context: object) -> None:
        """Print a warning log line."""
        self._emit("warning", message, **context)

    def error(self, message: str, **context: object) -> None:
        """Print an error log line."""
        self._emit("error", message, **context)

    def exception(self, message: str, **context: object) -> None:
        """Print an exception log line with traceback details."""
        self._emit("error", message, traceback=traceback.format_exc(), **context)


logger = AppLogger()
