"""
Fireblocks Tokenization Routes - Token Creation, Minting, Burning, Transfer
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
router = APIRouter(prefix="/tokenization", tags=["Tokenization"])


_db = None

def set_db(database):
    global _db
    _db = database

def get_db():
    return _db


# ==================== MODELS ====================

class DeployTokenRequest(BaseModel):
    vault_account_id: str = Field(..., description="Vault account ID")
    token_name: str = Field(..., min_length=1, max_length=50)
    token_symbol: str = Field(..., min_length=1, max_length=10)
    blockchain: str = Field(..., description="Blockchain ID (ETH, MATIC_POLYGON, SOL, BNB_BSC)")
    decimals: int = Field(default=18, ge=0, le=18)
    initial_supply: Optional[str] = "0"

class CreateCollectionRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    symbol: str = Field(..., min_length=1, max_length=10)
    blockchain: str = Field(...)

class MintTokenRequest(BaseModel):
    collection_id: str = Field(...)
    vault_account_id: str = Field(...)
    amount: str = Field(...)

class BurnTokenRequest(BaseModel):
    collection_id: str = Field(...)
    vault_account_id: str = Field(...)
    amount: str = Field(...)

class TransferTokenRequest(BaseModel):
    asset_id: str = Field(...)
    source_vault_id: str = Field(...)
    destination_address: str = Field(...)
    amount: str = Field(...)
    note: Optional[str] = ""

class LinkTokenRequest(BaseModel):
    collection_id: str = Field(...)
    token_id: str = Field(...)

class IssueTokenRequest(BaseModel):
    vault_account_id: str = Field(...)
    asset_id: str = Field(..., description="Asset ID for the new token")
    blockchain: str = Field(..., description="Blockchain ID")
    contract_address: str = Field(..., description="Smart contract address")


# ==================== ROUTES ====================

@router.get("/collections")
async def list_collections(current_user=Depends(get_current_user)):
    """List all token collections owned by the workspace"""
    try:
        client = FireblocksService.get_client()
        result = client.list_owned_collections()
        # Fireblocks returns {data: [...], paging: {...}}
        collections = result.get("data", []) if isinstance(result, dict) else result
        return {"success": True, "collections": collections}
    except Exception as e:
        logger.error(f"Failed to list collections: {e}")
        return {"success": False, "collections": [], "error": str(e)}


@router.post("/collections")
async def create_collection(request: CreateCollectionRequest, current_user=Depends(get_current_user)):
    """Create a new token collection"""
    db = get_db()
    try:
        client = FireblocksService.get_client()
        result = client.create_new_collection(
            name=request.name,
            symbol=request.symbol,
        )
        
        await db.tokenization_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "create_collection",
            "collection_name": request.name,
            "symbol": request.symbol,
            "blockchain": request.blockchain,
            "result": str(result) if result else None,
            "user_id": current_user.id if hasattr(current_user, 'id') else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {"success": True, "result": result, "message": f"Coleção {request.name} criada"}
    except Exception as e:
        logger.error(f"Failed to create collection: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/collections/{collection_id}")
async def get_collection(collection_id: str, current_user=Depends(get_current_user)):
    """Get collection details"""
    try:
        client = FireblocksService.get_client()
        collection = client.get_linked_collection(collection_id)
        return {"success": True, "collection": collection}
    except Exception as e:
        logger.error(f"Failed to get collection {collection_id}: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/collections/{collection_id}/tokens")
async def get_collection_tokens(collection_id: str, current_user=Depends(get_current_user)):
    """Get tokens in a collection"""
    try:
        client = FireblocksService.get_client()
        tokens = client.get_linked_tokens(collection_id)
        return {"success": True, "tokens": tokens}
    except Exception as e:
        logger.error(f"Failed to get tokens for collection {collection_id}: {e}")
        return {"success": False, "tokens": [], "error": str(e)}


@router.get("/collections/{collection_id}/tokens/count")
async def get_collection_tokens_count(collection_id: str, current_user=Depends(get_current_user)):
    """Get token count in a collection"""
    try:
        client = FireblocksService.get_client()
        count = client.get_linked_tokens_count(collection_id)
        return {"success": True, "count": count}
    except Exception as e:
        logger.error(f"Failed to get tokens count: {e}")
        return {"success": False, "count": 0, "error": str(e)}


@router.post("/tokens/issue")
async def issue_new_token(request: IssueTokenRequest, current_user=Depends(get_current_user)):
    """Issue/deploy a new token"""
    db = get_db()
    try:
        client = FireblocksService.get_client()
        result = client.issue_new_token(
            asset_id=request.asset_id,
            vault_account_id=request.vault_account_id,
        )
        
        await db.tokenization_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "issue_token",
            "asset_id": request.asset_id,
            "blockchain": request.blockchain,
            "vault_account_id": request.vault_account_id,
            "result": str(result) if result else None,
            "user_id": current_user.id if hasattr(current_user, 'id') else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {"success": True, "result": result, "message": f"Token {request.asset_id} emitido"}
    except Exception as e:
        logger.error(f"Failed to issue token: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tokens/mint")
async def mint_tokens(request: MintTokenRequest, current_user=Depends(get_current_user)):
    """Mint new tokens in a collection"""
    db = get_db()
    try:
        client = FireblocksService.get_client()
        result = client.mint_nft(
            collection_id=request.collection_id,
            vault_account_id=request.vault_account_id,
            body={"amount": request.amount}
        )
        
        await db.tokenization_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "mint",
            "collection_id": request.collection_id,
            "amount": request.amount,
            "vault_account_id": request.vault_account_id,
            "result": str(result) if result else None,
            "user_id": current_user.id if hasattr(current_user, 'id') else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {"success": True, "result": result, "message": f"Mint de {request.amount} tokens iniciado"}
    except Exception as e:
        logger.error(f"Minting failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tokens/burn")
async def burn_tokens(request: BurnTokenRequest, current_user=Depends(get_current_user)):
    """Burn tokens from a collection"""
    db = get_db()
    try:
        client = FireblocksService.get_client()
        result = client.burn_nft(
            collection_id=request.collection_id,
            body={
                "vaultAccountId": request.vault_account_id,
                "amount": request.amount
            }
        )
        
        await db.tokenization_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "burn",
            "collection_id": request.collection_id,
            "amount": request.amount,
            "vault_account_id": request.vault_account_id,
            "result": str(result) if result else None,
            "user_id": current_user.id if hasattr(current_user, 'id') else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {"success": True, "result": result, "message": f"Burn de {request.amount} tokens iniciado"}
    except Exception as e:
        logger.error(f"Burning failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tokens/link")
async def link_token(request: LinkTokenRequest, current_user=Depends(get_current_user)):
    """Link a token to a collection"""
    try:
        client = FireblocksService.get_client()
        result = client.link_token(
            collection_id=request.collection_id,
            token_id=request.token_id,
        )
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Failed to link token: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tokens/unlink")
async def unlink_token(request: LinkTokenRequest, current_user=Depends(get_current_user)):
    """Unlink a token from a collection"""
    try:
        client = FireblocksService.get_client()
        result = client.unlink_token(
            collection_id=request.collection_id,
            token_id=request.token_id,
        )
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"Failed to unlink token: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history")
async def get_tokenization_history(
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user)
):
    """Get tokenization action history"""
    db = get_db()
    cursor = db.tokenization_history.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    history = await cursor.to_list(limit)
    return {"success": True, "history": history}


class SetPriceRequest(BaseModel):
    collection_id: str = Field(...)
    symbol: str = Field(...)
    price_usd: float = Field(..., gt=0)

class TransferTokenRequest2(BaseModel):
    asset_id: str = Field(...)
    source_vault_id: str = Field(...)
    destination_address: str = Field(...)
    amount: str = Field(...)
    note: Optional[str] = ""


@router.get("/prices")
async def get_token_prices(current_user=Depends(get_current_user)):
    """Get all token prices"""
    db = get_db()
    cursor = db.token_prices.find({}, {"_id": 0})
    prices_list = await cursor.to_list(500)
    prices = {p["collection_id"]: {"price_usd": p["price_usd"], "updated_at": p.get("updated_at")} for p in prices_list}
    return {"success": True, "prices": prices}


@router.post("/prices")
async def set_token_price(request: SetPriceRequest, current_user=Depends(get_current_user)):
    """Set or update token price"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    await db.token_prices.update_one(
        {"collection_id": request.collection_id},
        {"$set": {
            "collection_id": request.collection_id,
            "symbol": request.symbol,
            "price_usd": request.price_usd,
            "updated_at": now,
            "updated_by": current_user.id if hasattr(current_user, 'id') else None,
        }},
        upsert=True
    )
    return {"success": True, "message": f"Preço de {request.symbol} atualizado para ${request.price_usd}"}


@router.post("/tokens/transfer")
async def transfer_token(request: TransferTokenRequest2, current_user=Depends(get_current_user)):
    """Transfer tokens between vaults"""
    db = get_db()
    try:
        client = FireblocksService.get_client()
        result = client.create_transaction(
            asset_id=request.asset_id,
            source={"type": "VAULT_ACCOUNT", "id": request.source_vault_id},
            destination={"type": "ONE_TIME_ADDRESS", "address": request.destination_address},
            amount=request.amount,
            note=request.note or "Token transfer via KBEX",
        )
        
        await db.tokenization_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "transfer",
            "asset_id": request.asset_id,
            "source_vault": request.source_vault_id,
            "destination": request.destination_address,
            "amount": request.amount,
            "result": str(result) if result else None,
            "user_id": current_user.id if hasattr(current_user, 'id') else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        return {"success": True, "result": result, "message": "Transferência submetida"}
    except Exception as e:
        logger.error(f"Transfer failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

