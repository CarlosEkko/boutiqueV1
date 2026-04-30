"""Price Alerts — KBEX Mobile M4.1.

Lets users subscribe to crypto price thresholds. A background worker polls live
prices from CoinGecko (already used by `/api/trading/cryptos`) and pushes a
notification via Expo Push API the moment the threshold is crossed.

DB collection: `price_alerts`
  {
    id: str (uuid),
    user_id: str,
    asset: str,        # e.g. "BTC", "ETH"
    direction: "above" | "below",
    target_price: float,
    currency: str,     # "EUR" | "USD" | ...
    is_active: bool,
    created_at: iso,
    triggered_at: iso | None,
    triggered_price: float | None,
    note: str | None
  }
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime, timezone
import asyncio
import logging
import os
import uuid
import httpx

from utils.auth import get_current_user_id

router = APIRouter(prefix="/price-alerts", tags=["Price Alerts"])
logger = logging.getLogger(__name__)

db = None


def set_db(database):
    global db
    db = database


# --- Models ---

class CreateAlertRequest(BaseModel):
    asset: str = Field(..., min_length=2, max_length=10)
    direction: Literal["above", "below"]
    target_price: float = Field(..., gt=0)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    note: Optional[str] = Field(default=None, max_length=200)


class AlertResponse(BaseModel):
    id: str
    user_id: str
    asset: str
    direction: str
    target_price: float
    currency: str
    is_active: bool
    created_at: str
    triggered_at: Optional[str] = None
    triggered_price: Optional[float] = None
    note: Optional[str] = None


# --- Endpoints ---

@router.get("", response_model=List[AlertResponse])
async def list_my_alerts(
    user_id: str = Depends(get_current_user_id),
    include_triggered: bool = False,
):
    """List the authenticated user's price alerts (active by default)."""
    query = {"user_id": user_id}
    if not include_triggered:
        query["is_active"] = True

    cursor = db.price_alerts.find(query, {"_id": 0}).sort("created_at", -1)
    return [AlertResponse(**doc) async for doc in cursor]


@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    payload: CreateAlertRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new price alert for the authenticated user."""
    asset = payload.asset.upper()
    currency = payload.currency.upper()

    # Soft cap: 50 active alerts per user (defensive limit, generous for HNW clients).
    active_count = await db.price_alerts.count_documents(
        {"user_id": user_id, "is_active": True}
    )
    if active_count >= 50:
        raise HTTPException(status_code=400, detail="Maximum of 50 active alerts reached")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "asset": asset,
        "direction": payload.direction,
        "target_price": float(payload.target_price),
        "currency": currency,
        "is_active": True,
        "created_at": now,
        "triggered_at": None,
        "triggered_price": None,
        "note": payload.note,
    }
    await db.price_alerts.insert_one(doc)
    doc.pop("_id", None)
    return AlertResponse(**doc)


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Permanently delete an alert (only owner)."""
    result = await db.price_alerts.delete_one({"id": alert_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


@router.post("/{alert_id}/toggle", response_model=AlertResponse)
async def toggle_alert(
    alert_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Toggle is_active without losing history."""
    doc = await db.price_alerts.find_one({"id": alert_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Alert not found")
    new_active = not doc.get("is_active", True)
    await db.price_alerts.update_one(
        {"id": alert_id, "user_id": user_id},
        {"$set": {"is_active": new_active}},
    )
    doc["is_active"] = new_active
    return AlertResponse(**doc)


# --- Background worker ---

ALERT_POLL_INTERVAL_S = int(os.environ.get("PRICE_ALERT_INTERVAL_S", "60"))
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def _fetch_prices_for_assets(assets: List[str], currency: str = "EUR") -> dict:
    """Fetch current prices for a set of assets in the requested currency.

    Hits our own `/api/trading/cryptos` endpoint via HTTP — same prices the
    Markets tab shows, including KBEX spread. Anonymous calls return the
    standard tier which is the right behaviour for headline alerts.
    """
    if not assets:
        return {}
    base_url = os.environ.get("INTERNAL_BACKEND_URL", "http://localhost:8001")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{base_url}/api/trading/cryptos",
                params={"currency": currency, "product": "exchange"},
            )
            if resp.status_code >= 400:
                logger.warning("trading/cryptos returned %s: %s", resp.status_code, resp.text[:200])
                return {}
            rows = resp.json()
        return {
            r["symbol"].upper(): float(r["price"])
            for r in rows
            if isinstance(r, dict) and "symbol" in r and "price" in r
        }
    except Exception as exc:
        logger.warning("price_alerts: failed to fetch trading prices: %s", exc)
        return {}


async def _send_expo_push(tokens: List[str], title: str, body: str, data: dict) -> None:
    """Fan out a notification to a list of Expo push tokens. Best-effort, non-blocking."""
    if not tokens:
        return
    messages = [
        {
            "to": tok,
            "title": title,
            "body": body,
            "sound": "default",
            "data": data,
            "priority": "high",
        }
        for tok in tokens
    ]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(EXPO_PUSH_URL, json=messages)
            if resp.status_code >= 400:
                logger.warning("Expo push API returned %s: %s", resp.status_code, resp.text[:300])
    except Exception as exc:
        logger.warning("Expo push send failed: %s", exc)


async def _evaluate_alerts() -> dict:
    """Single pass through active alerts. Returns counters for observability."""
    if db is None:
        return {"checked": 0, "triggered": 0}

    active = await db.price_alerts.find({"is_active": True}, {"_id": 0}).to_list(2000)
    if not active:
        return {"checked": 0, "triggered": 0}

    # Group by currency to minimise pricing calls.
    by_currency: dict = {}
    for a in active:
        by_currency.setdefault(a["currency"], set()).add(a["asset"])

    price_lookup: dict = {}
    for ccy, assets in by_currency.items():
        prices = await _fetch_prices_for_assets(list(assets), currency=ccy)
        for sym, p in prices.items():
            price_lookup[(sym, ccy)] = p

    triggered = 0
    for alert in active:
        cur_price = price_lookup.get((alert["asset"], alert["currency"]))
        if cur_price is None:
            continue
        crossed = (
            (alert["direction"] == "above" and cur_price >= alert["target_price"])
            or (alert["direction"] == "below" and cur_price <= alert["target_price"])
        )
        if not crossed:
            continue

        now = datetime.now(timezone.utc).isoformat()
        # Atomic flip — guards against double-firing if multiple workers ever run.
        result = await db.price_alerts.update_one(
            {"id": alert["id"], "is_active": True},
            {"$set": {
                "is_active": False,
                "triggered_at": now,
                "triggered_price": cur_price,
            }},
        )
        if result.modified_count == 0:
            continue

        triggered += 1

        # Look up active push tokens for the user.
        tokens = await db.push_tokens.find(
            {"user_id": alert["user_id"], "active": True},
            {"_id": 0, "token": 1},
        ).to_list(20)
        token_strs = [t["token"] for t in tokens]

        direction_word = "≥" if alert["direction"] == "above" else "≤"
        title = f"KBEX · {alert['asset']} {direction_word} {alert['target_price']:.2f} {alert['currency']}"
        body = f"Preço atual: {cur_price:.2f} {alert['currency']}"
        if alert.get("note"):
            body = f"{alert['note']} — {body}"

        await _send_expo_push(
            token_strs,
            title=title,
            body=body,
            data={
                "type": "price_alert",
                "alert_id": alert["id"],
                "asset": alert["asset"],
                "price": cur_price,
            },
        )

    return {"checked": len(active), "triggered": triggered}


async def _alert_loop():
    """Background loop that runs `_evaluate_alerts` on a configurable interval."""
    logger.info("Price-alert worker started (interval=%ss)", ALERT_POLL_INTERVAL_S)
    while True:
        try:
            stats = await _evaluate_alerts()
            if stats.get("triggered"):
                logger.info("Price-alert pass: %s", stats)
        except Exception as exc:
            logger.exception("price_alerts loop error: %s", exc)
        await asyncio.sleep(ALERT_POLL_INTERVAL_S)


def start_alert_worker():
    """Schedule the background worker on the running event loop."""
    asyncio.create_task(_alert_loop())


# --- Admin / debug endpoint (no UI yet, useful for testing) ---

@router.post("/run-once")
async def run_once_endpoint(user_id: str = Depends(get_current_user_id)):
    """Trigger a single evaluation pass. Used in development / by admins."""
    # Restrict to admins to avoid abuse — reuse the user lookup.
    if db is None:
        raise HTTPException(status_code=503, detail="Database not ready")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "is_admin": 1})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    stats = await _evaluate_alerts()
    return {"success": True, "stats": stats}
