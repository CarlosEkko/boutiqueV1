"""
Fireblocks Staking Routes - Delegated Staking Management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging
import uuid

from routes.auth import get_current_user
from services.fireblocks_service import FireblocksService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/staking", tags=["Staking"])


def get_db():
    from server import db
    return db


# ==================== MODELS ====================

class StakeRequest(BaseModel):
    vault_account_id: str = Field(..., description="Source vault account ID")
    provider_id: str = Field(..., description="Staking provider/validator ID")
    amount: str = Field(..., description="Amount to stake")
    note: Optional[str] = ""

class UnstakeRequest(BaseModel):
    vault_account_id: str = Field(..., description="Vault account ID")
    provider_id: str = Field(..., description="Staking provider ID")
    amount: str = Field(..., description="Amount to unstake")
    note: Optional[str] = ""

class ClaimRewardsRequest(BaseModel):
    vault_account_id: str = Field(..., description="Vault account ID")
    provider_id: str = Field(..., description="Staking provider ID")


# ==================== ROUTES ====================

@router.get("/chains")
async def get_staking_chains(current_user=Depends(get_current_user)):
    """Get all chains that support staking"""
    try:
        client = FireblocksService.get_client()
        chains = client.get_staking_chains()
        return {"success": True, "chains": chains}
    except Exception as e:
        logger.error(f"Failed to get staking chains: {e}")
        return {"success": False, "chains": [], "error": str(e)}


@router.get("/chains/{chain_descriptor}")
async def get_staking_chain_info(chain_descriptor: str, current_user=Depends(get_current_user)):
    """Get staking info for a specific chain"""
    try:
        client = FireblocksService.get_client()
        info = client.get_staking_chain_info(chain_descriptor)
        return {"success": True, "chain_info": info}
    except Exception as e:
        logger.error(f"Failed to get chain info for {chain_descriptor}: {e}")
        return {"success": False, "error": str(e)}


@router.get("/providers")
async def get_staking_providers(
    chain: Optional[str] = Query(None, description="Filter by chain"),
    current_user=Depends(get_current_user)
):
    """Get available staking providers/validators"""
    try:
        client = FireblocksService.get_client()
        providers = client.get_staking_providers()
        
        if chain:
            providers = [p for p in providers if p.get("chainDescriptor", "").lower() == chain.lower()]
        
        return {"success": True, "providers": providers}
    except Exception as e:
        logger.error(f"Failed to get staking providers: {e}")
        return {"success": False, "providers": [], "error": str(e)}


@router.get("/positions")
async def get_staking_positions(
    vault_account_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user)
):
    """Get all staking positions"""
    try:
        client = FireblocksService.get_client()
        positions = client.get_staking_positions()
        
        if vault_account_id:
            positions = [p for p in positions if str(p.get("vaultAccountId", "")) == vault_account_id]
        
        return {"success": True, "positions": positions}
    except Exception as e:
        logger.error(f"Failed to get staking positions: {e}")
        return {"success": False, "positions": [], "error": str(e)}


@router.get("/positions/{position_id}")
async def get_staking_position(position_id: str, current_user=Depends(get_current_user)):
    """Get a specific staking position"""
    try:
        client = FireblocksService.get_client()
        position = client.get_staking_position(position_id)
        return {"success": True, "position": position}
    except Exception as e:
        logger.error(f"Failed to get staking position {position_id}: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/summary")
async def get_staking_summary(current_user=Depends(get_current_user)):
    """Get staking positions summary"""
    try:
        client = FireblocksService.get_client()
        summary = client.get_staking_positions_summary()
        return {"success": True, "summary": summary}
    except Exception as e:
        logger.error(f"Failed to get staking summary: {e}")
        return {"success": False, "summary": {}, "error": str(e)}


@router.get("/summary/vault/{vault_account_id}")
async def get_staking_summary_by_vault(vault_account_id: str, current_user=Depends(get_current_user)):
    """Get staking summary for a specific vault"""
    try:
        client = FireblocksService.get_client()
        summary = client.get_staking_positions_summary_by_vault()
        return {"success": True, "summary": summary}
    except Exception as e:
        logger.error(f"Failed to get staking summary for vault {vault_account_id}: {e}")
        return {"success": False, "summary": {}, "error": str(e)}


@router.post("/stake")
async def stake_asset(request: StakeRequest, current_user=Depends(get_current_user)):
    """Stake cryptocurrency"""
    db = get_db()
    try:
        client = FireblocksService.get_client()
        result = client.execute_staking_stake(
            chain_descriptor=request.provider_id,
            body={
                "vaultAccountId": request.vault_account_id,
                "providerId": request.provider_id,
                "stakeAmount": request.amount,
            }
        )
        
        # Log the staking action
        await db.staking_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "stake",
            "vault_account_id": request.vault_account_id,
            "provider_id": request.provider_id,
            "amount": request.amount,
            "note": request.note,
            "result": str(result) if result else None,
            "user_id": current_user.id if hasattr(current_user, 'id') else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {"success": True, "result": result, "message": f"Staking de {request.amount} iniciado"}
    except Exception as e:
        logger.error(f"Staking failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/unstake")
async def unstake_asset(request: UnstakeRequest, current_user=Depends(get_current_user)):
    """Unstake cryptocurrency"""
    db = get_db()
    try:
        client = FireblocksService.get_client()
        result = client.execute_staking_unstake(
            chain_descriptor=request.provider_id,
            body={
                "vaultAccountId": request.vault_account_id,
                "providerId": request.provider_id,
                "unstakeAmount": request.amount,
            }
        )
        
        await db.staking_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "unstake",
            "vault_account_id": request.vault_account_id,
            "provider_id": request.provider_id,
            "amount": request.amount,
            "note": request.note,
            "result": str(result) if result else None,
            "user_id": current_user.id if hasattr(current_user, 'id') else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {"success": True, "result": result, "message": f"Unstaking de {request.amount} iniciado"}
    except Exception as e:
        logger.error(f"Unstaking failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/claim-rewards")
async def claim_rewards(request: ClaimRewardsRequest, current_user=Depends(get_current_user)):
    """Claim staking rewards"""
    db = get_db()
    try:
        client = FireblocksService.get_client()
        result = client.execute_staking_claim_rewards(
            chain_descriptor=request.provider_id,
            body={
                "vaultAccountId": request.vault_account_id,
                "providerId": request.provider_id,
            }
        )
        
        await db.staking_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "claim_rewards",
            "vault_account_id": request.vault_account_id,
            "provider_id": request.provider_id,
            "result": str(result) if result else None,
            "user_id": current_user.id if hasattr(current_user, 'id') else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {"success": True, "result": result, "message": "Claim de recompensas iniciado"}
    except Exception as e:
        logger.error(f"Claim rewards failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history")
async def get_staking_history(
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user)
):
    """Get staking action history"""
    db = get_db()
    cursor = db.staking_history.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    history = await cursor.to_list(limit)
    return {"success": True, "history": history}
