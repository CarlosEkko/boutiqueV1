"""
OTC Tier Policies — per-tier service-model matrix.

Each client tier (Standard / Premium / VIP / Institutional) has a policy
document describing:
  • white_glove_enabled      — can the client use the CRM/human flow?
  • instant_firm_enabled     — can the client get a live desk quote?
  • instant_max_usdt         — hard cap on instant RFQ notional (USDT)
  • auto_execute_enabled     — may the client execute without trader approval?
  • auto_execute_max_usdt    — cap for auto-execution (must be ≤ instant_max)

Policies are stored in the `otc_tier_policies` collection keyed by tier id,
auto-seeded on first service start.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict

from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/otc-policies", tags=["otc-policies"])

_db = None


def set_db(database):
    global _db
    _db = database


# ---------------------------------------------------------------------------
# Defaults (match matrix approved by product)
# ---------------------------------------------------------------------------
TIERS = ["standard", "premium", "vip", "institutional"]

DEFAULT_POLICIES: Dict[str, Dict[str, Any]] = {
    "standard": {
        "tier": "standard",
        "white_glove_enabled": True,
        "instant_firm_enabled": False,
        "instant_max_usdt": 0.0,
        "auto_execute_enabled": False,
        "auto_execute_max_usdt": 0.0,
    },
    "premium": {
        "tier": "premium",
        "white_glove_enabled": True,
        "instant_firm_enabled": True,
        "instant_max_usdt": 100_000.0,
        "auto_execute_enabled": False,
        "auto_execute_max_usdt": 0.0,
    },
    "vip": {
        "tier": "vip",
        "white_glove_enabled": True,
        "instant_firm_enabled": True,
        "instant_max_usdt": 500_000.0,
        "auto_execute_enabled": True,
        "auto_execute_max_usdt": 250_000.0,
    },
    "institutional": {
        "tier": "institutional",
        "white_glove_enabled": True,
        "instant_firm_enabled": True,
        "instant_max_usdt": 2_000_000.0,
        "auto_execute_enabled": True,
        "auto_execute_max_usdt": 1_000_000.0,
    },
}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class PolicyPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    white_glove_enabled: Optional[bool] = None
    instant_firm_enabled: Optional[bool] = None
    instant_max_usdt: Optional[float] = Field(None, ge=0)
    auto_execute_enabled: Optional[bool] = None
    auto_execute_max_usdt: Optional[float] = Field(None, ge=0)


class CheckRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tier: str
    size_usdt: float = Field(..., ge=0)


# ---------------------------------------------------------------------------
# Perms
# ---------------------------------------------------------------------------
async def _require_admin(current_user=Depends(get_current_user)) -> dict:
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    cu = current_user.dict() if hasattr(current_user, "dict") else dict(current_user)
    if cu.get("is_admin") or cu.get("internal_role") in ("admin", "global_manager"):
        return cu
    raise HTTPException(status_code=403, detail="Admin required")


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------
async def _ensure_seeded() -> None:
    if _db is None:
        return
    try:
        count = await _db.otc_tier_policies.count_documents({})
        if count == 0:
            docs = [{**p, "_id": p["tier"], "updated_ms": int(time.time() * 1000)}
                    for p in DEFAULT_POLICIES.values()]
            await _db.otc_tier_policies.insert_many(docs)
            logger.info("Seeded %d tier policies", len(docs))
    except Exception as e:
        logger.warning("Policy seed failed: %s", e)


async def get_policy(tier: str) -> Dict[str, Any]:
    await _ensure_seeded()
    tier = (tier or "standard").lower()
    if _db is not None:
        doc = await _db.otc_tier_policies.find_one({"_id": tier}, {"_id": 0})
        if doc:
            return doc
    return dict(DEFAULT_POLICIES.get(tier, DEFAULT_POLICIES["standard"]))


def check_mode(policy: Dict[str, Any], mode: str, size_usdt: float) -> Dict[str, Any]:
    """Returns {allowed: bool, reason: str | None, suggested_mode: str | None}."""
    if mode == "white_glove":
        if not policy.get("white_glove_enabled"):
            return {"allowed": False, "reason": "White-Glove service is not enabled for your tier.", "suggested_mode": None}
        return {"allowed": True, "reason": None, "suggested_mode": None}
    if mode == "instant":
        if not policy.get("instant_firm_enabled"):
            return {
                "allowed": False,
                "reason": "Instant firm quotes are not available for your tier. Please request a white-glove quote.",
                "suggested_mode": "white_glove",
            }
        cap = float(policy.get("instant_max_usdt") or 0.0)
        if size_usdt > cap:
            return {
                "allowed": False,
                "reason": f"This notional exceeds the instant limit for your tier ({cap:,.0f} USDT). Please request a white-glove quote.",
                "suggested_mode": "white_glove",
            }
        return {"allowed": True, "reason": None, "suggested_mode": None}
    return {"allowed": False, "reason": f"Unknown mode: {mode}", "suggested_mode": None}


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------
@router.get("")
async def list_policies(user: dict = Depends(_require_admin)):
    await _ensure_seeded()
    if _db is None:
        return {"policies": list(DEFAULT_POLICIES.values())}
    cursor = _db.otc_tier_policies.find({}, {"_id": 0})
    rows: List[Dict[str, Any]] = [r async for r in cursor]
    return {"policies": rows}


@router.put("/{tier}")
async def update_policy(tier: str, body: PolicyPatch, user: dict = Depends(_require_admin)):
    tier = tier.lower()
    if tier not in TIERS:
        raise HTTPException(status_code=400, detail=f"Unknown tier: {tier}")
    await _ensure_seeded()
    patch = {k: v for k, v in body.dict().items() if v is not None}
    # Guard: auto_execute_max must be <= instant_max
    current = await get_policy(tier)
    merged = {**current, **patch}
    if merged.get("auto_execute_max_usdt", 0) > merged.get("instant_max_usdt", 0):
        raise HTTPException(
            status_code=400,
            detail="auto_execute_max_usdt cannot exceed instant_max_usdt",
        )
    if _db is not None:
        patch["updated_ms"] = int(time.time() * 1000)
        patch["updated_by"] = user.get("id")
        await _db.otc_tier_policies.update_one(
            {"_id": tier}, {"$set": patch}, upsert=True,
        )
    logger.info("Tier policy updated (%s) by %s: %s", tier, user.get("email"), patch)
    return {"ok": True, "policy": await get_policy(tier)}


# ---------------------------------------------------------------------------
# Public (authenticated) — client uses this to know which buttons to show
# ---------------------------------------------------------------------------
@router.post("/check")
async def check_policy(body: CheckRequest, current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    pol = await get_policy(body.tier)
    return {
        "tier": pol.get("tier"),
        "modes": {
            "white_glove": check_mode(pol, "white_glove", body.size_usdt),
            "instant":     check_mode(pol, "instant", body.size_usdt),
        },
        "policy": pol,
    }
