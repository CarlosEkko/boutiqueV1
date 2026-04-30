"""
Public system status endpoint.

Returns a health snapshot suitable for a public /status page (à la Stripe,
Fireblocks). Each sub-system is individually probed and classified as
`operational` / `degraded` / `outage`. The endpoint itself never raises — the
page is what clients check when things are on fire.
"""
from __future__ import annotations
import os
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List

import httpx
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/status", tags=["Public Status"])

db = None


def set_db(database):
    global db
    db = database


# --- helpers ---
async def _probe_mongo() -> Dict:
    t0 = time.perf_counter()
    try:
        if db is None:
            raise RuntimeError("db not initialised")
        await db.command("ping")
        latency = round((time.perf_counter() - t0) * 1000, 1)
        return {"status": "operational" if latency < 500 else "degraded", "latency_ms": latency}
    except Exception as e:
        logger.warning(f"status: mongo probe failed — {e}")
        return {"status": "outage", "error": str(e)[:200]}


async def _probe_url(url: str, timeout: float = 4.0) -> Dict:
    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url)
        latency = round((time.perf_counter() - t0) * 1000, 1)
        if r.status_code >= 500:
            return {"status": "outage", "http": r.status_code, "latency_ms": latency}
        if r.status_code >= 400 or latency > 2500:
            return {"status": "degraded", "http": r.status_code, "latency_ms": latency}
        return {"status": "operational", "http": r.status_code, "latency_ms": latency}
    except Exception as e:
        return {"status": "outage", "error": str(e)[:200]}


async def _probe_stripe() -> Dict:
    """Reachability probe for Stripe API. Unauthenticated call to /v1/ returns
    401 — we treat any 2xx/4xx (network reachable) as operational, and only
    5xx / network errors as degraded."""
    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get("https://api.stripe.com/v1/")
        latency = round((time.perf_counter() - t0) * 1000, 1)
        if r.status_code >= 500:
            return {"status": "outage", "http": r.status_code, "latency_ms": latency}
        # 200/401 both mean Stripe is up (401 = no auth provided, which is fine)
        return {"status": "operational" if latency < 2000 else "degraded",
                "http": r.status_code, "latency_ms": latency}
    except Exception as e:
        return {"status": "degraded", "error": str(e)[:200]}


async def _recent_incidents() -> List[Dict]:
    """Pull last 30 days of incidents from the `status_incidents` collection if
    it exists; empty list otherwise. Admins can post incidents via the admin
    panel (future UI). Schema: {id, title, severity, started_at, resolved_at,
    updates: [{ts, message}], affected_components: [..]}"""
    if db is None:
        return []
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        docs = (
            await db.status_incidents.find(
                {"started_at": {"$gte": cutoff}},
                {"_id": 0},
            )
            .sort("started_at", -1)
            .limit(30)
            .to_list(30)
        )
        return docs or []
    except Exception as e:
        logger.warning(f"status: incidents query failed — {e}")
        return []


# --- routes ---
@router.get("/health")
async def public_health():
    """Overall health + per-component snapshot. Public (no auth)."""
    mongo = await _probe_mongo()
    # Third-party probes — all fire-and-forget; failure = degraded, not fatal.
    binance = await _probe_url("https://api.binance.com/api/v3/ping")
    stripe = await _probe_stripe()

    components: Dict[str, Dict] = {
        "api": {"status": "operational", "description": "KBEX REST API"},
        "database": {**mongo, "description": "MongoDB cluster"},
        "market_data": {**binance, "description": "Binance market feed"},
        "payments": {**stripe, "description": "Stripe checkout gateway"},
        "authentication": {"status": "operational", "description": "JWT / session"},
        "trading_engine": {"status": "operational", "description": "Trading & OTC"},
        "kyc": {"status": "operational", "description": "Sumsub KYC / KYB"},
        "email": {
            "status": "operational" if os.environ.get("BREVO_API_KEY") else "degraded",
            "description": "Brevo transactional email",
        },
    }

    # Roll-up: worst-of
    worst = "operational"
    for c in components.values():
        if c.get("status") == "outage":
            worst = "outage"
            break
        if c.get("status") == "degraded":
            worst = "degraded"

    return {
        "overall": worst,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "components": components,
        "incidents": await _recent_incidents(),
    }
