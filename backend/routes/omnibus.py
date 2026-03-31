"""
Omnibus Vault Routes
Manages a single shared Fireblocks vault for OTC / Multi-Sign clients.
Each client gets a virtual sub-account tracked in an internal ledger.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from routes.admin import get_admin_user, get_internal_user
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/omnibus", tags=["Omnibus Vault"])

db = None


def set_db(database):
    global db
    db = database


# ==================== MODELS ====================

class OmnibusConfigRequest(BaseModel):
    fireblocks_vault_id: str = Field(..., description="Fireblocks vault ID for the Omnibus")
    vault_name: str = Field(default="KBEX Omnibus", description="Display name")
    supported_assets: List[str] = Field(default=["BTC", "ETH", "USDT", "USDC", "SOL", "XRP"])


class ProvisionClientRequest(BaseModel):
    """Provision a sub-account for an OTC client within the Omnibus"""
    user_id: Optional[str] = None
    otc_client_id: Optional[str] = None
    initial_assets: List[str] = Field(default=["BTC", "ETH", "USDT", "USDC"])


class CreditDebitRequest(BaseModel):
    asset: str
    amount: float = Field(..., gt=0)
    reference: str = ""
    notes: str = ""


# ==================== ADMIN: CONFIG ====================

@router.get("/config")
async def get_omnibus_config(admin: dict = Depends(get_internal_user)):
    """Get current Omnibus vault configuration"""
    config = await db.omnibus_config.find_one({}, {"_id": 0})
    if not config:
        return {"configured": False}
    return {**config, "configured": True}


@router.put("/config")
async def set_omnibus_config(data: OmnibusConfigRequest, admin: dict = Depends(get_admin_user)):
    """Configure the Omnibus Fireblocks vault (admin only)"""
    now = datetime.now(timezone.utc).isoformat()

    await db.omnibus_config.update_one(
        {},
        {"$set": {
            "fireblocks_vault_id": data.fireblocks_vault_id,
            "vault_name": data.vault_name,
            "supported_assets": data.supported_assets,
            "updated_at": now,
            "updated_by": admin.get("email", ""),
        }},
        upsert=True
    )

    logger.info(f"Omnibus config set: vault_id={data.fireblocks_vault_id} by {admin.get('email')}")
    return {"success": True, "message": "Configuração Omnibus atualizada"}


# ==================== ADMIN: PROVISION CLIENT ====================

@router.post("/provision")
async def provision_client(data: ProvisionClientRequest, admin: dict = Depends(get_admin_user)):
    """Provision a sub-account in the Omnibus ledger for an OTC client"""
    config = await db.omnibus_config.find_one({}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="Omnibus vault não configurado. Configure primeiro.")

    # Resolve identity
    user_id = data.user_id
    otc_client_id = data.otc_client_id
    client_label = ""

    if otc_client_id:
        otc_client = await db.otc_clients.find_one({"id": otc_client_id}, {"_id": 0})
        if not otc_client:
            raise HTTPException(status_code=404, detail="OTC Client não encontrado")
        user_id = user_id or otc_client.get("user_id")
        client_label = otc_client.get("entity_name", otc_client.get("contact_name", ""))

    if not user_id and not otc_client_id:
        raise HTTPException(status_code=400, detail="Forneça user_id ou otc_client_id")

    # Check if already provisioned
    existing = await db.omnibus_ledger.find_one({
        "$or": [
            {"user_id": user_id} if user_id else {"_skip": True},
            {"otc_client_id": otc_client_id} if otc_client_id else {"_skip": True},
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Cliente já possui sub-conta Omnibus")

    now = datetime.now(timezone.utc).isoformat()

    # Create ledger entries for each initial asset
    sub_account_id = str(uuid.uuid4())
    entries = []
    for asset in data.initial_assets:
        entry = {
            "id": str(uuid.uuid4()),
            "sub_account_id": sub_account_id,
            "user_id": user_id,
            "otc_client_id": otc_client_id,
            "client_label": client_label,
            "asset": asset.upper(),
            "balance": 0.0,
            "available_balance": 0.0,
            "pending_balance": 0.0,
            "omnibus_vault_id": config["fireblocks_vault_id"],
            "created_at": now,
            "updated_at": now,
        }
        entries.append(entry)

    if entries:
        await db.omnibus_ledger.insert_many(entries)

    # Mark OTC client as omnibus-provisioned
    if otc_client_id:
        await db.otc_clients.update_one(
            {"id": otc_client_id},
            {"$set": {
                "omnibus_sub_account_id": sub_account_id,
                "omnibus_provisioned": True,
                "omnibus_provisioned_at": now,
            }}
        )

    logger.info(f"Omnibus sub-account {sub_account_id} provisioned for user={user_id} otc={otc_client_id}")
    return {
        "success": True,
        "sub_account_id": sub_account_id,
        "assets_provisioned": data.initial_assets,
    }


# ==================== ADMIN: CREDIT / DEBIT ====================

@router.post("/credit/{sub_account_id}")
async def credit_sub_account(sub_account_id: str, data: CreditDebitRequest, admin: dict = Depends(get_admin_user)):
    """Credit funds to a client's Omnibus sub-account"""
    asset = data.asset.upper()

    entry = await db.omnibus_ledger.find_one(
        {"sub_account_id": sub_account_id, "asset": asset}, {"_id": 0}
    )
    if not entry:
        raise HTTPException(status_code=404, detail=f"Sub-conta ou ativo {asset} não encontrado")

    now = datetime.now(timezone.utc).isoformat()

    await db.omnibus_ledger.update_one(
        {"sub_account_id": sub_account_id, "asset": asset},
        {"$inc": {"balance": data.amount, "available_balance": data.amount}, "$set": {"updated_at": now}}
    )

    # Log the movement
    await db.omnibus_movements.insert_one({
        "id": str(uuid.uuid4()),
        "sub_account_id": sub_account_id,
        "type": "credit",
        "asset": asset,
        "amount": data.amount,
        "reference": data.reference,
        "notes": data.notes,
        "performed_by": admin.get("email", ""),
        "created_at": now,
    })

    logger.info(f"Omnibus credit: {data.amount} {asset} to {sub_account_id}")
    return {"success": True, "message": f"{data.amount} {asset} creditado"}


@router.post("/debit/{sub_account_id}")
async def debit_sub_account(sub_account_id: str, data: CreditDebitRequest, admin: dict = Depends(get_admin_user)):
    """Debit funds from a client's Omnibus sub-account"""
    asset = data.asset.upper()

    entry = await db.omnibus_ledger.find_one(
        {"sub_account_id": sub_account_id, "asset": asset}, {"_id": 0}
    )
    if not entry:
        raise HTTPException(status_code=404, detail=f"Sub-conta ou ativo {asset} não encontrado")

    if entry.get("available_balance", 0) < data.amount:
        raise HTTPException(status_code=400, detail=f"Saldo insuficiente. Disponível: {entry.get('available_balance', 0)} {asset}")

    now = datetime.now(timezone.utc).isoformat()

    await db.omnibus_ledger.update_one(
        {"sub_account_id": sub_account_id, "asset": asset},
        {"$inc": {"balance": -data.amount, "available_balance": -data.amount}, "$set": {"updated_at": now}}
    )

    await db.omnibus_movements.insert_one({
        "id": str(uuid.uuid4()),
        "sub_account_id": sub_account_id,
        "type": "debit",
        "asset": asset,
        "amount": data.amount,
        "reference": data.reference,
        "notes": data.notes,
        "performed_by": admin.get("email", ""),
        "created_at": now,
    })

    logger.info(f"Omnibus debit: {data.amount} {asset} from {sub_account_id}")
    return {"success": True, "message": f"{data.amount} {asset} debitado"}


# ==================== ADMIN: LIST SUB-ACCOUNTS ====================

@router.get("/sub-accounts")
async def list_sub_accounts(admin: dict = Depends(get_internal_user)):
    """List all Omnibus sub-accounts with balances"""
    pipeline = [
        {"$group": {
            "_id": "$sub_account_id",
            "user_id": {"$first": "$user_id"},
            "otc_client_id": {"$first": "$otc_client_id"},
            "client_label": {"$first": "$client_label"},
            "created_at": {"$first": "$created_at"},
            "assets": {"$push": {
                "asset": "$asset",
                "balance": "$balance",
                "available_balance": "$available_balance",
                "pending_balance": "$pending_balance",
            }}
        }},
        {"$sort": {"created_at": -1}}
    ]
    accounts = await db.omnibus_ledger.aggregate(pipeline).to_list(500)
    return {"sub_accounts": accounts}


# ==================== ADMIN: MOVEMENTS HISTORY ====================

@router.get("/movements/{sub_account_id}")
async def get_movements(sub_account_id: str, admin: dict = Depends(get_internal_user)):
    """Get movement history for a sub-account"""
    movements = await db.omnibus_movements.find(
        {"sub_account_id": sub_account_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"movements": movements}


# ==================== CLIENT: MY OMNIBUS BALANCE ====================

@router.get("/my-balance")
async def get_my_omnibus_balance(current_user=Depends(get_current_user)):
    """Get the current user's Omnibus sub-account balances (if provisioned)"""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    entries = await db.omnibus_ledger.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(50)

    if not entries:
        return {"has_omnibus": False, "balances": []}

    sub_account_id = entries[0].get("sub_account_id", "")

    balances = []
    for e in entries:
        balances.append({
            "asset": e.get("asset"),
            "balance": e.get("balance", 0),
            "available_balance": e.get("available_balance", 0),
            "pending_balance": e.get("pending_balance", 0),
        })

    return {
        "has_omnibus": True,
        "sub_account_id": sub_account_id,
        "balances": balances,
    }


# ==================== CLIENT: MY MOVEMENTS ====================

@router.get("/my-movements")
async def get_my_movements(current_user=Depends(get_current_user)):
    """Get omnibus movements for the current user"""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    # Get sub-account ID
    entry = await db.omnibus_ledger.find_one({"user_id": user_id}, {"_id": 0})
    if not entry:
        return {"movements": []}

    sub_account_id = entry.get("sub_account_id")
    movements = await db.omnibus_movements.find(
        {"sub_account_id": sub_account_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    return {"movements": movements}
