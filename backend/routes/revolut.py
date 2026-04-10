"""
Revolut Business API Routes
OAuth flow, account listing, transaction monitoring, automatic deposit reconciliation.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import RedirectResponse
from typing import Optional
from datetime import datetime, timezone
import logging
import re
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/revolut", tags=["Revolut"])

# Pattern to match reference codes in transfer descriptions
# DEP + 8 hex chars (fiat deposit) or KB + 8 hex chars (trading order deposit)
REF_CODE_PATTERN = re.compile(r'(DEP[0-9A-Fa-f]{8}|KB[0-9A-Fa-f]{8})', re.IGNORECASE)

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


async def _auto_reconcile_deposit(deposit_doc: dict) -> dict | None:
    """
    Attempt to automatically reconcile a Revolut deposit by matching its reference
    against pending bank_transfers reference_code.
    
    Returns reconciliation result dict if matched, None otherwise.
    """
    reference = deposit_doc.get("reference", "")
    if not reference:
        return None

    # Search for known reference code patterns in the transfer description
    match = REF_CODE_PATTERN.search(reference)
    if not match:
        return None

    ref_code = match.group(1).upper()
    logger.info(f"Auto-reconcile: Found reference code '{ref_code}' in deposit {deposit_doc.get('transaction_id')}")

    # Look up the bank_transfer with this reference_code
    bank_transfer = await get_db().bank_transfers.find_one(
        {"reference_code": ref_code, "status": {"$in": ["pending", "awaiting_approval"]}},
        {"_id": 0}
    )
    if not bank_transfer:
        logger.info(f"Auto-reconcile: No pending bank_transfer found for ref '{ref_code}'")
        return None

    user_id = bank_transfer["user_id"]
    currency = deposit_doc.get("currency", bank_transfer.get("currency", "EUR"))
    amount = deposit_doc.get("amount", 0)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Find user info
    user = await get_db().users.find_one({"id": user_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not user:
        logger.warning(f"Auto-reconcile: User '{user_id}' not found for ref '{ref_code}'")
        return None

    # Credit user's fiat wallet
    wallet = await get_db().fiat_wallets.find_one(
        {"user_id": user_id, "currency": currency}, {"_id": 0}
    )
    if wallet:
        new_balance = wallet.get("balance", 0) + amount
        await get_db().fiat_wallets.update_one(
            {"user_id": user_id, "currency": currency},
            {"$set": {"balance": new_balance, "updated_at": now_iso}}
        )
    else:
        new_balance = amount
        await get_db().fiat_wallets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "currency": currency,
            "balance": amount,
            "created_at": now_iso,
            "updated_at": now_iso,
        })

    # Mark revolut_deposits as reconciled
    await get_db().revolut_deposits.update_one(
        {"transaction_id": deposit_doc["transaction_id"]},
        {"$set": {
            "reconciled": True,
            "auto_reconciled": True,
            "reconciled_to": user_id,
            "reconciled_to_name": user.get("name", ""),
            "reconciled_to_email": user.get("email", ""),
            "reconciled_at": now_iso,
            "reconciled_by": "system",
            "matched_reference_code": ref_code,
            "matched_bank_transfer_id": bank_transfer.get("id", ""),
        }}
    )

    # Update bank_transfer status to completed
    await get_db().bank_transfers.update_one(
        {"reference_code": ref_code},
        {"$set": {
            "status": "completed",
            "updated_at": now_iso,
            "approved_by": "auto_reconciliation",
            "approved_at": now_iso,
            "revolut_transaction_id": deposit_doc.get("transaction_id", ""),
        }}
    )

    # Log fiat transaction
    await get_db().fiat_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "deposit",
        "amount": amount,
        "currency": currency,
        "status": "completed",
        "method": "revolut_auto_reconciliation",
        "reference": ref_code,
        "revolut_tx_id": deposit_doc.get("transaction_id", ""),
        "created_at": now_iso,
    })

    logger.info(
        f"Auto-reconcile SUCCESS: {currency} {amount} → {user.get('name')} ({user.get('email')}) "
        f"ref={ref_code}, tx={deposit_doc.get('transaction_id')}"
    )

    return {
        "user_id": user_id,
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "amount": amount,
        "currency": currency,
        "reference_code": ref_code,
        "new_balance": new_balance,
    }


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


# ---- Webhook ----

@router.post("/webhooks/setup")
async def setup_webhook(request: Request, admin: dict = Depends(get_admin_user)):
    """Create a webhook on Revolut for real-time deposit notifications."""
    from services.revolut_service import revolut_service
    body = await request.json()
    webhook_url = body.get("url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="url required")
    
    result = await revolut_service.create_webhook(webhook_url)
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return result


@router.get("/webhooks")
async def list_webhooks(admin: dict = Depends(get_admin_user)):
    """List all registered Revolut webhooks."""
    from services.revolut_service import revolut_service
    result = await revolut_service.list_webhooks()
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return {"webhooks": result if isinstance(result, list) else []}


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a Revolut webhook."""
    from services.revolut_service import revolut_service
    result = await revolut_service.delete_webhook(webhook_id)
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return {"success": True, "message": "Webhook eliminado"}


@router.post("/webhook")
async def revolut_webhook(request: Request):
    """Handle Revolut webhook notifications for real-time deposit detection and auto-reconciliation."""
    body = await request.json()
    event = body.get("event", "")
    data = body.get("data", {})
    
    logger.info(f"Revolut webhook: {event}")
    
    if event in ("TransactionCreated", "TransactionStateChanged"):
        legs = data.get("legs", [])
        for leg in legs:
            amount = leg.get("amount", 0)
            if amount > 0:  # Incoming transfer (credit)
                tx_id = data.get("id")
                existing = await get_db().revolut_deposits.find_one(
                    {"transaction_id": tx_id}, {"_id": 0}
                )
                
                deposit_doc = {
                    "transaction_id": tx_id,
                    "amount": amount / 100,
                    "currency": leg.get("currency", "EUR"),
                    "reference": data.get("reference", ""),
                    "counterparty_name": leg.get("counterparty", {}).get("account_name", ""),
                    "counterparty_id": leg.get("counterparty", {}).get("id", ""),
                    "state": data.get("state", ""),
                    "created_at": data.get("created_at", ""),
                    "completed_at": data.get("completed_at", ""),
                    "reconciled": False,
                    "reconciled_to": None,
                    "reconciled_at": None,
                }
                
                if not existing:
                    await get_db().revolut_deposits.insert_one(deposit_doc)
                    logger.info(f"Webhook: New deposit stored, tx={tx_id}")
                else:
                    # Update state if changed
                    await get_db().revolut_deposits.update_one(
                        {"transaction_id": tx_id},
                        {"$set": {"state": data.get("state", "")}}
                    )
                    deposit_doc = existing
                
                # Attempt auto-reconciliation for completed transactions
                if data.get("state") == "completed" and not deposit_doc.get("reconciled"):
                    deposit_doc["transaction_id"] = tx_id
                    result = await _auto_reconcile_deposit(deposit_doc)
                    if result:
                        logger.info(f"Webhook auto-reconcile: {result['currency']} {result['amount']} → {result['user_name']}")
    
    return {"ok": True}


# ---- Reconciliation ----

@router.get("/bank-details/{currency}")
async def get_bank_details_for_currency(
    currency: str,
    account_type: str = "main",
    admin: dict = Depends(get_admin_user),
):
    """Get bank details (IBAN/BIC) for a Revolut account by currency and type."""
    from services.revolut_service import revolut_service
    
    accounts_result = await revolut_service.get_accounts()
    if isinstance(accounts_result, dict) and accounts_result.get("error"):
        raise HTTPException(status_code=400, detail=accounts_result["error"])
    
    if not isinstance(accounts_result, list):
        raise HTTPException(status_code=404, detail="No accounts found")
    
    target_name = "main" if account_type == "main" else "kbex"
    matching = [
        a for a in accounts_result
        if a.get("state") == "active"
        and a.get("currency", "").upper() == currency.upper()
        and target_name in (a.get("name", "")).lower()
    ]
    
    if not matching:
        raise HTTPException(status_code=404, detail=f"No {account_type} account found for {currency}")
    
    account = matching[0]
    bank_details = await revolut_service.get_bank_details(account["id"])
    
    if isinstance(bank_details, dict) and bank_details.get("error"):
        raise HTTPException(status_code=400, detail=bank_details.get("error", "Failed to fetch bank details"))
    
    return {
        "account_id": account["id"],
        "account_name": account.get("name"),
        "currency": currency.upper(),
        "balance": account.get("balance", 0),
        "bank_details": bank_details,
    }


@router.post("/sync-bank-details")
async def sync_bank_details(admin: dict = Depends(get_admin_user)):
    """Sync and cache bank details for all kbex (client) and Main (treasury) accounts locally."""
    from services.revolut_service import revolut_service
    
    accounts_result = await revolut_service.get_accounts()
    if isinstance(accounts_result, dict) and accounts_result.get("error"):
        raise HTTPException(status_code=400, detail=accounts_result["error"])
    
    if not isinstance(accounts_result, list):
        return {"synced": 0}
    
    synced = 0
    for account in accounts_result:
        if account.get("state") != "active":
            continue
        name_lower = (account.get("name", "")).lower()
        if "kbex" in name_lower:
            account_type = "kbex"
        elif "main" in name_lower:
            account_type = "main"
        else:
            continue
        
        bank_details = await revolut_service.get_bank_details(account["id"])
        if isinstance(bank_details, dict) and bank_details.get("error"):
            continue
        
        await get_db().revolut_bank_details.update_one(
            {"account_id": account["id"]},
            {"$set": {
                "account_id": account["id"],
                "account_name": account.get("name"),
                "currency": account.get("currency", "").upper(),
                "account_type": account_type,
                "bank_details": bank_details,
                "synced_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        synced += 1
    
    return {"synced": synced, "message": f"{synced} contas sincronizadas"}


@router.get("/public/bank-details/{currency}")
async def get_public_bank_details(currency: str):
    """Public endpoint: Get cached bank details for client deposits (kbex accounts)."""
    cached = await get_db().revolut_bank_details.find_one(
        {"currency": currency.upper(), "account_type": "kbex"},
        {"_id": 0}
    )
    
    if not cached:
        raise HTTPException(status_code=404, detail=f"Bank details for {currency} not available. Please contact support.")
    
    return {
        "currency": currency.upper(),
        "account_name": cached.get("account_name"),
        "bank_details": cached.get("bank_details"),
    }


@router.post("/sync-deposits")
async def sync_deposits(admin: dict = Depends(get_admin_user)):
    """Sync recent incoming deposits from Revolut, detect unreconciled ones, and auto-reconcile matches."""
    from services.revolut_service import revolut_service
    
    txs = await revolut_service.get_transactions(count=200)
    if isinstance(txs, dict) and txs.get("error"):
        raise HTTPException(status_code=400, detail=txs["error"])
    
    if not isinstance(txs, list):
        return {"synced": 0, "new_deposits": 0, "auto_reconciled": 0}
    
    new_count = 0
    auto_reconciled = 0
    auto_reconciled_details = []

    for tx in txs:
        legs = tx.get("legs", [])
        for leg in legs:
            amount = leg.get("amount", 0)
            if amount > 0 and tx.get("state") == "completed":
                existing = await get_db().revolut_deposits.find_one(
                    {"transaction_id": tx["id"]}, {"_id": 0}
                )
                if not existing:
                    counterparty = leg.get("counterparty", {})
                    deposit_doc = {
                        "transaction_id": tx["id"],
                        "amount": amount / 100,
                        "currency": leg.get("currency", "EUR"),
                        "reference": tx.get("reference", ""),
                        "counterparty_name": counterparty.get("account_name", ""),
                        "counterparty_id": counterparty.get("id", ""),
                        "state": tx.get("state", ""),
                        "created_at": tx.get("created_at", ""),
                        "completed_at": tx.get("completed_at", ""),
                        "reconciled": False,
                        "reconciled_to": None,
                        "reconciled_at": None,
                    }
                    await get_db().revolut_deposits.insert_one(deposit_doc)
                    new_count += 1
                    
                    # Attempt auto-reconciliation for new deposits
                    result = await _auto_reconcile_deposit(deposit_doc)
                    if result:
                        auto_reconciled += 1
                        auto_reconciled_details.append(result)
    
    # Also attempt to reconcile any existing unreconciled deposits
    unreconciled = await get_db().revolut_deposits.find(
        {"reconciled": False, "reference": {"$ne": ""}},
        {"_id": 0}
    ).to_list(500)
    
    for dep in unreconciled:
        result = await _auto_reconcile_deposit(dep)
        if result:
            auto_reconciled += 1
            auto_reconciled_details.append(result)
    
    return {
        "synced": len(txs),
        "new_deposits": new_count,
        "auto_reconciled": auto_reconciled,
        "auto_reconciled_details": auto_reconciled_details,
    }


@router.get("/deposits")
async def list_deposits(
    status: str = "all",
    admin: dict = Depends(get_admin_user),
):
    """List tracked deposits with reconciliation status."""
    query = {}
    if status == "pending":
        query["reconciled"] = False
    elif status == "reconciled":
        query["reconciled"] = True
    
    deposits = await get_db().revolut_deposits.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    pending = await get_db().revolut_deposits.count_documents({"reconciled": False})
    reconciled = await get_db().revolut_deposits.count_documents({"reconciled": True})
    
    return {"deposits": deposits, "pending_count": pending, "reconciled_count": reconciled}


@router.post("/deposits/{transaction_id}/reconcile")
async def reconcile_deposit(
    transaction_id: str,
    request: Request,
    admin: dict = Depends(get_admin_user),
):
    """Manually reconcile a deposit to a client's fiat wallet."""
    body = await request.json()
    user_id = body.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    deposit = await get_db().revolut_deposits.find_one(
        {"transaction_id": transaction_id}, {"_id": 0}
    )
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if deposit.get("reconciled"):
        raise HTTPException(status_code=400, detail="Already reconciled")
    
    # Find user
    user = await get_db().users.find_one({"id": user_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    currency = deposit.get("currency", "EUR")
    amount = deposit.get("amount", 0)
    
    # Credit the user's fiat wallet
    wallet = await get_db().fiat_wallets.find_one(
        {"user_id": user_id, "currency": currency}, {"_id": 0}
    )
    if wallet:
        new_balance = wallet.get("balance", 0) + amount
        await get_db().fiat_wallets.update_one(
            {"user_id": user_id, "currency": currency},
            {"$set": {"balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await get_db().fiat_wallets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "currency": currency,
            "balance": amount,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    
    # Mark deposit as reconciled
    await get_db().revolut_deposits.update_one(
        {"transaction_id": transaction_id},
        {"$set": {
            "reconciled": True,
            "auto_reconciled": False,
            "reconciled_to": user_id,
            "reconciled_to_name": user.get("name", ""),
            "reconciled_to_email": user.get("email", ""),
            "reconciled_at": datetime.now(timezone.utc).isoformat(),
            "reconciled_by": admin.get("name", "admin"),
        }}
    )
    
    # Log the transaction
    await get_db().fiat_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "deposit",
        "amount": amount,
        "currency": currency,
        "status": "completed",
        "method": "revolut_transfer",
        "reference": deposit.get("reference", ""),
        "revolut_tx_id": transaction_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {
        "success": True,
        "message": f"Depósito de {currency} {amount:,.2f} creditado a {user.get('name', '')}",
        "new_balance": new_balance if wallet else amount,
    }

