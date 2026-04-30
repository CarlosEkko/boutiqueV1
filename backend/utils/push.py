"""Shared Expo push notification helper.

Call `send_push_to_user(db, user_id, title, body, data)` from any route to push
to all active devices registered for that user.
"""
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_to_user(
    db,
    user_id: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """Best-effort push to every active token of a user. Returns tokens_sent count."""
    if not user_id or db is None:
        return 0
    try:
        tokens_cursor = db.push_tokens.find(
            {"user_id": user_id, "active": True},
            {"_id": 0, "token": 1},
        )
        tokens = [t["token"] async for t in tokens_cursor]
    except Exception as exc:
        logger.warning("push: failed to query tokens for %s: %s", user_id, exc)
        return 0

    if not tokens:
        return 0

    messages = [
        {
            "to": tok,
            "title": title,
            "body": body,
            "sound": "default",
            "data": data or {},
            "priority": "high",
        }
        for tok in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(EXPO_PUSH_URL, json=messages)
            if resp.status_code >= 400:
                logger.warning("Expo push: %s %s", resp.status_code, resp.text[:200])
                return 0
    except Exception as exc:
        logger.warning("Expo push send failed for %s: %s", user_id, exc)
        return 0

    return len(tokens)
