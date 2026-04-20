"""
Billing & Renewals — Annual fee management, referral commission tracking, renewal automation.

Design:
- Admission Fee (one-time): charged once at onboarding. Existing module (`referrals.py`).
- Annual Fee (recurring): charged every year on the anniversary of activation. NEW.
- Commission split:
    - `admission_commission_percent` — paid to referrer on the initial admission payment
    - `annual_commission_percent` — paid to referrer on each annual renewal payment
- Automation:
    - Daily background job creates pending annual payments ~30 days before due date
    - Notifies client + admin
    - Flags / suspends clients who are past their grace period
- All billing payments unified in the existing `admission_payments` collection with
  `fee_type` ∈ {"admission", "annual"}.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime, timezone, timedelta
import asyncio
import logging
import os
import uuid

from utils.auth import get_current_user_id
from routes.admin import get_admin_user, get_internal_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["Billing & Renewals"])

db = None


def set_db(database):
    global db
    db = database


# ==================== MODELS ====================


class AnnualFeeConfig(BaseModel):
    """Recurring annual fee (distinct from one-time admission)."""
    broker_eur: float = Field(default=0.0, ge=0)
    standard_eur: float = Field(default=250.0, ge=0)
    premium_eur: float = Field(default=1000.0, ge=0)
    vip_eur: float = Field(default=5000.0, ge=0)
    institucional_eur: float = Field(default=15000.0, ge=0)
    is_active: bool = Field(default=True)
    grace_days: int = Field(default=15, ge=0, le=365, description="Days after due date before flagging overdue")
    suspend_after_days: int = Field(default=30, ge=0, le=365, description="Days after due date before suspending access")
    notify_days_before: int = Field(default=30, ge=1, le=90, description="Days before due to notify client & create pending payment")


class UpdateAnnualFeeRequest(BaseModel):
    config: AnnualFeeConfig


class UpdateCommissionsRequest(BaseModel):
    admission_commission_percent: float = Field(..., ge=0, le=100)
    annual_commission_percent: float = Field(..., ge=0, le=100)


class SuspensionToggleRequest(BaseModel):
    reason: Optional[str] = None


class UpgradeRequest(BaseModel):
    target_tier: str  # broker | standard | premium | vip | institucional


class UpgradeApprovalRequest(BaseModel):
    target_tier: str
    force_amount_eur: Optional[float] = None  # Admin override


class SubmitPaymentMethodRequest(BaseModel):
    payment_method: str  # "crypto" or "bank_transfer"
    crypto_currency: Optional[str] = None  # BTC/ETH/USDT/USDC
    bank_account_id: Optional[str] = None


# ==================== HELPERS ====================


async def _get_settings() -> dict:
    """Fetch platform settings, seed annual_fee if missing."""
    settings = await db.platform_settings.find_one({"type": "general"}, {"_id": 0})
    if not settings:
        return {}
    changed = False
    if "annual_fee" not in settings:
        settings["annual_fee"] = AnnualFeeConfig().model_dump()
        changed = True
    ref = settings.get("referral_fees", {}) or {}
    changed_ref = False
    if "annual_commission_percent" not in ref:
        ref["annual_commission_percent"] = round(float(ref.get("admission_fee_percent", 0.0)) / 2, 2)
        changed_ref = True
    if "upgrade_commission_percent" not in ref:
        # Default: same as admission % for upgrades (incentive for team to drive upgrades)
        ref["upgrade_commission_percent"] = float(ref.get("admission_fee_percent", 0.0))
        changed_ref = True
    if changed_ref:
        settings["referral_fees"] = ref
        changed = True
    if changed:
        await db.platform_settings.update_one(
            {"type": "general"},
            {"$set": {
                "annual_fee": settings["annual_fee"],
                "referral_fees": settings["referral_fees"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
    return settings


def _tier_field(tier: str) -> str:
    t = (tier or "standard").lower()
    return f"{t}_eur"


async def _annual_fee_eur_for(tier: str) -> float:
    settings = await _get_settings()
    cfg = settings.get("annual_fee") or AnnualFeeConfig().model_dump()
    return float(cfg.get(_tier_field(tier), cfg.get("standard_eur", 0.0)))


async def _commission_percent(fee_type: str) -> float:
    """Return referrer commission % for the given fee_type ("admission" | "annual")."""
    settings = await _get_settings()
    ref = settings.get("referral_fees") or {}
    if fee_type == "annual":
        return float(ref.get("annual_commission_percent", 0.0))
    if fee_type == "admission":
        return float(ref.get("admission_fee_percent", 0.0))
    return 0.0


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


# ==================== CONFIG ENDPOINTS ====================


@router.get("/config")
async def get_billing_config(admin: dict = Depends(get_internal_user)):
    """Return admission + annual fee + commission configuration."""
    settings = await _get_settings()
    return {
        "admission_fee": settings.get("admission_fee", {}),
        "annual_fee": settings.get("annual_fee", {}),
        "referral_fees": settings.get("referral_fees", {}),
        "updated_at": settings.get("updated_at"),
    }


@router.put("/annual-fee")
async def update_annual_fee(payload: UpdateAnnualFeeRequest, admin: dict = Depends(get_admin_user)):
    """Update annual (recurring) fee config — admin only."""
    now = datetime.now(timezone.utc).isoformat()
    await db.platform_settings.update_one(
        {"type": "general"},
        {"$set": {"annual_fee": payload.config.model_dump(), "updated_at": now}},
        upsert=True,
    )
    logger.info(f"Annual fee config updated by {admin.get('email')}")
    return {"success": True, "annual_fee": payload.config.model_dump()}


@router.put("/commissions")
async def update_commissions(payload: UpdateCommissionsRequest, admin: dict = Depends(get_admin_user)):
    """Update referrer commission percentages (admission & annual) — admin only."""
    now = datetime.now(timezone.utc).isoformat()
    await db.platform_settings.update_one(
        {"type": "general"},
        {"$set": {
            "referral_fees.admission_fee_percent": payload.admission_commission_percent,
            "referral_fees.annual_commission_percent": payload.annual_commission_percent,
            "updated_at": now,
        }},
    )
    logger.info(
        f"Commissions updated by {admin.get('email')}: "
        f"admission={payload.admission_commission_percent}%, annual={payload.annual_commission_percent}%"
    )
    return {"success": True}


# ==================== RENEWALS DASHBOARD ====================


@router.get("/renewals")
async def list_renewals(
    status: Optional[str] = Query(None, regex="^(upcoming|pending|overdue|suspended|all)$"),
    admin: dict = Depends(get_internal_user),
):
    """
    Consolidated renewals dashboard.
    - upcoming: due within `notify_days_before` days, no pending payment yet
    - pending: pending annual payment awaiting confirmation
    - overdue: past due date (beyond grace_days)
    - suspended: accounts flagged as suspended for non-payment
    """
    settings = await _get_settings()
    cfg = settings.get("annual_fee") or AnnualFeeConfig().model_dump()
    notify_days = int(cfg.get("notify_days_before", 30))
    grace_days = int(cfg.get("grace_days", 15))

    now = datetime.now(timezone.utc)
    notify_threshold = _iso(now + timedelta(days=notify_days))
    now_iso = _iso(now)
    grace_threshold = _iso(now - timedelta(days=grace_days))

    async def _fetch(criteria, project_fields=None):
        proj = project_fields or {
            "_id": 0, "id": 1, "name": 1, "email": 1, "membership_level": 1,
            "annual_fee_next_due": 1, "annual_fee_paid_at": 1,
            "billing_status": 1, "suspended_at": 1,
        }
        return await db.users.find(criteria, proj).sort("annual_fee_next_due", 1).to_list(500)

    result = {"upcoming": [], "pending": [], "overdue": [], "suspended": [], "counts": {}}

    def _want(s): return status in (None, "all", s)

    if _want("upcoming"):
        upcoming = await _fetch({
            "user_type": "client",
            "annual_fee_next_due": {"$lte": notify_threshold, "$gt": now_iso},
            "billing_status": {"$ne": "suspended"},
        })
        # Filter out those who already have pending annual payment
        pending_ids = {
            p["user_id"] async for p in db.admission_payments.find(
                {"status": {"$in": ["pending", "awaiting_confirmation"]}, "fee_type": "annual"},
                {"_id": 0, "user_id": 1},
            )
        }
        result["upcoming"] = [u for u in upcoming if u["id"] not in pending_ids]

    if _want("pending"):
        pending_payments = await db.admission_payments.find(
            {"status": {"$in": ["pending", "awaiting_confirmation"]}, "fee_type": "annual"},
            {"_id": 0},
        ).sort("created_at", -1).to_list(500)
        result["pending"] = pending_payments

    if _want("overdue"):
        result["overdue"] = await _fetch({
            "user_type": "client",
            "annual_fee_next_due": {"$lt": grace_threshold},
            "billing_status": {"$ne": "suspended"},
        })

    if _want("suspended"):
        result["suspended"] = await _fetch({
            "user_type": "client",
            "billing_status": "suspended",
        })

    result["counts"] = {k: len(v) for k, v in result.items() if isinstance(v, list)}
    result["config"] = cfg
    return result


@router.post("/users/{user_id}/suspend")
async def suspend_user(user_id: str, payload: SuspensionToggleRequest, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "billing_status": "suspended",
            "suspended_at": now,
            "suspended_reason": (payload.reason or "non_payment")[:200],
            "suspended_by": admin.get("email"),
        }},
    )
    logger.info(f"User {user.get('email')} suspended by {admin.get('email')} ({payload.reason})")
    return {"success": True}


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(user_id: str, admin: dict = Depends(get_admin_user)):
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"billing_status": "active"}, "$unset": {"suspended_at": "", "suspended_reason": "", "suspended_by": ""}},
    )
    return {"success": True}


# ==================== PAYOUTS DASHBOARD ====================


@router.get("/payouts")
async def list_payouts(
    referrer_id: Optional[str] = None,
    status: Optional[str] = None,
    admin: dict = Depends(get_internal_user),
):
    """Aggregated commission ledger for staff referrers."""
    # Pending (unpaid) commissions grouped by referrer
    pending_pipeline = [
        {"$match": {"status": "pending", **({"referrer_id": referrer_id} if referrer_id else {})}},
        {"$group": {
            "_id": "$referrer_id",
            "total": {"$sum": "$commission_amount"},
            "count": {"$sum": 1},
            "currency": {"$first": "$currency"},
        }},
    ]
    pending_by_referrer = await db.referral_commissions.aggregate(pending_pipeline).to_list(500)

    referrer_ids = [r["_id"] for r in pending_by_referrer if r.get("_id")]
    referrers = {
        u["id"]: u for u in await db.users.find(
            {"id": {"$in": referrer_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}
        ).to_list(500)
    }

    pending_summary = [
        {
            "referrer_id": r["_id"],
            "referrer_name": (referrers.get(r["_id"]) or {}).get("name"),
            "referrer_email": (referrers.get(r["_id"]) or {}).get("email"),
            "total_pending": round(r["total"], 2),
            "currency": r.get("currency", "EUR"),
            "count": r["count"],
        }
        for r in pending_by_referrer if r.get("_id")
    ]

    payouts_query = {}
    if referrer_id:
        payouts_query["referrer_id"] = referrer_id
    if status:
        payouts_query["status"] = status
    recent_payouts = await db.referral_payouts.find(
        payouts_query, {"_id": 0}
    ).sort("created_at", -1).limit(200).to_list(200)

    return {
        "pending_summary": pending_summary,
        "recent_payouts": recent_payouts,
    }


# ==================== AUTOMATION JOB ====================


_bg_state = {
    "running": False,
    "last_run_at": None,
    "last_result": None,
    "last_error": None,
    "runs": 0,
    "interval_s": int(os.environ.get("BILLING_CYCLE_INTERVAL_S", "86400")),  # daily
    "task": None,
}


def _bg_public_state() -> dict:
    return {k: v for k, v in _bg_state.items() if k != "task"}


async def _run_renewal_cycle() -> dict:
    """
    Core daily cycle:
    - Upcoming (≤ notify_days_before): create pending annual_payment + notify client + admin
    - Past-due (> grace_days): warn
    - Past-due (> suspend_after_days): auto-suspend
    """
    settings = await _get_settings()
    cfg = settings.get("annual_fee") or AnnualFeeConfig().model_dump()
    if not cfg.get("is_active", True):
        return {"skipped": True, "reason": "annual_fee_disabled"}

    notify_days = int(cfg.get("notify_days_before", 30))
    grace_days = int(cfg.get("grace_days", 15))
    suspend_days = int(cfg.get("suspend_after_days", 30))

    now = datetime.now(timezone.utc)
    notify_threshold = _iso(now + timedelta(days=notify_days))
    grace_threshold = _iso(now - timedelta(days=grace_days))
    suspend_threshold = _iso(now - timedelta(days=suspend_days))

    created_payments = 0
    notified = 0
    suspended = 0

    # --- 1. Upcoming renewals ---
    upcoming = await db.users.find(
        {
            "user_type": "client",
            "annual_fee_next_due": {"$lte": notify_threshold, "$gt": _iso(now)},
            "billing_status": {"$ne": "suspended"},
        },
        {"_id": 0, "id": 1, "name": 1, "email": 1, "membership_level": 1, "annual_fee_next_due": 1},
    ).to_list(500)

    for user in upcoming:
        existing_pending = await db.admission_payments.find_one(
            {"user_id": user["id"], "status": "pending", "fee_type": "annual"}, {"_id": 0, "id": 1}
        )
        if existing_pending:
            continue

        tier = user.get("membership_level", "standard")
        amount_eur = await _annual_fee_eur_for(tier)
        if amount_eur <= 0:
            continue

        payment = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_email": user.get("email"),
            "user_name": user.get("name"),
            "fee_type": "annual",
            "membership_level": tier,
            "amount": amount_eur,
            "currency": "EUR",
            "status": "pending",
            "due_date": user.get("annual_fee_next_due"),
            "created_at": _iso(now),
            "created_by": "auto_renewal_cycle",
        }
        await db.admission_payments.insert_one(payment)
        created_payments += 1

        # Notify client
        try:
            await db.notifications.insert_one({
                "target": "user",
                "user_id": user["id"],
                "type": "annual_fee_upcoming",
                "title": "Renovação anual a vencer",
                "message": (
                    f"A sua taxa anual de €{amount_eur:,.2f} ({tier.upper()}) vence em "
                    f"{user.get('annual_fee_next_due', '')[:10]}. Pode regularizar a qualquer momento no seu perfil."
                ),
                "read": False,
                "created_at": _iso(now),
            })
            notified += 1
        except Exception as e:
            logger.warning(f"Failed to notify user {user['id']}: {e}")

        # Notify admins
        try:
            await db.notifications.insert_one({
                "target": "admin",
                "type": "annual_fee_upcoming_admin",
                "title": f"Pendente: renovação de {user.get('name')}",
                "message": f"Tier {tier.upper()}: €{amount_eur:,.2f}",
                "user_id": user["id"],
                "read": False,
                "created_at": _iso(now),
            })
        except Exception:
            pass

    # --- 2. Auto-suspend clients past grace period ---
    to_suspend = await db.users.find(
        {
            "user_type": "client",
            "annual_fee_next_due": {"$lt": suspend_threshold},
            "billing_status": {"$ne": "suspended"},
        },
        {"_id": 0, "id": 1, "email": 1},
    ).to_list(500)

    for user in to_suspend:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "billing_status": "suspended",
                "suspended_at": _iso(now),
                "suspended_reason": "annual_fee_overdue",
                "suspended_by": "auto_renewal_cycle",
            }},
        )
        suspended += 1
        try:
            await db.notifications.insert_one({
                "target": "admin",
                "type": "annual_fee_auto_suspended",
                "title": f"Conta suspensa: {user.get('email')}",
                "message": f"Suspensa automaticamente por taxa anual em atraso > {suspend_days} dias.",
                "user_id": user["id"],
                "read": False,
                "created_at": _iso(now),
            })
        except Exception:
            pass

    # --- 3. Flag overdue (past grace but not suspended yet) ---
    flagged = await db.users.update_many(
        {
            "user_type": "client",
            "annual_fee_next_due": {"$lt": grace_threshold, "$gte": suspend_threshold},
            "billing_status": {"$nin": ["suspended", "overdue"]},
        },
        {"$set": {"billing_status": "overdue"}},
    )

    return {
        "created_payments": created_payments,
        "notified_clients": notified,
        "suspended": suspended,
        "flagged_overdue": flagged.modified_count,
    }


@router.post("/run-cycle")
async def run_cycle_now(admin: dict = Depends(get_admin_user)):
    """Manually trigger the daily renewal cycle (admin)."""
    result = await _run_renewal_cycle()
    now = _iso(datetime.now(timezone.utc))
    _bg_state["last_run_at"] = now
    _bg_state["last_result"] = result
    _bg_state["runs"] += 1
    return {"success": True, "result": result, "timestamp": now}


@router.get("/cycle-status")
async def cycle_status(admin: dict = Depends(get_internal_user)):
    return _bg_public_state()


async def _cycle_loop():
    logger.info(f"Billing renewal cycle started (every {_bg_state['interval_s']}s)")
    # Initial delay — allow app to fully boot
    await asyncio.sleep(60)
    while True:
        try:
            result = await _run_renewal_cycle()
            _bg_state["last_run_at"] = _iso(datetime.now(timezone.utc))
            _bg_state["last_result"] = result
            _bg_state["last_error"] = None
            _bg_state["runs"] += 1
            if any(v for k, v in result.items() if k != "skipped"):
                logger.info(f"Billing cycle run #{_bg_state['runs']}: {result}")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            _bg_state["last_error"] = str(e)[:200]
            logger.exception(f"Billing cycle error: {e}")
        await asyncio.sleep(_bg_state["interval_s"])


def start_cycle():
    if _bg_state["task"] and not _bg_state["task"].done():
        return
    loop = asyncio.get_event_loop()
    _bg_state["task"] = loop.create_task(_cycle_loop())
    _bg_state["running"] = True


def stop_cycle():
    task = _bg_state.get("task")
    if task and not task.done():
        task.cancel()
    _bg_state["running"] = False


# ==================== CLIENT: MY BILLING STATUS ====================


@router.get("/my-status")
async def my_billing_status(user_id: str = Depends(get_current_user_id)):
    """Client-facing: upcoming renewals, billing state, pending annual payment."""
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "id": 1, "membership_level": 1,
         "annual_fee_next_due": 1, "annual_fee_paid_at": 1,
         "admission_fee_next_due": 1, "admission_fee_paid_at": 1,
         "billing_status": 1, "suspended_reason": 1},
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tier = user.get("membership_level", "standard")
    annual_amount = await _annual_fee_eur_for(tier)

    pending = await db.admission_payments.find_one(
        {"user_id": user_id, "status": {"$in": ["pending", "awaiting_confirmation"]}, "fee_type": "annual"},
        {"_id": 0},
    )

    days_until_due = None
    if user.get("annual_fee_next_due"):
        try:
            dt = datetime.fromisoformat(user["annual_fee_next_due"].replace("Z", "+00:00"))
            days_until_due = (dt - datetime.now(timezone.utc)).days
        except Exception:
            pass

    return {
        "tier": tier,
        "annual_fee_amount_eur": annual_amount,
        "annual_fee_next_due": user.get("annual_fee_next_due"),
        "annual_fee_paid_at": user.get("annual_fee_paid_at"),
        "days_until_due": days_until_due,
        "billing_status": user.get("billing_status", "active"),
        "pending_payment": pending,
    }


# ==================== HISTORY ====================


TIER_RANK = {"broker": 0, "standard": 1, "premium": 2, "vip": 3, "institucional": 4}


async def _payment_history(user_id: str) -> dict:
    """Return a structured history of ALL billing payments for a user."""
    payments = await db.admission_payments.find(
        {"user_id": user_id},
        {"_id": 0},
    ).sort("created_at", 1).to_list(500)

    summary = {
        "total_payments": len(payments),
        "admission_count": sum(1 for p in payments if p.get("fee_type", "admission") == "admission"),
        "annual_count": sum(1 for p in payments if p.get("fee_type") == "annual"),
        "upgrade_count": sum(1 for p in payments if p.get("fee_type") == "upgrade"),
        "total_paid_eur": round(sum(
            float(p.get("amount", 0)) for p in payments
            if p.get("status") == "paid" and (p.get("currency") or "EUR") == "EUR"
        ), 2),
    }

    # Account age (oldest paid payment)
    first_paid = next((p for p in payments if p.get("status") == "paid"), None)
    if first_paid and first_paid.get("paid_at"):
        try:
            dt = datetime.fromisoformat(first_paid["paid_at"].replace("Z", "+00:00"))
            summary["account_age_days"] = (datetime.now(timezone.utc) - dt).days
        except Exception:
            summary["account_age_days"] = None
    else:
        summary["account_age_days"] = None

    return {"payments": payments, "summary": summary}


@router.get("/my-history")
async def my_history(user_id: str = Depends(get_current_user_id)):
    """Client-facing: their own renewal history."""
    return await _payment_history(user_id)


@router.get("/users/{user_id}/history")
async def user_history(user_id: str, admin: dict = Depends(get_internal_user)):
    """Admin: any client's billing history."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "name": 1, "email": 1, "membership_level": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = await _payment_history(user_id)
    data["user"] = user
    return data


# ==================== TIER UPGRADE (PRO-RATA) ====================


async def _compute_prorata_upgrade(user_id: str, target_tier: str) -> dict:
    """
    Policy: **pro-rata differential** (option (a)).
    Charges only the price difference for the remaining period until next renewal.
    Preserves anniversary date.
    """
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_tier = (user.get("membership_level") or "standard").lower()
    target_tier = target_tier.lower()

    if target_tier not in TIER_RANK:
        raise HTTPException(status_code=400, detail="Tier alvo inválido")
    if TIER_RANK[target_tier] <= TIER_RANK.get(current_tier, 0):
        raise HTTPException(status_code=400, detail="Só é possível fazer upgrade para tier superior")

    current_annual = await _annual_fee_eur_for(current_tier)
    target_annual = await _annual_fee_eur_for(target_tier)
    delta_annual = max(0.0, target_annual - current_annual)

    now = datetime.now(timezone.utc)
    next_due_iso = user.get("annual_fee_next_due")
    days_remaining = 365
    if next_due_iso:
        try:
            next_due = datetime.fromisoformat(next_due_iso.replace("Z", "+00:00"))
            days_remaining = max(0, (next_due - now).days)
        except Exception:
            pass

    # Pro-rata: delta * (days_remaining / 365), rounded to 2dp
    prorata_amount = round(delta_annual * (days_remaining / 365.0), 2)

    return {
        "user_id": user_id,
        "current_tier": current_tier,
        "target_tier": target_tier,
        "current_annual_eur": current_annual,
        "target_annual_eur": target_annual,
        "annual_delta_eur": round(delta_annual, 2),
        "days_remaining": days_remaining,
        "prorata_amount_eur": prorata_amount,
        "current_next_due": next_due_iso,
        "policy": "prorata_delta",
    }


@router.post("/upgrade/quote")
async def upgrade_quote(payload: UpgradeRequest, user_id: str = Depends(get_current_user_id)):
    """Client-facing: preview exact amount to pay for an upgrade before confirming."""
    return await _compute_prorata_upgrade(user_id, payload.target_tier)


@router.post("/upgrade/request")
async def request_upgrade_payment(payload: UpgradeRequest, user_id: str = Depends(get_current_user_id)):
    """Client-facing: confirm upgrade and create pending upgrade payment."""
    quote = await _compute_prorata_upgrade(user_id, payload.target_tier)

    # Prevent duplicate pending upgrade
    existing = await db.admission_payments.find_one(
        {"user_id": user_id, "fee_type": "upgrade", "status": {"$in": ["pending", "awaiting_confirmation"]}},
        {"_id": 0, "id": 1},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um upgrade pendente")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    now = datetime.now(timezone.utc)

    amount = quote["prorata_amount_eur"]
    payment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": (user or {}).get("email"),
        "user_name": (user or {}).get("name"),
        "fee_type": "upgrade",
        "membership_level": quote["current_tier"],
        "target_tier": quote["target_tier"],
        "amount": amount,
        "currency": "EUR",
        "status": "pending" if amount > 0 else "paid",
        "prorata_details": quote,
        "created_at": _iso(now),
    }
    # Edge case: if amount is 0 (same tier or zero delta), auto-apply upgrade instantly.
    if amount <= 0:
        payment["paid_at"] = _iso(now)
        payment["approved_by"] = "auto_zero_amount"
        await db.users.update_one({"id": user_id}, {"$set": {"membership_level": quote["target_tier"]}})

    await db.admission_payments.insert_one(payment)
    return {"success": True, "payment_id": payment["id"], "amount": amount, "quote": quote}


@router.post("/upgrade/{payment_id}/approve")
async def approve_upgrade(payment_id: str, admin: dict = Depends(get_admin_user)):
    """Admin approves upgrade payment → applies new tier, pays commission to referrer."""
    payment = await db.admission_payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    if payment.get("fee_type") != "upgrade":
        raise HTTPException(status_code=400, detail="Pagamento não é um upgrade")
    if payment.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Upgrade já foi aprovado")

    now = datetime.now(timezone.utc)
    target_tier = payment.get("target_tier") or (payment.get("prorata_details") or {}).get("target_tier")
    if not target_tier:
        raise HTTPException(status_code=400, detail="Target tier em falta")

    user_id = payment.get("user_id")

    # Mark payment paid
    await db.admission_payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": "paid",
            "paid_at": _iso(now),
            "approved_by": admin.get("email"),
        }},
    )

    # Apply tier change. Preserve existing annual_fee_next_due (anniversary stays).
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"membership_level": target_tier, "billing_status": "active"}},
    )

    # Referrer commission on the upgrade differential
    try:
        from routes.referrals import calculate_referrer_commission
        referral = await db.referrals.find_one({"client_id": user_id, "status": "active"})
        if referral and payment.get("amount", 0) > 0:
            com = await calculate_referrer_commission("upgrade", payment["amount"], "EUR")
            if com["commission_amount"] > 0:
                await db.referral_commissions.insert_one({
                    "id": str(uuid.uuid4()),
                    "referral_id": referral.get("id"),
                    "referrer_id": referral.get("referrer_id"),
                    "client_id": user_id,
                    "transaction_type": "upgrade",
                    "original_amount": payment["amount"],
                    "commission_amount": com["commission_amount"],
                    "commission_percent": com["commission_percent"],
                    "currency": "EUR",
                    "status": "pending",
                    "created_at": _iso(now),
                })
    except Exception as e:
        logger.warning(f"Failed to calculate upgrade commission: {e}")

    logger.info(f"Upgrade {payment_id} approved by {admin.get('email')}: user {user_id} → {target_tier}")
    return {"success": True, "target_tier": target_tier}


# ==================== CHECKOUT (generic, for annual & upgrade payments) ====================


import httpx  # noqa: E402
from services.fireblocks_service import FireblocksService  # noqa: E402

BINANCE_API_URL = "https://api.binance.com/api/v3"

# Fireblocks asset IDs for the billing vault
BILLING_VAULT_ASSETS = {
    "BTC": "BTC",
    "ETH": "ETH",
    "USDT": "USDT_ERC20",
    "USDC": "USDC",
}
BILLING_VAULT_NAME = "KBEX OnBoarding"


async def _crypto_amounts_for_eur(eur_amount: float) -> dict:
    """Fetch live crypto equivalents for an EUR amount (BTC/ETH/USDT/USDC)."""
    crypto_amounts = {}
    if eur_amount <= 0:
        return crypto_amounts
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            # EUR → USD
            eur_usd = 1.08
            try:
                r = await c.get(f"{BINANCE_API_URL}/ticker/price", params={"symbol": "EURUSDT"})
                if r.status_code == 200:
                    eur_usd = float(r.json().get("price", 1.08))
            except Exception:
                pass
            usd_amount = eur_amount * eur_usd
            for sym in ("BTC", "ETH"):
                try:
                    r = await c.get(f"{BINANCE_API_URL}/ticker/price", params={"symbol": f"{sym}USDT"})
                    if r.status_code == 200:
                        price_usd = float(r.json().get("price", 0))
                        if price_usd > 0:
                            crypto_amounts[sym] = round(usd_amount / price_usd, 8)
                except Exception:
                    pass
            crypto_amounts["USDT"] = round(usd_amount, 2)
            crypto_amounts["USDC"] = round(usd_amount, 2)
    except Exception as e:
        logger.warning(f"Crypto rate fetch failed: {e}")
    return crypto_amounts


async def _get_billing_vault_config() -> Optional[dict]:
    """Return the stored KBEX OnBoarding vault config ({vault_id, vault_name, addresses})."""
    doc = await db.platform_settings.find_one({"type": "billing_fireblocks_vault"}, {"_id": 0})
    return doc if doc else None


async def _refresh_billing_vault_addresses(vault_id: str) -> dict:
    """Re-fetch deposit addresses from Fireblocks and update cached settings."""
    now = datetime.now(timezone.utc).isoformat()
    addresses = {}
    for label, fb_asset_id in BILLING_VAULT_ASSETS.items():
        try:
            info = await FireblocksService.get_deposit_address(vault_id=vault_id, asset_id=fb_asset_id)
            if info.get("address"):
                addresses[label] = {
                    "address": info.get("address"),
                    "tag": info.get("tag", ""),
                    "asset_id": fb_asset_id,
                }
        except Exception as e:
            logger.warning(f"Fireblocks: failed to fetch {fb_asset_id} for vault {vault_id}: {e}")
    await db.platform_settings.update_one(
        {"type": "billing_fireblocks_vault"},
        {"$set": {"addresses": addresses, "addresses_refreshed_at": now}},
    )
    return addresses


async def _get_billing_wallets() -> dict:
    """
    Return receiving wallet addresses for the billing checkout.
    Priority: Fireblocks KBEX OnBoarding vault → platform_settings.crypto_wallets → hardcoded fallback.
    Output shape: {"BTC": "addr", "ETH": "addr", "USDT": "addr", "USDC": "addr"}
    """
    vault = await _get_billing_vault_config()
    if vault and vault.get("addresses"):
        out = {k: v.get("address", "") for k, v in vault["addresses"].items() if v.get("address")}
        if out:
            return out

    # Fallback — legacy manual settings
    settings = await db.platform_settings.find_one({"type": "general"}, {"_id": 0, "crypto_wallets": 1})
    wallets = (settings or {}).get("crypto_wallets") or {}
    default_wallets = {
        "BTC": "bc1q83zcsh5kmtac53kwjjn2yh6wpujgnac79cdxyf",
        "ETH": "0x8a64196045B2E213e9cC0ab93865639CE93c8dbC",
        "USDT": "0x8a64196045B2E213e9cC0ab93865639CE93c8dbC",
        "USDC": "0x8a64196045B2E213e9cC0ab93865639CE93c8dbC",
    }
    for k, v in default_wallets.items():
        wallets.setdefault(k, v)
    return wallets


@router.get("/payments/{payment_id}")
async def get_payment_checkout(payment_id: str, user_id: str = Depends(get_current_user_id)):
    """Load a pending payment with fresh crypto amounts + receiving wallets — for client checkout."""
    payment = await db.admission_payments.find_one({"id": payment_id, "user_id": user_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    if payment.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Este pagamento já foi confirmado")

    amount_eur = float(payment.get("amount", 0))
    crypto_amounts = await _crypto_amounts_for_eur(amount_eur)
    wallets = await _get_billing_wallets()

    # Get fiat bank accounts (EUR)
    bank_accounts = await db.bank_accounts.find(
        {"is_active": True, "currency": "EUR"},
        {"_id": 0, "id": 1, "bank_name": 1, "account_holder": 1, "iban": 1, "bic": 1, "currency": 1},
    ).to_list(20)

    vault = await _get_billing_vault_config()
    return {
        "payment": payment,
        "crypto_amounts": crypto_amounts,
        "crypto_wallets": wallets,
        "bank_accounts": bank_accounts,
        "vault_source": "fireblocks" if (vault and vault.get("vault_id")) else "fallback",
    }


@router.post("/payments/{payment_id}/submit")
async def submit_payment_method(
    payment_id: str,
    payload: SubmitPaymentMethodRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Client confirms chosen payment method for a pending annual/upgrade payment.
    Records method + awaits admin approval.
    """
    payment = await db.admission_payments.find_one({"id": payment_id, "user_id": user_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    if payment.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Este pagamento já foi confirmado")

    if payload.payment_method not in ("crypto", "bank_transfer"):
        raise HTTPException(status_code=400, detail="Método inválido")
    if payload.payment_method == "crypto" and not payload.crypto_currency:
        raise HTTPException(status_code=400, detail="Crypto currency obrigatório")

    now = datetime.now(timezone.utc).isoformat()
    update = {
        "payment_method": payload.payment_method,
        "crypto_currency": payload.crypto_currency,
        "bank_account_id": payload.bank_account_id,
        "method_submitted_at": now,
        "status": "awaiting_confirmation",
    }
    await db.admission_payments.update_one({"id": payment_id}, {"$set": update})

    # Notify admin to review & approve
    try:
        await db.notifications.insert_one({
            "target": "admin",
            "type": "billing_payment_submitted",
            "title": f"Pagamento {payment.get('fee_type', 'billing')} submetido",
            "message": (
                f"{payment.get('user_name') or payment.get('user_email')} submeteu "
                f"{payload.payment_method}"
                + (f" ({payload.crypto_currency})" if payload.crypto_currency else "")
                + f" para €{float(payment.get('amount', 0)):,.2f}"
            ),
            "user_id": user_id,
            "payment_id": payment_id,
            "read": False,
            "created_at": now,
        })
    except Exception:
        pass

    logger.info(f"Payment {payment_id} method submitted: {payload.payment_method} / {payload.crypto_currency}")
    return {"success": True, "payment_id": payment_id, "status": "awaiting_confirmation"}


# ==================== ADMIN: FIREBLOCKS BILLING VAULT ====================


@router.get("/vault")
async def get_billing_vault(admin: dict = Depends(get_internal_user)):
    """Return KBEX OnBoarding vault info + live balance summary."""
    vault = await _get_billing_vault_config()
    if not vault or not vault.get("vault_id"):
        return {"configured": False, "vault_name": BILLING_VAULT_NAME}

    out = {
        "configured": True,
        "vault_id": vault["vault_id"],
        "vault_name": vault.get("vault_name", BILLING_VAULT_NAME),
        "addresses": vault.get("addresses", {}),
        "created_at": vault.get("created_at"),
        "addresses_refreshed_at": vault.get("addresses_refreshed_at"),
    }

    # Try to fetch live balances (best-effort)
    try:
        acct = await FireblocksService.get_vault_account(vault["vault_id"])
        balances = {}
        for asset in (acct.get("assets") or []):
            balances[asset.get("id")] = {
                "total": asset.get("total", "0"),
                "available": asset.get("available", "0"),
            }
        out["balances"] = balances
    except Exception as e:
        out["balances_error"] = str(e)[:200]

    return out


@router.post("/vault/setup")
async def setup_billing_vault(admin: dict = Depends(get_admin_user)):
    """
    Create the 'KBEX OnBoarding' Fireblocks vault with BTC/ETH/USDT/USDC wallets.
    Idempotent: if vault already exists in settings, it re-syncs addresses instead of recreating.
    """
    existing = await _get_billing_vault_config()
    if existing and existing.get("vault_id"):
        # Already exists — just refresh addresses
        addresses = await _refresh_billing_vault_addresses(existing["vault_id"])
        return {
            "success": True,
            "already_existed": True,
            "vault_id": existing["vault_id"],
            "addresses": addresses,
        }

    try:
        result = await FireblocksService.create_vault_with_assets(
            name=BILLING_VAULT_NAME,
            asset_ids=list(BILLING_VAULT_ASSETS.values()),
            hidden=False,
        )
    except Exception as e:
        logger.exception(f"Failed to create billing vault: {e}")
        raise HTTPException(status_code=500, detail=f"Falha ao criar vault Fireblocks: {str(e)[:200]}")

    vault_id = result.get("vault_id")
    if not vault_id:
        raise HTTPException(status_code=500, detail="Fireblocks não retornou vault_id")

    # Map Fireblocks assets → our labels
    addresses = {}
    label_by_fb_id = {v: k for k, v in BILLING_VAULT_ASSETS.items()}
    for a in (result.get("assets") or []):
        label = label_by_fb_id.get(a.get("asset_id"))
        if label and a.get("address"):
            addresses[label] = {
                "address": a["address"],
                "tag": a.get("tag", ""),
                "asset_id": a["asset_id"],
            }

    now = datetime.now(timezone.utc).isoformat()
    await db.platform_settings.update_one(
        {"type": "billing_fireblocks_vault"},
        {"$set": {
            "type": "billing_fireblocks_vault",
            "vault_id": vault_id,
            "vault_name": BILLING_VAULT_NAME,
            "addresses": addresses,
            "created_at": now,
            "created_by": admin.get("email"),
            "addresses_refreshed_at": now,
        }},
        upsert=True,
    )

    logger.info(f"Billing vault created by {admin.get('email')}: id={vault_id}")
    return {
        "success": True,
        "already_existed": False,
        "vault_id": vault_id,
        "addresses": addresses,
    }


@router.post("/vault/refresh-addresses")
async def refresh_billing_vault_addresses(admin: dict = Depends(get_admin_user)):
    """Re-fetch deposit addresses from Fireblocks (useful after manual asset additions in FB UI)."""
    vault = await _get_billing_vault_config()
    if not vault or not vault.get("vault_id"):
        raise HTTPException(status_code=400, detail="Vault KBEX OnBoarding não configurado")
    addresses = await _refresh_billing_vault_addresses(vault["vault_id"])
    return {"success": True, "addresses": addresses}
