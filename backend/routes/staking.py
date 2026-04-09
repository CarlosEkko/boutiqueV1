"""
KBEX Staking Routes - Delegated Staking Management
Supports: ETH (Compounding/Legacy validators), SOL, MATIC, ATOM, OSMO
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import logging
import uuid

from routes.auth import get_current_user
from utils.auth import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/staking", tags=["Staking"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db


# ==================== ASSET CONFIGURATION ====================

STAKING_ASSETS = [
    {
        "id": "ETH",
        "name": "Ethereum",
        "symbol": "ETH",
        "chain": "Ethereum",
        "fireblocks_id": "ETH",
        "icon": "eth",
        "apy_range": "3.5% - 5.2%",
        "min_stake": 32,
        "validator_types": [
            {
                "id": "compounding",
                "name": "Compounding",
                "description": "Recompensas reinvestidas automaticamente. Flexível entre 32 e 2048 ETH.",
                "min_amount": 32,
                "max_amount": 2048,
                "increment": None,
                "apy": "4.8%",
            },
            {
                "id": "legacy",
                "name": "Legacy",
                "description": "Validador dedicado. Montante em múltiplos exatos de 32 ETH.",
                "min_amount": 32,
                "max_amount": None,
                "increment": 32,
                "apy": "4.2%",
            }
        ]
    },
    {
        "id": "SOL",
        "name": "Solana",
        "symbol": "SOL",
        "chain": "Solana",
        "fireblocks_id": "SOL",
        "icon": "sol",
        "apy_range": "6.5% - 7.8%",
        "min_stake": 1,
        "validator_types": []
    },
    {
        "id": "MATIC",
        "name": "Polygon",
        "symbol": "MATIC",
        "chain": "Polygon",
        "fireblocks_id": "MATIC",
        "icon": "matic",
        "apy_range": "4.0% - 5.5%",
        "min_stake": 1,
        "validator_types": []
    },
    {
        "id": "ATOM",
        "name": "Cosmos",
        "symbol": "ATOM",
        "chain": "Cosmos",
        "fireblocks_id": "ATOM",
        "icon": "atom",
        "apy_range": "14% - 22%",
        "min_stake": 0.1,
        "validator_types": []
    },
    {
        "id": "OSMO",
        "name": "Osmosis",
        "symbol": "OSMO",
        "chain": "Osmosis",
        "fireblocks_id": "OSMO",
        "icon": "osmo",
        "apy_range": "8% - 12%",
        "min_stake": 0.1,
        "validator_types": []
    },
]


# ==================== MODELS ====================

class StakeRequest(BaseModel):
    asset_id: str = Field(..., description="Asset ID (ETH, SOL, etc.)")
    validator_type: Optional[str] = Field(None, description="compounding or legacy (ETH only)")
    provider_id: str = Field(..., description="Staking provider/validator ID")
    provider_name: Optional[str] = Field(None, description="Provider display name")
    amount: float = Field(..., gt=0, description="Amount to stake")
    note: Optional[str] = ""

class UnstakeRequest(BaseModel):
    position_id: str = Field(..., description="Position ID to unstake from")
    amount: float = Field(..., gt=0, description="Amount to unstake")
    note: Optional[str] = ""

class ClaimRewardsRequest(BaseModel):
    position_id: str = Field(..., description="Position ID to claim rewards from")


# ==================== HELPER: RESOLVE VAULT ====================

async def resolve_vault_id(user_id: str) -> Optional[str]:
    """Auto-resolve the user's Fireblocks vault ID from their profile"""
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"fireblocks_vault_id": 1})
    if user and user.get("fireblocks_vault_id"):
        return user["fireblocks_vault_id"]
    return None


# ==================== ROUTES ====================

@router.get("/assets")
async def get_staking_assets(current_user=Depends(get_current_user)):
    """Get all supported staking assets with validator types and APY info"""
    return {"success": True, "assets": STAKING_ASSETS}


@router.get("/providers")
async def get_staking_providers(
    chain: Optional[str] = Query(None, description="Filter by chain/asset"),
    current_user=Depends(get_current_user)
):
    """Get available staking providers/validators from Fireblocks"""
    try:
        from services.fireblocks_service import FireblocksService
        client = FireblocksService.get_client()
        providers = client.get_staking_providers()

        if chain:
            chain_lower = chain.lower()
            providers = [
                p for p in providers
                if p.get("chainDescriptor", "").lower() == chain_lower
            ]

        safe = []
        for p in (providers if isinstance(providers, list) else []):
            safe.append({
                "id": p.get("id") or p.get("providerId", ""),
                "name": p.get("providerName") or p.get("name", ""),
                "chain": p.get("chainDescriptor", ""),
                "apy": p.get("apy") or p.get("apr", ""),
                "min_stake": p.get("minStakeAmount", ""),
                "fee": p.get("serviceFee", "0"),
                "lockup": p.get("lockupPeriod", ""),
                "is_active": p.get("isActive", True),
            })

        return {"success": True, "providers": safe}
    except Exception as e:
        logger.warning(f"Fireblocks providers unavailable: {e}")
        return {"success": True, "providers": [], "fireblocks_error": str(e)}


@router.get("/positions")
async def get_staking_positions(
    current_user=Depends(get_current_user),
    user_id: str = Depends(get_current_user_id)
):
    """Get all staking positions for the current user"""
    db = get_db()

    # Fetch from local DB
    cursor = db.staking_positions.find(
        {"user_id": user_id, "status": {"$ne": "cancelled"}},
        {"_id": 0}
    ).sort("created_at", -1)
    positions = await cursor.to_list(100)

    # Also try Fireblocks live positions
    fb_positions = []
    vault_id = await resolve_vault_id(user_id)
    if vault_id:
        try:
            from services.fireblocks_service import FireblocksService
            client = FireblocksService.get_client()
            all_pos = client.get_staking_positions()
            if isinstance(all_pos, list):
                fb_positions = [
                    p for p in all_pos
                    if str(p.get("vaultAccountId", "")) == vault_id
                ]
        except Exception as e:
            logger.warning(f"Could not fetch Fireblocks positions: {e}")

    return {
        "success": True,
        "positions": positions,
        "fireblocks_positions": fb_positions,
        "vault_id": vault_id
    }


@router.get("/history")
async def get_staking_history(
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
    user_id: str = Depends(get_current_user_id)
):
    """Get staking action history for the current user"""
    db = get_db()
    cursor = db.staking_history.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    history = await cursor.to_list(limit)
    return {"success": True, "history": history}


@router.get("/summary")
async def get_staking_summary(
    current_user=Depends(get_current_user),
    user_id: str = Depends(get_current_user_id)
):
    """Get staking summary for dashboard cards"""
    db = get_db()

    active = await db.staking_positions.count_documents({
        "user_id": user_id, "status": "active"
    })
    pending = await db.staking_positions.count_documents({
        "user_id": user_id, "status": "pending"
    })

    pipeline = [
        {"$match": {"user_id": user_id, "status": {"$in": ["active", "pending"]}}},
        {"$group": {
            "_id": "$asset_id",
            "total_staked": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }}
    ]
    by_asset = await db.staking_positions.aggregate(pipeline).to_list(20)

    return {
        "success": True,
        "summary": {
            "active_positions": active,
            "pending_positions": pending,
            "total_positions": active + pending,
            "by_asset": [{
                "asset": a["_id"],
                "total_staked": a["total_staked"],
                "count": a["count"]
            } for a in by_asset]
        }
    }


@router.post("/stake")
async def stake_asset(request: StakeRequest, current_user=Depends(get_current_user), user_id: str = Depends(get_current_user_id)):
    """Create a new staking position"""
    db = get_db()

    # Validate asset
    asset_cfg = next((a for a in STAKING_ASSETS if a["id"] == request.asset_id), None)
    if not asset_cfg:
        raise HTTPException(status_code=400, detail=f"Ativo '{request.asset_id}' não suportado para staking")

    # Validate amount
    if request.amount < asset_cfg["min_stake"]:
        raise HTTPException(
            status_code=400,
            detail=f"Montante mínimo para {request.asset_id}: {asset_cfg['min_stake']} {request.asset_id}"
        )

    # ETH-specific validator type validation
    if request.asset_id == "ETH":
        if not request.validator_type:
            raise HTTPException(status_code=400, detail="Tipo de validador obrigatório para ETH (compounding ou legacy)")

        if request.validator_type == "compounding":
            if request.amount < 32 or request.amount > 2048:
                raise HTTPException(status_code=400, detail="Compounding: montante entre 32 e 2048 ETH")
        elif request.validator_type == "legacy":
            if request.amount < 32 or request.amount % 32 != 0:
                raise HTTPException(status_code=400, detail="Legacy: montante em múltiplos exatos de 32 ETH (32, 64, 96...)")
        else:
            raise HTTPException(status_code=400, detail="Tipo de validador inválido. Use 'compounding' ou 'legacy'")

    # Resolve vault ID
    vault_id = await resolve_vault_id(user_id)

    # Try Fireblocks staking
    fb_result = None
    if vault_id:
        try:
            from services.fireblocks_service import FireblocksService
            client = FireblocksService.get_client()
            fb_result = client.execute_staking_stake(
                chain_descriptor=asset_cfg["fireblocks_id"],
                body={
                    "vaultAccountId": vault_id,
                    "providerId": request.provider_id,
                    "stakeAmount": str(request.amount),
                }
            )
        except Exception as e:
            logger.warning(f"Fireblocks staking call failed (position will be tracked locally): {e}")

    # Store position in DB
    position_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    position = {
        "id": position_id,
        "user_id": user_id,
        "asset_id": request.asset_id,
        "asset_name": asset_cfg["name"],
        "validator_type": request.validator_type,
        "provider_id": request.provider_id,
        "provider_name": request.provider_name or request.provider_id,
        "amount": request.amount,
        "vault_id": vault_id,
        "status": "active" if fb_result else "pending",
        "fireblocks_result": str(fb_result) if fb_result else None,
        "rewards_accrued": 0,
        "note": request.note,
        "created_at": now,
        "updated_at": now,
    }
    await db.staking_positions.insert_one(position)

    # Log history
    await db.staking_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": "stake",
        "asset_id": request.asset_id,
        "validator_type": request.validator_type,
        "provider_id": request.provider_id,
        "provider_name": request.provider_name,
        "amount": request.amount,
        "position_id": position_id,
        "created_at": now,
    })

    return {
        "success": True,
        "position_id": position_id,
        "status": position["status"],
        "message": f"Staking de {request.amount} {request.asset_id} {'executado' if fb_result else 'registado (pendente de execução)'}",
    }


@router.post("/unstake")
async def unstake_asset(request: UnstakeRequest, current_user=Depends(get_current_user), user_id: str = Depends(get_current_user_id)):
    """Unstake from a position"""
    db = get_db()

    pos = await db.staking_positions.find_one({"id": request.position_id, "user_id": user_id})
    if not pos:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    if pos["status"] not in ("active", "pending"):
        raise HTTPException(status_code=400, detail="Posição não pode ser retirada no estado atual")
    if request.amount > pos["amount"]:
        raise HTTPException(status_code=400, detail="Montante superior ao staked")

    vault_id = await resolve_vault_id(user_id)
    fb_result = None
    if vault_id:
        try:
            from services.fireblocks_service import FireblocksService
            client = FireblocksService.get_client()
            fb_result = client.execute_staking_unstake(
                chain_descriptor=pos["asset_id"],
                body={
                    "vaultAccountId": vault_id,
                    "providerId": pos["provider_id"],
                    "unstakeAmount": str(request.amount),
                }
            )
        except Exception as e:
            logger.warning(f"Fireblocks unstake call failed: {e}")

    now = datetime.now(timezone.utc).isoformat()
    new_amount = pos["amount"] - request.amount
    new_status = "unstaking" if new_amount > 0 else "withdrawn"

    await db.staking_positions.update_one(
        {"id": request.position_id},
        {"$set": {"amount": new_amount, "status": new_status, "updated_at": now}}
    )

    await db.staking_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": "unstake",
        "asset_id": pos["asset_id"],
        "amount": request.amount,
        "position_id": request.position_id,
        "created_at": now,
    })

    return {
        "success": True,
        "message": f"Unstaking de {request.amount} {pos['asset_id']} iniciado",
        "new_amount": new_amount,
        "new_status": new_status,
    }


@router.post("/claim-rewards")
async def claim_rewards(request: ClaimRewardsRequest, current_user=Depends(get_current_user), user_id: str = Depends(get_current_user_id)):
    """Claim staking rewards for a position"""
    db = get_db()

    pos = await db.staking_positions.find_one({"id": request.position_id, "user_id": user_id})
    if not pos:
        raise HTTPException(status_code=404, detail="Posição não encontrada")

    vault_id = await resolve_vault_id(user_id)
    fb_result = None
    if vault_id and pos.get("provider_id"):
        try:
            from services.fireblocks_service import FireblocksService
            client = FireblocksService.get_client()
            fb_result = client.execute_staking_claim_rewards(
                chain_descriptor=pos["asset_id"],
                body={
                    "vaultAccountId": vault_id,
                    "providerId": pos["provider_id"],
                }
            )
        except Exception as e:
            logger.warning(f"Fireblocks claim rewards failed: {e}")

    now = datetime.now(timezone.utc).isoformat()
    await db.staking_history.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": "claim_rewards",
        "asset_id": pos["asset_id"],
        "amount": pos.get("rewards_accrued", 0),
        "position_id": request.position_id,
        "created_at": now,
    })

    return {
        "success": True,
        "message": "Claim de recompensas iniciado",
        "fireblocks_result": str(fb_result) if fb_result else None,
    }
