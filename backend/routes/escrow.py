"""
OTC Escrow Routes for KBEX Exchange
Professional DvP escrow engine with fee management and compliance
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from models.escrow import (
    EscrowStatus, EscrowDealType, EscrowStructure, FeePayerType,
    SettlementType, ComplianceCheckStatus, DisputeStatus,
    ESCROW_STATUS_TRANSITIONS, VOLUME_TIERS, calculate_fee, split_fee,
    calculate_risk_score,
    CreateEscrowDeal, UpdateEscrowDeal, AdvanceEscrowStatus,
    OpenDispute, ResolveDispute,
    DepositRequest, ConfirmDeposit, SettleRequest, WhitelistAddress,
    UpdateDisputeStatus, DisputeMessage, DisputeEvidenceUpload, ForceReleaseRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/escrow", tags=["Escrow"])

db = None

def set_db(database):
    global db
    db = database

from routes.auth import get_current_user


def _user_email(user) -> str:
    """Safely get email from user (works with dict or Pydantic model)."""
    return getattr(user, 'email', None) or (user.get('email') if isinstance(user, dict) else 'system')


def _user_is_admin(user) -> bool:
    """Safely check if user is admin."""
    return getattr(user, 'is_admin', False) or (user.get('is_admin', False) if isinstance(user, dict) else False)


def escrow_doc_to_response(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-safe response (exclude _id)."""
    doc.pop("_id", None)
    return doc


# ==================== DASHBOARD / KPIs ====================

@router.get("/dashboard")
async def get_escrow_dashboard(current_user: dict = Depends(get_current_user)):
    """Get escrow dashboard KPIs."""
    collection = db["escrow_deals"]

    pipeline_counts = await collection.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(length=100)
    status_map = {item["_id"]: item["count"] for item in pipeline_counts}

    active_statuses = [
        EscrowStatus.AWAITING_DEPOSIT, EscrowStatus.FUNDED,
        EscrowStatus.IN_VERIFICATION, EscrowStatus.READY_FOR_SETTLEMENT
    ]
    active_count = sum(status_map.get(s, 0) for s in active_statuses)

    # Funds under escrow (sum of ticket_size for active deals)
    funds_pipeline = await collection.aggregate([
        {"$match": {"status": {"$in": [s.value if hasattr(s, 'value') else s for s in active_statuses]}}},
        {"$group": {"_id": None, "total": {"$sum": "$ticket_size"}}}
    ]).to_list(length=1)
    funds_under_escrow = funds_pipeline[0]["total"] if funds_pipeline else 0.0

    # Total fees collected (settled + closed)
    fees_pipeline = await collection.aggregate([
        {"$match": {"status": {"$in": [EscrowStatus.SETTLED, EscrowStatus.CLOSED]}}},
        {"$group": {"_id": None, "total": {"$sum": "$fee_total"}}}
    ]).to_list(length=1)
    total_fees = fees_pipeline[0]["total"] if fees_pipeline else 0.0

    # Disputed count
    disputed = status_map.get(EscrowStatus.DISPUTED, 0)

    # Recent deals
    recent = await collection.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(length=5)

    # Total deals
    total = await collection.count_documents({})

    # Average settlement time (for settled deals)
    settled_deals = await collection.find(
        {"status": {"$in": [EscrowStatus.SETTLED, EscrowStatus.CLOSED]}, "settled_at": {"$exists": True}},
        {"_id": 0, "created_at": 1, "settled_at": 1}
    ).to_list(length=100)

    avg_settlement_hours = 0
    if settled_deals:
        times = []
        for d in settled_deals:
            if d.get("settled_at") and d.get("created_at"):
                c = d["created_at"] if isinstance(d["created_at"], datetime) else datetime.fromisoformat(str(d["created_at"]))
                s = d["settled_at"] if isinstance(d["settled_at"], datetime) else datetime.fromisoformat(str(d["settled_at"]))
                times.append((s - c).total_seconds() / 3600)
        if times:
            avg_settlement_hours = round(sum(times) / len(times), 1)

    return {
        "active_deals": active_count,
        "total_deals": total,
        "funds_under_escrow": round(funds_under_escrow, 2),
        "total_fees_collected": round(total_fees, 2),
        "disputed_deals": disputed,
        "settled_deals": status_map.get(EscrowStatus.SETTLED, 0) + status_map.get(EscrowStatus.CLOSED, 0),
        "avg_settlement_hours": avg_settlement_hours,
        "status_breakdown": status_map,
        "recent_deals": recent,
    }


# ==================== CRUD ====================

@router.get("/deals")
async def list_escrow_deals(
    status: Optional[str] = None,
    deal_type: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: int = -1,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """List escrow deals with filters."""
    query = {}
    if status:
        query["status"] = status
    if deal_type:
        query["deal_type"] = deal_type
    if search:
        query["$or"] = [
            {"deal_id": {"$regex": search, "$options": "i"}},
            {"buyer.name": {"$regex": search, "$options": "i"}},
            {"seller.name": {"$regex": search, "$options": "i"}},
            {"asset_a": {"$regex": search, "$options": "i"}},
            {"asset_b": {"$regex": search, "$options": "i"}},
        ]

    total = await db["escrow_deals"].count_documents(query)
    deals = await db["escrow_deals"].find(
        query, {"_id": 0}
    ).sort(sort_by, sort_order).skip(skip).limit(limit).to_list(length=limit)

    return {"deals": deals, "total": total, "skip": skip, "limit": limit}


@router.get("/deals/{deal_id}")
async def get_escrow_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single escrow deal by ID."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")
    return deal


@router.post("/deals")
async def create_escrow_deal(data: CreateEscrowDeal, current_user: dict = Depends(get_current_user)):
    """Create a new escrow deal."""
    ticket_size = data.quantity_a * data.agreed_price

    # Calculate fees
    fee_data = calculate_fee(
        ticket_size, data.fee_schedule,
        data.custom_fee_rate, data.custom_fee_min
    )
    fee_split = split_fee(fee_data["fee_total"], data.fee_payer)

    now = datetime.now(timezone.utc)
    deadline = now + timedelta(hours=data.settlement_deadline_hours)

    # Generate a human-readable deal ID
    count = await db["escrow_deals"].count_documents({})
    deal_number = f"ESC-{count + 1:04d}"

    deal = {
        "id": str(uuid.uuid4()),
        "deal_id": deal_number,
        "otc_deal_id": data.otc_deal_id,
        "deal_type": data.deal_type,
        "status": EscrowStatus.DRAFT,
        "structure": data.structure,
        "asset_a": data.asset_a,
        "asset_b": data.asset_b,
        "quantity_a": data.quantity_a,
        "quantity_b": data.quantity_b,
        "agreed_price": data.agreed_price,
        "ticket_size": round(ticket_size, 2),
        "settlement_type": data.settlement_type,
        "settlement_deadline": deadline.isoformat(),
        "settlement_deadline_hours": data.settlement_deadline_hours,
        # Fee engine
        "fee_schedule": data.fee_schedule,
        "fee_payer": data.fee_payer,
        "fee_rate": fee_data["fee_rate"],
        "fee_min": fee_data["fee_min"],
        "fee_total": fee_data["fee_total"],
        "fee_buyer": fee_split["fee_buyer"],
        "fee_seller": fee_split["fee_seller"],
        # Parties
        "buyer": data.buyer,
        "seller": data.seller,
        # Compliance
        "compliance": {
            "buyer_kyc": ComplianceCheckStatus.PENDING,
            "seller_kyc": ComplianceCheckStatus.PENDING,
            "aml_check": ComplianceCheckStatus.PENDING,
            "source_of_funds": ComplianceCheckStatus.PENDING,
            "risk_score": None,
            "approved_by": None,
            "approved_at": None,
            "notes": None,
        },
        # Dispute
        "dispute": None,
        # Custody
        "custody": {
            "buyer_deposited": False,
            "seller_deposited": False,
            "buyer_deposit_amount": 0.0,
            "seller_deposit_amount": 0.0,
            "locked": False,
        },
        "deposits": [],
        "whitelist": [],
        "settlement": None,
        # Fee volume discount
        "volume_discount_pct": fee_data.get("volume_discount_pct", 0),
        "volume_discount": fee_data.get("volume_discount", 0),
        # Metadata
        "notes": data.notes,
        "timeline": [{
            "timestamp": now.isoformat(),
            "status": EscrowStatus.DRAFT,
            "action": "Escrow deal created",
            "performed_by": _user_email(current_user),
        }],
        "created_by": _user_email(current_user),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "settled_at": None,
    }

    await db["escrow_deals"].insert_one(deal)
    deal.pop("_id", None)

    logger.info(f"Escrow deal {deal_number} created by {_user_email(current_user)}")
    return {"success": True, "deal": deal}


@router.put("/deals/{deal_id}")
async def update_escrow_deal(deal_id: str, data: UpdateEscrowDeal, current_user: dict = Depends(get_current_user)):
    """Update escrow deal (only in DRAFT status)."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")
    if deal["status"] != EscrowStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only edit deals in DRAFT status")

    update_fields = {}
    update_dict = data.model_dump(exclude_unset=True)

    for key, value in update_dict.items():
        if value is not None:
            update_fields[key] = value

    # Recalculate fees if schedule changed
    if "fee_schedule" in update_fields or "fee_payer" in update_fields:
        schedule = update_fields.get("fee_schedule", deal["fee_schedule"])
        payer = update_fields.get("fee_payer", deal["fee_payer"])
        custom_rate = update_fields.get("custom_fee_rate", deal.get("custom_fee_rate"))
        custom_min = update_fields.get("custom_fee_min", deal.get("custom_fee_min"))
        fee_data = calculate_fee(deal["ticket_size"], schedule, custom_rate, custom_min)
        fee_split_data = split_fee(fee_data["fee_total"], payer)
        update_fields.update({
            "fee_rate": fee_data["fee_rate"],
            "fee_min": fee_data["fee_min"],
            "fee_total": fee_data["fee_total"],
            "fee_buyer": fee_split_data["fee_buyer"],
            "fee_seller": fee_split_data["fee_seller"],
        })

    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db["escrow_deals"].update_one({"id": deal_id}, {"$set": update_fields})

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    return {"success": True, "deal": updated}


@router.delete("/deals/{deal_id}")
async def delete_escrow_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Delete escrow deal (only if DRAFT)."""
    deal = await db["escrow_deals"].find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")
    if deal["status"] != EscrowStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Can only delete DRAFT deals")

    await db["escrow_deals"].delete_one({"id": deal_id})
    return {"success": True, "message": "Escrow deal deleted"}


# ==================== STATE MACHINE ====================

@router.post("/deals/{deal_id}/advance")
async def advance_escrow_status(deal_id: str, data: AdvanceEscrowStatus, current_user: dict = Depends(get_current_user)):
    """Advance escrow deal to next status."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    current = deal["status"]
    new_status = data.new_status

    # Validate transition
    allowed = ESCROW_STATUS_TRANSITIONS.get(current, [])
    allowed_values = [s.value if hasattr(s, 'value') else s for s in allowed]

    if new_status not in allowed_values and not data.override:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current}' to '{new_status}'. Allowed: {allowed_values}"
        )

    # Compliance gating: block advance to ready_for_settlement if compliance not approved
    if new_status in [EscrowStatus.READY_FOR_SETTLEMENT, "ready_for_settlement"] and not data.override:
        compliance = deal.get("compliance", {})
        required = ["buyer_kyc", "seller_kyc", "aml_check", "source_of_funds"]
        unapproved = [k for k in required if compliance.get(k) != ComplianceCheckStatus.APPROVED]
        if unapproved:
            raise HTTPException(
                status_code=400,
                detail=f"Compliance gate: the following checks must be approved before settlement: {unapproved}"
            )

    now = datetime.now(timezone.utc)

    update = {
        "status": new_status,
        "updated_at": now.isoformat(),
    }

    # Handle locked state for funded deals
    if new_status == EscrowStatus.FUNDED:
        update["custody.locked"] = True
    elif new_status == EscrowStatus.SETTLED:
        update["settled_at"] = now.isoformat()
        update["custody.locked"] = False

    # Auto-calculate risk score on status changes
    risk_score = calculate_risk_score(deal)
    update["compliance.risk_score"] = risk_score

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": new_status,
        "action": f"Status changed from {current} to {new_status}",
        "performed_by": _user_email(current_user),
        "notes": data.notes,
    }

    if data.override:
        timeline_entry["action"] = f"[OVERRIDE] Status forced from {current} to {new_status}"

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": update, "$push": {"timeline": timeline_entry}}
    )

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    return {"success": True, "deal": updated}


# ==================== FEE CALCULATOR ====================

@router.post("/calculate-fee")
async def calculate_escrow_fee(
    ticket_size: float = Query(...),
    schedule: str = Query("standard"),
    payer: str = Query("split"),
    custom_rate: Optional[float] = None,
    custom_min: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """Calculate escrow fees for a given ticket size."""
    fee = calculate_fee(ticket_size, schedule, custom_rate, custom_min)
    fee_split_data = split_fee(fee["fee_total"], payer)
    return {**fee, **fee_split_data, "ticket_size": ticket_size}


# ==================== COMPLIANCE ====================

@router.put("/deals/{deal_id}/compliance")
async def update_compliance(deal_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    """Update compliance checks for an escrow deal."""
    deal = await db["escrow_deals"].find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    compliance = deal.get("compliance", {})
    now = datetime.now(timezone.utc)

    for key in ["buyer_kyc", "seller_kyc", "aml_check", "source_of_funds", "risk_score", "notes"]:
        if key in updates:
            compliance[key] = updates[key]

    # Auto-approve if all checks pass
    all_checks = [compliance.get("buyer_kyc"), compliance.get("seller_kyc"),
                  compliance.get("aml_check"), compliance.get("source_of_funds")]
    if all(c == ComplianceCheckStatus.APPROVED for c in all_checks):
        compliance["approved_by"] = _user_email(current_user)
        compliance["approved_at"] = now.isoformat()

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": deal["status"],
        "action": f"Compliance updated: {list(updates.keys())}",
        "performed_by": _user_email(current_user),
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": {"compliance": compliance, "updated_at": now.isoformat()},
         "$push": {"timeline": timeline_entry}}
    )

    return {"success": True, "compliance": compliance}


# ==================== DISPUTES ====================

@router.post("/deals/{deal_id}/dispute")
async def open_dispute(deal_id: str, data: OpenDispute, current_user: dict = Depends(get_current_user)):
    """Open a dispute on an escrow deal."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    if deal["status"] in [EscrowStatus.CLOSED, EscrowStatus.CANCELLED, EscrowStatus.EXPIRED]:
        raise HTTPException(status_code=400, detail="Cannot dispute a closed/cancelled/expired deal")

    now = datetime.now(timezone.utc)

    dispute = {
        "status": DisputeStatus.OPEN,
        "reason": data.reason,
        "opened_by": _user_email(current_user),
        "opened_at": now.isoformat(),
        "evidence": [],
        "messages": [],
        "resolution": None,
        "resolved_by": None,
        "resolved_at": None,
    }

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": EscrowStatus.DISPUTED,
        "action": f"Dispute opened: {data.reason}",
        "performed_by": _user_email(current_user),
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": {
            "status": EscrowStatus.DISPUTED,
            "dispute": dispute,
            "updated_at": now.isoformat(),
        }, "$push": {"timeline": timeline_entry}}
    )

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    return {"success": True, "deal": updated}


@router.post("/deals/{deal_id}/resolve-dispute")
async def resolve_dispute(deal_id: str, data: ResolveDispute, current_user: dict = Depends(get_current_user)):
    """Resolve a dispute on an escrow deal."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    if deal["status"] != EscrowStatus.DISPUTED:
        raise HTTPException(status_code=400, detail="Deal is not in disputed state")

    now = datetime.now(timezone.utc)

    dispute = deal.get("dispute", {})
    dispute["status"] = DisputeStatus.CLOSED
    dispute["resolution"] = data.resolution
    dispute["resolved_by"] = _user_email(current_user)
    dispute["resolved_at"] = now.isoformat()

    new_status = EscrowStatus.CLOSED
    if data.notes and "continue" in data.notes.lower():
        new_status = EscrowStatus.READY_FOR_SETTLEMENT

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": new_status,
        "action": f"Dispute resolved: {data.resolution}",
        "performed_by": _user_email(current_user),
        "notes": data.notes,
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": {
            "status": new_status,
            "dispute": dispute,
            "updated_at": now.isoformat(),
        }, "$push": {"timeline": timeline_entry}}
    )

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    return {"success": True, "deal": updated}


# ==================== ADMIN ACTIONS ====================

@router.post("/deals/{deal_id}/force-release")
async def force_release(deal_id: str, notes: str = "", current_user: dict = Depends(get_current_user)):
    """Admin force release of escrowed funds."""
    if not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only action")

    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    now = datetime.now(timezone.utc)
    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": EscrowStatus.CLOSED,
        "action": f"[ADMIN OVERRIDE] Force release executed",
        "performed_by": _user_email(current_user),
        "notes": notes,
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": {
            "status": EscrowStatus.CLOSED,
            "custody.locked": False,
            "updated_at": now.isoformat(),
        }, "$push": {"timeline": timeline_entry}}
    )

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    logger.warning(f"[ADMIN OVERRIDE] Force release on {deal_id} by {_user_email(current_user)}")
    return {"success": True, "deal": updated}


# ==================== PHASE 2: DEPOSITS ====================

@router.post("/deals/{deal_id}/deposit")
async def register_deposit(deal_id: str, data: DepositRequest, current_user: dict = Depends(get_current_user)):
    """Register a deposit from buyer or seller into escrow."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    if deal["status"] not in [EscrowStatus.DRAFT, EscrowStatus.AWAITING_DEPOSIT, "draft", "awaiting_deposit"]:
        raise HTTPException(status_code=400, detail="Deposits only accepted in draft or awaiting_deposit status")

    if data.party not in ["buyer", "seller"]:
        raise HTTPException(status_code=400, detail="Party must be 'buyer' or 'seller'")

    now = datetime.now(timezone.utc)
    deposit_id = str(uuid.uuid4())

    deposit_record = {
        "id": deposit_id,
        "party": data.party,
        "amount": data.amount,
        "asset": data.asset,
        "tx_hash": data.tx_hash,
        "source_address": data.source_address,
        "confirmed": False,
        "confirmed_by": None,
        "confirmed_at": None,
        "notes": data.notes,
        "created_at": now.isoformat(),
    }

    # Update custody
    custody_field = f"custody.{data.party}_deposit_amount"
    deposited_field = f"custody.{data.party}_deposited"

    updates = {
        "updated_at": now.isoformat(),
        custody_field: data.amount,
    }

    # If deal is in draft, move to awaiting_deposit
    if deal["status"] in [EscrowStatus.DRAFT, "draft"]:
        updates["status"] = EscrowStatus.AWAITING_DEPOSIT

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": updates.get("status", deal["status"]),
        "action": f"Deposit registered: {data.party} - {data.amount} {data.asset}" + (f" (tx: {data.tx_hash[:12]}...)" if data.tx_hash else ""),
        "performed_by": _user_email(current_user),
        "notes": data.notes,
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {
            "$set": updates,
            "$push": {"timeline": timeline_entry, "deposits": deposit_record}
        }
    )

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    return {"success": True, "deal": updated, "deposit_id": deposit_id}


@router.post("/deals/{deal_id}/confirm-deposit")
async def confirm_deposit(deal_id: str, data: ConfirmDeposit, current_user: dict = Depends(get_current_user)):
    """Confirm a pending deposit (admin action). Auto-advances to funded if both confirmed."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    deposits = deal.get("deposits", [])
    deposit_idx = None
    for i, dep in enumerate(deposits):
        if dep.get("id") == data.deposit_id:
            deposit_idx = i
            break

    if deposit_idx is None:
        raise HTTPException(status_code=404, detail="Deposit not found")

    now = datetime.now(timezone.utc)
    dep = deposits[deposit_idx]

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": {
            f"deposits.{deposit_idx}.confirmed": data.confirmed,
            f"deposits.{deposit_idx}.confirmed_by": _user_email(current_user),
            f"deposits.{deposit_idx}.confirmed_at": now.isoformat(),
            f"custody.{dep['party']}_deposited": data.confirmed,
            "updated_at": now.isoformat(),
        }}
    )

    # Check if both sides confirmed -> auto-advance to funded
    updated_deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    custody = updated_deal.get("custody", {})
    structure = updated_deal.get("structure", "two_sided")

    should_fund = False
    if structure == "two_sided":
        should_fund = custody.get("buyer_deposited") and custody.get("seller_deposited")
    else:
        should_fund = custody.get("buyer_deposited") or custody.get("seller_deposited")

    if should_fund and updated_deal["status"] in [EscrowStatus.AWAITING_DEPOSIT, "awaiting_deposit"]:
        timeline_entry = {
            "timestamp": now.isoformat(),
            "status": EscrowStatus.FUNDED,
            "action": "Auto-advanced to Funded: all required deposits confirmed",
            "performed_by": "system",
        }
        await db["escrow_deals"].update_one(
            {"id": deal_id},
            {"$set": {"status": EscrowStatus.FUNDED, "custody.locked": True, "updated_at": now.isoformat()},
             "$push": {"timeline": timeline_entry}}
        )

    confirmation_timeline = {
        "timestamp": now.isoformat(),
        "status": updated_deal["status"],
        "action": f"Deposit {'confirmed' if data.confirmed else 'rejected'}: {dep['party']} - {dep['amount']} {dep['asset']}",
        "performed_by": _user_email(current_user),
        "notes": data.notes,
    }
    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$push": {"timeline": confirmation_timeline}}
    )

    final = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    return {"success": True, "deal": final}


# ==================== PHASE 2: SETTLEMENT DvP ====================

@router.post("/deals/{deal_id}/settle")
async def execute_settlement(deal_id: str, data: SettleRequest, current_user: dict = Depends(get_current_user)):
    """Execute DvP settlement. Both conditions must be met."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    if deal["status"] not in [EscrowStatus.READY_FOR_SETTLEMENT, "ready_for_settlement"]:
        raise HTTPException(status_code=400, detail="Deal must be in 'ready_for_settlement' status")

    custody = deal.get("custody", {})
    structure = deal.get("structure", "two_sided")

    # Verify DvP conditions
    if structure == "two_sided":
        if not custody.get("buyer_deposited") or not custody.get("seller_deposited"):
            raise HTTPException(status_code=400, detail="DvP failed: both buyer and seller must have confirmed deposits")
    else:
        if not custody.get("buyer_deposited") and not custody.get("seller_deposited"):
            raise HTTPException(status_code=400, detail="DvP failed: at least one party must have confirmed deposit")

    # Compliance gate check
    compliance = deal.get("compliance", {})
    required = ["buyer_kyc", "seller_kyc", "aml_check", "source_of_funds"]
    unapproved = [k for k in required if compliance.get(k) != ComplianceCheckStatus.APPROVED]
    if unapproved:
        raise HTTPException(
            status_code=400,
            detail=f"Settlement blocked: compliance checks not approved: {unapproved}"
        )

    now = datetime.now(timezone.utc)

    # Record the settlement
    settlement_record = {
        "id": str(uuid.uuid4()),
        "executed_at": now.isoformat(),
        "executed_by": _user_email(current_user),
        "asset_a": deal["asset_a"],
        "quantity_a": deal["quantity_a"],
        "asset_b": deal["asset_b"],
        "quantity_b": deal["quantity_b"],
        "buyer_destination": data.buyer_destination,
        "seller_destination": data.seller_destination,
        "fee_total": deal["fee_total"],
        "fee_buyer": deal["fee_buyer"],
        "fee_seller": deal["fee_seller"],
        "notes": data.notes,
    }

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": EscrowStatus.SETTLED,
        "action": f"DvP Settlement executed: {deal['quantity_a']} {deal['asset_a']} ↔ {deal['quantity_b']} {deal['asset_b']}",
        "performed_by": _user_email(current_user),
        "notes": data.notes,
    }

    # Record fee in ledger
    fee_entry = {
        "id": str(uuid.uuid4()),
        "deal_id": deal["deal_id"],
        "escrow_id": deal["id"],
        "fee_total": deal["fee_total"],
        "fee_buyer": deal["fee_buyer"],
        "fee_seller": deal["fee_seller"],
        "fee_schedule": deal["fee_schedule"],
        "fee_rate": deal["fee_rate"],
        "ticket_size": deal["ticket_size"],
        "volume_discount_pct": deal.get("volume_discount_pct", 0),
        "volume_discount": deal.get("volume_discount", 0),
        "asset_a": deal["asset_a"],
        "asset_b": deal["asset_b"],
        "buyer_name": deal.get("buyer", {}).get("name", ""),
        "seller_name": deal.get("seller", {}).get("name", ""),
        "settled_at": now.isoformat(),
        "recorded_by": _user_email(current_user),
    }
    await db["escrow_fee_ledger"].insert_one(fee_entry)
    fee_entry.pop("_id", None)

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": {
            "status": EscrowStatus.SETTLED,
            "settled_at": now.isoformat(),
            "custody.locked": False,
            "settlement": settlement_record,
            "updated_at": now.isoformat(),
        }, "$push": {"timeline": timeline_entry}}
    )

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    logger.info(f"Settlement executed for {deal['deal_id']} by {_user_email(current_user)}")
    return {"success": True, "deal": updated, "settlement": settlement_record, "fee_invoice": fee_entry}


# ==================== PHASE 2: FEE LEDGER ====================

@router.get("/fee-ledger")
async def get_fee_ledger(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get fee revenue ledger for KBEX."""
    total = await db["escrow_fee_ledger"].count_documents({})
    entries = await db["escrow_fee_ledger"].find(
        {}, {"_id": 0}
    ).sort("settled_at", -1).skip(skip).limit(limit).to_list(length=limit)

    # Aggregate totals
    agg = await db["escrow_fee_ledger"].aggregate([
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$fee_total"},
            "total_from_buyers": {"$sum": "$fee_buyer"},
            "total_from_sellers": {"$sum": "$fee_seller"},
            "total_volume": {"$sum": "$ticket_size"},
            "deal_count": {"$sum": 1},
        }}
    ]).to_list(length=1)

    totals = agg[0] if agg else {"total_revenue": 0, "total_from_buyers": 0, "total_from_sellers": 0, "total_volume": 0, "deal_count": 0}
    totals.pop("_id", None)

    return {
        "entries": entries,
        "total": total,
        "totals": {k: round(v, 2) if isinstance(v, float) else v for k, v in totals.items()},
    }


@router.get("/fee-ledger/summary")
async def get_fee_summary(
    current_user: dict = Depends(get_current_user)
):
    """Get fee revenue summary grouped by schedule."""
    by_schedule = await db["escrow_fee_ledger"].aggregate([
        {"$group": {
            "_id": "$fee_schedule",
            "revenue": {"$sum": "$fee_total"},
            "volume": {"$sum": "$ticket_size"},
            "count": {"$sum": 1},
        }}
    ]).to_list(length=10)

    return {"by_schedule": [{**item, "schedule": item.pop("_id")} for item in by_schedule]}


@router.get("/volume-tiers")
async def get_volume_tiers(current_user: dict = Depends(get_current_user)):
    """Get the volume tier discount schedule."""
    # Convert infinity to a large number for JSON serialization
    tiers = []
    for tier in VOLUME_TIERS:
        t = tier.copy()
        if t.get("max") == float("inf"):
            t["max"] = None  # Use None to represent infinity
        tiers.append(t)
    return {"tiers": tiers}


# ==================== PHASE 2: WHITELISTS ====================

@router.get("/deals/{deal_id}/whitelist")
async def get_whitelist(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Get whitelisted addresses for an escrow deal."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")
    return {"whitelist": deal.get("whitelist", [])}


@router.post("/deals/{deal_id}/whitelist")
async def add_whitelist_address(deal_id: str, data: WhitelistAddress, current_user: dict = Depends(get_current_user)):
    """Add a whitelisted destination address for settlement."""
    deal = await db["escrow_deals"].find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    now = datetime.now(timezone.utc)
    entry = {
        "id": str(uuid.uuid4()),
        "address": data.address,
        "label": data.label,
        "asset": data.asset,
        "party": data.party,
        "added_by": _user_email(current_user),
        "added_at": now.isoformat(),
    }

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": deal["status"],
        "action": f"Whitelist address added: {data.party} - {data.label} ({data.address[:12]}...)",
        "performed_by": _user_email(current_user),
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$push": {"whitelist": entry, "timeline": timeline_entry},
         "$set": {"updated_at": now.isoformat()}}
    )

    return {"success": True, "entry": entry}


@router.delete("/deals/{deal_id}/whitelist/{address_id}")
async def remove_whitelist_address(deal_id: str, address_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a whitelisted address."""
    deal = await db["escrow_deals"].find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$pull": {"whitelist": {"id": address_id}},
         "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


# ==================== PHASE 3: ENHANCED DISPUTE RESOLUTION ====================

@router.put("/deals/{deal_id}/dispute/status")
async def update_dispute_status(deal_id: str, data: UpdateDisputeStatus, current_user: dict = Depends(get_current_user)):
    """Update dispute status through the resolution workflow."""
    if not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only action")

    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")
    if deal["status"] != EscrowStatus.DISPUTED:
        raise HTTPException(status_code=400, detail="Deal is not in disputed state")

    valid_statuses = [
        DisputeStatus.UNDER_REVIEW, DisputeStatus.EVIDENCE_REQUIRED,
        DisputeStatus.RESOLVED_BUYER, DisputeStatus.RESOLVED_SELLER,
        DisputeStatus.RESOLVED_SPLIT, DisputeStatus.CLOSED
    ]
    if data.new_status not in [s.value if hasattr(s, 'value') else s for s in valid_statuses] and data.new_status not in [s for s in valid_statuses]:
        raise HTTPException(status_code=400, detail=f"Invalid dispute status: {data.new_status}")

    now = datetime.now(timezone.utc)
    dispute = deal.get("dispute", {})
    dispute["status"] = data.new_status

    # If resolved, set deal status back based on resolution
    deal_status = EscrowStatus.DISPUTED
    if data.new_status in ["resolved_buyer", "resolved_seller", "resolved_split", "closed"]:
        dispute["resolution"] = data.notes or f"Resolved: {data.new_status}"
        dispute["resolved_by"] = _user_email(current_user)
        dispute["resolved_at"] = now.isoformat()
        deal_status = EscrowStatus.CLOSED

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": deal_status,
        "action": f"Dispute status updated to: {data.new_status}",
        "performed_by": _user_email(current_user),
        "notes": data.notes,
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": {
            "status": deal_status,
            "dispute": dispute,
            "updated_at": now.isoformat(),
        }, "$push": {"timeline": timeline_entry}}
    )

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    return {"success": True, "deal": updated}


@router.post("/deals/{deal_id}/dispute/evidence")
async def add_dispute_evidence(deal_id: str, data: DisputeEvidenceUpload, current_user: dict = Depends(get_current_user)):
    """Add evidence to an active dispute (base64 JSON, Cloudflare-safe)."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")
    if deal["status"] != EscrowStatus.DISPUTED:
        raise HTTPException(status_code=400, detail="Deal must be in disputed state")

    now = datetime.now(timezone.utc)
    evidence_id = str(uuid.uuid4())

    evidence_entry = {
        "id": evidence_id,
        "uploaded_by": _user_email(current_user),
        "file_name": data.file_name,
        "description": data.description,
        "uploaded_at": now.isoformat(),
        "has_file": bool(data.file_data),
    }

    # Store file data separately if provided
    if data.file_data:
        await db["escrow_evidence_files"].insert_one({
            "evidence_id": evidence_id,
            "deal_id": deal_id,
            "file_name": data.file_name,
            "file_data": data.file_data,
            "uploaded_by": _user_email(current_user),
            "uploaded_at": now.isoformat(),
        })

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": deal["status"],
        "action": f"Evidence uploaded: {data.file_name}",
        "performed_by": _user_email(current_user),
        "notes": data.description,
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$push": {
            "dispute.evidence": evidence_entry,
            "timeline": timeline_entry,
        }, "$set": {"updated_at": now.isoformat()}}
    )

    return {"success": True, "evidence_id": evidence_id}


@router.post("/deals/{deal_id}/dispute/message")
async def add_dispute_message(deal_id: str, data: DisputeMessage, current_user: dict = Depends(get_current_user)):
    """Add a message to the dispute thread."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")
    if deal["status"] != EscrowStatus.DISPUTED:
        raise HTTPException(status_code=400, detail="Deal must be in disputed state")

    now = datetime.now(timezone.utc)
    message_entry = {
        "id": str(uuid.uuid4()),
        "sender": _user_email(current_user),
        "sender_role": data.sender_role or ("admin" if _user_is_admin(current_user) else "party"),
        "message": data.message,
        "timestamp": now.isoformat(),
    }

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$push": {"dispute.messages": message_entry},
         "$set": {"updated_at": now.isoformat()}}
    )

    return {"success": True, "message": message_entry}


@router.post("/deals/{deal_id}/admin-force-release")
async def admin_force_release(deal_id: str, data: ForceReleaseRequest, current_user: dict = Depends(get_current_user)):
    """Admin force release with detailed allocation (buyer/seller/split)."""
    if not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only action")

    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    now = datetime.now(timezone.utc)

    release_record = {
        "id": str(uuid.uuid4()),
        "release_to": data.release_to,
        "amount_buyer": data.amount_buyer,
        "amount_seller": data.amount_seller,
        "executed_by": _user_email(current_user),
        "executed_at": now.isoformat(),
        "notes": data.notes,
    }

    timeline_entry = {
        "timestamp": now.isoformat(),
        "status": EscrowStatus.CLOSED,
        "action": f"[ADMIN FORCE RELEASE] Funds released to: {data.release_to}",
        "performed_by": _user_email(current_user),
        "notes": data.notes,
    }

    # Update dispute if exists
    update_fields = {
        "status": EscrowStatus.CLOSED,
        "custody.locked": False,
        "force_release": release_record,
        "updated_at": now.isoformat(),
    }

    dispute = deal.get("dispute")
    if dispute:
        dispute["status"] = f"resolved_{data.release_to}" if data.release_to in ["buyer", "seller"] else DisputeStatus.RESOLVED_SPLIT
        dispute["resolution"] = f"Admin force release to {data.release_to}"
        dispute["resolved_by"] = _user_email(current_user)
        dispute["resolved_at"] = now.isoformat()
        update_fields["dispute"] = dispute

    await db["escrow_deals"].update_one(
        {"id": deal_id},
        {"$set": update_fields, "$push": {"timeline": timeline_entry}}
    )

    updated = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    logger.warning(f"[ADMIN FORCE RELEASE] Deal {deal_id} - released to {data.release_to} by {_user_email(current_user)}")
    return {"success": True, "deal": updated, "release": release_record}


# ==================== PHASE 3: REPORTING & AUDIT ====================

@router.get("/reports/statement")
async def get_escrow_statement(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate escrow statement with optional filters."""
    query = {}

    if date_from:
        query.setdefault("created_at", {})["$gte"] = date_from
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to
    if status:
        query["status"] = status

    deals = await db["escrow_deals"].find(query, {"_id": 0}).sort("created_at", -1).to_list(length=500)

    # Aggregate stats
    total_volume = sum(d.get("ticket_size", 0) for d in deals)
    total_fees = sum(d.get("fee_total", 0) for d in deals)
    by_status = {}
    for d in deals:
        s = d.get("status", "unknown")
        by_status[s] = by_status.get(s, 0) + 1

    return {
        "deals": deals,
        "total_deals": len(deals),
        "total_volume": round(total_volume, 2),
        "total_fees": round(total_fees, 2),
        "by_status": by_status,
        "filters": {"date_from": date_from, "date_to": date_to, "status": status},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/reports/audit-trail/{deal_id}")
async def get_audit_trail(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Get complete audit trail for a specific escrow deal."""
    deal = await db["escrow_deals"].find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Escrow deal not found")

    # Collect all auditable events
    timeline = deal.get("timeline", [])
    deposits = deal.get("deposits", [])
    dispute = deal.get("dispute", {})
    evidence = dispute.get("evidence", []) if dispute else []
    messages = dispute.get("messages", []) if dispute else []
    settlement = deal.get("settlement")
    force_release = deal.get("force_release")

    # Build unified audit log
    audit_entries = []

    for t in timeline:
        audit_entries.append({
            "type": "status_change",
            "timestamp": t.get("timestamp"),
            "action": t.get("action"),
            "performed_by": t.get("performed_by"),
            "notes": t.get("notes"),
            "status": t.get("status"),
        })

    for dep in deposits:
        audit_entries.append({
            "type": "deposit",
            "timestamp": dep.get("created_at"),
            "action": f"Deposit: {dep.get('party')} - {dep.get('amount')} {dep.get('asset')}",
            "performed_by": dep.get("confirmed_by") or "system",
            "notes": f"TX: {dep.get('tx_hash', 'N/A')} | Confirmed: {dep.get('confirmed')}",
            "status": "deposit",
        })

    for ev in evidence:
        audit_entries.append({
            "type": "evidence",
            "timestamp": ev.get("uploaded_at"),
            "action": f"Evidence uploaded: {ev.get('file_name')}",
            "performed_by": ev.get("uploaded_by"),
            "notes": ev.get("description"),
            "status": "disputed",
        })

    for msg in messages:
        audit_entries.append({
            "type": "dispute_message",
            "timestamp": msg.get("timestamp"),
            "action": f"Dispute message from {msg.get('sender_role', 'unknown')}",
            "performed_by": msg.get("sender"),
            "notes": msg.get("message"),
            "status": "disputed",
        })

    if settlement:
        audit_entries.append({
            "type": "settlement",
            "timestamp": settlement.get("executed_at"),
            "action": f"Settlement: {settlement.get('quantity_a')} {settlement.get('asset_a')} ↔ {settlement.get('quantity_b')} {settlement.get('asset_b')}",
            "performed_by": settlement.get("executed_by"),
            "notes": f"Fee: ${settlement.get('fee_total', 0)}",
            "status": "settled",
        })

    if force_release:
        audit_entries.append({
            "type": "force_release",
            "timestamp": force_release.get("executed_at"),
            "action": f"Force Release to: {force_release.get('release_to')}",
            "performed_by": force_release.get("executed_by"),
            "notes": force_release.get("notes"),
            "status": "closed",
        })

    # Sort chronologically
    audit_entries.sort(key=lambda x: x.get("timestamp") or "")

    return {
        "deal_id": deal.get("deal_id"),
        "escrow_id": deal_id,
        "current_status": deal.get("status"),
        "audit_entries": audit_entries,
        "total_events": len(audit_entries),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/reports/export")
async def export_deals_csv(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export escrow deals as CSV-compatible JSON array."""
    if not _user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only action")

    query = {}
    if date_from:
        query.setdefault("created_at", {})["$gte"] = date_from
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to
    if status:
        query["status"] = status

    deals = await db["escrow_deals"].find(query, {"_id": 0}).sort("created_at", -1).to_list(length=1000)

    rows = []
    for d in deals:
        rows.append({
            "deal_id": d.get("deal_id"),
            "status": d.get("status"),
            "deal_type": d.get("deal_type"),
            "asset_a": d.get("asset_a"),
            "asset_b": d.get("asset_b"),
            "quantity_a": d.get("quantity_a"),
            "quantity_b": d.get("quantity_b"),
            "agreed_price": d.get("agreed_price"),
            "ticket_size": d.get("ticket_size"),
            "fee_schedule": d.get("fee_schedule"),
            "fee_total": d.get("fee_total"),
            "fee_buyer": d.get("fee_buyer"),
            "fee_seller": d.get("fee_seller"),
            "buyer_name": d.get("buyer", {}).get("name"),
            "seller_name": d.get("seller", {}).get("name"),
            "created_at": d.get("created_at"),
            "settled_at": d.get("settled_at"),
            "risk_score": d.get("compliance", {}).get("risk_score"),
        })

    return {
        "rows": rows,
        "total": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
