"""
Referral System Routes - Client Referrals and Fee Management
Handles referral tracking, commission calculation, and client assignment
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from utils.auth import get_current_user_id
from utils.i18n import t, I18n
from routes.admin import get_admin_user, get_internal_user, get_manager_or_admin
from services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/referrals", tags=["Referrals"])

# Database reference
db = None


def set_db(database):
    global db
    db = database


# ==================== MODELS ====================

class ReferralFeeConfig(BaseModel):
    """Configuration for referral fees"""
    trading_fee_percent: float = Field(default=10.0, ge=0, le=100, description="% of trading fee given to referrer")
    deposit_fee_percent: float = Field(default=5.0, ge=0, le=100, description="% of deposit fee given to referrer")
    withdrawal_fee_percent: float = Field(default=5.0, ge=0, le=100, description="% of withdrawal fee given to referrer")
    admission_fee_percent: float = Field(default=0.0, ge=0, le=100, description="% of INITIAL admission fee given to referrer")
    annual_commission_percent: float = Field(default=0.0, ge=0, le=100, description="% of ANNUAL renewal fee given to referrer")
    upgrade_commission_percent: float = Field(default=0.0, ge=0, le=100, description="% of UPGRADE differential fee given to referrer")
    min_payout_amount: float = Field(default=50.0, ge=0, description="Minimum amount for commission payout")
    payout_currency: str = Field(default="EUR", description="Currency for commission payouts")


class AdmissionFeeConfig(BaseModel):
    """Configuration for annual admission fee by client profile (EUR reference only)"""
    broker_eur: float = Field(default=0.0, ge=0, description="Broker annual fee in EUR")
    standard_eur: float = Field(default=500.0, ge=0, description="Standard annual fee in EUR")
    premium_eur: float = Field(default=2500.0, ge=0, description="Premium annual fee in EUR")
    vip_eur: float = Field(default=10000.0, ge=0, description="VIP annual fee in EUR")
    institucional_eur: float = Field(default=25000.0, ge=0, description="Institucional annual fee in EUR")
    is_active: bool = Field(default=True, description="Whether admission fee is required")


class CreateReferralRequest(BaseModel):
    """Request to create a client referral"""
    client_id: str = Field(..., description="ID of the client being referred")
    notes: Optional[str] = None


class TransferReferralRequest(BaseModel):
    """Request to transfer a referral to another staff member"""
    new_referrer_id: str = Field(..., description="ID of the new staff member")
    reason: Optional[str] = None


class ReferralPayoutRequest(BaseModel):
    """Request for commission payout"""
    referrer_id: str
    amount: float
    currency: str = "EUR"
    notes: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

async def get_platform_settings():
    """Get platform settings from database"""
    settings = await db.platform_settings.find_one({"type": "general"}, {"_id": 0})
    if not settings:
        # Create default settings
        settings = {
            "type": "general",
            "referral_fees": ReferralFeeConfig().model_dump(),
            "admission_fee": AdmissionFeeConfig().model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.platform_settings.insert_one(settings)
    return settings


async def calculate_referrer_commission(transaction_type: str, fee_amount: float, currency: str) -> dict:
    """Calculate commission for a referrer based on transaction"""
    settings = await get_platform_settings()
    referral_fees = settings.get("referral_fees", {})
    
    if transaction_type == "trading":
        percent = referral_fees.get("trading_fee_percent", 10.0)
    elif transaction_type == "deposit":
        percent = referral_fees.get("deposit_fee_percent", 5.0)
    elif transaction_type == "withdrawal":
        percent = referral_fees.get("withdrawal_fee_percent", 5.0)
    elif transaction_type == "admission":
        percent = referral_fees.get("admission_fee_percent", 0.0)
    elif transaction_type == "annual":
        percent = referral_fees.get("annual_commission_percent", 0.0)
    elif transaction_type == "upgrade":
        percent = referral_fees.get("upgrade_commission_percent", 0.0)
    else:
        percent = 0
    
    commission = fee_amount * (percent / 100)
    
    return {
        "commission_amount": commission,
        "commission_percent": percent,
        "original_fee": fee_amount,
        "currency": currency
    }


# ==================== ADMIN ENDPOINTS - SETTINGS ====================

@router.get("/settings")
async def get_referral_settings(admin: dict = Depends(get_admin_user)):
    """Get referral and admission fee settings (Admin only)"""
    settings = await get_platform_settings()
    return {
        "referral_fees": settings.get("referral_fees", ReferralFeeConfig().model_dump()),
        "admission_fee": settings.get("admission_fee", AdmissionFeeConfig().model_dump()),
        "updated_at": settings.get("updated_at")
    }


@router.put("/settings/referral-fees")
async def update_referral_fees(
    config: ReferralFeeConfig,
    admin: dict = Depends(get_admin_user)
):
    """Update referral fee configuration (Admin only)"""
    await db.platform_settings.update_one(
        {"type": "general"},
        {
            "$set": {
                "referral_fees": config.model_dump(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    logger.info(f"Referral fees updated by {admin.get('email')}")
    return {"success": True, "message": "Taxas de referência atualizadas"}


@router.put("/settings/admission-fee")
async def update_admission_fee(
    config: AdmissionFeeConfig,
    admin: dict = Depends(get_admin_user)
):
    """Update admission fee configuration (Admin only)"""
    await db.platform_settings.update_one(
        {"type": "general"},
        {
            "$set": {
                "admission_fee": config.model_dump(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    logger.info(f"Admission fee updated by {admin.get('email')}")
    return {"success": True, "message": "Taxa de admissão atualizada"}


# ==================== STAFF ENDPOINTS - REFERRALS ====================

@router.post("/create")
async def create_referral(
    request: CreateReferralRequest,
    staff: dict = Depends(get_internal_user)
):
    """Create a new client referral (Internal staff only)"""
    # Check if client exists
    client = await db.users.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    if client.get("user_type") == "internal":
        raise HTTPException(status_code=400, detail="Não é possível referenciar utilizadores internos")
    
    # Check if client already has a referrer
    existing_referral = await db.referrals.find_one({
        "client_id": request.client_id,
        "status": "active"
    })
    
    if existing_referral:
        raise HTTPException(
            status_code=400, 
            detail=f"Cliente já está referenciado por {existing_referral.get('referrer_name')}"
        )
    
    # Create referral
    referral = {
        "id": str(uuid.uuid4()),
        "client_id": request.client_id,
        "client_email": client.get("email"),
        "client_name": client.get("name"),
        "referrer_id": staff.get("id"),
        "referrer_email": staff.get("email"),
        "referrer_name": staff.get("name"),
        "status": "active",  # active, transferred, removed
        "notes": request.notes,
        "total_commissions_earned": 0.0,
        "total_commissions_paid": 0.0,
        "pending_commissions": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referrals.insert_one(referral)
    
    # Update client record with referrer info
    await db.users.update_one(
        {"id": request.client_id},
        {
            "$set": {
                "referred_by": staff.get("id"),
                "referred_by_name": staff.get("name"),
                "referral_date": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    logger.info(f"Referral created: {staff.get('email')} -> {client.get('email')}")
    
    return {
        "success": True,
        "message": f"Cliente {client.get('name')} referenciado com sucesso",
        "referral_id": referral["id"]
    }


@router.get("/my-referrals")
async def get_my_referrals(
    status: Optional[str] = None,
    staff: dict = Depends(get_internal_user)
):
    """Get referrals for the current staff member"""
    query = {"referrer_id": staff.get("id")}
    if status:
        query["status"] = status
    
    referrals = await db.referrals.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Calculate totals
    total_earned = sum(r.get("total_commissions_earned", 0) for r in referrals)
    total_pending = sum(r.get("pending_commissions", 0) for r in referrals)
    total_paid = sum(r.get("total_commissions_paid", 0) for r in referrals)
    
    return {
        "referrals": referrals,
        "count": len(referrals),
        "summary": {
            "total_earned": total_earned,
            "total_pending": total_pending,
            "total_paid": total_paid,
            "active_referrals": len([r for r in referrals if r.get("status") == "active"])
        }
    }


@router.get("/client/{client_id}")
async def get_client_referral_info(
    client_id: str,
    user: dict = Depends(get_internal_user)
):
    """Get referral info for a specific client"""
    referral = await db.referrals.find_one(
        {"client_id": client_id, "status": "active"},
        {"_id": 0}
    )
    
    if not referral:
        return {"has_referrer": False, "referral": None}
    
    return {"has_referrer": True, "referral": referral}


# ==================== ADMIN ENDPOINTS - MANAGE REFERRALS ====================

@router.get("/all")
async def get_all_referrals(
    status: Optional[str] = None,
    referrer_id: Optional[str] = None,
    admin: dict = Depends(get_manager_or_admin)
):
    """Get all referrals (Admin/Manager only)"""
    query = {}
    if status:
        query["status"] = status
    if referrer_id:
        query["referrer_id"] = referrer_id
    
    referrals = await db.referrals.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Get summary by referrer
    referrer_stats = {}
    for ref in referrals:
        rid = ref.get("referrer_id")
        if rid not in referrer_stats:
            referrer_stats[rid] = {
                "name": ref.get("referrer_name"),
                "email": ref.get("referrer_email"),
                "active_count": 0,
                "total_earned": 0,
                "total_pending": 0
            }
        if ref.get("status") == "active":
            referrer_stats[rid]["active_count"] += 1
        referrer_stats[rid]["total_earned"] += ref.get("total_commissions_earned", 0)
        referrer_stats[rid]["total_pending"] += ref.get("pending_commissions", 0)
    
    return {
        "referrals": referrals,
        "count": len(referrals),
        "referrer_stats": list(referrer_stats.values())
    }


@router.post("/{referral_id}/transfer")
async def transfer_referral(
    referral_id: str,
    request: TransferReferralRequest,
    admin: dict = Depends(get_admin_user)
):
    """Transfer a client to another staff member (Admin only)"""
    referral = await db.referrals.find_one({"id": referral_id})
    if not referral:
        raise HTTPException(status_code=404, detail="Referência não encontrada")
    
    # Get new referrer
    new_referrer = await db.users.find_one({"id": request.new_referrer_id}, {"_id": 0})
    if not new_referrer:
        raise HTTPException(status_code=404, detail="Novo referenciador não encontrado")
    
    if new_referrer.get("user_type") != "internal":
        raise HTTPException(status_code=400, detail="O novo referenciador deve ser utilizador interno")
    
    old_referrer_name = referral.get("referrer_name")
    
    # Update referral
    now = datetime.now(timezone.utc).isoformat()
    await db.referrals.update_one(
        {"id": referral_id},
        {
            "$set": {
                "referrer_id": request.new_referrer_id,
                "referrer_email": new_referrer.get("email"),
                "referrer_name": new_referrer.get("name"),
                "updated_at": now,
                "transfer_history": {
                    "from": old_referrer_name,
                    "to": new_referrer.get("name"),
                    "date": now,
                    "reason": request.reason,
                    "transferred_by": admin.get("email")
                }
            },
            "$push": {
                "history": {
                    "action": "transferred",
                    "from": old_referrer_name,
                    "to": new_referrer.get("name"),
                    "date": now,
                    "by": admin.get("email"),
                    "reason": request.reason
                }
            }
        }
    )
    
    # Update client record
    await db.users.update_one(
        {"id": referral.get("client_id")},
        {
            "$set": {
                "referred_by": request.new_referrer_id,
                "referred_by_name": new_referrer.get("name")
            }
        }
    )
    
    logger.info(f"Referral {referral_id} transferred from {old_referrer_name} to {new_referrer.get('name')} by {admin.get('email')}")
    
    return {"success": True, "message": "Referência transferida com sucesso"}


@router.delete("/{referral_id}")
async def remove_referral(
    referral_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Remove a referral (Admin only)"""
    referral = await db.referrals.find_one({"id": referral_id})
    if not referral:
        raise HTTPException(status_code=404, detail="Referência não encontrada")
    
    # Update referral status
    await db.referrals.update_one(
        {"id": referral_id},
        {
            "$set": {
                "status": "removed",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "removed_by": admin.get("email"),
                "removed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Clear referrer from client
    await db.users.update_one(
        {"id": referral.get("client_id")},
        {
            "$unset": {
                "referred_by": "",
                "referred_by_name": ""
            }
        }
    )
    
    logger.info(f"Referral {referral_id} removed by {admin.get('email')}")
    
    return {"success": True, "message": "Referência removida com sucesso"}


# ==================== COMMISSION TRACKING ====================

@router.post("/commission/record")
async def record_commission(
    client_id: str,
    transaction_type: str,
    fee_amount: float,
    currency: str = "EUR",
    internal_call: bool = True
):
    """Record a commission for a referral (Internal API call)"""
    if not internal_call:
        raise HTTPException(status_code=403, detail="Internal use only")
    
    # Find active referral for this client
    referral = await db.referrals.find_one({
        "client_id": client_id,
        "status": "active"
    })
    
    if not referral:
        return {"recorded": False, "reason": "No active referral"}
    
    # Calculate commission
    commission_info = await calculate_referrer_commission(transaction_type, fee_amount, currency)
    commission = commission_info["commission_amount"]
    
    if commission <= 0:
        return {"recorded": False, "reason": "Zero commission"}
    
    # Record commission
    commission_record = {
        "id": str(uuid.uuid4()),
        "referral_id": referral.get("id"),
        "referrer_id": referral.get("referrer_id"),
        "client_id": client_id,
        "transaction_type": transaction_type,
        "original_fee": fee_amount,
        "commission_amount": commission,
        "commission_percent": commission_info["commission_percent"],
        "currency": currency,
        "status": "pending",  # pending, approved, paid
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referral_commissions.insert_one(commission_record)
    
    # Update referral totals
    await db.referrals.update_one(
        {"id": referral.get("id")},
        {
            "$inc": {
                "total_commissions_earned": commission,
                "pending_commissions": commission
            },
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    logger.info(f"Commission recorded: {commission} {currency} for referrer {referral.get('referrer_email')}")
    
    return {
        "recorded": True,
        "commission_id": commission_record["id"],
        "amount": commission,
        "referrer_id": referral.get("referrer_id")
    }


@router.get("/commissions/pending")
async def get_pending_commissions(admin: dict = Depends(get_admin_user)):
    """Get all pending commissions (Admin only)"""
    commissions = await db.referral_commissions.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Group by referrer
    by_referrer = {}
    for c in commissions:
        rid = c.get("referrer_id")
        if rid not in by_referrer:
            by_referrer[rid] = {
                "referrer_id": rid,
                "total_pending": 0,
                "commissions": []
            }
        by_referrer[rid]["total_pending"] += c.get("commission_amount", 0)
        by_referrer[rid]["commissions"].append(c)
    
    return {
        "commissions": commissions,
        "by_referrer": list(by_referrer.values()),
        "total_pending": sum(c.get("commission_amount", 0) for c in commissions)
    }


@router.post("/commissions/payout")
async def process_commission_payout(
    request: ReferralPayoutRequest,
    admin: dict = Depends(get_admin_user)
):
    """Process commission payout to a referrer (Admin only)"""
    # Get referrer
    referrer = await db.users.find_one({"id": request.referrer_id}, {"_id": 0})
    if not referrer:
        raise HTTPException(status_code=404, detail="Referenciador não encontrado")
    
    # Get pending commissions for this referrer
    pending = await db.referral_commissions.find({
        "referrer_id": request.referrer_id,
        "status": "pending"
    }).to_list(1000)
    
    total_pending = sum(c.get("commission_amount", 0) for c in pending)
    
    if request.amount > total_pending:
        raise HTTPException(
            status_code=400, 
            detail=f"Valor de pagamento ({request.amount}) excede comissões pendentes ({total_pending})"
        )
    
    # Mark commissions as paid
    commission_ids = [c.get("id") for c in pending][:int(request.amount / (total_pending / len(pending)))] if pending else []
    
    await db.referral_commissions.update_many(
        {"id": {"$in": commission_ids}},
        {
            "$set": {
                "status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "paid_by": admin.get("email")
            }
        }
    )
    
    # Update referral totals
    referrals = await db.referrals.find({"referrer_id": request.referrer_id}).to_list(100)
    for ref in referrals:
        await db.referrals.update_one(
            {"id": ref.get("id")},
            {
                "$inc": {
                    "total_commissions_paid": request.amount / len(referrals),
                    "pending_commissions": -request.amount / len(referrals)
                }
            }
        )
    
    # Create payout record
    payout = {
        "id": str(uuid.uuid4()),
        "referrer_id": request.referrer_id,
        "referrer_email": referrer.get("email"),
        "referrer_name": referrer.get("name"),
        "amount": request.amount,
        "currency": request.currency,
        "notes": request.notes,
        "processed_by": admin.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referral_payouts.insert_one(payout)
    
    logger.info(f"Commission payout of {request.amount} {request.currency} to {referrer.get('email')} by {admin.get('email')}")
    
    return {
        "success": True,
        "message": f"Pagamento de {request.amount} {request.currency} processado",
        "payout_id": payout["id"]
    }


# ==================== ADMISSION FEE ====================

@router.get("/admission-fee/status/{user_id}")
async def get_admission_fee_status(user_id: str):
    """Get admission fee payment status for a user"""
    settings = await get_platform_settings()
    admission_config = settings.get("admission_fee", {})
    
    if not admission_config.get("is_active", True):
        return {
            "required": False,
            "paid": True,
            "message": "Taxa de admissão não está ativa"
        }
    
    # Get user to determine tier and type
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return {
            "required": False,
            "paid": True,
            "message": "Utilizador não encontrado"
        }
    
    # Internal users don't need to pay admission fee
    if user.get("user_type") == "internal":
        return {
            "required": False,
            "paid": True,
            "message": "Taxa não aplicável a utilizadores internos"
        }
    
    membership_level = user.get("membership_level", "standard")
    
    # Filter for admission rows only (the same collection now stores annual_fee too)
    admission_filter = {
        "$or": [
            {"fee_type": "admission"},
            {"fee_type": {"$exists": False}},
            {"fee_type": None},
        ],
    }

    # Check if user has paid
    payment = await db.admission_payments.find_one(
        {"user_id": user_id, "status": "paid", **admission_filter},
        {"_id": 0}
    )
    
    if payment:
        return {
            "required": True,
            "paid": True,
            "payment": payment,
            "next_due": payment.get("next_due_date"),
            "membership_level": membership_level
        }
    
    # Check for pending payment
    pending = await db.admission_payments.find_one(
        {"user_id": user_id, "status": "pending", **admission_filter},
        {"_id": 0}
    )
    
    # Get EUR amount for user's membership level
    tier_prefix = membership_level.lower()
    eur_amount = admission_config.get(f"{tier_prefix}_eur", admission_config.get("standard_eur", 500))
    
    # Fetch live crypto prices for conversion
    crypto_amounts = {}
    try:
        import httpx
        BINANCE_API_URL = "https://api.binance.com/api/v3"
        async with httpx.AsyncClient(timeout=10.0) as client:
            for crypto_symbol in ["BTC", "ETH"]:
                resp = await client.get(
                    f"{BINANCE_API_URL}/ticker/price",
                    params={"symbol": f"{crypto_symbol}USDT"}
                )
                if resp.status_code == 200:
                    price_usd = float(resp.json().get("price", 0))
                    if price_usd > 0:
                        # Get EUR/USD rate
                        eur_usd_resp = await client.get(
                            f"{BINANCE_API_URL}/ticker/price",
                            params={"symbol": "EURUSDT"}
                        )
                        eur_usd = float(eur_usd_resp.json().get("price", 1.08)) if eur_usd_resp.status_code == 200 else 1.08
                        # Convert EUR amount to crypto: EUR -> USD -> Crypto
                        usd_amount = eur_amount * eur_usd
                        crypto_amounts[crypto_symbol] = round(usd_amount / price_usd, 8)
            # USDT/USDC are 1:1 with USD
            eur_usd_rate = 1.08
            try:
                eur_resp = await client.get(f"{BINANCE_API_URL}/ticker/price", params={"symbol": "EURUSDT"})
                if eur_resp.status_code == 200:
                    eur_usd_rate = float(eur_resp.json().get("price", 1.08))
            except Exception:
                pass
            usdt_amount = round(eur_amount * eur_usd_rate, 2)
            crypto_amounts["USDT"] = usdt_amount
            crypto_amounts["USDC"] = usdt_amount
    except Exception as e:
        logger.warning(f"Failed to fetch crypto prices for admission fee: {e}")
    
    return {
        "required": True,
        "paid": False,
        "pending_payment": pending,
        "membership_level": membership_level,
        "eur_amount": eur_amount,
        "crypto_amounts": crypto_amounts
    }


@router.post("/admission-fee/request")
async def request_admission_fee_payment(
    currency: str = "EUR",
    user_id: str = Depends(get_current_user_id)
):
    """Request to pay admission fee"""
    logger.info(f"admission-fee/request: user_id={user_id} currency={currency}")
    try:
        settings = await get_platform_settings()
        admission_config = settings.get("admission_fee", {}) or {}

        if not admission_config.get("is_active", True):
            return {"success": True, "message": "Taxa de admissão não é necessária"}

        # Check if already paid (admission only — annual_fee rows live in the same collection)
        existing = await db.admission_payments.find_one({
            "user_id": user_id,
            "status": {"$in": ["paid", "pending"]},
            "$or": [
                {"fee_type": "admission"},
                {"fee_type": {"$exists": False}},  # legacy rows default to admission
                {"fee_type": None},
            ],
        })

        if existing and existing.get("status") == "paid":
            raise HTTPException(status_code=400, detail="Taxa de admissão já foi paga")

        if existing and existing.get("status") == "pending":
            return {
                "success": True,
                "payment_id": existing.get("id"),
                "amount": float(existing.get("amount") or 0),
                "currency": existing.get("currency") or "EUR",
                "message": "Pagamento pendente já existe",
            }

        # Get user membership level (defensive against missing/None values)
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            logger.error(f"admission-fee/request: user {user_id} not found in users collection")
            raise HTTPException(status_code=404, detail="Utilizador não encontrado")

        ml_raw = user.get("membership_level")
        membership_level = str(ml_raw).lower() if ml_raw else "standard"
        # Map institutional → institucional (DB key)
        if membership_level == "institutional":
            membership_level = "institucional"

        # Get EUR amount for tier
        eur_amount = admission_config.get(f"{membership_level}_eur")
        if eur_amount is None:
            eur_amount = admission_config.get("standard_eur", 500)
        eur_amount = float(eur_amount or 0)

        # Create payment request
        payment = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user.get("email"),
            "user_name": user.get("name"),
            "fee_type": "admission",  # initial onboarding
            "membership_level": membership_level,
            "amount": eur_amount,
            "currency": "EUR",
            "status": "pending",
            "type": "annual_admission",
            "tenant_slug": user.get("tenant_slug") or "kbex",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.admission_payments.insert_one(payment)

        return {
            "success": True,
            "payment_id": payment["id"],
            "amount": eur_amount,
            "currency": "EUR",
            "membership_level": membership_level,
            "message": "Solicitação de pagamento criada",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"admission-fee/request failed for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao iniciar pagamento: {e}")


@router.post("/admission-fee/{payment_id}/approve")
async def approve_admission_payment(
    payment_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Approve an admission fee payment (Admin only)"""
    payment = await db.admission_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    
    if payment.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Pagamento já foi aprovado")
    
    now = datetime.now(timezone.utc)
    # Anniversary = +1 year from today (independent of initial admission date)
    next_year = datetime(now.year + 1, now.month, now.day, tzinfo=timezone.utc)

    fee_type = payment.get("fee_type", "admission")  # legacy payments default to admission

    await db.admission_payments.update_one(
        {"id": payment_id},
        {
            "$set": {
                "status": "paid",
                "paid_at": now.isoformat(),
                "approved_by": admin.get("email"),
                "next_due_date": next_year.isoformat()
            }
        }
    )

    # Update user status — differentiate admission vs annual
    user_update = {
        "annual_fee_paid_at": now.isoformat(),
        "annual_fee_next_due": next_year.isoformat(),
        "billing_status": "active",
    }
    if fee_type == "admission":
        # First-time admission: also stamp admission fields (kept for backward compat)
        user_update.update({
            "admission_fee_paid": True,
            "admission_fee_paid_at": now.isoformat(),
            "admission_fee_next_due": next_year.isoformat(),
        })

    await db.users.update_one(
        {"id": payment.get("user_id")},
        {"$set": user_update, "$unset": {"suspended_at": "", "suspended_reason": "", "suspended_by": ""}},
    )

    logger.info(f"{fee_type.title()} payment {payment_id} approved by {admin.get('email')}")

    # Calculate referrer commission if client was referred
    try:
        user_id = payment.get("user_id")
        referral = await db.referrals.find_one({"client_id": user_id, "status": "active"})
        if referral:
            commission_data = await calculate_referrer_commission(
                fee_type, payment.get("amount", 0), payment.get("currency", "EUR")
            )
            if commission_data["commission_amount"] > 0:
                commission_record = {
                    "id": str(uuid.uuid4()),
                    "referral_id": referral.get("id"),
                    "referrer_id": referral.get("referrer_id"),
                    "client_id": user_id,
                    "transaction_type": fee_type,
                    "original_amount": payment.get("amount", 0),
                    "commission_amount": commission_data["commission_amount"],
                    "commission_percent": commission_data["commission_percent"],
                    "currency": payment.get("currency", "EUR"),
                    "status": "pending",
                    "created_at": now.isoformat()
                }
                await db.referral_commissions.insert_one(commission_record)
                logger.info(f"{fee_type.title()} commission {commission_data['commission_amount']} {payment.get('currency', 'EUR')} credited to referrer {referral.get('referrer_id')}")
    except Exception as e:
        logger.warning(f"Failed to calculate referrer commission: {e}")

    # Transactional email (Brevo) — payment confirmed (manual admin approval)
    try:
        recipient_email = payment.get("user_email") or (await db.users.find_one({"id": payment.get("user_id")}, {"_id": 0, "email": 1}) or {}).get("email")
        recipient_name = payment.get("user_name") or recipient_email
        tier_label = payment.get("membership_level") or ""
        if recipient_email:
            import os as _os
            portal_url = f"{_os.environ.get('FRONTEND_URL', 'https://kbex.io').rstrip('/')}/dashboard/profile#billing"
            await email_service.send_billing_payment_confirmed(
                to_email=recipient_email,
                to_name=recipient_name,
                fee_type=fee_type,
                amount_eur=float(payment.get("amount", 0)),
                tier_label=tier_label,
                tx_id=payment_id,
                next_due=next_year.isoformat()[:10],
                portal_url=portal_url,
            )
    except Exception as e:
        logger.warning(f"Billing email failed (manual approve payment={payment_id}): {e}")

    return {"success": True, "message": "Pagamento aprovado com sucesso", "fee_type": fee_type}


@router.post("/admission-fee/{payment_id}/reject")
async def reject_admission_payment(
    payment_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Reject an admission fee payment (Admin only)"""
    payment = await db.admission_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")
    
    if payment.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Pagamento não está pendente")
    
    # Update payment status to rejected
    await db.admission_payments.update_one(
        {"id": payment_id},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": datetime.now(timezone.utc).isoformat(),
                "rejected_by": admin.get("email")
            }
        }
    )
    
    logger.info(f"Admission fee payment {payment_id} rejected by {admin.get('email')}")
    
    return {"success": True, "message": "Pagamento rejeitado"}


@router.get("/admission-fee/payments")
async def get_admission_payments(
    status: str = "pending",
    admin: dict = Depends(get_admin_user)
):
    """Get admission fee payments with optional status filter (Admin only)"""
    query = {}
    if status != "all":
        # Handle "approved" filter to include both "approved" and "paid" statuses
        if status == "approved":
            query["status"] = {"$in": ["approved", "paid"]}
        else:
            query["status"] = status
    
    payments = await db.admission_payments.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Enrich with user info and normalize status
    for payment in payments:
        user = await db.users.find_one({"id": payment.get("user_id")}, {"_id": 0, "hashed_password": 0})
        if user:
            payment["user_name"] = user.get("name")
            payment["user_email"] = user.get("email")
            payment["tier"] = user.get("membership_level", "standard")
        # Normalize "paid" to "approved" for frontend consistency
        if payment.get("status") == "paid":
            payment["status"] = "approved"
    
    return payments


@router.get("/admission-fee/pending")
async def get_pending_admission_payments(admin: dict = Depends(get_admin_user)):
    """Get all pending admission fee payments (Admin only)"""
    payments = await db.admission_payments.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Enrich with user info
    for payment in payments:
        user = await db.users.find_one({"id": payment.get("user_id")}, {"_id": 0, "password": 0})
        if user:
            payment["user_name"] = user.get("name")
            payment["user_email"] = user.get("email")
    
    return {"payments": payments, "count": len(payments)}
