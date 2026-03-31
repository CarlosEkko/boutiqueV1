"""
Omnibus Vault Routes
Manages a single shared Fireblocks vault for OTC / Multi-Sign clients.
Each client gets one or more virtual sub-accounts (cofres) tracked in an internal ledger.
Admin can configure max cofres per membership tier.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
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
    supported_assets: List[str] = Field(default=["BTC", "ETH", "USDT", "USDC"])


class TierLimitsRequest(BaseModel):
    """Configure max cofres per membership tier"""
    tier_limits: Dict[str, int] = Field(
        ...,
        description="Map of tier name to max cofres. e.g. {'standard': 3, 'premium': 10, 'vip': 20, 'black': 50}"
    )


class CreateCofreRequest(BaseModel):
    """Client creates a new cofre"""
    name: str = Field(..., min_length=1, max_length=60, description="Cofre display name")
    assets: List[str] = Field(default=["BTC", "ETH", "USDT", "USDC"])


class RenameCofreRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)


class ProvisionClientRequest(BaseModel):
    """Admin provisions a cofre for an OTC client"""
    user_id: Optional[str] = None
    otc_client_id: Optional[str] = None
    cofre_name: str = Field(default="Cofre Principal")
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


# ==================== ADMIN: TIER LIMITS ====================

@router.get("/tier-limits")
async def get_tier_limits(admin: dict = Depends(get_internal_user)):
    """Get cofre limits per membership tier"""
    doc = await db.omnibus_tier_limits.find_one({}, {"_id": 0})
    if not doc:
        return {"tier_limits": {"broker": 1, "standard": 3, "premium": 10, "vip": 20, "institucional": 50}}
    return {"tier_limits": doc.get("tier_limits", {})}


@router.put("/tier-limits")
async def set_tier_limits(data: TierLimitsRequest, admin: dict = Depends(get_admin_user)):
    """Configure max cofres per tier (admin only)"""
    now = datetime.now(timezone.utc).isoformat()
    await db.omnibus_tier_limits.update_one(
        {},
        {"$set": {
            "tier_limits": data.tier_limits,
            "updated_at": now,
            "updated_by": admin.get("email", ""),
        }},
        upsert=True
    )
    logger.info(f"Tier limits updated by {admin.get('email')}: {data.tier_limits}")
    return {"success": True, "message": "Limites de cofres atualizados"}


# ==================== HELPERS ====================

async def _get_user_tier(user_id: str) -> str:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "membership_level": 1})
    return (user.get("membership_level", "standard") if user else "standard").lower()


async def _get_max_cofres(tier: str) -> int:
    doc = await db.omnibus_tier_limits.find_one({}, {"_id": 0})
    defaults = {"broker": 1, "standard": 3, "premium": 10, "vip": 20, "institucional": 50}
    limits = doc.get("tier_limits", defaults) if doc else defaults
    return limits.get(tier, limits.get("standard", 3))


async def _count_user_cofres(user_id: str) -> int:
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$sub_account_id"}},
        {"$count": "total"}
    ]
    result = await db.omnibus_ledger.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0


# ==================== ADMIN: PROVISION CLIENT ====================

@router.post("/provision")
async def provision_client(data: ProvisionClientRequest, admin: dict = Depends(get_admin_user)):
    """Provision a cofre in the Omnibus ledger for an OTC client (admin bypass, no tier limit)"""
    config = await db.omnibus_config.find_one({}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="Omnibus vault não configurado. Configure primeiro.")

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

    now = datetime.now(timezone.utc).isoformat()
    sub_account_id = str(uuid.uuid4())
    entries = []
    for asset in data.initial_assets:
        entries.append({
            "id": str(uuid.uuid4()),
            "sub_account_id": sub_account_id,
            "cofre_name": data.cofre_name,
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
        })

    if entries:
        await db.omnibus_ledger.insert_many(entries)

    if otc_client_id:
        await db.otc_clients.update_one(
            {"id": otc_client_id},
            {"$set": {
                "omnibus_provisioned": True,
                "omnibus_provisioned_at": now,
            },
             "$addToSet": {"omnibus_sub_account_ids": sub_account_id}
            }
        )

    logger.info(f"Omnibus cofre '{data.cofre_name}' ({sub_account_id}) provisioned for user={user_id}")
    return {
        "success": True,
        "sub_account_id": sub_account_id,
        "cofre_name": data.cofre_name,
        "assets_provisioned": data.initial_assets,
    }


# ==================== CLIENT: CREATE COFRE ====================

@router.post("/cofres")
async def create_cofre(data: CreateCofreRequest, current_user=Depends(get_current_user)):
    """Client creates a new cofre (subject to tier limits)"""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    config = await db.omnibus_config.find_one({}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=400, detail="Serviço de cofres não configurado")

    # Check tier limit
    tier = await _get_user_tier(user_id)
    max_cofres = await _get_max_cofres(tier)
    current_count = await _count_user_cofres(user_id)

    if current_count >= max_cofres:
        raise HTTPException(
            status_code=400,
            detail=f"Limite de cofres atingido. O seu plano ({tier}) permite no máximo {max_cofres} cofres."
        )

    now = datetime.now(timezone.utc).isoformat()
    sub_account_id = str(uuid.uuid4())
    entries = []
    for asset in data.assets:
        entries.append({
            "id": str(uuid.uuid4()),
            "sub_account_id": sub_account_id,
            "cofre_name": data.name,
            "user_id": user_id,
            "otc_client_id": None,
            "client_label": "",
            "asset": asset.upper(),
            "balance": 0.0,
            "available_balance": 0.0,
            "pending_balance": 0.0,
            "omnibus_vault_id": config["fireblocks_vault_id"],
            "created_at": now,
            "updated_at": now,
        })

    if entries:
        await db.omnibus_ledger.insert_many(entries)

    logger.info(f"Client {user_id} created cofre '{data.name}' ({sub_account_id}) [{current_count + 1}/{max_cofres}]")
    return {
        "success": True,
        "sub_account_id": sub_account_id,
        "cofre_name": data.name,
        "cofres_used": current_count + 1,
        "cofres_max": max_cofres,
    }


# ==================== CLIENT / ADMIN: RENAME COFRE ====================

@router.put("/cofres/{sub_account_id}/rename")
async def rename_cofre(sub_account_id: str, data: RenameCofreRequest, current_user=Depends(get_current_user)):
    """Rename a cofre"""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    entry = await db.omnibus_ledger.find_one(
        {"sub_account_id": sub_account_id, "user_id": user_id}, {"_id": 0}
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Cofre não encontrado")

    await db.omnibus_ledger.update_many(
        {"sub_account_id": sub_account_id},
        {"$set": {"cofre_name": data.name, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    logger.info(f"Cofre {sub_account_id} renamed to '{data.name}' by user {user_id}")
    return {"success": True, "message": f"Cofre renomeado para '{data.name}'"}


# ==================== ADMIN: CREDIT / DEBIT ====================

@router.post("/credit/{sub_account_id}")
async def credit_sub_account(sub_account_id: str, data: CreditDebitRequest, admin: dict = Depends(get_admin_user)):
    """Credit funds to a cofre"""
    asset = data.asset.upper()

    entry = await db.omnibus_ledger.find_one(
        {"sub_account_id": sub_account_id, "asset": asset}, {"_id": 0}
    )
    if not entry:
        raise HTTPException(status_code=404, detail=f"Cofre ou ativo {asset} não encontrado")

    now = datetime.now(timezone.utc).isoformat()
    await db.omnibus_ledger.update_one(
        {"sub_account_id": sub_account_id, "asset": asset},
        {"$inc": {"balance": data.amount, "available_balance": data.amount}, "$set": {"updated_at": now}}
    )

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
    """Debit funds from a cofre"""
    asset = data.asset.upper()

    entry = await db.omnibus_ledger.find_one(
        {"sub_account_id": sub_account_id, "asset": asset}, {"_id": 0}
    )
    if not entry:
        raise HTTPException(status_code=404, detail=f"Cofre ou ativo {asset} não encontrado")

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
    """List all Omnibus cofres with balances"""
    pipeline = [
        {"$group": {
            "_id": "$sub_account_id",
            "cofre_name": {"$first": "$cofre_name"},
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
    """Get movement history for a cofre"""
    movements = await db.omnibus_movements.find(
        {"sub_account_id": sub_account_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"movements": movements}


# ==================== CLIENT: MY COFRES ====================

@router.get("/my-cofres")
async def get_my_cofres(current_user=Depends(get_current_user)):
    """Get all cofres for the current user"""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    pipeline = [
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
    cofres = await db.omnibus_ledger.aggregate(pipeline).to_list(100)

    if not cofres:
        return {"has_cofres": False, "cofres": [], "cofres_count": 0, "cofres_max": 0}

    tier = await _get_user_tier(user_id)
    max_cofres = await _get_max_cofres(tier)

    return {
        "has_cofres": True,
        "cofres": cofres,
        "cofres_count": len(cofres),
        "cofres_max": max_cofres,
        "tier": tier,
    }


# LEGACY: Keep /my-balance for backward compatibility with multisign.py
@router.get("/my-balance")
async def get_my_omnibus_balance(current_user=Depends(get_current_user)):
    """Get the current user's first Omnibus cofre balances (legacy)"""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    entries = await db.omnibus_ledger.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(500)

    if not entries:
        return {"has_omnibus": False, "balances": []}

    # Group by sub_account_id
    cofres = {}
    for e in entries:
        sid = e.get("sub_account_id", "")
        if sid not in cofres:
            cofres[sid] = {"sub_account_id": sid, "cofre_name": e.get("cofre_name", "Cofre"), "balances": []}
        cofres[sid]["balances"].append({
            "asset": e.get("asset"),
            "balance": e.get("balance", 0),
            "available_balance": e.get("available_balance", 0),
            "pending_balance": e.get("pending_balance", 0),
        })

    return {
        "has_omnibus": True,
        "cofres": list(cofres.values()),
    }


# ==================== CLIENT: MY MOVEMENTS ====================

@router.get("/my-movements")
async def get_my_movements(current_user=Depends(get_current_user)):
    """Get omnibus movements for the current user"""
    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")

    subs = await db.omnibus_ledger.distinct("sub_account_id", {"user_id": user_id})
    if not subs:
        return {"movements": []}

    movements = await db.omnibus_movements.find(
        {"sub_account_id": {"$in": subs}}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    return {"movements": movements}
