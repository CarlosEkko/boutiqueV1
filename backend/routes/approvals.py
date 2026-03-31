"""
Transaction Approval Routes - Multi-Sign Workflow
Handles multi-approval process for crypto transactions before execution
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging

from utils.auth import get_current_user_id
from routes.admin import get_admin_user, get_internal_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/approvals", tags=["Transaction Approvals"])

db = None

def set_db(database):
    global db
    db = database


# ==================== MODELS ====================

class CreateTransactionRequest(BaseModel):
    asset: str  # e.g., "USDT", "BTC"
    network: str  # e.g., "TRC20", "ERC20"
    amount: float
    destination_name: str  # e.g., "Krytobox.io #2"
    destination_address: str
    source_wallet: str  # e.g., "OTC Trade 3"
    notes: str = ""
    deal_id: Optional[str] = None  # Link to OTC deal


class ApprovalActionRequest(BaseModel):
    comment: str = ""


class ApprovalSettingsRequest(BaseModel):
    required_approvals: int = Field(default=3, ge=1, le=10)
    approval_timeout_hours: int = Field(default=48, ge=1, le=168)
    approver_ids: List[str] = []


# ==================== HELPER ====================

async def get_approval_settings():
    settings = await db.platform_settings.find_one({"type": "approval_settings"}, {"_id": 0})
    if not settings:
        return {
            "required_approvals": 3,
            "approval_timeout_hours": 48,
            "approver_ids": []
        }
    return settings


def get_process_steps(tx):
    """Build the process timeline from transaction data."""
    steps = []

    # 1. Request Submitted
    steps.append({
        "key": "request_submitted",
        "label": "Request Submitted",
        "status": "completed",
        "details": {
            "sender_name": tx.get("created_by_name", ""),
            "sender_email": tx.get("created_by_email", ""),
            "timestamp": tx.get("created_at", ""),
        }
    })

    # 2. Approval
    approvals = tx.get("approvals", [])
    required = tx.get("required_approvals", 3)
    approved_count = len([a for a in approvals if a["status"] == "approved"])
    rejected = any(a["status"] == "rejected" for a in approvals)

    if tx["status"] == "cancelled":
        approval_status = "cancelled"
    elif rejected:
        approval_status = "rejected"
    elif approved_count >= required:
        approval_status = "completed"
    else:
        approval_status = "in_progress"

    steps.append({
        "key": "approval",
        "label": "Approval",
        "status": approval_status,
        "details": {
            "required": required,
            "approved_count": approved_count,
            "approvals": approvals,
        }
    })

    # 3. Risk & Compliance
    rc = tx.get("risk_compliance", {})
    if rc.get("completed"):
        rc_status = "completed"
    elif approval_status == "completed":
        rc_status = "in_progress"
    else:
        rc_status = "pending"

    steps.append({
        "key": "risk_compliance",
        "label": "Risk & Compliance",
        "status": rc_status,
        "details": rc
    })

    # 4. KBEX Signature
    sig = tx.get("kbex_signature", {})
    if sig.get("signed"):
        sig_status = "completed"
    elif rc.get("completed"):
        sig_status = "in_progress"
    else:
        sig_status = "pending"

    steps.append({
        "key": "kbex_signature",
        "label": "Assinatura KBEX",
        "status": sig_status,
        "details": sig
    })

    # 5. Send
    send = tx.get("send_details", {})
    if send.get("completed"):
        send_status = "completed"
    elif sig.get("signed"):
        send_status = "in_progress"
    else:
        send_status = "pending"

    steps.append({
        "key": "send",
        "label": "Envio",
        "status": send_status,
        "details": send
    })

    # 6. Successful
    if tx["status"] == "completed":
        steps.append({
            "key": "successful",
            "label": "Successful",
            "status": "completed",
            "details": {"timestamp": tx.get("completed_at", "")}
        })
    elif tx["status"] not in ["cancelled", "rejected"]:
        steps.append({
            "key": "successful",
            "label": "Successful",
            "status": "pending",
            "details": {}
        })

    return steps


# ==================== SETTINGS ====================

@router.get("/settings")
async def get_settings(user: dict = Depends(get_admin_user)):
    settings = await get_approval_settings()
    # Get approver details
    approver_ids = settings.get("approver_ids", [])
    approvers = []
    if approver_ids:
        cursor = db.users.find({"id": {"$in": approver_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1, "internal_role": 1})
        approvers = await cursor.to_list(50)
    return {**settings, "approvers": approvers}


@router.put("/settings")
async def update_settings(data: ApprovalSettingsRequest, user: dict = Depends(get_admin_user)):
    await db.platform_settings.update_one(
        {"type": "approval_settings"},
        {"$set": {
            "type": "approval_settings",
            "required_approvals": data.required_approvals,
            "approval_timeout_hours": data.approval_timeout_hours,
            "approver_ids": data.approver_ids,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("email"),
        }},
        upsert=True
    )
    return {"success": True, "message": "Configurações de aprovação atualizadas"}


# ==================== CREATE TRANSACTION ====================

@router.post("/transactions")
async def create_transaction(data: CreateTransactionRequest, staff: dict = Depends(get_internal_user)):
    """Create a new transaction requiring multi-sign approval."""
    settings = await get_approval_settings()
    approver_ids = settings.get("approver_ids", [])
    required = settings.get("required_approvals", 3)
    timeout_hours = settings.get("approval_timeout_hours", 48)

    if len(approver_ids) < required:
        raise HTTPException(status_code=400, detail=f"São necessários pelo menos {required} aprovadores configurados. Atualmente: {len(approver_ids)}")

    # Get approver details
    approvers_cursor = db.users.find({"id": {"$in": approver_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    approvers = await approvers_cursor.to_list(50)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=timeout_hours)

    # Build approval entries
    approval_entries = []
    for approver in approvers:
        approval_entries.append({
            "user_id": approver["id"],
            "user_name": approver.get("name", ""),
            "user_email": approver.get("email", ""),
            "status": "pending",
            "timestamp": now.isoformat(),
            "comment": "",
            "action_at": None,
        })

    tx = {
        "id": str(uuid.uuid4()),
        "order_number": f"TX-{now.strftime('%y%m%d')}-{str(uuid.uuid4())[:4].upper()}",
        "asset": data.asset,
        "network": data.network,
        "amount": data.amount,
        "destination_name": data.destination_name,
        "destination_address": data.destination_address,
        "source_wallet": data.source_wallet,
        "notes": data.notes,
        "deal_id": data.deal_id,
        "status": "pending_approval",  # pending_approval, approved, risk_review, signing, sending, completed, rejected, cancelled
        "required_approvals": required,
        "approvals": approval_entries,
        "risk_compliance": {},
        "kbex_signature": {},
        "send_details": {},
        "created_by": staff.get("id"),
        "created_by_name": staff.get("name", ""),
        "created_by_email": staff.get("email", ""),
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "completed_at": None,
        "cancelled_at": None,
    }

    await db.transaction_approvals.insert_one(tx)
    logger.info(f"Transaction {tx['id']} created by {staff.get('email')} — {data.amount} {data.asset} requiring {required} approvals")

    return {"success": True, "transaction_id": tx["id"], "order_number": tx["order_number"]}


# ==================== LIST & DETAIL ====================

@router.get("/transactions")
async def list_transactions(
    status: Optional[str] = None,
    staff: dict = Depends(get_internal_user)
):
    """List all transactions."""
    query = {}
    if status and status != "all":
        query["status"] = status

    txs = await db.transaction_approvals.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

    # Add pending count for badge
    pending_count = await db.transaction_approvals.count_documents({"status": "pending_approval"})

    return {"transactions": txs, "pending_count": pending_count}


@router.get("/transactions/{tx_id}")
async def get_transaction(tx_id: str, staff: dict = Depends(get_internal_user)):
    """Get transaction detail with process steps."""
    tx = await db.transaction_approvals.find_one({"id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    tx["process_steps"] = get_process_steps(tx)

    # Calculate time remaining
    if tx["status"] == "pending_approval" and tx.get("expires_at"):
        expires = datetime.fromisoformat(tx["expires_at"])
        remaining = expires - datetime.now(timezone.utc)
        tx["time_remaining_seconds"] = max(0, int(remaining.total_seconds()))
    else:
        tx["time_remaining_seconds"] = 0

    return tx


@router.get("/pending")
async def get_my_pending(staff: dict = Depends(get_internal_user)):
    """Get transactions pending current user's approval."""
    user_id = staff.get("id")
    txs = await db.transaction_approvals.find(
        {
            "status": "pending_approval",
            "approvals": {
                "$elemMatch": {"user_id": user_id, "status": "pending"}
            }
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return {"transactions": txs, "count": len(txs)}


# ==================== APPROVE / REJECT ====================

@router.post("/transactions/{tx_id}/approve")
async def approve_transaction(tx_id: str, data: ApprovalActionRequest, staff: dict = Depends(get_internal_user)):
    """Approve a transaction."""
    tx = await db.transaction_approvals.find_one({"id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    if tx["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Transação não está pendente de aprovação")

    user_id = staff.get("id")
    now = datetime.now(timezone.utc).isoformat()

    # Find user's approval entry
    found = False
    approvals = tx.get("approvals", [])
    for a in approvals:
        if a["user_id"] == user_id:
            if a["status"] != "pending":
                raise HTTPException(status_code=400, detail="Já votou nesta transação")
            a["status"] = "approved"
            a["action_at"] = now
            a["comment"] = data.comment
            found = True
            break

    if not found:
        raise HTTPException(status_code=403, detail="Não é aprovador desta transação")

    # Check if we reached quorum
    approved_count = len([a for a in approvals if a["status"] == "approved"])
    required = tx.get("required_approvals", 3)

    update = {"approvals": approvals}
    if approved_count >= required:
        update["status"] = "risk_review"
        # Auto-advance: simulate Risk & Compliance check
        update["risk_compliance"] = {
            "completed": True,
            "result": "passed",
            "checked_at": now,
            "details": "Risk & Compliance checks are successful."
        }
        # Auto-advance: simulate KBEX Signature
        update["kbex_signature"] = {
            "signed": True,
            "signed_at": now,
            "signer": "KBEX System",
            "details": "Signed successfully."
        }
        # Auto-advance: simulate Send
        simulated_tx_id = f"0x{uuid.uuid4().hex[:40]}"
        update["send_details"] = {
            "completed": True,
            "sent_at": now,
            "tx_hash": simulated_tx_id,
            "confirmations": "(-/-)",
            "details": f"Network Confirmations (-/-)"
        }
        update["status"] = "completed"
        update["completed_at"] = now
        logger.info(f"Transaction {tx_id} fully approved ({approved_count}/{required}) and executed (simulated)")
    else:
        logger.info(f"Transaction {tx_id} approved by {staff.get('email')} ({approved_count}/{required})")

    await db.transaction_approvals.update_one({"id": tx_id}, {"$set": update})

    return {
        "success": True,
        "approved_count": approved_count,
        "required": required,
        "fully_approved": approved_count >= required,
        "message": f"Aprovação registada ({approved_count}/{required})"
    }


@router.post("/transactions/{tx_id}/reject")
async def reject_transaction(tx_id: str, data: ApprovalActionRequest, staff: dict = Depends(get_internal_user)):
    """Reject a transaction."""
    tx = await db.transaction_approvals.find_one({"id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    if tx["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Transação não está pendente de aprovação")

    user_id = staff.get("id")
    now = datetime.now(timezone.utc).isoformat()

    approvals = tx.get("approvals", [])
    found = False
    for a in approvals:
        if a["user_id"] == user_id:
            a["status"] = "rejected"
            a["action_at"] = now
            a["comment"] = data.comment
            found = True
            break

    if not found:
        raise HTTPException(status_code=403, detail="Não é aprovador desta transação")

    await db.transaction_approvals.update_one(
        {"id": tx_id},
        {"$set": {
            "approvals": approvals,
            "status": "rejected",
            "rejected_at": now,
            "rejected_by": staff.get("email"),
            "rejection_reason": data.comment
        }}
    )

    logger.info(f"Transaction {tx_id} rejected by {staff.get('email')}: {data.comment}")
    return {"success": True, "message": "Transação rejeitada"}


@router.post("/transactions/{tx_id}/cancel")
async def cancel_transaction(tx_id: str, staff: dict = Depends(get_internal_user)):
    """Cancel a pending transaction."""
    tx = await db.transaction_approvals.find_one({"id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    if tx["status"] not in ("pending_approval", "risk_review"):
        raise HTTPException(status_code=400, detail="Transação não pode ser cancelada neste estado")

    # Only creator or admin can cancel
    if tx.get("created_by") != staff.get("id") and not staff.get("is_admin"):
        raise HTTPException(status_code=403, detail="Apenas o criador ou admin pode cancelar")

    now = datetime.now(timezone.utc).isoformat()
    await db.transaction_approvals.update_one(
        {"id": tx_id},
        {"$set": {"status": "cancelled", "cancelled_at": now, "cancelled_by": staff.get("email")}}
    )

    return {"success": True, "message": "Transação cancelada"}
