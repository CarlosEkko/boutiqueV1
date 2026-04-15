"""
Cloudflare Turnstile verification utility
"""
import os
import httpx
import logging

logger = logging.getLogger(__name__)

TURNSTILE_SECRET = os.environ.get("TURNSTILE_SECRET_KEY", "")
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile(token: str, remote_ip: str = None) -> bool:
    """Verify a Cloudflare Turnstile token. Returns True if valid."""
    if not TURNSTILE_SECRET:
        logger.warning("TURNSTILE_SECRET_KEY not configured — skipping verification")
        return True

    if not token:
        return False

    payload = {"secret": TURNSTILE_SECRET, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(TURNSTILE_VERIFY_URL, data=payload)
            data = resp.json()
            success = data.get("success", False)
            if not success:
                logger.warning(f"Turnstile verification failed: {data.get('error-codes', [])}")
            return success
    except Exception as e:
        logger.error(f"Turnstile verification error: {e}")
        return False
