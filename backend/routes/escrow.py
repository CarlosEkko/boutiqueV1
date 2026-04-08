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
    ESCROW_STATUS_TRANSITIONS, calculate_fee, split_fee,
    CreateEscrowDeal, UpdateEscrowDeal, AdvanceEscrowStatus,
    OpenDispute, ResolveDispute
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
