"""
OTC Desk Routes
API endpoints for the OTC trading desk module
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from models.otc import (
    OTCLead, OTCLeadStatus, OTCLeadSource, TransactionType, SettlementMethod,
    OTCClient, OTCDeal, OTCDealStage, OTCQuote, QuoteStatus,
    OTCExecution, ExecutionStatus, OTCSettlement, SettlementStatus,
    OTCInvoice, InvoiceStatus, ExecutionTimeframe,
    CreateOTCLeadRequest, UpdateOTCLeadRequest, CreateOTCDealRequest, CreateQuoteRequest,
    FundingType, TradingFrequency
)

router = APIRouter(prefix="/otc", tags=["OTC Desk"])

# Database reference - will be set by server.py
db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db

from routes.auth import get_current_user
from pydantic import BaseModel

# Model for client RFQ request
class ClientRFQRequest(BaseModel):
    transaction_type: str
    base_asset: str
    quote_asset: str
    amount: float
    notes: Optional[str] = None


# ==================== OTC LEADS ====================

@router.get("/leads")
async def get_otc_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all OTC leads with filtering"""
    db = get_db()
    
    query = {}
    
    if status and status != "all":
        query["status"] = status
    if source and source != "all":
        query["source"] = source
    if assigned_to:
        query["assigned_to"] = assigned_to
    if search:
        query["$or"] = [
            {"entity_name": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}},
            {"contact_email": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.otc_leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    leads = await cursor.to_list(limit)
    
    total = await db.otc_leads.count_documents(query)
    
    return {
        "leads": leads,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/leads")
async def create_otc_lead(
    lead_data: CreateOTCLeadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new OTC lead"""
    db = get_db()
    
    lead = OTCLead(
        **lead_data.dict(),
        status=OTCLeadStatus.NEW
    )
    
    await db.otc_leads.insert_one(lead.dict())
    
    return {"success": True, "lead": lead.dict()}


@router.get("/leads/{lead_id}")
async def get_otc_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single OTC lead"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id}, {"_id": 0})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return lead


@router.put("/leads/{lead_id}")
async def update_otc_lead(
    lead_id: str,
    update_data: UpdateOTCLeadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update an OTC lead"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.otc_leads.update_one(
        {"id": lead_id},
        {"$set": update_dict}
    )
    
    updated_lead = await db.otc_leads.find_one({"id": lead_id}, {"_id": 0})
    return {"success": True, "lead": updated_lead}


@router.delete("/leads/{lead_id}")
async def delete_otc_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an OTC lead"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Don't allow deletion of active clients
    if lead.get("status") == "active_client":
        raise HTTPException(status_code=400, detail="Cannot delete an active client lead")
    
    await db.otc_leads.delete_one({"id": lead_id})
    
    return {"success": True, "message": "Lead deleted successfully"}


@router.post("/leads/{lead_id}/archive")
async def archive_otc_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Archive an OTC lead"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Don't allow archiving of active clients
    if lead.get("status") == "active_client":
        raise HTTPException(status_code=400, detail="Cannot archive an active client lead")
    
    await db.otc_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": "archived",
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Lead archived successfully"}


@router.post("/leads/{lead_id}/pre-qualify")
async def pre_qualify_lead(
    lead_id: str,
    qualified: bool,
    volume_per_operation: Optional[float] = None,
    current_exchange: Optional[str] = None,
    problem_to_solve: Optional[str] = None,
    rejection_reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Pre-qualify a lead - mark as qualified or not qualified"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update = {
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if qualified:
        update["status"] = OTCLeadStatus.PRE_QUALIFIED.value
        if volume_per_operation:
            update["volume_per_operation"] = volume_per_operation
        if current_exchange:
            update["current_exchange"] = current_exchange
        if problem_to_solve:
            update["problem_to_solve"] = problem_to_solve
    else:
        update["status"] = OTCLeadStatus.NOT_QUALIFIED.value
        if rejection_reason:
            update["rejection_reason"] = rejection_reason
    
    await db.otc_leads.update_one({"id": lead_id}, {"$set": update})
    
    return {"success": True, "status": update.get("status")}


@router.post("/leads/{lead_id}/convert-to-client")
async def convert_lead_to_client(
    lead_id: str,
    daily_limit_usd: float = 100000,
    monthly_limit_usd: float = 1000000,
    default_settlement: SettlementMethod = SettlementMethod.SEPA,
    account_manager_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Convert a qualified lead to an OTC client"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("status") not in [OTCLeadStatus.KYC_APPROVED.value, OTCLeadStatus.PRE_QUALIFIED.value]:
        raise HTTPException(status_code=400, detail="Lead must be KYC approved or pre-qualified")
    
    # Create OTC Client
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    client = OTCClient(
        lead_id=lead_id,
        entity_name=lead.get("entity_name"),
        contact_name=lead.get("contact_name"),
        contact_email=lead.get("contact_email"),
        contact_phone=lead.get("contact_phone"),
        country=lead.get("country"),
        account_manager_id=account_manager_id or current_user_id,
        daily_limit_usd=daily_limit_usd,
        monthly_limit_usd=monthly_limit_usd,
        default_settlement_method=default_settlement
    )
    
    await db.otc_clients.insert_one(client.dict())
    
    # Update lead status
    await db.otc_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": OTCLeadStatus.ACTIVE_CLIENT.value,
            "converted_to_client_id": client.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "client": client.dict()}


@router.post("/leads/{lead_id}/advance-to-kyc")
async def advance_lead_to_kyc(
    lead_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Advance a pre-qualified lead to KYC stage"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("status") != OTCLeadStatus.PRE_QUALIFIED.value:
        raise HTTPException(status_code=400, detail="Lead must be pre-qualified first")
    
    # Update lead status to KYC pending
    await db.otc_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": OTCLeadStatus.KYC_PENDING.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated_lead = await db.otc_leads.find_one({"id": lead_id}, {"_id": 0})
    return {"success": True, "lead": updated_lead, "message": "Lead avançado para KYC"}


@router.post("/leads/{lead_id}/approve-kyc")
async def approve_lead_kyc(
    lead_id: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Approve KYC for a lead"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("status") != OTCLeadStatus.KYC_PENDING.value:
        raise HTTPException(status_code=400, detail="Lead must be in KYC pending status")
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    # Update lead status to KYC approved
    update_data = {
        "status": OTCLeadStatus.KYC_APPROVED.value,
        "kyc_approved_at": datetime.now(timezone.utc).isoformat(),
        "kyc_approved_by": current_user_id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if notes:
        update_data["kyc_notes"] = notes
    
    await db.otc_leads.update_one(
        {"id": lead_id},
        {"$set": update_data}
    )
    
    updated_lead = await db.otc_leads.find_one({"id": lead_id}, {"_id": 0})
    return {"success": True, "lead": updated_lead, "message": "KYC aprovado"}


@router.post("/leads/{lead_id}/reject-kyc")
async def reject_lead_kyc(
    lead_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Reject KYC for a lead"""
    db = get_db()
    
    lead = await db.otc_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("status") != OTCLeadStatus.KYC_PENDING.value:
        raise HTTPException(status_code=400, detail="Lead must be in KYC pending status")
    
    # Update lead status to not qualified
    await db.otc_leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": OTCLeadStatus.NOT_QUALIFIED.value,
            "rejection_reason": f"KYC Rejeitado: {reason}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated_lead = await db.otc_leads.find_one({"id": lead_id}, {"_id": 0})
    return {"success": True, "lead": updated_lead, "message": "KYC rejeitado"}


# ==================== OTC CLIENTS ====================

@router.get("/clients")
async def get_otc_clients(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all OTC clients"""
    db = get_db()
    
    query = {}
    
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"entity_name": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}},
            {"contact_email": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.otc_clients.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    clients = await cursor.to_list(limit)
    
    total = await db.otc_clients.count_documents(query)
    
    return {
        "clients": clients,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/clients/{client_id}")
async def get_otc_client(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single OTC client with stats"""
    db = get_db()
    
    client = await db.otc_clients.find_one({"id": client_id}, {"_id": 0})
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get client's deals
    deals = await db.otc_deals.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    # Calculate stats
    total_volume = sum((d.get("total_value") or 0) for d in deals if d.get("stage") == OTCDealStage.COMPLETED.value)
    total_trades = len([d for d in deals if d.get("stage") == OTCDealStage.COMPLETED.value])
    
    return {
        "client": client,
        "deals": deals,
        "stats": {
            "total_volume_usd": total_volume,
            "total_trades": total_trades,
            "active_deals": len([d for d in deals if d.get("stage") not in [OTCDealStage.COMPLETED.value, OTCDealStage.CANCELLED.value, OTCDealStage.REJECTED.value]])
        }
    }


@router.put("/clients/{client_id}")
async def update_otc_client(
    client_id: str,
    daily_limit_usd: Optional[float] = None,
    monthly_limit_usd: Optional[float] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update an OTC client"""
    db = get_db()
    
    client = await db.otc_clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if daily_limit_usd is not None:
        update_dict["daily_limit_usd"] = daily_limit_usd
    if monthly_limit_usd is not None:
        update_dict["monthly_limit_usd"] = monthly_limit_usd
    if status is not None:
        update_dict["status"] = status
    
    await db.otc_clients.update_one(
        {"id": client_id},
        {"$set": update_dict}
    )
    
    return {"success": True, "message": "Client updated"}


@router.post("/clients/{client_id}/link-user")
async def link_user_to_otc_client(
    client_id: str,
    body: dict = None,
    current_user: dict = Depends(get_current_user)
):
    """Link a registered user to an OTC client - gives them access to OTC Trading Portal"""
    from fastapi import Body
    db = get_db()
    
    # Find the client
    client = await db.otc_clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get user_id from body
    user_id = body.get("user_id") if body else None
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    # Verify the user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already linked to another OTC client
    existing_link = await db.otc_clients.find_one({"user_id": user_id, "id": {"$ne": client_id}})
    if existing_link:
        raise HTTPException(status_code=400, detail="User is already linked to another OTC client")
    
    # Update the client with the user_id and update contact_email to match
    await db.otc_clients.update_one(
        {"id": client_id},
        {"$set": {
            "user_id": user_id,
            "contact_email": user.get("email"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "User linked to OTC client successfully"}


@router.post("/clients/{client_id}/unlink-user")
async def unlink_user_from_otc_client(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove user access from OTC client - removes their access to OTC Trading Portal"""
    db = get_db()
    
    client = await db.otc_clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if not client.get("user_id"):
        raise HTTPException(status_code=400, detail="Client has no linked user")
    
    # Remove the user_id from the client
    await db.otc_clients.update_one(
        {"id": client_id},
        {"$set": {
            "user_id": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "User unlinked from OTC client"}


# ==================== OTC DEALS / PIPELINE ====================

@router.get("/deals")
async def get_otc_deals(
    stage: Optional[str] = None,
    client_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all OTC deals"""
    db = get_db()
    
    query = {}
    
    if stage and stage != "all":
        query["stage"] = stage
    if client_id:
        query["client_id"] = client_id
    if assigned_to:
        query["assigned_operator_id"] = assigned_to
    
    cursor = db.otc_deals.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    deals = await cursor.to_list(limit)
    
    total = await db.otc_deals.count_documents(query)
    
    return {
        "deals": deals,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/deals/pipeline")
async def get_otc_pipeline(
    current_user: dict = Depends(get_current_user)
):
    """Get deals grouped by pipeline stage for Kanban view"""
    db = get_db()
    
    pipeline = {}
    
    # Get counts for each stage
    for stage in OTCDealStage:
        if stage.value not in ["completed", "cancelled", "rejected"]:
            deals = await db.otc_deals.find(
                {"stage": stage.value},
                {"_id": 0}
            ).sort("created_at", -1).to_list(50)
            
            pipeline[stage.value] = {
                "deals": deals,
                "count": len(deals),
                "total_value": sum(d.get("total_value") or 0 for d in deals)
            }
    
    return pipeline


@router.post("/deals")
async def create_otc_deal(
    deal_data: CreateOTCDealRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new OTC deal (RFQ)"""
    db = get_db()
    
    # Verify client exists
    client = await db.otc_clients.find_one({"id": deal_data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Generate deal number
    count = await db.otc_deals.count_documents({})
    deal_number = f"OTC-{datetime.now().year}-{str(count + 1).zfill(4)}"
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    deal = OTCDeal(
        deal_number=deal_number,
        client_id=deal_data.client_id,
        client_name=client.get("entity_name"),
        transaction_type=deal_data.transaction_type,
        base_asset=deal_data.base_asset,
        quote_asset=deal_data.quote_asset,
        amount=deal_data.amount,
        settlement_method=deal_data.settlement_method or client.get("default_settlement_method"),
        funding_type=client.get("funding_type", FundingType.PREFUNDED),
        stage=OTCDealStage.RFQ,
        assigned_operator_id=current_user_id,
        rfq_received_at=datetime.now(timezone.utc).isoformat(),
        notes=deal_data.notes
    )
    
    await db.otc_deals.insert_one(deal.dict())
    
    return {"success": True, "deal": deal.dict()}


@router.get("/deals/{deal_id}")
async def get_otc_deal(
    deal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single OTC deal with all related data"""
    db = get_db()
    
    deal = await db.otc_deals.find_one({"id": deal_id}, {"_id": 0})
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get related data
    quotes = await db.otc_quotes.find({"deal_id": deal_id}, {"_id": 0}).to_list(10)
    executions = await db.otc_executions.find({"deal_id": deal_id}, {"_id": 0}).to_list(10)
    settlements = await db.otc_settlements.find({"deal_id": deal_id}, {"_id": 0}).to_list(10)
    
    return {
        "deal": deal,
        "quotes": quotes,
        "executions": executions,
        "settlements": settlements
    }


@router.post("/deals/{deal_id}/move-stage")
async def move_deal_stage(
    deal_id: str,
    new_stage: OTCDealStage,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Move a deal to a different stage"""
    db = get_db()
    
    deal = await db.otc_deals.find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    update = {
        "stage": new_stage.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if notes:
        update["notes"] = (deal.get("notes", "") + f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {notes}").strip()
    
    # Set timestamp for specific stages
    if new_stage == OTCDealStage.ACCEPTANCE:
        update["accepted_at"] = datetime.now(timezone.utc).isoformat()
    elif new_stage == OTCDealStage.EXECUTION:
        update["executed_at"] = datetime.now(timezone.utc).isoformat()
    elif new_stage == OTCDealStage.SETTLEMENT:
        update["settled_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.otc_deals.update_one({"id": deal_id}, {"$set": update})
    
    return {"success": True, "stage": new_stage.value}


# ==================== QUOTES ====================

@router.post("/quotes")
async def create_quote(
    quote_data: CreateQuoteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a quote for a deal"""
    db = get_db()
    
    deal = await db.otc_deals.find_one({"id": quote_data.deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get market price if not manual
    market_price = quote_data.market_price
    price_source = "manual"
    
    if not quote_data.is_manual or market_price is None:
        # Use the same price source as Exchange page
        base_asset = deal.get('base_asset', '').upper()
        quote_asset = deal.get('quote_asset', '').upper()
        crypto_usd_price = None
        
        try:
            from routes.trading import get_crypto_price
            price_data = await get_crypto_price(base_asset)
            crypto_usd_price = price_data.get("price_usd")
        except Exception as e:
            logger.error(f"Failed to get price from trading cache: {e}")
        
        # Fallback to direct API call
        if crypto_usd_price is None:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10.0) as client:
                    symbol = f"{base_asset}USDT"
                    response = await client.get(f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}")
                    if response.status_code == 200:
                        crypto_usd_price = float(response.json()["price"])
            except Exception:
                pass
        
        if crypto_usd_price:
            # Convert to target fiat
            if quote_asset in ["EUR", "USD", "AED", "BRL"]:
                if quote_asset != "USD":
                    try:
                        import httpx
                        async with httpx.AsyncClient(timeout=5.0) as client:
                            fiat_response = await client.get("https://api.exchangerate-api.com/v4/latest/USD")
                            if fiat_response.status_code == 200:
                                rates = fiat_response.json().get("rates", {})
                                market_price = crypto_usd_price * rates.get(quote_asset, 1)
                            else:
                                fallback_rates = {"EUR": 0.92, "AED": 3.67, "BRL": 5.0}
                                market_price = crypto_usd_price * fallback_rates.get(quote_asset, 1)
                    except Exception:
                        fallback_rates = {"EUR": 0.92, "AED": 3.67, "BRL": 5.0}
                        market_price = crypto_usd_price * fallback_rates.get(quote_asset, 1)
                else:
                    market_price = crypto_usd_price
                price_source = "market"
            else:
                market_price = crypto_usd_price
                price_source = "market"
        
        if market_price is None:
            raise HTTPException(status_code=400, detail="Não foi possível obter o preço de mercado. Por favor insira manualmente.")
    
    # Calculate final price with spread
    spread_amount = market_price * (quote_data.spread_percent / 100)
    
    # For buy orders, client pays more. For sell orders, client receives less.
    if deal.get("transaction_type") == TransactionType.BUY.value:
        final_price = market_price + spread_amount
    else:
        final_price = market_price - spread_amount
    
    total_value = deal.get("amount") * final_price
    
    # Calculate expiry
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=quote_data.valid_for_minutes)).isoformat()
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    quote = OTCQuote(
        deal_id=quote_data.deal_id,
        base_asset=deal.get("base_asset"),
        quote_asset=deal.get("quote_asset"),
        amount=deal.get("amount"),
        market_price=market_price,
        spread_percent=quote_data.spread_percent,
        final_price=final_price,
        total_value=total_value,
        fees=quote_data.fees,
        is_manual=quote_data.is_manual,
        price_source=price_source,
        valid_for_minutes=quote_data.valid_for_minutes,
        expires_at=expires_at,
        status=QuoteStatus.SENT,
        created_by=current_user_id
    )
    
    await db.otc_quotes.insert_one(quote.dict())
    
    # Update deal
    await db.otc_deals.update_one(
        {"id": quote_data.deal_id},
        {"$set": {
            "stage": OTCDealStage.QUOTE.value,
            "quote_id": quote.id,
            "market_price": market_price,
            "spread_percent": quote_data.spread_percent,
            "final_price": final_price,
            "total_value": total_value,
            "fees": quote_data.fees,
            "quote_sent_at": datetime.now(timezone.utc).isoformat(),
            "quote_expires_at": expires_at,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "quote": quote.dict()}


@router.post("/quotes/{quote_id}/accept")
async def accept_quote(
    quote_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Client accepts a quote"""
    db = get_db()
    
    quote = await db.otc_quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check if expired
    if datetime.fromisoformat(quote.get("expires_at").replace("Z", "+00:00")) < datetime.now(timezone.utc):
        await db.otc_quotes.update_one({"id": quote_id}, {"$set": {"status": QuoteStatus.EXPIRED.value}})
        raise HTTPException(status_code=400, detail="Quote has expired")
    
    # Update quote
    await db.otc_quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "status": QuoteStatus.ACCEPTED.value,
            "response_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update deal
    await db.otc_deals.update_one(
        {"id": quote.get("deal_id")},
        {"$set": {
            "stage": OTCDealStage.ACCEPTANCE.value,
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Quote accepted"}


# ==================== DASHBOARD / KPIs ====================

@router.get("/dashboard")
async def get_otc_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Get OTC Desk dashboard with KPIs"""
    db = get_db()
    
    now = datetime.now(timezone.utc)
    day_ago = (now - timedelta(days=1)).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()
    
    # Lead stats
    total_leads = await db.otc_leads.count_documents({})
    new_leads = await db.otc_leads.count_documents({"status": OTCLeadStatus.NEW.value})
    qualified_leads = await db.otc_leads.count_documents({"status": OTCLeadStatus.PRE_QUALIFIED.value})
    converted_leads = await db.otc_leads.count_documents({"status": OTCLeadStatus.ACTIVE_CLIENT.value})
    
    # Client stats
    total_clients = await db.otc_clients.count_documents({})
    active_clients = await db.otc_clients.count_documents({"is_active": True})
    
    # Deal stats
    total_deals = await db.otc_deals.count_documents({})
    completed_deals = await db.otc_deals.count_documents({"stage": OTCDealStage.COMPLETED.value})
    active_deals = await db.otc_deals.count_documents({
        "stage": {"$nin": [OTCDealStage.COMPLETED.value, OTCDealStage.CANCELLED.value, OTCDealStage.REJECTED.value]}
    })
    
    # Volume calculations
    completed_deals_data = await db.otc_deals.find(
        {"stage": OTCDealStage.COMPLETED.value},
        {"total_value": 1, "settled_at": 1, "fees": 1}
    ).to_list(10000)
    
    total_volume = sum((d.get("total_value") or 0) for d in completed_deals_data)
    total_revenue = sum((d.get("fees") or 0) for d in completed_deals_data)
    
    # Volume by period
    volume_24h = sum((d.get("total_value") or 0) for d in completed_deals_data if d.get("settled_at", "") >= day_ago)
    volume_7d = sum((d.get("total_value") or 0) for d in completed_deals_data if d.get("settled_at", "") >= week_ago)
    volume_30d = sum((d.get("total_value") or 0) for d in completed_deals_data if d.get("settled_at", "") >= month_ago)
    
    # Pipeline by stage
    pipeline = {}
    for stage in OTCDealStage:
        if stage.value not in ["completed", "cancelled", "rejected"]:
            count = await db.otc_deals.count_documents({"stage": stage.value})
            pipeline[stage.value] = count
    
    # Conversion rate
    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
    
    return {
        "leads": {
            "total": total_leads,
            "new": new_leads,
            "qualified": qualified_leads,
            "converted": converted_leads,
            "conversion_rate": round(conversion_rate, 1)
        },
        "clients": {
            "total": total_clients,
            "active": active_clients
        },
        "deals": {
            "total": total_deals,
            "completed": completed_deals,
            "active": active_deals,
            "pipeline": pipeline
        },
        "volume": {
            "total": round(total_volume, 2),
            "24h": round(volume_24h, 2),
            "7d": round(volume_7d, 2),
            "30d": round(volume_30d, 2)
        },
        "revenue": {
            "total": round(total_revenue, 2)
        }
    }


@router.get("/stats/enums")
async def get_otc_enums():
    """Get all OTC enums for frontend dropdowns"""
    return {
        "lead_sources": [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in OTCLeadSource],
        "lead_statuses": [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in OTCLeadStatus],
        "transaction_types": [{"value": e.value, "label": e.value.title()} for e in TransactionType],
        "settlement_methods": [{"value": e.value, "label": e.value.replace("_", " ").upper()} for e in SettlementMethod],
        "trading_frequencies": [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in TradingFrequency],
        "deal_stages": [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in OTCDealStage],
        "funding_types": [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in FundingType],
        "execution_timeframes": [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in ExecutionTimeframe]
    }


# ==================== QUOTES LIST & MARKET PRICE ====================

@router.get("/quotes")
async def get_otc_quotes(
    status: Optional[str] = None,
    deal_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all OTC quotes with filtering"""
    db = get_db()
    
    query = {}
    
    if status and status != "all":
        query["status"] = status
    if deal_id:
        query["deal_id"] = deal_id
    
    cursor = db.otc_quotes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    quotes = await cursor.to_list(limit)
    
    # Enrich with deal info
    for quote in quotes:
        deal = await db.otc_deals.find_one({"id": quote.get("deal_id")}, {"_id": 0, "deal_number": 1, "client_name": 1})
        if deal:
            quote["deal_number"] = deal.get("deal_number")
            quote["client_name"] = deal.get("client_name")
    
    total = await db.otc_quotes.count_documents(query)
    
    return {
        "quotes": quotes,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/market-price")
async def get_market_price(
    base_asset: str,
    quote_asset: str,
    current_user: dict = Depends(get_current_user)
):
    """Get current market price using the same source as Exchange/Trading pages"""
    db = get_db()
    
    try:
        import httpx
        from routes.trading import get_crypto_price
        
        base_upper = base_asset.upper()
        quote_upper = quote_asset.upper()
        
        # Use the same price source as Exchange page (trading.py cache)
        try:
            price_data = await get_crypto_price(base_upper)
            crypto_usd_price = price_data.get("price_usd")
        except Exception as e:
            logger.error(f"Failed to get price from trading cache: {e}")
            crypto_usd_price = None
        
        # Fallback to direct API call if cache fails
        if crypto_usd_price is None:
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    symbol = f"{base_upper}USDT"
                    response = await client.get(f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}")
                    if response.status_code == 200:
                        crypto_usd_price = float(response.json()["price"])
                except Exception:
                    pass
        
        if crypto_usd_price is None:
            raise HTTPException(status_code=404, detail=f"Preço não disponível para {base_asset}")
        
        # Convert to target fiat if needed
        final_price = crypto_usd_price
        if quote_upper in ["EUR", "USD", "AED", "BRL"] and quote_upper != "USD":
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    fiat_response = await client.get("https://api.exchangerate-api.com/v4/latest/USD")
                    if fiat_response.status_code == 200:
                        rates = fiat_response.json().get("rates", {})
                        fiat_rate = rates.get(quote_upper, 1)
                        final_price = crypto_usd_price * fiat_rate
            except Exception:
                # Use hardcoded approximate rates as fallback
                fallback_rates = {"EUR": 0.92, "AED": 3.67, "BRL": 5.0}
                final_price = crypto_usd_price * fallback_rates.get(quote_upper, 1)
        
        return {
            "base_asset": base_upper,
            "quote_asset": quote_upper,
            "price": round(final_price, 2),
            "source": "market",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching market price: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao obter preço de mercado: {str(e)}")


@router.post("/quotes/{quote_id}/reject")
async def reject_quote(
    quote_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Reject a quote"""
    db = get_db()
    
    quote = await db.otc_quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    if quote.get("status") != QuoteStatus.SENT.value:
        raise HTTPException(status_code=400, detail="Only sent quotes can be rejected")
    
    # Update quote
    await db.otc_quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "status": QuoteStatus.REJECTED.value,
            "client_response": reason or "Rejected by operator",
            "response_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Move deal back to RFQ stage for new quote
    await db.otc_deals.update_one(
        {"id": quote.get("deal_id")},
        {"$set": {
            "stage": OTCDealStage.RFQ.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Quote rejected"}


# ==================== EXECUTION ====================

@router.post("/deals/{deal_id}/start-execution")
async def start_execution(
    deal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Start execution process for an accepted deal"""
    db = get_db()
    
    deal = await db.otc_deals.find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    if deal.get("stage") != OTCDealStage.ACCEPTANCE.value:
        raise HTTPException(status_code=400, detail="Deal must be in acceptance stage")
    
    # Get the accepted quote
    quote = await db.otc_quotes.find_one({"deal_id": deal_id, "status": QuoteStatus.ACCEPTED.value})
    if not quote:
        raise HTTPException(status_code=400, detail="No accepted quote found")
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    # Determine expected funds
    if deal.get("transaction_type") == TransactionType.BUY.value:
        # Client sends fiat, receives crypto
        funds_expected = (quote.get("total_value") or 0) + (quote.get("fees") or 0)
        funds_expected_asset = quote.get("quote_asset")
        delivery_asset = quote.get("base_asset")
        delivery_amount = quote.get("amount")
    else:
        # Client sends crypto, receives fiat
        funds_expected = quote.get("amount")
        funds_expected_asset = quote.get("base_asset")
        delivery_asset = quote.get("quote_asset")
        delivery_amount = (quote.get("total_value") or 0) - (quote.get("fees") or 0)
    
    # Create execution record
    execution = OTCExecution(
        deal_id=deal_id,
        quote_id=quote.get("id"),
        status=ExecutionStatus.PENDING_FUNDS,
        funding_type=deal.get("funding_type", FundingType.PREFUNDED),
        funds_expected=funds_expected,
        funds_expected_asset=funds_expected_asset,
        delivery_asset=delivery_asset,
        delivery_amount=delivery_amount,
        executed_by=current_user_id
    )
    
    await db.otc_executions.insert_one(execution.dict())
    
    # Update deal
    await db.otc_deals.update_one(
        {"id": deal_id},
        {"$set": {
            "stage": OTCDealStage.EXECUTION.value,
            "execution_id": execution.id,
            "executed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "execution": execution.dict()}


@router.get("/executions/{execution_id}")
async def get_execution(
    execution_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get execution details"""
    db = get_db()
    
    execution = await db.otc_executions.find_one({"id": execution_id}, {"_id": 0})
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return execution


@router.post("/executions/{execution_id}/confirm-funds")
async def confirm_funds_received(
    execution_id: str,
    amount: float,
    tx_hash: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Confirm that funds have been received"""
    db = get_db()
    
    execution = await db.otc_executions.find_one({"id": execution_id})
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    await db.otc_executions.update_one(
        {"id": execution_id},
        {"$set": {
            "status": ExecutionStatus.FUNDS_RECEIVED.value,
            "funds_received": amount,
            "funds_received_at": datetime.now(timezone.utc).isoformat(),
            "funds_tx_hash": tx_hash,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Funds confirmed"}


@router.post("/executions/{execution_id}/complete")
async def complete_execution(
    execution_id: str,
    executed_price: float,
    delivery_tx_hash: Optional[str] = None,
    delivery_address: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Mark execution as complete and move to settlement"""
    db = get_db()
    
    execution = await db.otc_executions.find_one({"id": execution_id})
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Update execution
    await db.otc_executions.update_one(
        {"id": execution_id},
        {"$set": {
            "status": ExecutionStatus.EXECUTED.value,
            "executed_amount": execution.get("delivery_amount"),
            "executed_price": executed_price,
            "delivery_tx_hash": delivery_tx_hash,
            "delivery_address": delivery_address,
            "delivery_at": datetime.now(timezone.utc).isoformat(),
            "execution_venue": "internal",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Move deal to settlement
    deal_id = execution.get("deal_id")
    await db.otc_deals.update_one(
        {"id": deal_id},
        {"$set": {
            "stage": OTCDealStage.SETTLEMENT.value,
            "settled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Execution completed, moved to settlement"}


# ==================== SETTLEMENT ====================

@router.get("/settlements")
async def list_settlements(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """List all settlements"""
    db = get_db()
    
    query = {}
    if status and status != "all":
        query["status"] = status
    
    cursor = db.otc_settlements.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    settlements = await cursor.to_list(limit)
    
    # Enrich with deal and client info
    for settlement in settlements:
        deal = await db.otc_deals.find_one({"id": settlement.get("deal_id")}, {"_id": 0})
        if deal:
            settlement["deal_number"] = deal.get("deal_number")
            settlement["client_name"] = deal.get("client_name")
            settlement["transaction_type"] = deal.get("transaction_type")
            settlement["base_asset"] = deal.get("base_asset")
            settlement["quote_asset"] = deal.get("quote_asset")
            settlement["amount"] = deal.get("amount")
            settlement["total_value"] = deal.get("total_value")
    
    total = await db.otc_settlements.count_documents(query)
    
    return {"settlements": settlements, "total": total}


@router.post("/settlements")
async def create_settlement(
    deal_id: str,
    method: str,
    fiat_amount: Optional[float] = None,
    fiat_currency: Optional[str] = None,
    crypto_amount: Optional[float] = None,
    crypto_asset: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Create a settlement record for a deal"""
    db = get_db()
    
    deal = await db.otc_deals.find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    if deal.get("stage") != OTCDealStage.SETTLEMENT.value:
        raise HTTPException(status_code=400, detail="Deal must be in settlement stage")
    
    # Get execution
    execution = await db.otc_executions.find_one({"deal_id": deal_id})
    if not execution:
        raise HTTPException(status_code=400, detail="No execution found for this deal")
    
    settlement = OTCSettlement(
        deal_id=deal_id,
        execution_id=execution.get("id"),
        method=SettlementMethod(method),
        fiat_amount=fiat_amount,
        fiat_currency=fiat_currency,
        crypto_amount=crypto_amount,
        crypto_asset=crypto_asset
    )
    
    await db.otc_settlements.insert_one(settlement.dict())
    
    # Update deal
    await db.otc_deals.update_one(
        {"id": deal_id},
        {"$set": {
            "settlement_id": settlement.id,
            "settlement_method": method,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "settlement": settlement.dict()}


@router.get("/settlements/{settlement_id}")
async def get_settlement(
    settlement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get settlement details"""
    db = get_db()
    
    settlement = await db.otc_settlements.find_one({"id": settlement_id}, {"_id": 0})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    # Enrich with deal info
    deal = await db.otc_deals.find_one({"id": settlement.get("deal_id")}, {"_id": 0})
    if deal:
        settlement["deal"] = deal
    
    return settlement


@router.post("/settlements/{settlement_id}/confirm-fiat")
async def confirm_fiat_settlement(
    settlement_id: str,
    bank_reference: str,
    amount: float,
    current_user: dict = Depends(get_current_user)
):
    """Confirm fiat settlement"""
    db = get_db()
    
    settlement = await db.otc_settlements.find_one({"id": settlement_id})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    await db.otc_settlements.update_one(
        {"id": settlement_id},
        {"$set": {
            "status": SettlementStatus.IN_PROGRESS.value,
            "fiat_amount": amount,
            "bank_reference": bank_reference,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Fiat settlement confirmed"}


@router.post("/settlements/{settlement_id}/confirm-crypto")
async def confirm_crypto_settlement(
    settlement_id: str,
    tx_hash: str,
    amount: float,
    network: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Confirm crypto settlement"""
    db = get_db()
    
    settlement = await db.otc_settlements.find_one({"id": settlement_id})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    await db.otc_settlements.update_one(
        {"id": settlement_id},
        {"$set": {
            "status": SettlementStatus.IN_PROGRESS.value,
            "crypto_amount": amount,
            "tx_hash": tx_hash,
            "network": network,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Crypto settlement confirmed"}


@router.post("/settlements/{settlement_id}/complete")
async def complete_settlement(
    settlement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark settlement as complete and move deal to invoice stage"""
    db = get_db()
    
    settlement = await db.otc_settlements.find_one({"id": settlement_id})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    # Update settlement
    await db.otc_settlements.update_one(
        {"id": settlement_id},
        {"$set": {
            "status": SettlementStatus.COMPLETED.value,
            "confirmed_at": datetime.now(timezone.utc).isoformat(),
            "confirmed_by": current_user_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Move deal to invoice stage
    deal_id = settlement.get("deal_id")
    await db.otc_deals.update_one(
        {"id": deal_id},
        {"$set": {
            "stage": OTCDealStage.INVOICE.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Settlement completed, deal moved to invoice stage"}


# ==================== INVOICES ====================

@router.get("/invoices")
async def list_invoices(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """List all invoices"""
    db = get_db()
    
    query = {}
    if status and status != "all":
        query["status"] = status
    
    cursor = db.otc_invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    invoices = await cursor.to_list(limit)
    
    total = await db.otc_invoices.count_documents(query)
    
    return {"invoices": invoices, "total": total}


async def generate_invoice_number(db) -> str:
    """Generate unique invoice number"""
    year = datetime.now().year
    count = await db.otc_invoices.count_documents({})
    return f"INV-{year}-{str(count + 1).zfill(5)}"


@router.post("/invoices")
async def create_invoice(
    deal_id: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Create an invoice for a deal"""
    db = get_db()
    
    deal = await db.otc_deals.find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    if deal.get("stage") != OTCDealStage.INVOICE.value:
        raise HTTPException(status_code=400, detail="Deal must be in invoice stage")
    
    # Get client info
    client = await db.otc_clients.find_one({"id": deal.get("client_id")})
    client_name = client.get("entity_name") if client else deal.get("client_name", "Unknown")
    client_address = client.get("address") if client else None
    
    # Generate invoice number
    invoice_number = await generate_invoice_number(db)
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    invoice = OTCInvoice(
        invoice_number=invoice_number,
        deal_id=deal_id,
        client_id=deal.get("client_id"),
        client_name=client_name,
        client_address=client_address,
        base_asset=deal.get("base_asset"),
        quote_asset=deal.get("quote_asset"),
        amount=deal.get("amount"),
        price=deal.get("final_price", 0),
        subtotal=deal.get("total_value") or 0,
        fees=deal.get("fees") or 0,
        total=(deal.get("total_value") or 0) + (deal.get("fees") or 0),
        notes=notes,
        created_by=current_user_id
    )
    
    await db.otc_invoices.insert_one(invoice.dict())
    
    # Update deal
    await db.otc_deals.update_one(
        {"id": deal_id},
        {"$set": {
            "invoice_id": invoice.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "invoice": invoice.dict()}


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get invoice details"""
    db = get_db()
    
    invoice = await db.otc_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Enrich with deal info
    deal = await db.otc_deals.find_one({"id": invoice.get("deal_id")}, {"_id": 0})
    if deal:
        invoice["deal"] = deal
    
    return invoice


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark invoice as sent"""
    db = get_db()
    
    invoice = await db.otc_invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await db.otc_invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": InvoiceStatus.SENT.value,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Invoice marked as sent"}


@router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(
    invoice_id: str,
    payment_reference: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Mark invoice as paid and complete the deal"""
    db = get_db()
    
    invoice = await db.otc_invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update invoice
    await db.otc_invoices.update_one(
        {"id": invoice_id},
        {"$set": {
            "status": InvoiceStatus.PAID.value,
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "payment_reference": payment_reference,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Move deal to post-sale/completed
    deal_id = invoice.get("deal_id")
    await db.otc_deals.update_one(
        {"id": deal_id},
        {"$set": {
            "stage": OTCDealStage.COMPLETED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Invoice marked as paid, deal completed"}



# ==================== CLIENT PORTAL ENDPOINTS ====================

@router.get("/client/me")
async def get_my_otc_client(
    current_user: dict = Depends(get_current_user)
):
    """Get the OTC client profile for the current user"""
    db = get_db()
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    current_user_email = getattr(current_user, 'email', None) if hasattr(current_user, 'email') else current_user.get("email")
    
    # Find client by user_id or email
    client = await db.otc_clients.find_one(
        {"$or": [
            {"user_id": current_user_id},
            {"contact_email": current_user_email}
        ]},
        {"_id": 0}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Not an OTC client")
    
    return client


@router.get("/client/deals")
async def get_my_otc_deals(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get deals for the current OTC client"""
    db = get_db()
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    current_user_email = getattr(current_user, 'email', None) if hasattr(current_user, 'email') else current_user.get("email")
    
    # Find client
    client = await db.otc_clients.find_one(
        {"$or": [
            {"user_id": current_user_id},
            {"contact_email": current_user_email}
        ]}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Not an OTC client")
    
    # Get deals for this client
    cursor = db.otc_deals.find(
        {"client_id": client.get("id")},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    deals = await cursor.to_list(limit)
    total = await db.otc_deals.count_documents({"client_id": client.get("id")})
    
    return {"deals": deals, "total": total}


@router.get("/client/quotes")
async def get_my_otc_quotes(
    current_user: dict = Depends(get_current_user)
):
    """Get quotes for the current OTC client's deals"""
    db = get_db()
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    current_user_email = getattr(current_user, 'email', None) if hasattr(current_user, 'email') else current_user.get("email")
    
    # Find client
    client = await db.otc_clients.find_one(
        {"$or": [
            {"user_id": current_user_id},
            {"contact_email": current_user_email}
        ]}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Not an OTC client")
    
    # Get client's deal IDs
    deals_cursor = db.otc_deals.find({"client_id": client.get("id")}, {"id": 1})
    deals = await deals_cursor.to_list(1000)
    deal_ids = [d.get("id") for d in deals]
    
    # Get quotes for these deals
    quotes_cursor = db.otc_quotes.find(
        {"deal_id": {"$in": deal_ids}},
        {"_id": 0}
    ).sort("created_at", -1)
    
    quotes = await quotes_cursor.to_list(100)
    
    # Enrich with deal info
    for quote in quotes:
        deal = await db.otc_deals.find_one({"id": quote.get("deal_id")}, {"_id": 0, "deal_number": 1})
        if deal:
            quote["deal_number"] = deal.get("deal_number")
    
    return {"quotes": quotes}


@router.post("/client/rfq")
async def create_client_rfq(
    request: ClientRFQRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new RFQ (Request for Quote) from client portal"""
    db = get_db()
    
    transaction_type = request.transaction_type
    base_asset = request.base_asset
    quote_asset = request.quote_asset
    amount = request.amount
    notes = request.notes
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    current_user_email = getattr(current_user, 'email', None) if hasattr(current_user, 'email') else current_user.get("email")
    
    # Find client
    client = await db.otc_clients.find_one(
        {"$or": [
            {"user_id": current_user_id},
            {"contact_email": current_user_email}
        ]}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Not an OTC client")
    
    # Generate deal number
    year = datetime.now().year
    count = await db.otc_deals.count_documents({})
    deal_number = f"OTC-{year}-{str(count + 1).zfill(4)}"
    
    # Create the deal (RFQ)
    deal = OTCDeal(
        deal_number=deal_number,
        client_id=client.get("id"),
        client_name=client.get("entity_name"),
        transaction_type=TransactionType(transaction_type),
        base_asset=base_asset.upper(),
        quote_asset=quote_asset.upper(),
        amount=amount,
        stage=OTCDealStage.RFQ,
        notes=notes,
        rfq_received_at=datetime.now(timezone.utc).isoformat()
    )
    
    await db.otc_deals.insert_one(deal.dict())
    
    return {"success": True, "deal": deal.dict(), "message": "RFQ criado com sucesso"}


@router.post("/client/quotes/{quote_id}/accept")
async def client_accept_quote(
    quote_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accept a quote from client portal"""
    db = get_db()
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    current_user_email = getattr(current_user, 'email', None) if hasattr(current_user, 'email') else current_user.get("email")
    
    # Find client
    client = await db.otc_clients.find_one(
        {"$or": [
            {"user_id": current_user_id},
            {"contact_email": current_user_email}
        ]}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Not an OTC client")
    
    # Get quote
    quote = await db.otc_quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Verify quote belongs to client's deal
    deal = await db.otc_deals.find_one({"id": quote.get("deal_id")})
    if not deal or deal.get("client_id") != client.get("id"):
        raise HTTPException(status_code=403, detail="Quote does not belong to your deals")
    
    if quote.get("status") != QuoteStatus.SENT.value:
        raise HTTPException(status_code=400, detail="Quote is not in pending status")
    
    # Check if expired
    if quote.get("expires_at"):
        expires = datetime.fromisoformat(quote.get("expires_at").replace('Z', '+00:00'))
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Quote has expired")
    
    # Accept the quote
    await db.otc_quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "status": QuoteStatus.ACCEPTED.value,
            "client_response": "Accepted by client",
            "response_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update deal stage and values
    await db.otc_deals.update_one(
        {"id": quote.get("deal_id")},
        {"$set": {
            "stage": OTCDealStage.ACCEPTANCE.value,
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "final_price": quote.get("final_price"),
            "total_value": quote.get("total_value"),
            "fees": quote.get("fees", 0),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Quote accepted"}


@router.post("/client/quotes/{quote_id}/reject")
async def client_reject_quote(
    quote_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Reject a quote from client portal"""
    db = get_db()
    
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    current_user_email = getattr(current_user, 'email', None) if hasattr(current_user, 'email') else current_user.get("email")
    
    # Find client
    client = await db.otc_clients.find_one(
        {"$or": [
            {"user_id": current_user_id},
            {"contact_email": current_user_email}
        ]}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Not an OTC client")
    
    # Get quote
    quote = await db.otc_quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Verify quote belongs to client's deal
    deal = await db.otc_deals.find_one({"id": quote.get("deal_id")})
    if not deal or deal.get("client_id") != client.get("id"):
        raise HTTPException(status_code=403, detail="Quote does not belong to your deals")
    
    # Reject the quote
    await db.otc_quotes.update_one(
        {"id": quote_id},
        {"$set": {
            "status": QuoteStatus.REJECTED.value,
            "client_response": reason or "Rejected by client",
            "response_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Move deal back to RFQ stage
    await db.otc_deals.update_one(
        {"id": quote.get("deal_id")},
        {"$set": {
            "stage": OTCDealStage.RFQ.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Quote rejected"}
