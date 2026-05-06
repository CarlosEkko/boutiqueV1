"""
OTC Desk routes — thin HTTP layer over `services.otc_desk_engine`.

Access control
  • All endpoints require an authenticated user.
  • RFQ + Execute + Reset require staff with `otc_desk` department (or admin /
    global_manager). Mirrors the sidebar guard used by the frontend.
  • State + PnL series are readable by any staff member with OTC desk access.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
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
async def post_reset(user: dict = Depends(_require_staff)):
    """Reset inventory, PnL, hedge feed and equity curve. Admin-tier action."""
    if not (user.get("is_admin") or user.get("internal_role") in ("admin", "global_manager")):
        raise HTTPException(status_code=403, detail="Admin required to reset desk")
    await get_engine().reset()
    return {"ok": True}
