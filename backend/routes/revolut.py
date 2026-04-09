"""
Revolut Business API Routes
OAuth flow, account listing, transaction monitoring.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import RedirectResponse
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/revolut", tags=["Revolut"])

db = None
def set_db(database):
    global db
    db = database
    from services.revolut_service import revolut_service
    revolut_service.set_db(database)


def get_db():
    return db


# Reuse admin auth dependency
from routes.admin import get_admin_user


# ---- OAuth Flow ----

@router.get("/connect")
async def get_connect_url(admin: dict = Depends(get_admin_user)):
    """Get the Revolut authorization URL to initiate OAuth."""
    from services.revolut_service import revolut_service
    url = revolut_service.get_authorization_url()
    return {"auth_url": url}


@router.get("/callback")
async def oauth_callback(code: str = Query(...)):
    """Handle OAuth callback from Revolut with authorization code."""
    from services.revolut_service import revolut_service
    result = await revolut_service.exchange_code(code)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    # Redirect to admin dashboard with success
    return {"success": True, "message": "Revolut Business conectado com sucesso!"}


@router.get("/status")
async def connection_status(admin: dict = Depends(get_admin_user)):
    """Check Revolut connection status."""
    from services.revolut_service import revolut_service
    return await revolut_service.get_connection_status()


# ---- Accounts ----

@router.get("/accounts")
async def list_accounts(admin: dict = Depends(get_admin_user)):
    """List all Revolut Business accounts."""
    from services.revolut_service import revolut_service
    result = await revolut_service.get_accounts()
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return {"accounts": result if isinstance(result, list) else []}


@router.get("/accounts/{account_id}")
async def get_account(account_id: str, admin: dict = Depends(get_admin_user)):
    """Get specific account details."""
    from services.revolut_service import revolut_service
    result = await revolut_service.get_account(account_id)
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return result


# ---- Transactions ----

@router.get("/transactions")
async def list_transactions(
    account_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    count: int = 50,
    admin: dict = Depends(get_admin_user),
):
    """List transactions with optional filters."""
    from services.revolut_service import revolut_service
    result = await revolut_service.get_transactions(account_id, from_date, to_date, count)
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return {"transactions": result if isinstance(result, list) else []}


# ---- Counterparties ----

@router.get("/counterparties")
async def list_counterparties(admin: dict = Depends(get_admin_user)):
    """List saved beneficiaries/counterparties."""
    from services.revolut_service import revolut_service
    result = await revolut_service.get_counterparties()
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return {"counterparties": result if isinstance(result, list) else []}
