"""
OTC Deals, Compliance & Commissions Routes for KBEX Exchange
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from enum import Enum
import uuid
import logging
import httpx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/otc-deals", tags=["OTC Deals"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db

# Auth dependency
from routes.auth import get_current_user

async def get_current_user_id(current_user=Depends(get_current_user)):
    if hasattr(current_user, 'id'):
        return current_user.id
    return current_user["id"]

# ==================== ENUMS ====================

class DealType(str, Enum):
    BUY = "buy"
    SELL = "sell"

class DealStatus(str, Enum):
    DRAFT = "draft"
    QUALIFICATION = "qualification"
    COMPLIANCE = "compliance"
    NEGOTIATION = "negotiation"
    APPROVED = "approved"
    EXECUTING = "executing"
    SETTLED = "settled"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class ComplianceItemStatus(str, Enum):
    NOT_STARTED = "not_started"
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    EXPIRED = "expired"

class CommissionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"

# ==================== REQUEST MODELS ====================

class OTCDealCreate(BaseModel):
    deal_type: str = "buy"
    asset: str = "BTC"
    quantity: float = 0
    reference_price: float = 0
    reference_currency: str = "EUR"
    condition: str = "premium"
    condition_pct: float = 0
    gross_pct: float = 0
    net_pct: float = 0
    broker_id: Optional[str] = None
    broker_name: Optional[str] = None
    broker_type: str = "internal"
    member_id: Optional[str] = None
    member_name: Optional[str] = None
    broker_share_pct: float = 50
    commission_currency: str = "EUR"
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    lead_id: Optional[str] = None
    notes: Optional[str] = None

class OTCDealUpdate(BaseModel):
    deal_type: Optional[str] = None
    asset: Optional[str] = None
    quantity: Optional[float] = None
    reference_price: Optional[float] = None
    reference_currency: Optional[str] = None
    condition: Optional[str] = None
    condition_pct: Optional[float] = None
    gross_pct: Optional[float] = None
    net_pct: Optional[float] = None
    broker_id: Optional[str] = None
    broker_name: Optional[str] = None
    broker_type: Optional[str] = None
    member_id: Optional[str] = None
    member_name: Optional[str] = None
    broker_share_pct: Optional[float] = None
    commission_currency: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class ComplianceWalletCreate(BaseModel):
    address: str
    blockchain: str = "Bitcoin"
    wallet_type: str = "cold"
    description: Optional[str] = None

class KYTAnalysisUpdate(BaseModel):
    risk_score: int = 0
    flags: List[str] = []
    analyst_notes: Optional[str] = None
    status: str = "pending"

class SatoshiTestCreate(BaseModel):
    test_type: str = "generated"
    source_address: Optional[str] = None

class ProofRequest(BaseModel):
    proof_type: str  # "ownership" or "reserves"
    wallet_address: Optional[str] = None
    amount: Optional[float] = None
    asset: Optional[str] = None

class CommissionUpdate(BaseModel):
    status: str

# ==================== HELPER: Binance Price ====================

BINANCE_API_URL = "https://api.binance.com/api/v3"

async def get_binance_price(symbol: str) -> float:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{BINANCE_API_URL}/ticker/price", params={"symbol": f"{symbol}USDT"})
            if resp.status_code == 200:
                return float(resp.json().get("price", 0))
    except Exception:
        pass
    return 0

# ==================== DEAL ROUTES ====================

@router.post("/deals")
async def create_deal(deal: OTCDealCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new OTC deal"""
    db = get_db()

    # Calculate values
    adjusted_price = deal.reference_price
    if deal.condition == "premium":
        adjusted_price = deal.reference_price * (1 + deal.condition_pct / 100)
    else:
        adjusted_price = deal.reference_price * (1 - deal.condition_pct / 100)

    total_value = deal.quantity * adjusted_price
    gross_amount = total_value * (deal.gross_pct / 100)
    net_amount = total_value * (deal.net_pct / 100)
    kbex_margin = gross_amount - net_amount
    broker_commission = kbex_margin * (deal.broker_share_pct / 100)
    member_commission = kbex_margin - broker_commission

    deal_id = str(uuid.uuid4())
    deal_number = f"OTC-{datetime.now(timezone.utc).strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}"

    deal_doc = {
        "id": deal_id,
        "deal_number": deal_number,
        "deal_type": deal.deal_type,
        "asset": deal.asset,
        "quantity": deal.quantity,
        "reference_price": deal.reference_price,
        "reference_currency": deal.reference_currency,
        "condition": deal.condition,
        "condition_pct": deal.condition_pct,
        "adjusted_price": adjusted_price,
        "total_value": total_value,
        "gross_pct": deal.gross_pct,
        "net_pct": deal.net_pct,
        "gross_amount": gross_amount,
        "net_amount": net_amount,
        "kbex_margin": kbex_margin,
        "broker_id": deal.broker_id,
        "broker_name": deal.broker_name,
        "broker_type": deal.broker_type,
        "broker_share_pct": deal.broker_share_pct,
        "broker_commission": broker_commission,
        "member_id": deal.member_id,
        "member_name": deal.member_name,
        "member_commission": member_commission,
        "commission_currency": deal.commission_currency,
        "client_name": deal.client_name,
        "client_email": deal.client_email,
        "lead_id": deal.lead_id,
        "notes": deal.notes,
        "status": "draft",
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.otc_deals.insert_one(deal_doc)
    deal_doc.pop("_id", None)
    return deal_doc


@router.get("/deals")
async def list_deals(
    status: Optional[str] = None,
    asset: Optional[str] = None,
    broker_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """List OTC deals with optional filters"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if asset:
        query["asset"] = asset
    if broker_id:
        query["broker_id"] = broker_id

    # Check user role for visibility
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "user_type": 1, "email": 1})
    if user and user.get("user_type") == "client":
        query["$or"] = [
            {"broker_id": user_id},
            {"member_id": user_id},
            {"client_email": user.get("email")},
        ]

    deals = await db.otc_deals.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return deals


@router.get("/deals/{deal_id}")
async def get_deal(deal_id: str, user_id: str = Depends(get_current_user_id)):
    """Get a single OTC deal"""
    db = get_db()
    deal = await db.otc_deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")
    return deal


@router.put("/deals/{deal_id}")
async def update_deal(deal_id: str, update: OTCDealUpdate, user_id: str = Depends(get_current_user_id)):
    """Update an OTC deal"""
    db = get_db()
    deal = await db.otc_deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")

    update_data = {k: v for k, v in update.dict().items() if v is not None}

    # Recalculate if financial fields changed
    qty = update_data.get("quantity", deal["quantity"])
    ref_price = update_data.get("reference_price", deal["reference_price"])
    condition = update_data.get("condition", deal["condition"])
    condition_pct = update_data.get("condition_pct", deal["condition_pct"])
    gross_pct = update_data.get("gross_pct", deal["gross_pct"])
    net_pct = update_data.get("net_pct", deal["net_pct"])
    broker_share = update_data.get("broker_share_pct", deal["broker_share_pct"])

    adjusted_price = ref_price * (1 + condition_pct / 100) if condition == "premium" else ref_price * (1 - condition_pct / 100)
    total_value = qty * adjusted_price
    gross_amount = total_value * (gross_pct / 100)
    net_amount = total_value * (net_pct / 100)
    kbex_margin = gross_amount - net_amount
    broker_commission = kbex_margin * (broker_share / 100)
    member_commission = kbex_margin - broker_commission

    update_data.update({
        "adjusted_price": adjusted_price,
        "total_value": total_value,
        "gross_amount": gross_amount,
        "net_amount": net_amount,
        "kbex_margin": kbex_margin,
        "broker_commission": broker_commission,
        "member_commission": member_commission,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    await db.otc_deals.update_one({"id": deal_id}, {"$set": update_data})
    updated = await db.otc_deals.find_one({"id": deal_id}, {"_id": 0})
    return updated


@router.put("/deals/{deal_id}/status")
async def update_deal_status(deal_id: str, status: str, user_id: str = Depends(get_current_user_id)):
    """Advance deal status"""
    db = get_db()
    deal = await db.otc_deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")

    valid_transitions = {
        "draft": ["qualification", "cancelled"],
        "qualification": ["compliance", "cancelled"],
        "compliance": ["negotiation", "cancelled"],
        "negotiation": ["approved", "cancelled"],
        "approved": ["executing", "cancelled"],
        "executing": ["settled", "cancelled"],
        "settled": ["closed"],
    }

    current = deal["status"]
    if status not in valid_transitions.get(current, []):
        raise HTTPException(status_code=400, detail=f"Transição inválida: {current} → {status}")

    # Block compliance → negotiation without Proof of Reserves
    if current == "compliance" and status == "negotiation":
        compliance = await db.otc_compliance.find_one({"deal_id": deal_id}, {"_id": 0})
        if compliance:
            por = compliance.get("proof_of_reserves", {})
            if por.get("status") != "verified":
                raise HTTPException(
                    status_code=400,
                    detail="Proof of Reserves obrigatório antes de avançar para Negociação. Aceda ao Compliance Forense para completar a verificação."
                )
        else:
            raise HTTPException(
                status_code=400,
                detail="Registo de compliance não encontrado. Aceda ao Compliance Forense primeiro."
            )

    update_data = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if status == "settled":
        update_data["settled_at"] = datetime.now(timezone.utc).isoformat()
        # Auto-generate commissions when deal is settled
        await generate_commissions(deal_id)

    await db.otc_deals.update_one({"id": deal_id}, {"$set": update_data})
    return {"success": True, "status": status}


@router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete an OTC deal (only drafts)"""
    db = get_db()
    deal = await db.otc_deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Negócio não encontrado")
    if deal["status"] != "draft":
        raise HTTPException(status_code=400, detail="Só é possível eliminar negócios em rascunho")
    await db.otc_deals.delete_one({"id": deal_id})
    await db.otc_compliance.delete_many({"deal_id": deal_id})
    return {"success": True}


# ==================== COMPLIANCE ROUTES ====================

@router.get("/deals/{deal_id}/compliance")
async def get_compliance(deal_id: str, user_id: str = Depends(get_current_user_id)):
    """Get compliance record for a deal"""
    db = get_db()
    compliance = await db.otc_compliance.find_one({"deal_id": deal_id}, {"_id": 0})
    if not compliance:
        # Create default compliance record
        compliance = {
            "id": str(uuid.uuid4()),
            "deal_id": deal_id,
            "wallets": [],
            "kyt": {"risk_score": 0, "flags": [], "analyst_notes": "", "status": "not_started"},
            "satoshi_test": {"status": "not_started", "test_amount": None, "verification_address": None, "verified_at": None, "test_type": None},
            "proof_of_ownership": {"status": "not_started", "verified_at": None, "wallet_address": None},
            "proof_of_reserves": {"status": "not_started", "verified_at": None, "amount": None, "asset": None},
            "overall_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.otc_compliance.insert_one(compliance)
        compliance.pop("_id", None)
    return compliance


@router.post("/deals/{deal_id}/compliance/wallets")
async def add_compliance_wallet(deal_id: str, wallet: ComplianceWalletCreate, user_id: str = Depends(get_current_user_id)):
    """Add a wallet for compliance verification"""
    db = get_db()
    compliance = await db.otc_compliance.find_one({"deal_id": deal_id})
    if not compliance:
        await get_compliance(deal_id, user_id)

    wallet_doc = {
        "id": str(uuid.uuid4()),
        "address": wallet.address,
        "blockchain": wallet.blockchain,
        "wallet_type": wallet.wallet_type,
        "description": wallet.description,
        "status": "pending",
        "added_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.otc_compliance.update_one(
        {"deal_id": deal_id},
        {"$push": {"wallets": wallet_doc}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "wallet": wallet_doc}


@router.put("/deals/{deal_id}/compliance/wallets/{wallet_id}/verify")
async def verify_wallet(deal_id: str, wallet_id: str, status: str = "verified", user_id: str = Depends(get_current_user_id)):
    """Verify or reject a wallet"""
    db = get_db()
    await db.otc_compliance.update_one(
        {"deal_id": deal_id, "wallets.id": wallet_id},
        {"$set": {
            "wallets.$.status": status,
            "wallets.$.verified_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    await recalculate_compliance_status(deal_id)
    return {"success": True}


@router.put("/deals/{deal_id}/compliance/kyt")
async def update_kyt(deal_id: str, kyt: KYTAnalysisUpdate, user_id: str = Depends(get_current_user_id)):
    """Update KYT analysis"""
    db = get_db()
    compliance = await db.otc_compliance.find_one({"deal_id": deal_id})
    if not compliance:
        await get_compliance(deal_id, user_id)

    await db.otc_compliance.update_one(
        {"deal_id": deal_id},
        {"$set": {
            "kyt": kyt.dict(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    await recalculate_compliance_status(deal_id)
    return {"success": True}


@router.post("/deals/{deal_id}/compliance/satoshi-test")
async def start_satoshi_test(deal_id: str, test: SatoshiTestCreate, user_id: str = Depends(get_current_user_id)):
    """Start a Satoshi/AB test"""
    db = get_db()
    import random
    test_amount = round(random.uniform(0.00001, 0.00009), 8)
    # Generate a verification address (mock for now)
    verification_address = f"bc1q{uuid.uuid4().hex[:32]}"

    test_doc = {
        "status": "pending",
        "test_amount": test_amount,
        "verification_address": verification_address,
        "test_type": test.test_type,
        "source_address": test.source_address,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "verified_at": None,
    }

    compliance = await db.otc_compliance.find_one({"deal_id": deal_id})
    if not compliance:
        await get_compliance(deal_id, user_id)

    await db.otc_compliance.update_one(
        {"deal_id": deal_id},
        {"$set": {"satoshi_test": test_doc, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "satoshi_test": test_doc}


@router.put("/deals/{deal_id}/compliance/satoshi-test/verify")
async def verify_satoshi_test(deal_id: str, status: str = "verified", user_id: str = Depends(get_current_user_id)):
    """Verify Satoshi test result"""
    db = get_db()
    await db.otc_compliance.update_one(
        {"deal_id": deal_id},
        {"$set": {
            "satoshi_test.status": status,
            "satoshi_test.verified_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    await recalculate_compliance_status(deal_id)
    return {"success": True}


@router.post("/deals/{deal_id}/compliance/proof")
async def request_proof(deal_id: str, proof: ProofRequest, user_id: str = Depends(get_current_user_id)):
    """Request Proof of Ownership or Proof of Reserves"""
    db = get_db()
    compliance = await db.otc_compliance.find_one({"deal_id": deal_id})
    if not compliance:
        await get_compliance(deal_id, user_id)

    field = "proof_of_ownership" if proof.proof_type == "ownership" else "proof_of_reserves"
    proof_doc = {
        "status": "pending",
        "wallet_address": proof.wallet_address,
        "amount": proof.amount,
        "asset": proof.asset,
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "verified_at": None,
    }

    await db.otc_compliance.update_one(
        {"deal_id": deal_id},
        {"$set": {field: proof_doc, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "proof": proof_doc}


@router.put("/deals/{deal_id}/compliance/proof/{proof_type}/verify")
async def verify_proof(deal_id: str, proof_type: str, status: str = "verified", user_id: str = Depends(get_current_user_id)):
    """Verify proof of ownership or reserves"""
    db = get_db()
    field = "proof_of_ownership" if proof_type == "ownership" else "proof_of_reserves"
    await db.otc_compliance.update_one(
        {"deal_id": deal_id},
        {"$set": {
            f"{field}.status": status,
            f"{field}.verified_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    await recalculate_compliance_status(deal_id)
    return {"success": True}


async def recalculate_compliance_status(deal_id: str):
    """Recalculate overall compliance status based on all checks"""
    db = get_db()
    compliance = await db.otc_compliance.find_one({"deal_id": deal_id}, {"_id": 0})
    if not compliance:
        return

    all_checks = []
    # Wallets
    wallets = compliance.get("wallets", [])
    if wallets:
        all_checks.append(all(w.get("status") == "verified" for w in wallets))
    # KYT
    kyt = compliance.get("kyt", {})
    all_checks.append(kyt.get("status") in ["clean", "verified_clean"])
    # Satoshi test
    sat = compliance.get("satoshi_test", {})
    all_checks.append(sat.get("status") == "verified")
    # Proof of Ownership
    poo = compliance.get("proof_of_ownership", {})
    all_checks.append(poo.get("status") == "verified")
    # Proof of Reserves
    por = compliance.get("proof_of_reserves", {})
    all_checks.append(por.get("status") == "verified")

    if all(all_checks):
        overall = "approved"
    elif any(c is False for c in all_checks):
        overall = "pending"
    else:
        overall = "pending"

    await db.otc_compliance.update_one(
        {"deal_id": deal_id},
        {"$set": {"overall_status": overall}}
    )


# ==================== COMMISSION ROUTES ====================

async def generate_commissions(deal_id: str):
    """Auto-generate commissions when a deal is settled"""
    db = get_db()
    deal = await db.otc_deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        return

    # Check if commissions already exist
    existing = await db.otc_commissions.count_documents({"deal_id": deal_id})
    if existing > 0:
        return

    commissions = []
    # Broker commission
    if deal.get("broker_commission", 0) > 0:
        commissions.append({
            "id": str(uuid.uuid4()),
            "deal_id": deal_id,
            "deal_number": deal.get("deal_number", ""),
            "beneficiary_id": deal.get("broker_id"),
            "beneficiary_name": deal.get("broker_name", ""),
            "role": "Corretor Externo" if deal.get("broker_type") == "external" else "Corretor",
            "amount": deal["broker_commission"],
            "currency": deal.get("commission_currency", "EUR"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # KBEX Member commission
    if deal.get("member_commission", 0) > 0:
        commissions.append({
            "id": str(uuid.uuid4()),
            "deal_id": deal_id,
            "deal_number": deal.get("deal_number", ""),
            "beneficiary_id": deal.get("member_id"),
            "beneficiary_name": deal.get("member_name", ""),
            "role": "Membro KBEX",
            "amount": deal["member_commission"],
            "currency": deal.get("commission_currency", "EUR"),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if commissions:
        await db.otc_commissions.insert_many(commissions)


@router.get("/commissions")
async def list_commissions(
    status: Optional[str] = None,
    beneficiary_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """List all commissions"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if beneficiary_id:
        query["beneficiary_id"] = beneficiary_id

    # Visibility check
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "role": 1, "user_type": 1})
    if user and user.get("user_type") == "client":
        query["beneficiary_id"] = user_id

    commissions = await db.otc_commissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return commissions


@router.put("/commissions/{commission_id}/status")
async def update_commission_status(commission_id: str, update: CommissionUpdate, user_id: str = Depends(get_current_user_id)):
    """Update commission status (approve, pay, reject)"""
    db = get_db()
    commission = await db.otc_commissions.find_one({"id": commission_id}, {"_id": 0})
    if not commission:
        raise HTTPException(status_code=404, detail="Comissão não encontrada")

    valid_transitions = {
        "pending": ["approved", "rejected"],
        "approved": ["paid", "rejected"],
    }

    current = commission["status"]
    if update.status not in valid_transitions.get(current, []):
        raise HTTPException(status_code=400, detail=f"Transição inválida: {current} → {update.status}")

    update_data = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if update.status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    if update.status == "approved":
        update_data["approved_at"] = datetime.now(timezone.utc).isoformat()
        update_data["approved_by"] = user_id

    await db.otc_commissions.update_one({"id": commission_id}, {"$set": update_data})
    return {"success": True, "status": update.status}


@router.put("/commissions/bulk-update")
async def bulk_update_commissions(commission_ids: List[str], status: str, user_id: str = Depends(get_current_user_id)):
    """Bulk update commission statuses"""
    db = get_db()
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    if status == "approved":
        update_data["approved_at"] = datetime.now(timezone.utc).isoformat()
        update_data["approved_by"] = user_id

    result = await db.otc_commissions.update_many(
        {"id": {"$in": commission_ids}},
        {"$set": update_data}
    )
    return {"success": True, "modified": result.modified_count}


@router.get("/commissions/summary")
async def commissions_summary(user_id: str = Depends(get_current_user_id)):
    """Get commission summary KPIs"""
    db = get_db()
    all_commissions = await db.otc_commissions.find({}, {"_id": 0}).to_list(1000)

    total = sum(c.get("amount", 0) for c in all_commissions)
    pending = sum(c.get("amount", 0) for c in all_commissions if c.get("status") == "pending")
    approved = sum(c.get("amount", 0) for c in all_commissions if c.get("status") == "approved")
    paid = sum(c.get("amount", 0) for c in all_commissions if c.get("status") == "paid")

    # Group by beneficiary
    brokers = {}
    for c in all_commissions:
        name = c.get("beneficiary_name", "N/A")
        if name not in brokers:
            brokers[name] = {"total": 0, "pending": 0, "paid": 0, "role": c.get("role", "")}
        brokers[name]["total"] += c.get("amount", 0)
        if c.get("status") == "pending":
            brokers[name]["pending"] += c.get("amount", 0)
        elif c.get("status") == "paid":
            brokers[name]["paid"] += c.get("amount", 0)

    broker_list = [{"name": k, **v} for k, v in brokers.items()]

    return {
        "total_generated": total,
        "pending_approval": pending,
        "approved": approved,
        "paid": paid,
        "brokers": broker_list,
    }


# ==================== REFERENCE PRICE ====================

@router.get("/reference-price/{asset}")
async def get_reference_price(asset: str):
    """Get KBEX reference price for an asset (from Binance)"""
    price = await get_binance_price(asset)
    if price == 0:
        return {"asset": asset, "price_usd": 0, "source": "unavailable"}

    # Also get EUR rate
    eur_rate = 1.0
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{BINANCE_API_URL}/ticker/price", params={"symbol": "EURUSDT"})
            if resp.status_code == 200:
                eur_rate = float(resp.json().get("price", 1.08))
    except Exception:
        eur_rate = 1.08

    return {
        "asset": asset,
        "price_usd": price,
        "price_eur": round(price / eur_rate, 2),
        "price_aed": round(price * 3.673, 2),
        "price_brl": round(price * 5.50, 2),
        "eur_usd_rate": eur_rate,
        "source": "KBEX",
    }


# ==================== TEAM MEMBERS FOR DROPDOWNS ====================

@router.get("/team-members")
async def get_team_members(user_id: str = Depends(get_current_user_id)):
    """Get internal team members for broker/member dropdowns"""
    db = get_db()
    members = await db.users.find(
        {"user_type": {"$in": ["internal", "admin"]}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
    ).to_list(100)
    return members
