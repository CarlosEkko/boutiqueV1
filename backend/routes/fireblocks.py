"""
Fireblocks Routes - Wallet and Transaction Management API
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from services.fireblocks_service import FireblocksService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fireblocks", tags=["Fireblocks"])

# Request/Response Models
class CreateVaultRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    hidden: bool = False

class CreateAssetRequest(BaseModel):
    asset_id: str = Field(..., description="Asset ID (e.g., BTC, ETH, BTC_TEST)")

class CreateTransactionRequest(BaseModel):
    source_vault_id: str
    destination_address: str
    asset_id: str
    amount: str
    note: Optional[str] = ""

class VaultAccountResponse(BaseModel):
    id: str
    name: str
    assets: List[Dict[str, Any]] = []

class AssetResponse(BaseModel):
    id: str
    balance: str
    available: str
    pending: str
    address: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    status: str
    asset_id: str
    amount: str
    source: Dict[str, Any]
    destination: Dict[str, Any]
    created_at: Optional[datetime] = None

class CreateOnboardingVaultRequest(BaseModel):
    vault_name: str = Field(default="Cofre Tx anual", description="Name for the vault")
    assets: List[str] = Field(default=["BTC", "ETH", "USDT_ERC20", "USDC"], description="List of asset IDs")

class CreateOnboardingVaultResponse(BaseModel):
    vault_id: str
    vault_name: str
    assets: List[Dict[str, Any]]

# Routes
@router.get("/health")
async def fireblocks_health():
    """Check Fireblocks connection status"""
    try:
        client = FireblocksService.get_client()
        return {"status": "connected", "message": "Fireblocks client initialized"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Fireblocks not available: {str(e)}")

@router.get("/vault-accounts")
async def list_vault_accounts():
    """List all vault accounts"""
    try:
        accounts = await FireblocksService.get_vault_accounts()
        return {"accounts": accounts, "count": len(accounts)}
    except Exception as e:
        logger.error(f"Error listing vault accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vault-accounts")
async def create_vault_account(request: CreateVaultRequest):
    """Create a new vault account"""
    try:
        account = await FireblocksService.create_vault_account(
            name=request.name,
            hidden=request.hidden
        )
        return {"message": "Vault account created", "account": account}
    except Exception as e:
        logger.error(f"Error creating vault account: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-onboarding-vault")
async def create_onboarding_vault(request: CreateOnboardingVaultRequest):
    """
    Create a vault for onboarding annual payments with BTC, ETH, USDT, USDC wallets.
    Returns the vault ID and all wallet addresses.
    """
    try:
        result = await FireblocksService.create_vault_with_assets(
            name=request.vault_name,
            asset_ids=request.assets,
            hidden=False
        )
        return {
            "success": True,
            "message": f"Vault '{request.vault_name}' criado com sucesso",
            "data": result
        }
    except Exception as e:
        logger.error(f"Error creating onboarding vault: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vault-accounts/{vault_id}")
async def get_vault_account(vault_id: str):
    """Get a specific vault account"""
    try:
        account = await FireblocksService.get_vault_account(vault_id)
        return account
    except Exception as e:
        logger.error(f"Error getting vault account: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vault-accounts/{vault_id}/assets")
async def create_vault_asset(vault_id: str, request: CreateAssetRequest):
    """Create an asset wallet in a vault account"""
    try:
        asset = await FireblocksService.create_vault_asset(
            vault_id=vault_id,
            asset_id=request.asset_id
        )
        return {"message": f"Asset {request.asset_id} created", "asset": asset}
    except Exception as e:
        logger.error(f"Error creating vault asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vault-accounts/{vault_id}/assets/{asset_id}")
async def get_vault_asset(vault_id: str, asset_id: str):
    """Get asset balance in a vault"""
    try:
        asset = await FireblocksService.get_vault_asset(vault_id, asset_id)
        return asset
    except Exception as e:
        logger.error(f"Error getting vault asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vault-accounts/{vault_id}/assets/{asset_id}/addresses")
async def get_deposit_addresses(vault_id: str, asset_id: str):
    """Get deposit addresses for an asset"""
    try:
        addresses = await FireblocksService.get_deposit_addresses(vault_id, asset_id)
        return {"addresses": addresses}
    except Exception as e:
        logger.error(f"Error getting deposit addresses: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supported-assets")
async def list_supported_assets():
    """List all supported assets"""
    try:
        assets = await FireblocksService.get_supported_assets()
        return {"assets": assets, "count": len(assets)}
    except Exception as e:
        logger.error(f"Error listing supported assets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transactions")
async def create_transaction(request: CreateTransactionRequest):
    """Create a withdrawal transaction"""
    try:
        tx = await FireblocksService.create_transaction(
            source_vault_id=request.source_vault_id,
            destination_address=request.destination_address,
            asset_id=request.asset_id,
            amount=request.amount,
            note=request.note
        )
        return {"message": "Transaction created", "transaction": tx}
    except Exception as e:
        logger.error(f"Error creating transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{tx_id}")
async def get_transaction(tx_id: str):
    """Get transaction status"""
    try:
        tx = await FireblocksService.get_transaction(tx_id)
        return tx
    except Exception as e:
        logger.error(f"Error getting transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))
