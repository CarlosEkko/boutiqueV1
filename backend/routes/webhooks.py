"""
Brevo Webhook Routes
Handles incoming email event notifications from Brevo
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db

WEBHOOK_SECRET = os.environ.get("BREVO_WEBHOOK_SECRET", "")

# Map Brevo event types to normalized names
EVENT_TYPE_MAP = {
    "request": "sent",
    "sent": "sent",
    "delivered": "delivered",
    "opened": "opened",
    "open": "opened",
    "click": "clicked",
    "hardBounce": "hard_bounce",
    "hard_bounce": "hard_bounce",
    "softBounce": "soft_bounce",
    "soft_bounce": "soft_bounce",
    "unsubscribed": "unsubscribed",
    "blocked": "blocked",
}


@router.post("/brevo")
async def handle_brevo_webhook(request: Request):
    """Receive and store email event notifications from Brevo"""
    database = get_db()
    if database is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("event")
    email = payload.get("email")

    if not event_type or not email:
        return {"status": "ignored", "reason": "missing event or email"}

    normalized_type = EVENT_TYPE_MAP.get(event_type, event_type)

    ts = payload.get("ts", payload.get("ts_event"))
    timestamp = datetime.fromtimestamp(ts, tz=timezone.utc) if ts else datetime.now(timezone.utc)

    event_doc = {
        "event_type": normalized_type,
        "email": email,
        "brevo_message_id": payload.get("message-id"),
        "subject": payload.get("subject"),
        "tag": payload.get("tag"),
        "timestamp": timestamp,
        "raw_data": payload,
        "processed_at": datetime.now(timezone.utc),
    }

    await database.email_events.insert_one(event_doc)
    logger.info(f"Stored email event: {normalized_type} for {email}")

    # Update contact engagement in CRM leads
    try:
        update_data = {
            f"email_tracking.last_{normalized_type}": timestamp,
            "email_tracking.last_event": normalized_type,
            "email_tracking.last_event_at": timestamp,
        }
        inc_data = {f"email_tracking.{normalized_type}_count": 1}

        await database.crm_leads.update_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}},
            {"$set": update_data, "$inc": inc_data}
        )
    except Exception as e:
        logger.warning(f"Failed to update CRM lead tracking for {email}: {e}")

    return {"status": "received"}


@router.get("/brevo/events/{email}")
async def get_email_events(email: str, limit: int = 50):
    """Get email tracking events for a contact"""
    database = get_db()
    if database is None:
        raise HTTPException(status_code=500, detail="Database not available")

    events = await database.email_events.find(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)

    # Get aggregated stats
    pipeline = [
        {"$match": {"email": {"$regex": f"^{email}$", "$options": "i"}}},
        {"$group": {
            "_id": "$event_type",
            "count": {"$sum": 1},
            "last": {"$max": "$timestamp"}
        }}
    ]
    stats = await database.email_events.aggregate(pipeline).to_list(length=20)

    stats_dict = {}
    for s in stats:
        stats_dict[s["_id"]] = {"count": s["count"], "last": s["last"].isoformat() if s["last"] else None}

    return {
        "email": email,
        "total_events": len(events),
        "stats": stats_dict,
        "events": [{
            "event_type": e.get("event_type"),
            "subject": e.get("subject"),
            "timestamp": e.get("timestamp").isoformat() if e.get("timestamp") else None,
            "tag": e.get("tag"),
        } for e in events]
    }


@router.post("/brevo/setup")
async def setup_brevo_webhooks(request: Request):
    """Setup Brevo webhooks to point to this server"""
    from services.email_service import email_service

    body = await request.json()
    webhook_url = body.get("webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="webhook_url is required")

    result = await email_service.setup_webhooks(webhook_url)
    return result
