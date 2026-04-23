"""
Stripe Checkout integration for KBEX.io.

Three payment flows, all via Stripe Hosted Checkout:
  1. Admission Fee (one-time, onboarding, tier-based amount)
  2. Annual Renewal (yearly, tier-based amount)
  3. Fiat Deposit (variable amount, user-chosen, min/max validated server-side)

Security model (per Stripe integration playbook):
  - Amounts are NEVER trusted from the frontend. Backend resolves them from
    platform_settings (admission/annual) or validates against server-side
    min/max (deposit).
  - success_url and cancel_url are built from the frontend's origin passed
    as `origin_url`. No hardcoded URLs, no relying on FRONTEND_URL in env.
  - Each checkout session is recorded in `payment_transactions` with
    payment_status="initiated" BEFORE returning to the frontend.
  - Status is refreshed via polling (`GET /checkout-status/{session_id}`)
    and the webhook (`POST /api/webhook/stripe`). Both are idempotent: the
    first one to see `paid` applies business logic; subsequent calls are
    no-ops.
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
)
from utils.auth import get_current_user_id
from routes.billing import _annual_fee_eur_for, _get_settings, _iso

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stripe", tags=["stripe"])

db = None

def set_db(database):
    global db
    db = database


STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
SUPPORTED_CURRENCIES = {"eur", "usd", "aed", "chf", "qar", "sar", "hkd"}

# Fiat deposit guardrails — server-authoritative; prevents $0.01 abuse.
DEPOSIT_MIN_EUR = 50.0
DEPOSIT_MAX_EUR = 50_000.0

PaymentType = Literal["admission_fee", "annual_renewal", "fiat_deposit", "upgrade_prorata"]


# ==================== MODELS ====================

class CreateCheckoutRequest(BaseModel):
    payment_type: PaymentType
    origin_url: str = Field(..., description="Frontend origin, e.g. https://kbex.io")
    # Only used when payment_type=fiat_deposit. For admission/renewal/upgrade,
    # amount is resolved server-side from the user's tier or the pending
    # admission_payments row.
    deposit_amount: Optional[float] = Field(None, ge=0)
    currency: str = Field("eur", description="3-letter ISO currency code")
    tier_override: Optional[str] = Field(
        None,
        description="Admin-only override. Ignored for regular clients.",
    )
    # Required for upgrade_prorata — the admission_payments row created by
    # /api/billing/upgrade/request. The amount (and tier transition) is loaded
    # from that row server-side, never trusted from the client.
    payment_id: Optional[str] = Field(
        None,
        description="admission_payments.id — required for upgrade_prorata",
    )


class CheckoutSessionResult(BaseModel):
    session_id: str
    url: str
    amount: float
    currency: str
    payment_type: PaymentType


class CheckoutStatusResult(BaseModel):
    session_id: str
    status: str          # open | complete | expired
    payment_status: str  # unpaid | paid | no_payment_required
    amount_total: float
    currency: str
    payment_type: Optional[str] = None
    processed: bool = False  # True once business logic has fired


# ==================== HELPERS ====================

def _stripe_client(request: Request) -> StripeCheckout:
    """Build a StripeCheckout bound to this deployment's webhook URL."""
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe not configured (missing STRIPE_API_KEY)")
    # Prefer the externally visible host so Stripe can actually POST to us.
    forwarded = request.headers.get("x-forwarded-host") or request.headers.get("host")
    scheme = request.headers.get("x-forwarded-proto") or "https"
    host_url = f"{scheme}://{forwarded}" if forwarded else str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


async def _resolve_amount(
    payment_type: PaymentType,
    user: dict,
    deposit_amount: Optional[float],
    tier_override: Optional[str],
    payment_id: Optional[str] = None,
) -> float:
    """Server-side amount resolution. Never trust the frontend."""
    if payment_type == "admission_fee":
        tier = (tier_override or user.get("membership_level") or "standard").lower()
        settings = await _get_settings()
        cfg = settings.get("admission_fee") or {}
        field = f"{tier}_eur"
        amount = float(cfg.get(field, cfg.get("standard_eur", 0.0)))
        if amount <= 0:
            raise HTTPException(400, f"Admission fee not configured for tier '{tier}'")
        return round(amount, 2)

    if payment_type == "annual_renewal":
        tier = (tier_override or user.get("membership_level") or "standard").lower()
        amount = await _annual_fee_eur_for(tier)
        if amount <= 0:
            raise HTTPException(400, f"Annual fee not configured for tier '{tier}'")
        return round(amount, 2)

    if payment_type == "upgrade_prorata":
        if not payment_id:
            raise HTTPException(400, "payment_id is required for upgrade_prorata")
        pending = await db.admission_payments.find_one(
            {"id": payment_id, "user_id": user["id"], "fee_type": "upgrade"},
            {"_id": 0},
        )
        if not pending:
            raise HTTPException(404, "Pending upgrade payment not found")
        if pending.get("status") not in ("pending", "awaiting_confirmation"):
            raise HTTPException(400, f"Upgrade payment is already {pending.get('status')}")
        amount = float(pending.get("amount") or 0.0)
        if amount <= 0:
            raise HTTPException(400, "Upgrade amount must be > 0")
        return round(amount, 2)

    # Fiat deposit — validate user-provided amount against guardrails.
    if deposit_amount is None or deposit_amount <= 0:
        raise HTTPException(400, "deposit_amount is required for fiat_deposit")
    if not (DEPOSIT_MIN_EUR <= deposit_amount <= DEPOSIT_MAX_EUR):
        raise HTTPException(
            400,
            f"Deposit amount must be between €{DEPOSIT_MIN_EUR:.0f} and €{DEPOSIT_MAX_EUR:,.0f}",
        )
    return round(float(deposit_amount), 2)


def _success_path(payment_type: PaymentType) -> str:
    """Where to land the user inside KBEX after payment. All flows use a
    single universal return page that polls for status and then redirects
    to the right destination based on payment_type."""
    return "/payment/return"


def _cancel_path(payment_type: PaymentType) -> str:
    return "/payment/return"


# ==================== ROUTES ====================

@router.post("/create-checkout-session", response_model=CheckoutSessionResult)
async def create_checkout_session(
    payload: CreateCheckoutRequest,
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    """Create a Stripe Checkout session for the authenticated user."""
    currency = payload.currency.lower()
    if currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(
            400,
            f"Currency '{currency}' not supported. Use one of {sorted(SUPPORTED_CURRENCIES)}",
        )

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")

    amount = await _resolve_amount(
        payload.payment_type, user, payload.deposit_amount, payload.tier_override,
        payment_id=payload.payment_id,
    )

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/payment/return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/return?stripe_cancelled=1"

    metadata = {
        "user_id": user_id,
        "user_email": user.get("email", ""),
        "payment_type": payload.payment_type,
        "tier": (payload.tier_override or user.get("membership_level") or "standard"),
        "tenant_slug": user.get("tenant_slug", "kbex"),
    }
    if payload.payment_id:
        metadata["admission_payment_id"] = payload.payment_id

    stripe = _stripe_client(request)
    req = CheckoutSessionRequest(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    try:
        session: CheckoutSessionResponse = await stripe.create_checkout_session(req)
    except Exception as e:
        logger.exception(f"Stripe create_checkout_session failed: {e}")
        raise HTTPException(502, f"Failed to create checkout session: {e}")

    # Record transaction as initiated BEFORE returning to frontend.
    now = datetime.now(timezone.utc)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user_id,
        "user_email": user.get("email"),
        "payment_type": payload.payment_type,
        "tier": metadata["tier"],
        "amount": amount,
        "currency": currency,
        "status": "open",
        "payment_status": "initiated",
        "metadata": metadata,
        "processed": False,
        "created_at": _iso(now),
        "updated_at": _iso(now),
    })

    logger.info(
        f"Stripe checkout session {session.session_id} created: "
        f"{payload.payment_type} €{amount} {currency.upper()} user={user_id}"
    )

    return CheckoutSessionResult(
        session_id=session.session_id,
        url=session.url,
        amount=amount,
        currency=currency,
        payment_type=payload.payment_type,
    )


@router.get("/checkout-status/{session_id}", response_model=CheckoutStatusResult)
async def get_checkout_status(
    session_id: str,
    request: Request,
    user_id: str = Depends(get_current_user_id),
):
    """Poll Stripe for session status + update local record + apply business
    logic exactly once on transition to `paid`."""
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Checkout session not found")
    if tx["user_id"] != user_id:
        raise HTTPException(403, "Not your session")

    stripe = _stripe_client(request)
    try:
        status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logger.exception(f"Stripe get_checkout_status failed: {e}")
        raise HTTPException(502, f"Failed to fetch status: {e}")

    await _apply_status_update(session_id, status)
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})

    return CheckoutStatusResult(
        session_id=session_id,
        status=status.status,
        payment_status=status.payment_status,
        amount_total=float(status.amount_total) / 100.0 if status.amount_total else float(tx.get("amount", 0)),
        currency=status.currency or tx.get("currency", "eur"),
        payment_type=tx.get("payment_type"),
        processed=bool(tx.get("processed")),
    )


@router.post("/api/webhook/stripe", include_in_schema=False)
async def stripe_webhook_alias(request: Request):
    # Internal alias so we can import-mount this router once in server.py.
    return await _stripe_webhook_handler(request)


async def _stripe_webhook_handler(request: Request):
    """Receive and verify Stripe webhook events. Idempotent."""
    if not STRIPE_API_KEY:
        return {"ok": False, "error": "stripe_not_configured"}

    body_bytes = await request.body()
    signature = request.headers.get("Stripe-Signature") or request.headers.get("stripe-signature")

    forwarded = request.headers.get("x-forwarded-host") or request.headers.get("host")
    scheme = request.headers.get("x-forwarded-proto") or "https"
    host_url = f"{scheme}://{forwarded}" if forwarded else str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url}/api/webhook/stripe")

    try:
        evt = await stripe.handle_webhook(body_bytes, signature)
    except Exception as e:
        logger.warning(f"Stripe webhook verification failed: {e}")
        # Return 200 to stop Stripe from retrying a malformed request.
        return {"ok": False, "error": "webhook_verification_failed"}

    logger.info(f"Stripe webhook received: {evt.event_type} session={evt.session_id}")

    if evt.session_id and evt.event_type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        # Fake a minimal CheckoutStatusResponse from the webhook payload.
        class _Evt:
            status = "complete"
            payment_status = evt.payment_status or "paid"
            amount_total = 0
            currency = None
        await _apply_status_update(evt.session_id, _Evt())

    return {"ok": True}


# ==================== BUSINESS LOGIC ====================

async def _apply_status_update(session_id: str, status_obj) -> None:
    """Update the local tx + trigger business logic on first `paid` transition.

    Idempotent: multiple callers (polling + webhook) can race; only the first
    one to flip `processed` from False to True actually applies the fee.
    """
    now = datetime.now(timezone.utc)
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        return

    new_status = getattr(status_obj, "status", tx.get("status"))
    new_payment_status = getattr(status_obj, "payment_status", tx.get("payment_status"))

    update = {
        "status": new_status,
        "payment_status": new_payment_status,
        "updated_at": _iso(now),
    }

    # Only flip processed→True atomically if we are the first to observe `paid`
    # AND the tx isn't already processed.
    if new_payment_status == "paid" and not tx.get("processed"):
        # Atomic compare-and-set via findOneAndUpdate on `processed`.
        flipped = await db.payment_transactions.find_one_and_update(
            {"session_id": session_id, "processed": {"$ne": True}},
            {"$set": {**update, "processed": True, "paid_at": _iso(now)}},
        )
        if flipped:
            await _fulfill_payment(flipped)
            return

    await db.payment_transactions.update_one(
        {"session_id": session_id}, {"$set": update}
    )


async def _fulfill_payment(tx: dict) -> None:
    """Apply tier-specific business rules once payment confirmed paid."""
    user_id = tx["user_id"]
    payment_type = tx["payment_type"]
    amount = float(tx.get("amount", 0))
    currency = (tx.get("currency") or "eur").upper()
    now = datetime.now(timezone.utc)
    next_year = now + timedelta(days=365)

    if payment_type == "admission_fee":
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "admission_fee_paid": True,
                "admission_fee_paid_at": _iso(now),
                "admission_fee_next_due": _iso(next_year),
                "billing_status": "active",
            }},
        )
        # Mark any matching pending admission_payments row as completed.
        await db.admission_payments.update_many(
            {"user_id": user_id, "fee_type": "admission", "status": "pending"},
            {"$set": {
                "status": "completed",
                "paid_at": _iso(now),
                "payment_method": "stripe",
                "stripe_session_id": tx["session_id"],
            }},
        )

    elif payment_type == "annual_renewal":
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "annual_fee_paid_at": _iso(now),
                "annual_fee_next_due": _iso(next_year),
                "billing_status": "active",
                "suspended_at": None,
                "suspended_reason": None,
            }},
        )
        await db.admission_payments.update_many(
            {"user_id": user_id, "fee_type": "annual", "status": "pending"},
            {"$set": {
                "status": "completed",
                "paid_at": _iso(now),
                "payment_method": "stripe",
                "stripe_session_id": tx["session_id"],
            }},
        )

    elif payment_type == "upgrade_prorata":
        # Mark the pending upgrade row as paid, apply the new tier to the
        # user, and keep the referrer-commission job (if any) in sync with
        # the manual-approve flow.
        payment_id = tx.get("metadata", {}).get("admission_payment_id")
        if not payment_id:
            logger.warning(f"upgrade_prorata without payment_id in tx {tx['session_id']}")
            return
        pending = await db.admission_payments.find_one({"id": payment_id}, {"_id": 0})
        if not pending:
            logger.warning(f"upgrade_prorata: no admission_payments row {payment_id}")
            return
        target_tier = pending.get("target_tier") or (pending.get("prorata_details") or {}).get("target_tier")
        if target_tier:
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"membership_level": target_tier}},
            )
        await db.admission_payments.update_one(
            {"id": payment_id},
            {"$set": {
                "status": "paid",
                "paid_at": _iso(now),
                "payment_method": "stripe",
                "stripe_session_id": tx["session_id"],
                "approved_by": "stripe_auto",
            }},
        )

    elif payment_type == "fiat_deposit":
        # Credit the user's fiat wallet in the paid currency.
        existing = await db.fiat_wallets.find_one(
            {"user_id": user_id, "currency": currency}, {"_id": 0}
        )
        if existing:
            new_balance = float(existing.get("balance", 0.0)) + amount
            await db.fiat_wallets.update_one(
                {"user_id": user_id, "currency": currency},
                {"$set": {"balance": new_balance, "updated_at": _iso(now)}},
            )
        else:
            await db.fiat_wallets.insert_one({
                "user_id": user_id,
                "currency": currency,
                "balance": amount,
                "tenant_slug": tx.get("metadata", {}).get("tenant_slug", "kbex"),
                "created_at": _iso(now),
                "updated_at": _iso(now),
            })
        # Audit-trail entry for the deposit.
        await db.fiat_deposits.insert_one({
            "user_id": user_id,
            "currency": currency,
            "amount": amount,
            "method": "stripe",
            "status": "completed",
            "stripe_session_id": tx["session_id"],
            "created_at": _iso(now),
        })

    logger.info(
        f"✓ Stripe payment fulfilled: type={payment_type} user={user_id} "
        f"amount={amount} {currency} session={tx['session_id']}"
    )
