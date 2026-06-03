"""Small in-memory rate limiter for sensitive auth endpoints."""

from collections import defaultdict, deque
from collections.abc import Callable
from time import time

from flask import request
from flask.typing import ResponseReturnValue

from .responses import api_error

_buckets: dict[str, deque[float]] = defaultdict(deque)


def client_ip() -> str:
    """Return the best available request IP for rate limiting."""
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.remote_addr or "unknown"


def normalized_json_value(*keys: str) -> str:
    """Return a lower-cased JSON value for account-specific rate-limit keys."""
    payload = request.get_json(silent=True) or {}
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip().lower()
    return "missing"


def enforce_rate_limits(
    *rules: tuple[str, int, int, Callable[[], str]],
) -> ResponseReturnValue | None:
    """Apply route-specific rate-limit rules.

    Each rule is `(name, max_requests, window_seconds, key_func)`.
    """
    now = time()

    for name, max_requests, window_seconds, key_func in rules:
        key = f"{name}:{key_func()}"
        bucket = _buckets[key]

        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()

        if len(bucket) >= max_requests:
            return api_error(
                "Too many requests. Please try again later.", 429, "RATE_LIMITED"
            )

    for name, _, _, key_func in rules:
        _buckets[f"{name}:{key_func()}"].append(now)

    return None
