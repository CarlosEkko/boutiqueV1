"""
Admin Multi-Sign Management Routes
Provision, manage, and monitor Multi-Sign service for clients.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from routes.admin import get_admin_user, get_internal_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/multisign", tags=["Admin Multi-Sign"])

db = None


def set_db(database):
    global db
    db = database


# ==================== MODELS ====================

class ActivateMultiSignRequest(BaseModel):
    user_id: str
    required_signatures: int = Field(default=2, ge=1, le=10)
    transaction_timeout_hours: int = Field(default=48, ge=1, le=168)
    cofre_name: str = Field(default="Cofre Principal")
    initial_assets: List[str] = Field(default=["BTC", "ETH", "USDT", "USDC"])


class UpdateClientSettingsRequest(BaseModel):
    required_signatures: Optional[int] = None
    transaction_timeout_hours: Optional[int] = None
    is_active: Optional[bool] = None


# ==================== LIST CLIENTS ====================

@router.get("/clients")
async def list_multisign_clients(admin: dict = Depends(get_admin_user)):
    """List all clients with Multi-Sign service"""
    settings = await db.vault_settings.find({}, {"_id": 0}).to_list(500)

    clients = []
    for s in settings:
        user_id = s.get("user_id")
        user = await db.users.find_one(
            {"id": user_id},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "membership_level": 1}
        )

        # Count signatories
        sig_count = await db.vault_signatories.count_documents({"owner_id": user_id})

        # Count cofres
        cofre_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": "$sub_account_id"}},
            {"$count": "total"}
        ]
        cofre_result = await db.omnibus_ledger.aggregate(cofre_pipeline).to_list(1)
        cofre_count = cofre_result[0]["total"] if cofre_result else 0

        # Count transactions
        tx_count = await db.vault_transactions.count_documents({"owner_id": user_id})
        pending_tx = await db.vault_transactions.count_documents(
            {"owner_id": user_id, "status": "pending_signatures"}
        )

        clients.append({
            "user_id": user_id,
            "name": user.get("name", "N/A") if user else "N/A",
            "email": user.get("email", "") if user else "",
            "membership_level": user.get("membership_level", "standard") if user else "standard",
            "required_signatures": s.get("required_signatures", 2),
            "transaction_timeout_hours": s.get("transaction_timeout_hours", 48),
            "is_active": s.get("is_active", True),
            "signatories_count": sig_count,
            "cofres_count": cofre_count,
            "transactions_count": tx_count,
            "pending_transactions": pending_tx,
            "activated_at": s.get("created_at", ""),
        })

    return {"clients": clients, "total": len(clients)}


# ==================== AVAILABLE CLIENTS (not yet activated) ====================

@router.get("/available-clients")
async def list_available_clients(admin: dict = Depends(get_admin_user)):
    """List client users who don't have Multi-Sign yet"""
    # Get all user_ids that already have vault_settings
    existing_ids = await db.vault_settings.distinct("user_id")

    # Find client users NOT in that list
    clients = await db.users.find(
        {"user_type": "client", "id": {"$nin": existing_ids}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "membership_level": 1}
    ).to_list(500)

    return {"clients": clients}


# ==================== ACTIVATE MULTI-SIGN ====================

@router.post("/activate")
async def activate_multisign(data: ActivateMultiSignRequest, admin: dict = Depends(get_admin_user)):
    """Activate Multi-Sign service for a client"""
    # Verify user exists
    user = await db.users.find_one({"id": data.user_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")

    # Check not already activated
    existing = await db.vault_settings.find_one({"user_id": data.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Multi-Sign já ativo para este cliente")

    now = datetime.now(timezone.utc).isoformat()

    # 1. Create vault settings
    await db.vault_settings.insert_one({
        "user_id": data.user_id,
        "required_signatures": data.required_signatures,
        "transaction_timeout_hours": data.transaction_timeout_hours,
        "is_active": True,
        "created_at": now,
        "activated_by": admin.get("email", ""),
    })

    # 2. Add the user as an admin signatory automatically
    await db.vault_signatories.insert_one({
        "id": str(uuid.uuid4()),
        "owner_id": data.user_id,
        "user_id": data.user_id,
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": "admin",
        "created_at": now,
    })

    # 3. Provision omnibus cofre
    config = await db.omnibus_config.find_one({}, {"_id": 0})
    omnibus_vault_id = config.get("fireblocks_vault_id", "") if config else ""

    sub_account_id = str(uuid.uuid4())
    entries = []
    for asset in data.initial_assets:
        entries.append({
            "id": str(uuid.uuid4()),
            "sub_account_id": sub_account_id,
            "cofre_name": data.cofre_name,
            "user_id": data.user_id,
            "otc_client_id": None,
            "client_label": user.get("name", ""),
            "asset": asset.upper(),
            "balance": 0.0,
            "available_balance": 0.0,
            "pending_balance": 0.0,
            "omnibus_vault_id": omnibus_vault_id,
            "created_at": now,
            "updated_at": now,
        })

    if entries:
        await db.omnibus_ledger.insert_many(entries)

    logger.info(f"Multi-Sign activated for {user.get('email')} by {admin.get('email')}")
    return {
        "success": True,
        "message": f"Multi-Sign ativado para {user.get('name', '')}",
        "user_id": data.user_id,
        "sub_account_id": sub_account_id,
    }


# ==================== CLIENT DETAIL ====================

@router.get("/clients/{user_id}")
async def get_client_detail(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get detailed Multi-Sign info for a client"""
    settings = await db.vault_settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Cliente não tem Multi-Sign ativo")

    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "membership_level": 1}
    )

    # Signatories
    signatories = await db.vault_signatories.find(
        {"owner_id": user_id}, {"_id": 0}
    ).to_list(50)

    # Cofres
    cofre_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$sub_account_id",
            "cofre_name": {"$first": "$cofre_name"},
            "created_at": {"$first": "$created_at"},
            "assets": {"$push": {
                "asset": "$asset",
                "balance": "$balance",
                "available_balance": "$available_balance",
                "pending_balance": "$pending_balance",
            }}
        }},
        {"$sort": {"created_at": 1}}
    ]
    cofres = await db.omnibus_ledger.aggregate(cofre_pipeline).to_list(50)

    # Recent transactions
    transactions = await db.vault_transactions.find(
        {"owner_id": user_id},
        {"_id": 0, "id": 1, "order_number": 1, "asset": 1, "amount": 1, "status": 1, "created_at": 1, "destination_name": 1}
    ).sort("created_at", -1).to_list(20)

    return {
        "user": user,
        "settings": settings,
        "signatories": signatories,
        "cofres": cofres,
        "transactions": transactions,
    }


# ==================== UPDATE SETTINGS ====================

@router.put("/clients/{user_id}")
async def update_client_settings(user_id: str, data: UpdateClientSettingsRequest, admin: dict = Depends(get_admin_user)):
    """Update Multi-Sign settings for a client"""
    settings = await db.vault_settings.find_one({"user_id": user_id})
    if not settings:
        raise HTTPException(status_code=404, detail="Cliente não tem Multi-Sign ativo")

    update = {}
    if data.required_signatures is not None:
        update["required_signatures"] = data.required_signatures
    if data.transaction_timeout_hours is not None:
        update["transaction_timeout_hours"] = data.transaction_timeout_hours
    if data.is_active is not None:
        update["is_active"] = data.is_active

    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.vault_settings.update_one({"user_id": user_id}, {"$set": update})

    logger.info(f"Multi-Sign settings updated for {user_id} by {admin.get('email')}: {update}")
    return {"success": True, "message": "Configurações atualizadas"}


# ==================== DEACTIVATE ====================

@router.delete("/clients/{user_id}")
async def deactivate_multisign(user_id: str, admin: dict = Depends(get_admin_user)):
    """Deactivate Multi-Sign for a client (soft delete - marks inactive)"""
    settings = await db.vault_settings.find_one({"user_id": user_id})
    if not settings:
        raise HTTPException(status_code=404, detail="Cliente não tem Multi-Sign ativo")

    await db.vault_settings.update_one(
        {"user_id": user_id},
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat(), "deactivated_by": admin.get("email", "")}}
    )

    logger.info(f"Multi-Sign deactivated for {user_id} by {admin.get('email')}")
    return {"success": True, "message": "Multi-Sign desativado"}
