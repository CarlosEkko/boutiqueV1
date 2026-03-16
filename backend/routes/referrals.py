"""
Referral System Routes - Client Referrals and Fee Management
Handles referral tracking, commission calculation, and client assignment
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from utils.auth import get_current_user_id
from routes.admin import get_admin_user, get_internal_user, get_manager_or_admin

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
    min_payout_amount: float = Field(default=50.0, ge=0, description="Minimum amount for commission payout")
    payout_currency: str = Field(default="EUR", description="Currency for commission payouts")


class AdmissionFeeConfig(BaseModel):
    """Configuration for annual admission fee"""
    amount_eur: float = Field(default=500.0, ge=0, description="Annual fee in EUR")
    amount_usd: float = Field(default=550.0, ge=0, description="Annual fee in USD")
    amount_aed: float = Field(default=2000.0, ge=0, description="Annual fee in AED")
    amount_brl: float = Field(default=2750.0, ge=0, description="Annual fee in BRL")
    is_active: bool = Field(default=True, description="Whether admission fee is required")
    grace_period_days: int = Field(default=7, description="Days to pay after registration")


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
    
    # Check if user has paid
    payment = await db.admission_payments.find_one(
        {"user_id": user_id, "status": "paid"},
        {"_id": 0}
    )
    
    if payment:
        return {
            "required": True,
            "paid": True,
            "payment": payment,
            "next_due": payment.get("next_due_date")
        }
    
    # Check for pending payment
    pending = await db.admission_payments.find_one(
        {"user_id": user_id, "status": "pending"},
        {"_id": 0}
    )
    
    return {
        "required": True,
        "paid": False,
        "pending_payment": pending,
        "amounts": {
            "EUR": admission_config.get("amount_eur", 500),
            "USD": admission_config.get("amount_usd", 550),
            "AED": admission_config.get("amount_aed", 2000),
            "BRL": admission_config.get("amount_brl", 2750)
        },
        "grace_period_days": admission_config.get("grace_period_days", 7)
    }


@router.post("/admission-fee/request")
async def request_admission_fee_payment(
    currency: str = "EUR",
    user_id: str = Depends(get_current_user_id)
):
    """Request to pay admission fee"""
    settings = await get_platform_settings()
    admission_config = settings.get("admission_fee", {})
    
    if not admission_config.get("is_active", True):
        return {"success": True, "message": "Taxa de admissão não é necessária"}
    
    # Check if already paid
    existing = await db.admission_payments.find_one({
        "user_id": user_id,
        "status": {"$in": ["paid", "pending"]}
    })
    
    if existing and existing.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Taxa de admissão já foi paga")
    
    if existing and existing.get("status") == "pending":
        return {
            "success": True,
            "payment_id": existing.get("id"),
            "message": "Pagamento pendente já existe"
        }
    
    # Get amount for currency
    amount_key = f"amount_{currency.lower()}"
    amount = admission_config.get(amount_key, admission_config.get("amount_eur", 500))
    
    # Create payment request
    payment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "amount": amount,
        "currency": currency,
        "status": "pending",
        "type": "annual_admission",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admission_payments.insert_one(payment)
    
    return {
        "success": True,
        "payment_id": payment["id"],
        "amount": amount,
        "currency": currency,
        "message": "Solicitação de pagamento criada"
    }


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
    next_year = datetime(now.year + 1, now.month, now.day, tzinfo=timezone.utc)
    
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
    
    # Update user status
    await db.users.update_one(
        {"id": payment.get("user_id")},
        {
            "$set": {
                "admission_fee_paid": True,
                "admission_fee_paid_at": now.isoformat(),
                "admission_fee_next_due": next_year.isoformat()
            }
        }
    )
    
    logger.info(f"Admission fee payment {payment_id} approved by {admin.get('email')}")
    
    return {"success": True, "message": "Pagamento aprovado com sucesso"}


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
