"""
Client Multi-Sign Vault Routes
Premium multi-signature transaction system for KBEX clients
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging

from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/vault", tags=["Vault Multi-Sign"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db


# ==================== MODELS ====================

class AddSignatoryRequest(BaseModel):
    email: str
    role: str = "signer"  # signer, admin, viewer
    name: str = ""


class VaultSettingsRequest(BaseModel):
    required_signatures: int = Field(default=2, ge=1, le=10)
    transaction_timeout_hours: int = Field(default=48, ge=1, le=168)


class CreateVaultTransactionRequest(BaseModel):
    asset: str
    network: str
    amount: float
    destination_name: str
    destination_address: str
    source_wallet: str = "Main Wallet"
    notes: str = ""
    selected_signer_ids: List[str] = []


class SignActionRequest(BaseModel):
    comment: str = ""


# ==================== HELPERS ====================

def build_process_steps(tx):
    steps = []

    # 1. Initiated
    steps.append({
        "key": "initiated",
        "label": "Initiated",
        "status": "completed",
        "timestamp": tx.get("created_at", ""),
        "details": {"by": tx.get("created_by_name", ""), "email": tx.get("created_by_email", "")}
    })

    # 2. Signatures
    sigs = tx.get("signatures", [])
    required = tx.get("required_signatures", 2)
    signed_count = len([s for s in sigs if s["status"] == "signed"])
    rejected = any(s["status"] == "rejected" for s in sigs)

    if tx["status"] == "cancelled":
        sig_status = "cancelled"
    elif rejected:
        sig_status = "rejected"
    elif signed_count >= required:
        sig_status = "completed"
    elif signed_count > 0:
        sig_status = "in_progress"
    else:
        sig_status = "waiting"

    steps.append({
        "key": "signatures",
        "label": "Signatures",
        "status": sig_status,
        "details": {"required": required, "signed": signed_count, "signers": sigs}
    })

    # 3. Risk Check
    rc = tx.get("risk_check", {})
    if rc.get("passed"):
        rc_status = "completed"
    elif sig_status == "completed":
        rc_status = "in_progress"
    else:
        rc_status = "pending"
    steps.append({
        "key": "risk_check",
        "label": "Risk & Compliance",
        "status": rc_status,
        "details": rc
    })

    # 4. Execution
    ex = tx.get("execution", {})
    if ex.get("completed"):
        ex_status = "completed"
    elif rc.get("passed"):
        ex_status = "in_progress"
    else:
        ex_status = "pending"
    steps.append({
        "key": "execution",
        "label": "Execution",
        "status": ex_status,
        "details": ex
    })

    # 5. Completed
    steps.append({
        "key": "completed",
        "label": "Completed",
        "status": "completed" if tx["status"] == "completed" else "pending",
        "timestamp": tx.get("completed_at", ""),
        "details": {}
    })

    return steps


# ==================== SIGNATORIES ====================

@router.get("/signatories")
async def get_signatories(current_user=Depends(get_current_user)):
    """Get client's configured signatories."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    signatories = await db.vault_signatories.find(
        {"owner_id": user_id}, {"_id": 0}
    ).to_list(50)
    return {"signatories": signatories}


@router.post("/signatories")
async def add_signatory(data: AddSignatoryRequest, current_user=Depends(get_current_user)):
    """Add a signatory to the client's vault."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    # Check if user exists on platform
    target_user = await db.users.find_one(
        {"email": {"$regex": f"^{data.email}$", "$options": "i"}},
        {"_id": 0, "id": 1, "name": 1, "email": 1}
    )

    # Check duplicate
    existing = await db.vault_signatories.find_one({
        "owner_id": user_id, "email": {"$regex": f"^{data.email}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Este signatário já está configurado")

    signatory = {
        "id": str(uuid.uuid4()),
        "owner_id": user_id,
        "user_id": target_user["id"] if target_user else None,
        "name": data.name or (target_user["name"] if target_user else data.email.split("@")[0]),
        "email": data.email,
        "role": data.role,
        "is_registered": bool(target_user),
        "status": "active",
        "added_at": datetime.now(timezone.utc).isoformat(),
        "last_active": None,
    }
    await db.vault_signatories.insert_one(signatory)

    return {"success": True, "signatory": {k: v for k, v in signatory.items() if k != "_id"}}


@router.delete("/signatories/{signatory_id}")
async def remove_signatory(signatory_id: str, current_user=Depends(get_current_user)):
    """Remove a signatory."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    result = await db.vault_signatories.delete_one({"id": signatory_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Signatário não encontrado")
    return {"success": True}


# ==================== SETTINGS ====================

@router.get("/settings")
async def get_vault_settings(current_user=Depends(get_current_user)):
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    settings = await db.vault_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        return {"required_signatures": 2, "transaction_timeout_hours": 48}
    return settings


@router.put("/settings")
async def update_vault_settings(data: VaultSettingsRequest, current_user=Depends(get_current_user)):
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    # Validate against signatories count
    sig_count = await db.vault_signatories.count_documents({"owner_id": user_id, "role": {"$in": ["signer", "admin"]}})
    if data.required_signatures > sig_count:
        raise HTTPException(status_code=400, detail=f"Precisa de pelo menos {data.required_signatures} signatários. Atualmente: {sig_count}")

    await db.vault_settings.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "required_signatures": data.required_signatures,
            "transaction_timeout_hours": data.transaction_timeout_hours,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )
    return {"success": True, "message": "Configurações atualizadas"}


# ==================== TRANSACTIONS ====================

@router.post("/transactions")
async def create_vault_transaction(data: CreateVaultTransactionRequest, current_user=Depends(get_current_user)):
    """Create a multi-sign transaction."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    user_name = current_user.name if hasattr(current_user, 'name') else current_user.get("name", "")
    user_email = current_user.email if hasattr(current_user, 'email') else current_user.get("email", "")

    settings = await db.vault_settings.find_one({"user_id": user_id}, {"_id": 0})
    required = settings.get("required_signatures", 2) if settings else 2
    timeout = settings.get("transaction_timeout_hours", 48) if settings else 48

    # Get signatories
    if data.selected_signer_ids:
        signatories = await db.vault_signatories.find(
            {"id": {"$in": data.selected_signer_ids}, "owner_id": user_id, "role": {"$in": ["signer", "admin"]}},
            {"_id": 0}
        ).to_list(50)
    else:
        signatories = await db.vault_signatories.find(
            {"owner_id": user_id, "role": {"$in": ["signer", "admin"]}},
            {"_id": 0}
        ).to_list(50)

    if len(signatories) < required:
        raise HTTPException(status_code=400, detail=f"Precisa de pelo menos {required} signatários. Selecionados: {len(signatories)}")

    now = datetime.now(timezone.utc)

    signatures = []
    for sig in signatories:
        signatures.append({
            "signatory_id": sig["id"],
            "user_id": sig.get("user_id"),
            "name": sig["name"],
            "email": sig["email"],
            "role": sig["role"],
            "status": "pending",
            "signed_at": None,
            "comment": "",
        })

    tx = {
        "id": str(uuid.uuid4()),
        "order_number": f"VTX-{now.strftime('%y%m%d')}-{str(uuid.uuid4())[:4].upper()}",
        "owner_id": user_id,
        "asset": data.asset,
        "network": data.network,
        "amount": data.amount,
        "destination_name": data.destination_name,
        "destination_address": data.destination_address,
        "source_wallet": data.source_wallet,
        "notes": data.notes,
        "status": "pending_signatures",
        "required_signatures": required,
        "signatures": signatures,
        "risk_check": {},
        "execution": {},
        "created_by": user_id,
        "created_by_name": user_name,
        "created_by_email": user_email,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=timeout)).isoformat(),
        "completed_at": None,
        "activity_log": [
            {"action": "created", "by": user_name, "email": user_email, "at": now.isoformat(), "details": f"Transaction {data.amount} {data.asset} created"}
        ]
    }

    await db.vault_transactions.insert_one(tx)
    logger.info(f"Vault transaction {tx['id']} created by {user_email}: {data.amount} {data.asset}")

    return {"success": True, "transaction_id": tx["id"], "order_number": tx["order_number"]}


@router.get("/transactions")
async def list_vault_transactions(status: Optional[str] = None, current_user=Depends(get_current_user)):
    """List transactions the user owns or is a signer of."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    user_email = current_user.email if hasattr(current_user, 'email') else current_user.get("email", "")

    query = {"$or": [
        {"owner_id": user_id},
        {"signatures.user_id": user_id},
        {"signatures.email": {"$regex": f"^{user_email}$", "$options": "i"}}
    ]}
    if status and status != "all":
        query["status"] = status

    txs = await db.vault_transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

    pending_count = 0
    for tx in txs:
        if tx["status"] == "pending_signatures":
            for sig in tx.get("signatures", []):
                if (sig.get("user_id") == user_id or sig.get("email", "").lower() == user_email.lower()) and sig["status"] == "pending":
                    pending_count += 1
                    break

    return {"transactions": txs, "pending_action_count": pending_count}


@router.get("/transactions/{tx_id}")
async def get_vault_transaction(tx_id: str, current_user=Depends(get_current_user)):
    """Get transaction detail with process steps."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    tx = await db.vault_transactions.find_one({"id": tx_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    tx["process_steps"] = build_process_steps(tx)

    if tx["status"] == "pending_signatures" and tx.get("expires_at"):
        remaining = datetime.fromisoformat(tx["expires_at"]) - datetime.now(timezone.utc)
        tx["time_remaining_seconds"] = max(0, int(remaining.total_seconds()))
    else:
        tx["time_remaining_seconds"] = 0

    return tx


@router.post("/transactions/{tx_id}/sign")
async def sign_transaction(tx_id: str, data: SignActionRequest, current_user=Depends(get_current_user)):
    """Sign/approve a transaction."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    user_email = current_user.email if hasattr(current_user, 'email') else current_user.get("email", "")
    user_name = current_user.name if hasattr(current_user, 'name') else current_user.get("name", "")

    tx = await db.vault_transactions.find_one({"id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    if tx["status"] != "pending_signatures":
        raise HTTPException(status_code=400, detail="Transação não está pendente de assinaturas")

    now = datetime.now(timezone.utc).isoformat()
    signatures = tx.get("signatures", [])
    found = False

    for sig in signatures:
        if sig.get("user_id") == user_id or sig.get("email", "").lower() == user_email.lower():
            if sig["status"] != "pending":
                raise HTTPException(status_code=400, detail="Já assinou esta transação")
            sig["status"] = "signed"
            sig["signed_at"] = now
            sig["comment"] = data.comment
            found = True
            break

    if not found:
        raise HTTPException(status_code=403, detail="Não é signatário desta transação")

    signed_count = len([s for s in signatures if s["status"] == "signed"])
    required = tx.get("required_signatures", 2)

    update = {"signatures": signatures}
    log_entry = {"action": "signed", "by": user_name, "email": user_email, "at": now, "details": data.comment or "Signed"}

    if signed_count >= required:
        # Auto-advance: Risk Check → Execution → Completed (simulated)
        update["risk_check"] = {"passed": True, "checked_at": now, "details": "All checks passed"}
        simulated_hash = f"0x{uuid.uuid4().hex[:40]}"
        update["execution"] = {"completed": True, "executed_at": now, "tx_hash": simulated_hash, "confirmations": "6/6"}
        update["status"] = "completed"
        update["completed_at"] = now
        log_entry2 = {"action": "completed", "by": "System", "email": "", "at": now, "details": f"Transaction executed. TxHash: {simulated_hash}"}
        update["activity_log"] = tx.get("activity_log", []) + [log_entry, log_entry2]
        logger.info(f"Vault tx {tx_id} fully signed ({signed_count}/{required}) and executed (simulated)")
    else:
        update["activity_log"] = tx.get("activity_log", []) + [log_entry]

    await db.vault_transactions.update_one({"id": tx_id}, {"$set": update})

    return {"success": True, "signed_count": signed_count, "required": required, "fully_signed": signed_count >= required}


@router.post("/transactions/{tx_id}/reject")
async def reject_vault_transaction(tx_id: str, data: SignActionRequest, current_user=Depends(get_current_user)):
    """Reject a transaction."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    user_email = current_user.email if hasattr(current_user, 'email') else current_user.get("email", "")
    user_name = current_user.name if hasattr(current_user, 'name') else current_user.get("name", "")

    tx = await db.vault_transactions.find_one({"id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    if tx["status"] != "pending_signatures":
        raise HTTPException(status_code=400, detail="Transação não está pendente")

    now = datetime.now(timezone.utc).isoformat()
    signatures = tx.get("signatures", [])
    for sig in signatures:
        if sig.get("user_id") == user_id or sig.get("email", "").lower() == user_email.lower():
            sig["status"] = "rejected"
            sig["signed_at"] = now
            sig["comment"] = data.comment
            break

    log_entry = {"action": "rejected", "by": user_name, "email": user_email, "at": now, "details": data.comment or "Rejected"}

    await db.vault_transactions.update_one({"id": tx_id}, {"$set": {
        "signatures": signatures,
        "status": "rejected",
        "rejected_at": now,
        "activity_log": tx.get("activity_log", []) + [log_entry]
    }})

    return {"success": True, "message": "Transação rejeitada"}


@router.post("/transactions/{tx_id}/cancel")
async def cancel_vault_transaction(tx_id: str, current_user=Depends(get_current_user)):
    """Cancel a pending transaction (owner only)."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    tx = await db.vault_transactions.find_one({"id": tx_id})
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    if tx.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Apenas o criador pode cancelar")
    if tx["status"] not in ("pending_signatures",):
        raise HTTPException(status_code=400, detail="Transação não pode ser cancelada")

    now = datetime.now(timezone.utc).isoformat()
    user_name = current_user.name if hasattr(current_user, 'name') else current_user.get("name", "")
    log_entry = {"action": "cancelled", "by": user_name, "email": "", "at": now, "details": "Transaction cancelled"}

    await db.vault_transactions.update_one({"id": tx_id}, {"$set": {
        "status": "cancelled", "cancelled_at": now,
        "activity_log": tx.get("activity_log", []) + [log_entry]
    }})
    return {"success": True}


# ==================== DASHBOARD STATS ====================

@router.get("/dashboard")
async def get_vault_dashboard(current_user=Depends(get_current_user)):
    """Get dashboard stats for the vault."""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    user_email = current_user.email if hasattr(current_user, 'email') else current_user.get("email", "")

    query = {"$or": [
        {"owner_id": user_id},
        {"signatures.user_id": user_id},
        {"signatures.email": {"$regex": f"^{user_email}$", "$options": "i"}}
    ]}

    total = await db.vault_transactions.count_documents(query)
    pending = await db.vault_transactions.count_documents({**query, "status": "pending_signatures"})
    completed = await db.vault_transactions.count_documents({**query, "status": "completed"})
    rejected = await db.vault_transactions.count_documents({**query, "status": "rejected"})

    # Total secured value (completed transactions)
    pipeline = [
        {"$match": {**query, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    agg = await db.vault_transactions.aggregate(pipeline).to_list(1)
    total_secured = agg[0]["total"] if agg else 0

    signatories_count = await db.vault_signatories.count_documents({"owner_id": user_id})

    settings = await db.vault_settings.find_one({"user_id": user_id}, {"_id": 0})
    threshold = settings.get("required_signatures", 2) if settings else 2

    return {
        "total_transactions": total,
        "pending_signatures": pending,
        "completed": completed,
        "rejected": rejected,
        "total_secured_value": total_secured,
        "signatories_count": signatories_count,
        "threshold": threshold,
    }
