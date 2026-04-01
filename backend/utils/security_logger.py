"""
Security Events Logger - Logs security events to MongoDB for the Security Dashboard
"""
import logging
from datetime import datetime, timezone
from typing import Optional
import uuid

logger = logging.getLogger(__name__)

db = None

def set_db(database):
    global db
    db = database


async def log_security_event(
    event_type: str,
    client_ip: str,
    endpoint: str,
    details: Optional[dict] = None,
    email: Optional[str] = None,
    severity: str = "medium"
):
    """
    Log a security event to MongoDB.
    """
    if db is None:
        logger.warning("Security logger DB not initialized")
        return

    event = {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "client_ip": client_ip,
        "endpoint": endpoint,
        "email": email,
        "details": details or {},
        "severity": severity,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    try:
        await db.security_events.insert_one(event)
        logger.info(f"Security event logged: {event_type} from {client_ip}")
    except Exception as e:
        logger.error(f"Failed to log security event: {e}")


async def is_ip_blacklisted(ip: str) -> bool:
    """Check if an IP is in the blacklist."""
    if db is None:
        return False
    try:
        entry = await db.ip_blacklist.find_one({"ip": ip, "active": True}, {"_id": 0})
        return entry is not None
    except Exception:
        return False
