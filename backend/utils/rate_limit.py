"""
Rate Limiting utility - In-memory sliding window per IP
"""
import time
from collections import defaultdict
from fastapi import HTTPException, Request
import threading

_lock = threading.Lock()
_requests: dict = defaultdict(list)

# Cleanup old entries every 5 minutes
_last_cleanup = time.time()
CLEANUP_INTERVAL = 300


def _cleanup():
    global _last_cleanup
    now = time.time()
    if now - _last_cleanup < CLEANUP_INTERVAL:
        return
    _last_cleanup = now
    expired_keys = []
    for key, timestamps in _requests.items():
        _requests[key] = [t for t in timestamps if now - t < 120]
        if not _requests[key]:
            expired_keys.append(key)
    for key in expired_keys:
        del _requests[key]


def check_rate_limit(request: Request, max_requests: int = 10, window_seconds: int = 60):
    """
    Check rate limit for current request IP.
    Raises HTTP 429 if limit exceeded.
    """
    client_ip = getattr(request.state, 'client_ip', request.client.host if request.client else 'unknown')
    path = request.url.path
    key = f"{client_ip}:{path}"
    now = time.time()

    with _lock:
        _cleanup()
        # Remove expired timestamps
        _requests[key] = [t for t in _requests[key] if now - t < window_seconds]

        if len(_requests[key]) >= max_requests:
            raise HTTPException(
                status_code=429,
                detail=f"Demasiadas tentativas. Tente novamente em {window_seconds} segundos."
            )

        _requests[key].append(now)
