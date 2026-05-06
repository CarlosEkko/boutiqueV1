"""
OTC Desk routes — thin HTTP layer over `services.otc_desk_engine`.

Access control
  • All endpoints require an authenticated user.
  • RFQ + Execute require staff with `otc_desk` department (or admin /
    global_manager). Mirrors the sidebar guard used by the frontend.
  • State + PnL series are readable by any staff member with OTC desk access.
  • /admin/* endpoints require admin / global_manager (no otc_desk-only access).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict

from routes.auth import get_current_user
from services.otc_desk_engine import get_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/otc-desk", tags=["otc-desk"])

_db = None


def set_db(database):
    global _db
    _db = database
    get_engine().set_db(database)


# ---------------------------------------------------------------------------
# Permission helpers
# ---------------------------------------------------------------------------
async def _require_staff(current_user=Depends(get_current_user)) -> dict:
    """Allow admin, global_manager, or any staff with otc_desk / admin in departments."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # current_user is a Pydantic UserResponse — coerce to plain dict for downstream use.
    cu = current_user.dict() if hasattr(current_user, "dict") else dict(current_user)

    if cu.get("is_admin") or cu.get("internal_role") in ("admin", "global_manager"):
        return cu

    # Check user_permissions collection
    try:
        if _db is not None:
            perm = await _db.user_permissions.find_one(
                {"user_id": cu["id"]}, {"_id": 0, "departments": 1}
            )
            depts = set((perm or {}).get("departments") or [])
            if {"otc_desk", "admin"} & depts:
                return cu
    except Exception as e:
        logger.warning("perm lookup failed: %s", e)

    raise HTTPException(status_code=403, detail="OTC Desk access required")


async def _require_admin(current_user=Depends(get_current_user)) -> dict:
    """Admin-only gate for desk configuration + reset."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cu = current_user.dict() if hasattr(current_user, "dict") else dict(current_user)
    if cu.get("is_admin") or cu.get("internal_role") in ("admin", "global_manager"):
        return cu
    raise HTTPException(status_code=403, detail="Admin required")


# ---------------------------------------------------------------------------
# Pydantic models — request / response wire shapes
# ---------------------------------------------------------------------------
class RFQRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    symbol: str = Field(..., description="Base asset symbol (e.g., BTC)")
    size: float = Field(..., gt=0, description="Size in base asset units")
    side: str = Field(..., pattern="^(buy|sell)$")


class ExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    quote_id: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/rfq")
async def post_rfq(body: RFQRequest, user: dict = Depends(_require_staff)):
    """Emit a firm quote. Valid for `quote_ttl_ms` (default 15 s)."""
    try:
        q = get_engine().build_quote(body.symbol.upper(), body.size, body.side)
        return {"ok": True, "quote": q.__dict__}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/execute")
async def post_execute(body: ExecuteRequest, user: dict = Depends(_require_staff)):
    """Execute an outstanding firm quote. Triggers simulated hedge asynchronously."""
    try:
        res = await get_engine().execute(body.quote_id, user_id=user["id"])
        return {"ok": True, **res}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/state")
async def get_state(user: dict = Depends(_require_staff)):
    """Full desk snapshot — suitable for 2 s polling by the UI."""
    return get_engine().snapshot()


@router.get("/pnl-series")
async def get_pnl_series(user: dict = Depends(_require_staff)):
    """Equity curve time series (last ~300 samples, 2 s cadence)."""
    return {"series": get_engine().pnl_series()}


@router.post("/reset")
async def post_reset(user: dict = Depends(_require_admin)):
    """Reset inventory, PnL, hedge feed and equity curve. Admin-tier action."""
    await get_engine().reset()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin — desk configuration (assets + pricing + risk)
# ---------------------------------------------------------------------------
class PricingPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    base_margin_bps: Optional[float] = Field(None, ge=0, le=1000)
    vol_factor: Optional[float] = Field(None, ge=0, le=10)
    quote_ttl_ms: Optional[int] = Field(None, ge=1000, le=120_000)
    hedge_latency_ms: Optional[int] = Field(None, ge=0, le=60_000)


class RiskPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    daily_loss_limit_usdt: Optional[float] = Field(None, ge=0)
    auto_widen_enabled: Optional[bool] = None
    auto_widen_trigger_pct: Optional[float] = Field(None, ge=0, le=200)
    auto_widen_multiplier: Optional[float] = Field(None, ge=1, le=20)


class AssetUpsert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    symbol: str
    quote: Optional[str] = "USDT"
    seed: Optional[float] = None
    liquidity: Optional[float] = Field(None, gt=0)
    inv_factor: Optional[float] = Field(None, ge=0, le=1)
    max_inventory: Optional[float] = Field(None, ge=0)
    max_notional_usdt: Optional[float] = Field(None, ge=0)


@router.get("/admin/config")
async def admin_get_config(user: dict = Depends(_require_admin)):
    return get_engine().config_snapshot()


@router.put("/admin/config/pricing")
async def admin_update_pricing(body: PricingPatch, user: dict = Depends(_require_admin)):
    updated = await get_engine().update_pricing(body.dict(exclude_none=True))
    return {"ok": True, "pricing": updated}


@router.put("/admin/config/risk")
async def admin_update_risk(body: RiskPatch, user: dict = Depends(_require_admin)):
    updated = await get_engine().update_risk(body.dict(exclude_none=True))
    return {"ok": True, "risk": updated}


@router.post("/admin/assets")
async def admin_upsert_asset(body: AssetUpsert, user: dict = Depends(_require_admin)):
    try:
        row = await get_engine().upsert_asset(body.dict(exclude_none=True))
        return {"ok": True, "asset": row}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/assets/{symbol}")
async def admin_remove_asset(symbol: str, user: dict = Depends(_require_admin)):
    try:
        await get_engine().remove_asset(symbol)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/trades")
async def admin_list_trades(
    user: dict = Depends(_require_admin),
    limit: int = Query(100, ge=1, le=500),
    symbol: Optional[str] = Query(None),
):
    if _db is None:
        return {"trades": []}
    query: Dict[str, Any] = {}
    if symbol:
        query["symbol"] = symbol.upper()
    cursor = _db.otc_desk_trades.find(query, {"_id": 0}).sort("ts", -1).limit(limit)
    rows: List[Dict[str, Any]] = [r async for r in cursor]
    return {"trades": rows, "count": len(rows)}


@router.get("/admin/stats")
async def admin_stats(user: dict = Depends(_require_admin)):
    """Aggregate trade + hedge metrics over 24h and 7d windows."""
    import time as _t
    now_ms = int(_t.time() * 1000)
    day_ms = 86_400_000
    windows = {"d1": now_ms - day_ms, "d7": now_ms - 7 * day_ms}

    result: Dict[str, Any] = {}
    engine = get_engine()

    if _db is not None:
        for label, since in windows.items():
            # Volume + PnL per symbol via aggregation
            pipeline = [
                {"$match": {"ts": {"$gte": since}}},
                {"$group": {
                    "_id": "$symbol",
                    "count": {"$sum": 1},
                    "volume_usdt": {"$sum": "$notional"},
                    "spread_capture": {"$sum": "$spread_capture"},
                    "avg_spread_bps": {"$avg": "$spread_bps"},
                }},
            ]
            by_symbol: List[Dict[str, Any]] = []
            async for row in _db.otc_desk_trades.aggregate(pipeline):
                by_symbol.append({
                    "symbol": row["_id"],
                    "count": row.get("count", 0),
                    "volume_usdt": round(row.get("volume_usdt", 0.0) or 0.0, 2),
                    "spread_capture": round(row.get("spread_capture", 0.0) or 0.0, 2),
                    "avg_spread_bps": round(row.get("avg_spread_bps", 0.0) or 0.0, 2),
                })
            totals = {
                "trades": sum(r["count"] for r in by_symbol),
                "volume_usdt": round(sum(r["volume_usdt"] for r in by_symbol), 2),
                "spread_capture": round(sum(r["spread_capture"] for r in by_symbol), 2),
            }
            # Hedge slippage cost
            hedge_pipeline = [
                {"$match": {"ts": {"$gte": since}}},
                {"$group": {
                    "_id": None,
                    "hedge_count": {"$sum": 1},
                    "slippage_cost": {"$sum": "$slippage_cost"},
                    "avg_slippage_bps": {"$avg": "$slippage_bps"},
                }},
            ]
            hedges: Dict[str, Any] = {"hedge_count": 0, "slippage_cost": 0.0, "avg_slippage_bps": 0.0}
            async for row in _db.otc_desk_hedge_fills.aggregate(hedge_pipeline):
                hedges = {
                    "hedge_count": row.get("hedge_count", 0),
                    "slippage_cost": round(row.get("slippage_cost", 0.0) or 0.0, 2),
                    "avg_slippage_bps": round(row.get("avg_slippage_bps", 0.0) or 0.0, 2),
                }
            result[label] = {"by_symbol": by_symbol, "totals": totals, "hedges": hedges}
    else:
        result = {"d1": {"by_symbol": [], "totals": {}, "hedges": {}}, "d7": {"by_symbol": [], "totals": {}, "hedges": {}}}

    # Current live inventory + PnL for the header
    snap = engine.snapshot()
    result["live"] = {
        "cash_pnl": snap["cash_pnl"],
        "unrealized_pnl": snap["unrealized_pnl"],
        "total_pnl": snap["total_pnl"],
        "daily_pnl": snap.get("daily_pnl", 0.0),
        "daily_loss_limit_usdt": snap.get("daily_loss_limit_usdt", 0.0),
        "active_quotes": len(snap.get("active_quotes") or []),
        "inventory": snap["inventory"],
    }
    return result
