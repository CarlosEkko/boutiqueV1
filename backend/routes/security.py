"""
Security Dashboard Routes — KPIs, Events, Activity Charts, IP Blacklist
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
import logging

from routes.admin import get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/security", tags=["Security Dashboard"])

db = None

def set_db(database):
    global db
    db = database


class BlacklistRequest(BaseModel):
    ip: str
    reason: str = ""
    duration_hours: Optional[int] = None  # None = permanent


@router.get("/dashboard")
async def get_security_dashboard(
    period: str = Query("24h", regex="^(24h|7d|30d)$"),
    admin=Depends(get_admin_user)
):
    """Get security KPIs for the dashboard."""
    now = datetime.now(timezone.utc)
    if period == "24h":
        since = now - timedelta(hours=24)
    elif period == "7d":
        since = now - timedelta(days=7)
    else:
        since = now - timedelta(days=30)

    since_iso = since.isoformat()

    pipeline_base = {"timestamp": {"$gte": since_iso}}

    # Count events by type
    event_types = ["failed_login", "rate_limit", "turnstile_rejected", "blacklist_blocked"]
    counts = {}
    for et in event_types:
        counts[et] = await db.security_events.count_documents({**pipeline_base, "event_type": et})

    total_events = sum(counts.values())

    # Count by severity
    severity_counts = {}
    for sev in ["low", "medium", "high", "critical"]:
        severity_counts[sev] = await db.security_events.count_documents({**pipeline_base, "severity": sev})

    # Unique IPs with events
    unique_ips_pipeline = [
        {"$match": pipeline_base},
        {"$group": {"_id": "$client_ip"}},
        {"$count": "total"}
    ]
    unique_ips_result = await db.security_events.aggregate(unique_ips_pipeline).to_list(1)
    unique_ips = unique_ips_result[0]["total"] if unique_ips_result else 0

    # Active blacklist count
    blacklist_count = await db.ip_blacklist.count_documents({"active": True})

    return {
        "period": period,
        "total_events": total_events,
        "by_type": counts,
        "by_severity": severity_counts,
        "unique_suspicious_ips": unique_ips,
        "active_blacklist": blacklist_count,
    }


@router.get("/events")
async def get_security_events(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    ip: Optional[str] = None,
    period: str = Query("24h", regex="^(24h|7d|30d|all)$"),
    admin=Depends(get_admin_user)
):
    """Get paginated security events with filters."""
    query = {}

    if period != "all":
        now = datetime.now(timezone.utc)
        if period == "24h":
            since = now - timedelta(hours=24)
        elif period == "7d":
            since = now - timedelta(days=7)
        else:
            since = now - timedelta(days=30)
        query["timestamp"] = {"$gte": since.isoformat()}

    if event_type:
        query["event_type"] = event_type
    if severity:
        query["severity"] = severity
    if ip:
        query["client_ip"] = {"$regex": ip, "$options": "i"}

    total = await db.security_events.count_documents(query)
    skip = (page - 1) * limit

    events = await db.security_events.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "events": events,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 1,
    }


@router.get("/activity")
async def get_security_activity(
    period: str = Query("24h", regex="^(24h|7d|30d)$"),
    admin=Depends(get_admin_user)
):
    """Get hourly/daily activity data for charts."""
    now = datetime.now(timezone.utc)

    if period == "24h":
        since = now - timedelta(hours=24)
        # Group by hour
        hours = []
        for i in range(24):
            hour_start = since + timedelta(hours=i)
            hour_end = hour_start + timedelta(hours=1)
            count = await db.security_events.count_documents({
                "timestamp": {"$gte": hour_start.isoformat(), "$lt": hour_end.isoformat()}
            })
            hours.append({
                "label": hour_start.strftime("%H:00"),
                "count": count,
                "timestamp": hour_start.isoformat()
            })
        return {"data": hours, "group_by": "hour"}
    else:
        days_count = 7 if period == "7d" else 30
        since = now - timedelta(days=days_count)
        days = []
        for i in range(days_count):
            day_start = since + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            count = await db.security_events.count_documents({
                "timestamp": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
            })
            days.append({
                "label": day_start.strftime("%d/%m"),
                "count": count,
                "timestamp": day_start.isoformat()
            })
        return {"data": days, "group_by": "day"}


@router.get("/top-ips")
async def get_top_suspicious_ips(
    period: str = Query("24h", regex="^(24h|7d|30d)$"),
    limit: int = Query(10, ge=1, le=50),
    admin=Depends(get_admin_user)
):
    """Get top IPs with most security events."""
    now = datetime.now(timezone.utc)
    if period == "24h":
        since = now - timedelta(hours=24)
    elif period == "7d":
        since = now - timedelta(days=7)
    else:
        since = now - timedelta(days=30)

    pipeline = [
        {"$match": {"timestamp": {"$gte": since.isoformat()}}},
        {"$group": {
            "_id": "$client_ip",
            "total_events": {"$sum": 1},
            "event_types": {"$addToSet": "$event_type"},
            "last_event": {"$max": "$timestamp"},
            "emails_targeted": {"$addToSet": "$email"}
        }},
        {"$sort": {"total_events": -1}},
        {"$limit": limit}
    ]

    results = await db.security_events.aggregate(pipeline).to_list(limit)

    top_ips = []
    for r in results:
        # Check if blacklisted
        is_blocked = await db.ip_blacklist.find_one(
            {"ip": r["_id"], "active": True}, {"_id": 0}
        )
        emails = [e for e in r.get("emails_targeted", []) if e]
        top_ips.append({
            "ip": r["_id"],
            "total_events": r["total_events"],
            "event_types": r["event_types"],
            "last_event": r["last_event"],
            "emails_targeted": emails[:5],
            "is_blacklisted": is_blocked is not None,
        })

    return top_ips


@router.get("/blacklist")
async def get_blacklist(admin=Depends(get_admin_user)):
    """Get all blacklisted IPs."""
    entries = await db.ip_blacklist.find(
        {"active": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return entries


@router.post("/blacklist")
async def add_to_blacklist(data: BlacklistRequest, admin=Depends(get_admin_user)):
    """Add an IP to the blacklist."""
    existing = await db.ip_blacklist.find_one({"ip": data.ip, "active": True})
    if existing:
        raise HTTPException(status_code=400, detail="IP já está na blacklist")

    now = datetime.now(timezone.utc)
    entry = {
        "ip": data.ip,
        "reason": data.reason,
        "active": True,
        "created_at": now.isoformat(),
        "created_by": admin.get("email", "admin"),
        "expires_at": (now + timedelta(hours=data.duration_hours)).isoformat() if data.duration_hours else None,
    }

    await db.ip_blacklist.insert_one(entry)

    from utils.security_logger import log_security_event
    await log_security_event(
        event_type="ip_blacklisted",
        client_ip=data.ip,
        endpoint="/api/security/blacklist",
        details={"reason": data.reason, "by": admin.get("email")},
        severity="high"
    )

    return {"success": True, "message": f"IP {data.ip} adicionado à blacklist"}


@router.delete("/blacklist/{ip}")
async def remove_from_blacklist(ip: str, admin=Depends(get_admin_user)):
    """Remove an IP from the blacklist."""
    result = await db.ip_blacklist.update_many(
        {"ip": ip, "active": True},
        {"$set": {"active": False, "removed_at": datetime.now(timezone.utc).isoformat(), "removed_by": admin.get("email", "admin")}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="IP não encontrado na blacklist")

    return {"success": True, "message": f"IP {ip} removido da blacklist"}
