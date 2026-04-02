"""
CRM Routes for KBEX Exchange
"""
from fastapi import APIRouter, HTTPException, Header, Depends, Query, Request
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from pydantic import BaseModel
import uuid
import logging

logger = logging.getLogger(__name__)

from utils.turnstile import verify_turnstile
from utils.rate_limit import check_rate_limit

from models.crm import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    LeadCreate, LeadUpdate, LeadResponse, LeadStatus,
    DealCreate, DealUpdate, DealResponse, DealStage,
    ContactCreate, ContactUpdate, ContactResponse,
    TaskCreate, TaskUpdate, TaskResponse, TaskStatus, TaskPriority,
    CRMDashboardStats, WalletInfo
)
from routes.auth import get_current_user
from services.trustfull_service import score_lead as risk_intelligence_scan

router = APIRouter(prefix="/crm", tags=["CRM"])


# ==================== PUBLIC LEAD ENDPOINT ====================

class PublicLeadRequest(BaseModel):
    """Public lead request - minimal fields for website form"""
    name: str
    email: str
    phone: str
    message: Optional[str] = None
    turnstile_token: Optional[str] = None


@router.post("/leads/public")
async def create_public_lead(lead_data: PublicLeadRequest, request: Request):
    """Create a CRM lead from the public website - no auth required"""
    # Rate limit: 5 requests per minute per IP
    check_rate_limit(request, max_requests=5, window_seconds=60)

    # Verify Turnstile
    if lead_data.turnstile_token:
        client_ip = getattr(request.state, 'client_ip', request.client.host if request.client else None)
        if not await verify_turnstile(lead_data.turnstile_token, client_ip):
            raise HTTPException(status_code=400, detail="Verificação de segurança falhou. Tente novamente.")

    db = get_db()

    # Check if a lead with this email already exists (not lost)
    existing = await db.crm_leads.find_one({
        "email": {"$regex": f"^{lead_data.email}$", "$options": "i"},
        "status": {"$nin": ["lost"]}
    })
    if existing:
        return {
            "success": True,
            "already_exists": True,
            "message": "O seu pedido já foi recebido. A nossa equipa entrará em contacto brevemente."
        }

    # Check if email already registered as user — still create lead for CRM tracking
    existing_user = await db.users.find_one({"email": {"$regex": f"^{lead_data.email}$", "$options": "i"}})

    now = datetime.now(timezone.utc)
    doc = {
        "name": lead_data.name,
        "email": lead_data.email,
        "phone": lead_data.phone,
        "source": "Website",
        "status": LeadStatus.NEW.value,
        "interest": "Solicitar Acesso",
        "notes": lead_data.message,
        "is_qualified": False,
        "qualification_score": 0,
        "interested_cryptos": [],
        "preferred_currency": "EUR",
        "tags": ["website", "solicitar-acesso"] + (["existing-user"] if existing_user else []),
        "created_at": now,
        "updated_at": now,
        "created_by": "public_website",
        "converted_to_client": False,
        "converted_at": None,
        "user_already_registered": bool(existing_user),
    }

    await db.crm_leads.insert_one(doc)
    lead_id = doc["_id"]

    # Also create an OTC Lead for the OTC pipeline
    otc_lead_id = None
    try:
        from models.otc import OTCLead, OTCLeadStatus, OTCLeadSource, TransactionType, FATF_HIGH_RISK_COUNTRIES
        otc_lead = OTCLead(
            entity_name=lead_data.name,
            contact_name=lead_data.name,
            contact_email=lead_data.email,
            contact_phone=lead_data.phone,
            country="PT",
            source=OTCLeadSource.WEBSITE,
            source_detail="Solicitar Acesso - Landing Page",
            status=OTCLeadStatus.NEW,
            workflow_stage=1,
            transaction_type=TransactionType.BUY,
            notes=lead_data.message or "",
            activity_log=[{
                "action": "lead_created",
                "timestamp": now.isoformat(),
                "user_id": "public_website",
                "details": "Lead criado via formulário público 'Solicitar Acesso'"
            }]
        )
        # Check for existing OTC lead with same email
        existing_otc = await db.otc_leads.find_one({
            "contact_email": {"$regex": f"^{lead_data.email}$", "$options": "i"},
            "status": {"$nin": ["lost", "archived"]}
        })
        if not existing_otc:
            await db.otc_leads.insert_one(otc_lead.dict())
            otc_lead_id = otc_lead.id
            logger.info(f"OTC Lead created from public form: {otc_lead_id} for {lead_data.email}")
        else:
            logger.info(f"OTC Lead already exists for {lead_data.email}, skipping creation")
    except Exception as e:
        logger.warning(f"Failed to create OTC Lead from public form: {e}")

    # Trigger Risk Intelligence scan (async, non-blocking)
    try:
        ri_result = await risk_intelligence_scan(lead_data.email, lead_data.phone)
        if ri_result.get("combined_score") is not None:
            await db.crm_leads.update_one(
                {"_id": lead_id},
                {"$set": {"risk_intelligence_data": ri_result}}
            )
            # Also update OTC lead if created
            if otc_lead_id:
                await db.otc_leads.update_one(
                    {"id": otc_lead_id},
                    {"$set": {"trustfull_data": ri_result}}
                )
            logger.info(f"Risk Intelligence score for {lead_data.email}: {ri_result.get('combined_score')} ({ri_result.get('risk_level')})")
    except Exception as e:
        logger.warning(f"Risk Intelligence scoring failed for {lead_data.email}: {e}")

    # Send confirmation email via Brevo
    email_sent = False
    try:
        from services.email_service import email_service
        if email_service:
            email_result = await email_service.send_access_request_confirmation(
                to_email=lead_data.email,
                to_name=lead_data.name,
            )
            email_sent = email_result.get("success", False)
            if not email_sent:
                logger.warning(f"Email not sent to {lead_data.email}: {email_result.get('error', 'unknown')}")
            
            # Sync contact to Brevo CRM
            await email_service.sync_contact_to_brevo(
                email=lead_data.email,
                name=lead_data.name,
                phone=lead_data.phone,
                source="Website - Solicitar Acesso",
            )
    except Exception as e:
        logger.warning(f"Failed to send confirmation email: {e}")

    return {
        "success": True,
        "already_exists": False,
        "email_sent": email_sent,
        "otc_lead_created": otc_lead_id is not None,
        "message": "Pedido de acesso recebido com sucesso. A nossa equipa entrará em contacto brevemente."
    }

# ==================== HELPERS ====================

def serialize_doc(doc):
    """Convert MongoDB document to dict with string id"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

def get_user_id(current_user):
    """Extract user ID from either dict or Pydantic model"""
    if hasattr(current_user, 'id'):
        return current_user.id
    elif hasattr(current_user, 'user_id'):
        return current_user.user_id
    elif isinstance(current_user, dict):
        return current_user.get("id") or current_user.get("user_id")
    return None

def get_db():
    from server import db
    return db

# ==================== SUPPLIERS ====================

@router.get("/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
    country: Optional[str] = None,
    cryptocurrency: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all suppliers with filters"""
    db = get_db()
    
    query = {}
    if category:
        query["category"] = category
    if is_active is not None:
        query["is_active"] = is_active
    if is_verified is not None:
        query["is_verified"] = is_verified
    if country:
        query["country"] = country
    if cryptocurrency:
        query["cryptocurrencies"] = cryptocurrency
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.crm_suppliers.find(query, {"_id": 1, "name": 1, "company_name": 1, "email": 1, "phone": 1, "country": 1, "region": 1, "registered_on_kryptobox": 1, "kryptobox_user_id": 1, "cryptocurrencies": 1, "category": 1, "gross_discount": 1, "net_discount": 1, "min_volume": 1, "max_volume": 1, "preferred_currency": 1, "handshake_wallet": 1, "transaction_wallet": 1, "additional_wallets": 1, "delivery_map": 1, "delivery_countries": 1, "delivery_time_hours": 1, "is_active": 1, "is_verified": 1, "verification_date": 1, "notes": 1, "tags": 1, "created_at": 1, "updated_at": 1, "created_by": 1, "total_transactions": 1, "total_volume": 1}).sort("created_at", -1).skip(skip).limit(limit)
    
    suppliers = []
    async for doc in cursor:
        suppliers.append(serialize_doc(doc))
    
    return suppliers

@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single supplier"""
    db = get_db()
    
    doc = await db.crm_suppliers.find_one({"_id": ObjectId(supplier_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return serialize_doc(doc)

@router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(supplier: SupplierCreate, current_user: dict = Depends(get_current_user)):
    """Create a new supplier"""
    db = get_db()
    
    now = datetime.now(timezone.utc)
    doc = supplier.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["created_by"] = get_user_id(current_user)
    doc["total_transactions"] = 0
    doc["total_volume"] = 0.0
    
    result = await db.crm_suppliers.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    return serialize_doc(doc)

@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(supplier_id: str, supplier: SupplierUpdate, current_user: dict = Depends(get_current_user)):
    """Update a supplier"""
    db = get_db()
    
    update_data = {k: v for k, v in supplier.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.crm_suppliers.find_one_and_update(
        {"_id": ObjectId(supplier_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return serialize_doc(result)

@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a supplier"""
    db = get_db()
    
    result = await db.crm_suppliers.delete_one({"_id": ObjectId(supplier_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return {"message": "Supplier deleted"}

# ==================== LEADS ====================

@router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    status: Optional[str] = None,
    is_qualified: Optional[bool] = None,
    assigned_to: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all leads with filters"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    if is_qualified is not None:
        query["is_qualified"] = is_qualified
    if assigned_to:
        query["assigned_to"] = assigned_to
    if source:
        query["source"] = source
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.crm_leads.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    leads = []
    async for doc in cursor:
        leads.append(serialize_doc(doc))
    
    return leads

@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single lead"""
    db = get_db()
    
    doc = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return serialize_doc(doc)

@router.post("/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, current_user: dict = Depends(get_current_user)):
    """Create a new lead"""
    db = get_db()
    
    now = datetime.now(timezone.utc)
    doc = lead.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["created_by"] = get_user_id(current_user)
    doc["converted_to_client"] = False
    doc["converted_at"] = None
    
    result = await db.crm_leads.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Trigger Risk Intelligence scan (async, non-blocking)
    try:
        email = doc.get("email")
        phone = doc.get("phone")
        if email:
            ri_result = await risk_intelligence_scan(email, phone)
            if ri_result.get("combined_score") is not None:
                await db.crm_leads.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {"risk_intelligence_data": ri_result}}
                )
                logger.info(f"Risk Intelligence score for {email}: {ri_result.get('combined_score')}")
    except Exception as e:
        logger.warning(f"Risk Intelligence scoring failed: {e}")
    
    return serialize_doc(doc)

@router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, lead: LeadUpdate, current_user: dict = Depends(get_current_user)):
    """Update a lead"""
    db = get_db()
    
    update_data = {k: v for k, v in lead.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.crm_leads.find_one_and_update(
        {"_id": ObjectId(lead_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return serialize_doc(result)

@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a lead"""
    db = get_db()
    
    result = await db.crm_leads.delete_one({"_id": ObjectId(lead_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Lead deleted"}

@router.post("/leads/{lead_id}/send-registration")
async def send_registration_email(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Send registration email to a lead so they can register as a client"""
    db = get_db()
    
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead_email = lead.get("email")
    lead_name = lead.get("name", "")
    
    if not lead_email:
        raise HTTPException(status_code=400, detail="Lead não tem email definido")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": {"$regex": f"^{lead_email}$", "$options": "i"}})
    
    # Build registration link
    import os
    base_url = os.environ.get("FRONTEND_URL", "https://kbex.io")
    
    email_sent = False
    
    if existing_user:
        # User already exists — send onboarding/welcome email instead of blocking
        try:
            from services.email_service import email_service
            if email_service:
                registration_link = f"{base_url}/login"
                email_result = await email_service.send_onboarding_email(
                    to_email=lead_email,
                    to_name=lead_name,
                    entity_name=lead.get("company_name") or lead_name,
                    registration_link=registration_link,
                )
                email_sent = email_result.get("success", False)
        except Exception as e:
            logger.warning(f"Failed to send onboarding email to existing user: {e}")
        
        # Update lead — send email but keep current status
        await db.crm_leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": {
                "registration_email_sent": True,
                "registration_email_sent_at": datetime.now(timezone.utc).isoformat(),
                "notes_history": lead.get("notes_history", []) + [{
                    "note": f"Utilizador já registado. Email de onboarding reenviado.",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }],
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "success": True,
            "message": f"Utilizador já registado. Email de onboarding enviado para {lead_email}",
            "email_sent": email_sent,
            "already_registered": True,
        }
    
    registration_link = f"{base_url}/register?email={lead_email}"
    
    # Send onboarding email via Brevo
    email_sent = False
    try:
        from services.email_service import email_service
        if email_service:
            email_result = await email_service.send_onboarding_email(
                to_email=lead_email,
                to_name=lead_name,
                entity_name=lead.get("company_name") or lead_name,
                registration_link=registration_link,
            )
            email_sent = email_result.get("success", False)
            if not email_sent:
                logger.warning(f"Registration email not sent to {lead_email}: {email_result.get('error', 'unknown')}")
    except Exception as e:
        logger.warning(f"Failed to send registration email: {e}")
    
    # Update lead status
    await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {
            "status": LeadStatus.QUALIFIED.value,
            "registration_email_sent": True,
            "registration_email_sent_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Não foi possível enviar o email. Verifique a configuração do Brevo.")
    
    return {"success": True, "message": f"Email de registo enviado para {lead_email}", "email_sent": email_sent}


@router.post("/leads/{lead_id}/convert-to-otc")
async def convert_lead_to_otc(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Convert a CRM lead to an OTC lead"""
    db = get_db()

    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Check if OTC lead already exists with this email
    if lead.get("email"):
        existing_otc = await db.otc_leads.find_one({
            "contact_email": {"$regex": f"^{lead['email']}$", "$options": "i"},
            "status": {"$nin": ["archived", "lost"]}
        })
        if existing_otc:
            raise HTTPException(status_code=400, detail="Já existe um lead OTC com este email")

    from models.otc import OTCLead, OTCLeadSource, OTCLeadStatus

    otc_lead = OTCLead(
        entity_name=lead.get("company_name") or lead.get("name", ""),
        contact_name=lead.get("name", ""),
        contact_email=lead.get("email", ""),
        contact_phone=lead.get("phone", ""),
        country=lead.get("country") or "N/A",
        source=OTCLeadSource.REFERRAL,
        source_detail=f"Convertido do CRM Lead (ID: {lead_id})",
        notes=lead.get("notes"),
        status=OTCLeadStatus.NEW,
        workflow_stage=1,
        activity_log=[{
            "action": "lead_created",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": getattr(current_user, 'id', None) or current_user.get("id"),
            "details": f"Lead OTC criado a partir do CRM Lead: {lead.get('name', '')}"
        }]
    )

    otc_doc = otc_lead.dict()

    # Transfer Risk Intelligence data from CRM lead to OTC lead
    ri_data = lead.get("risk_intelligence_data")
    if ri_data:
        otc_doc["trustfull_data"] = ri_data

    await db.otc_leads.insert_one(otc_doc)

    # Update CRM lead to mark conversion
    await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {
            "updated_at": datetime.now(timezone.utc),
            "tags": list(set((lead.get("tags") or []) + ["otc-convertido"])),
            "notes": (lead.get("notes") or "") + f"\n[Convertido para Lead OTC em {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}]"
        }}
    )

    return {"success": True, "message": "Lead convertido para OTC com sucesso", "otc_lead_id": otc_lead.id}


@router.post("/leads/{lead_id}/risk-scan")
async def risk_scan_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Manually trigger Risk Intelligence scoring for a CRM lead."""
    db = get_db()
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")

    email = lead.get("email", "")
    phone = lead.get("phone", "")
    if not email:
        raise HTTPException(status_code=400, detail="Lead sem email para análise")

    ri_result = await risk_intelligence_scan(email, phone if phone else None)
    await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"risk_intelligence_data": ri_result, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"success": True, "risk_intelligence_data": ri_result}

# ==================== DEALS ====================

@router.get("/deals", response_model=List[DealResponse])
async def get_deals(
    stage: Optional[str] = None,
    assigned_to: Optional[str] = None,
    supplier_id: Optional[str] = None,
    client_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all deals with filters"""
    db = get_db()
    
    query = {}
    if stage:
        query["stage"] = stage
    if assigned_to:
        query["assigned_to"] = assigned_to
    if supplier_id:
        query["supplier_id"] = supplier_id
    if client_id:
        query["client_id"] = client_id
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.crm_deals.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    deals = []
    async for doc in cursor:
        deal = serialize_doc(doc)
        
        # Get related names
        if deal.get("supplier_id"):
            supplier = await db.crm_suppliers.find_one({"_id": ObjectId(deal["supplier_id"])}, {"name": 1})
            deal["supplier_name"] = supplier["name"] if supplier else None
        if deal.get("lead_id"):
            lead = await db.crm_leads.find_one({"_id": ObjectId(deal["lead_id"])}, {"name": 1})
            deal["lead_name"] = lead["name"] if lead else None
        if deal.get("client_id"):
            client = await db.users.find_one({"_id": ObjectId(deal["client_id"])}, {"name": 1, "email": 1})
            deal["client_name"] = client.get("name") or client.get("email") if client else None
        
        deals.append(deal)
    
    return deals

@router.get("/deals/{deal_id}", response_model=DealResponse)
async def get_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single deal"""
    db = get_db()
    
    doc = await db.crm_deals.find_one({"_id": ObjectId(deal_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return serialize_doc(doc)

@router.post("/deals", response_model=DealResponse)
async def create_deal(deal: DealCreate, current_user: dict = Depends(get_current_user)):
    """Create a new deal"""
    db = get_db()
    
    now = datetime.now(timezone.utc)
    doc = deal.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["created_by"] = get_user_id(current_user)
    
    result = await db.crm_deals.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    return serialize_doc(doc)

@router.put("/deals/{deal_id}", response_model=DealResponse)
async def update_deal(deal_id: str, deal: DealUpdate, current_user: dict = Depends(get_current_user)):
    """Update a deal"""
    db = get_db()
    
    update_data = {k: v for k, v in deal.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If closing the deal, set actual_close_date
    if update_data.get("stage") in [DealStage.CLOSED_WON.value, DealStage.CLOSED_LOST.value]:
        update_data["actual_close_date"] = datetime.now(timezone.utc)
    
    result = await db.crm_deals.find_one_and_update(
        {"_id": ObjectId(deal_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return serialize_doc(result)

@router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a deal"""
    db = get_db()
    
    result = await db.crm_deals.delete_one({"_id": ObjectId(deal_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return {"message": "Deal deleted"}

# ==================== CONTACTS ====================

@router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    supplier_id: Optional[str] = None,
    client_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all contacts with filters"""
    db = get_db()
    
    query = {}
    if supplier_id:
        query["supplier_id"] = supplier_id
    if client_id:
        query["client_id"] = client_id
    if lead_id:
        query["lead_id"] = lead_id
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.crm_contacts.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    contacts = []
    async for doc in cursor:
        contact = serialize_doc(doc)
        contact["full_name"] = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
        contacts.append(contact)
    
    return contacts

@router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single contact"""
    db = get_db()
    
    doc = await db.crm_contacts.find_one({"_id": ObjectId(contact_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact = serialize_doc(doc)
    contact["full_name"] = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
    return contact

@router.post("/contacts", response_model=ContactResponse)
async def create_contact(contact: ContactCreate, current_user: dict = Depends(get_current_user)):
    """Create a new contact"""
    db = get_db()
    
    now = datetime.now(timezone.utc)
    doc = contact.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["created_by"] = get_user_id(current_user)
    
    result = await db.crm_contacts.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["full_name"] = f"{doc.get('first_name', '')} {doc.get('last_name', '')}".strip()
    
    return serialize_doc(doc)

@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, contact: ContactUpdate, current_user: dict = Depends(get_current_user)):
    """Update a contact"""
    db = get_db()
    
    update_data = {k: v for k, v in contact.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.crm_contacts.find_one_and_update(
        {"_id": ObjectId(contact_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    result["full_name"] = f"{result.get('first_name', '')} {result.get('last_name', '')}".strip()
    return serialize_doc(result)

@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a contact"""
    db = get_db()
    
    result = await db.crm_contacts.delete_one({"_id": ObjectId(contact_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"message": "Contact deleted"}

# ==================== TASKS ====================

@router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    supplier_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    overdue_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all tasks with filters"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to
    if supplier_id:
        query["supplier_id"] = supplier_id
    if lead_id:
        query["lead_id"] = lead_id
    if deal_id:
        query["deal_id"] = deal_id
    if overdue_only:
        query["due_date"] = {"$lt": datetime.now(timezone.utc)}
        query["status"] = {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value]}
    
    cursor = db.crm_tasks.find(query).sort([("due_date", 1), ("priority", -1)]).skip(skip).limit(limit)
    
    tasks = []
    now = datetime.now(timezone.utc)
    async for doc in cursor:
        task = serialize_doc(doc)
        # Check if overdue
        if task.get("due_date") and task.get("status") not in [TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value]:
            due_date = task["due_date"]
            if isinstance(due_date, str):
                due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
            # Handle both naive and aware datetimes
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            task["is_overdue"] = due_date < now
        else:
            task["is_overdue"] = False
        tasks.append(task)
    
    return tasks

@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single task"""
    db = get_db()
    
    doc = await db.crm_tasks.find_one({"_id": ObjectId(task_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return serialize_doc(doc)

@router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    db = get_db()
    
    now = datetime.now(timezone.utc)
    doc = task.model_dump()
    doc["created_at"] = now
    doc["updated_at"] = now
    doc["created_by"] = get_user_id(current_user)
    
    result = await db.crm_tasks.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["is_overdue"] = False
    
    return serialize_doc(doc)

@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """Update a task"""
    db = get_db()
    
    update_data = {k: v for k, v in task.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # If completing the task, set completed_at
    if update_data.get("status") == TaskStatus.COMPLETED.value:
        update_data["completed_at"] = datetime.now(timezone.utc)
    
    result = await db.crm_tasks.find_one_and_update(
        {"_id": ObjectId(task_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return serialize_doc(result)

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    db = get_db()
    
    result = await db.crm_tasks.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted"}

# ==================== DASHBOARD ====================

@router.get("/dashboard", response_model=CRMDashboardStats)
async def get_crm_dashboard(current_user: dict = Depends(get_current_user)):
    """Get CRM dashboard statistics"""
    db = get_db()
    
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    stats = CRMDashboardStats()
    
    # Suppliers
    stats.total_suppliers = await db.crm_suppliers.count_documents({})
    stats.active_suppliers = await db.crm_suppliers.count_documents({"is_active": True})
    stats.verified_suppliers = await db.crm_suppliers.count_documents({"is_verified": True})
    
    # Leads
    stats.total_leads = await db.crm_leads.count_documents({})
    stats.new_leads = await db.crm_leads.count_documents({"status": LeadStatus.NEW.value})
    stats.qualified_leads = await db.crm_leads.count_documents({"is_qualified": True})
    stats.leads_this_month = await db.crm_leads.count_documents({"created_at": {"$gte": start_of_month}})
    
    # Deals
    stats.total_deals = await db.crm_deals.count_documents({})
    stats.open_deals = await db.crm_deals.count_documents({
        "stage": {"$nin": [DealStage.CLOSED_WON.value, DealStage.CLOSED_LOST.value]}
    })
    stats.won_deals = await db.crm_deals.count_documents({"stage": DealStage.CLOSED_WON.value})
    stats.lost_deals = await db.crm_deals.count_documents({"stage": DealStage.CLOSED_LOST.value})
    stats.deals_this_month = await db.crm_deals.count_documents({"created_at": {"$gte": start_of_month}})
    
    # Deal values
    pipeline_cursor = db.crm_deals.aggregate([
        {"$match": {"stage": {"$nin": [DealStage.CLOSED_WON.value, DealStage.CLOSED_LOST.value]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    async for doc in pipeline_cursor:
        stats.pipeline_value = doc.get("total", 0)
    
    won_cursor = db.crm_deals.aggregate([
        {"$match": {"stage": DealStage.CLOSED_WON.value}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    async for doc in won_cursor:
        stats.won_deal_value = doc.get("total", 0)
    
    total_cursor = db.crm_deals.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ])
    async for doc in total_cursor:
        stats.total_deal_value = doc.get("total", 0)
    
    # Contacts
    stats.total_contacts = await db.crm_contacts.count_documents({})
    
    # Tasks
    stats.pending_tasks = await db.crm_tasks.count_documents({
        "status": {"$in": [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value]}
    })
    stats.overdue_tasks = await db.crm_tasks.count_documents({
        "due_date": {"$lt": now},
        "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value]}
    })
    
    return stats

# ==================== ENUMS ENDPOINTS ====================

@router.get("/enums/supplier-categories")
async def get_supplier_categories():
    """Get supplier category options"""
    from models.crm import SupplierCategory
    return [{"value": e.value, "label": e.value.replace("_", " ")} for e in SupplierCategory]

@router.get("/enums/lead-statuses")
async def get_lead_statuses():
    """Get lead status options"""
    from models.crm import LeadStatus
    labels = {
        "new": "Novo",
        "contacted": "Contactado",
        "qualified": "Qualificado",
        "proposal": "Proposta",
        "negotiation": "Negociação",
        "won": "Ganho",
        "lost": "Perdido"
    }
    return [{"value": e.value, "label": labels.get(e.value, e.value)} for e in LeadStatus]

@router.get("/enums/deal-stages")
async def get_deal_stages():
    """Get deal stage options"""
    from models.crm import DealStage
    labels = {
        "qualification": "Qualificação",
        "proposal": "Proposta",
        "negotiation": "Negociação",
        "closed_won": "Fechado (Ganho)",
        "closed_lost": "Fechado (Perdido)"
    }
    return [{"value": e.value, "label": labels.get(e.value, e.value)} for e in DealStage]

@router.get("/enums/task-priorities")
async def get_task_priorities():
    """Get task priority options"""
    from models.crm import TaskPriority
    labels = {
        "low": "Baixa",
        "medium": "Média",
        "high": "Alta",
        "urgent": "Urgente"
    }
    return [{"value": e.value, "label": labels.get(e.value, e.value)} for e in TaskPriority]

@router.get("/enums/task-statuses")
async def get_task_statuses():
    """Get task status options"""
    from models.crm import TaskStatus
    labels = {
        "pending": "Pendente",
        "in_progress": "Em Progresso",
        "completed": "Concluída",
        "cancelled": "Cancelada"
    }
    return [{"value": e.value, "label": labels.get(e.value, e.value)} for e in TaskStatus]

@router.get("/enums/wallet-availability")
async def get_wallet_availability():
    """Get wallet availability options"""
    from models.crm import WalletAvailability
    labels = {
        "available": "Disponível",
        "busy": "Ocupada",
        "blocked": "Bloqueada",
        "under_review": "Em Revisão"
    }
    return [{"value": e.value, "label": labels.get(e.value, e.value)} for e in WalletAvailability]

@router.get("/enums/forensic-status")
async def get_forensic_status():
    """Get forensic status options"""
    from models.crm import ForensicStatus
    labels = {
        "not_verified": "Não Verificada",
        "pending": "Pendente",
        "verified_clean": "Verificada (Limpa)",
        "verified_flagged": "Verificada (Sinalizada)",
        "rejected": "Rejeitada"
    }
    return [{"value": e.value, "label": labels.get(e.value, e.value)} for e in ForensicStatus]



# ==================== CRM CLIENTS (KBEX Clients 360° View) ====================

@router.get("/clients")
async def get_crm_clients(
    region: Optional[str] = None,
    tier: Optional[str] = None,
    kyc_status: Optional[str] = None,
    is_approved: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get clients with 360° view data for CRM - filtered by permissions"""
    db = get_db()
    
    # Check if user is admin (handle both dict and Pydantic object)
    is_admin = getattr(current_user, 'is_admin', False) if hasattr(current_user, 'is_admin') else current_user.get("is_admin", False)
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    # Build query - only clients (not internal users)
    query = {"user_type": {"$ne": "internal"}}
    
    # If not admin, only show clients where current user is the account manager
    if not is_admin:
        query["invited_by"] = current_user_id
    
    if region and region != "all":
        query["region"] = region
    if tier and tier != "all":
        query["membership_level"] = tier
    if kyc_status and kyc_status != "all":
        query["kyc_status"] = kyc_status
    if is_approved is not None:
        query["is_approved"] = is_approved
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    # Sort
    sort_direction = -1 if sort_order == "desc" else 1
    
    cursor = db.users.find(
        query,
        {"_id": 0, "hashed_password": 0, "two_factor_secret": 0, "two_factor_secret_temp": 0}
    ).sort(sort_by, sort_direction).skip(skip).limit(limit)
    
    clients = []
    async for user in cursor:
        user_id = user.get("id")
        
        # Get trading stats
        trading_stats = await get_client_trading_stats(db, user_id)
        
        # Get wallet count
        wallet_count = await db.wallets.count_documents({"user_id": user_id})
        
        # Get pending tickets
        pending_tickets = await db.tickets.count_documents({
            "user_id": user_id,
            "status": {"$in": ["open", "pending", "in_progress"]}
        })
        
        # Get transaction count
        tx_count = await db.transactions.count_documents({"user_id": user_id})
        
        # Add computed fields
        user["trading_stats"] = trading_stats
        user["wallet_count"] = wallet_count
        user["pending_tickets"] = pending_tickets
        user["transaction_count"] = tx_count
        
        clients.append(user)
    
    # Get total count for pagination
    total = await db.users.count_documents(query)
    
    return {
        "clients": clients,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/clients/{client_id}")
async def get_crm_client_detail(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get complete 360° view of a single client - with permission check"""
    db = get_db()
    
    # Check if user is admin (handle both dict and Pydantic object)
    is_admin = getattr(current_user, 'is_admin', False) if hasattr(current_user, 'is_admin') else current_user.get("is_admin", False)
    current_user_id = getattr(current_user, 'id', None) if hasattr(current_user, 'id') else current_user.get("id")
    
    # Get user
    user = await db.users.find_one(
        {"id": client_id},
        {"_id": 0, "hashed_password": 0, "two_factor_secret": 0, "two_factor_secret_temp": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Permission check: admin can see all, managers can only see their assigned clients
    if not is_admin:
        if user.get("invited_by") != current_user_id:
            raise HTTPException(status_code=403, detail="Não tem permissão para ver este cliente")
    
    # Get all related data
    
    # 1. Wallets (from wallets collection first, fallback to embedded in user doc)
    wallets = await db.wallets.find({"user_id": client_id}, {"_id": 0}).to_list(100)
    if not wallets:
        # Try embedded wallets from user document
        wallets = user.get("wallets", [])
    
    # 2. Transactions (last 50)
    transactions = await db.transactions.find(
        {"user_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # 3. Trading orders (last 50)
    orders = await db.trading_orders.find(
        {"user_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # 4. Investments
    investments = await db.user_investments.find(
        {"user_id": client_id},
        {"_id": 0}
    ).to_list(100)
    
    # 5. Support tickets
    tickets = await db.tickets.find(
        {"user_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # 6. Fiat deposits
    fiat_deposits = await db.fiat_deposits.find(
        {"user_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # 7. Trading stats
    trading_stats = await get_client_trading_stats(db, client_id)
    
    # 8. Account manager (referrer or assigned manager)
    account_manager = None
    manager_id = user.get("assigned_to") or user.get("invited_by")
    if manager_id:
        manager = await db.users.find_one(
            {"id": manager_id},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "internal_role": 1}
        )
        if manager:
            account_manager = manager
    
    # 9. Activity timeline (combine all interactions)
    activities = []
    
    # Add transactions to timeline
    for tx in transactions[:10]:
        activities.append({
            "type": "transaction",
            "subtype": tx.get("type", "unknown"),
            "description": f"{tx.get('type', 'Transação')} - {tx.get('amount', 0)} {tx.get('asset', tx.get('currency', ''))}",
            "date": tx.get("created_at"),
            "status": tx.get("status")
        })
    
    # Add tickets to timeline
    for ticket in tickets[:5]:
        activities.append({
            "type": "ticket",
            "subtype": ticket.get("category", "support"),
            "description": ticket.get("subject", "Ticket de suporte"),
            "date": ticket.get("created_at"),
            "status": ticket.get("status")
        })
    
    # Add orders to timeline
    for order in orders[:10]:
        activities.append({
            "type": "order",
            "subtype": order.get("order_type", "trade"),
            "description": f"{order.get('order_type', 'Ordem')} {order.get('crypto_asset', '')} - {order.get('crypto_amount', 0)}",
            "date": order.get("created_at"),
            "status": order.get("status")
        })
    
    # Sort activities by date
    activities.sort(key=lambda x: x.get("date") or "", reverse=True)
    
    return {
        "client": user,
        "wallets": wallets,
        "transactions": transactions,
        "orders": orders,
        "investments": investments,
        "tickets": tickets,
        "fiat_deposits": fiat_deposits,
        "trading_stats": trading_stats,
        "account_manager": account_manager,
        "activities": activities[:20]
    }


async def get_client_trading_stats(db, user_id: str) -> dict:
    """Calculate trading statistics for a client"""
    
    # Get all orders
    orders = await db.trading_orders.find(
        {"user_id": user_id, "status": "completed"},
        {"_id": 0}
    ).to_list(1000)
    
    if not orders:
        return {
            "total_volume_eur": 0,
            "total_orders": 0,
            "buy_orders": 0,
            "sell_orders": 0,
            "favorite_pairs": [],
            "avg_order_value": 0,
            "last_trade_date": None,
            "trading_frequency": "none"
        }
    
    total_volume = 0
    buy_count = 0
    sell_count = 0
    pairs_count = {}
    
    for order in orders:
        total_volume += order.get("fiat_amount", 0)
        
        if order.get("order_type") == "buy":
            buy_count += 1
        elif order.get("order_type") == "sell":
            sell_count += 1
        
        # Count pairs
        pair = f"{order.get('crypto_asset', 'UNKNOWN')}/{order.get('fiat_currency', 'EUR')}"
        pairs_count[pair] = pairs_count.get(pair, 0) + 1
    
    # Get favorite pairs (top 3)
    sorted_pairs = sorted(pairs_count.items(), key=lambda x: x[1], reverse=True)
    favorite_pairs = [p[0] for p in sorted_pairs[:3]]
    
    # Calculate frequency
    total_orders = len(orders)
    if total_orders == 0:
        frequency = "none"
    elif total_orders >= 20:
        frequency = "high"
    elif total_orders >= 5:
        frequency = "medium"
    else:
        frequency = "low"
    
    # Get last trade date
    last_trade = None
    if orders:
        last_order = max(orders, key=lambda x: x.get("created_at", ""))
        last_trade = last_order.get("created_at")
    
    return {
        "total_volume_eur": round(total_volume, 2),
        "total_orders": total_orders,
        "buy_orders": buy_count,
        "sell_orders": sell_count,
        "favorite_pairs": favorite_pairs,
        "avg_order_value": round(total_volume / total_orders, 2) if total_orders > 0 else 0,
        "last_trade_date": last_trade,
        "trading_frequency": frequency
    }


@router.get("/clients/stats/overview")
async def get_crm_clients_overview(
    current_user: dict = Depends(get_current_user)
):
    """Get overview statistics for CRM clients dashboard"""
    db = get_db()
    
    # Total clients
    total_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}})
    
    # By region
    europe_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "region": "europe"})
    mena_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "region": "mena"})
    latam_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "region": "latam"})
    
    # By tier
    standard_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "membership_level": "standard"})
    premium_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "membership_level": "premium"})
    vip_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "membership_level": "vip"})
    
    # By KYC status
    kyc_approved = await db.users.count_documents({"user_type": {"$ne": "internal"}, "kyc_status": "approved"})
    kyc_pending = await db.users.count_documents({"user_type": {"$ne": "internal"}, "kyc_status": "pending"})
    kyc_not_started = await db.users.count_documents({"user_type": {"$ne": "internal"}, "kyc_status": {"$in": ["not_started", None]}})
    
    # Active this month (made a transaction or order)
    from datetime import datetime, timedelta
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    month_ago_str = month_ago.isoformat()
    
    # Get unique users with orders this month
    active_users = set()
    orders_cursor = db.trading_orders.find({"created_at": {"$gte": month_ago_str}}, {"user_id": 1})
    async for order in orders_cursor:
        active_users.add(order.get("user_id"))
    
    # Total trading volume this month
    orders = await db.trading_orders.find(
        {"created_at": {"$gte": month_ago_str}, "status": "completed"},
        {"fiat_amount": 1}
    ).to_list(10000)
    total_volume = sum(o.get("fiat_amount", 0) for o in orders)
    
    return {
        "total_clients": total_clients,
        "by_region": {
            "europe": europe_clients,
            "mena": mena_clients,
            "latam": latam_clients
        },
        "by_tier": {
            "standard": standard_clients,
            "premium": premium_clients,
            "vip": vip_clients
        },
        "by_kyc": {
            "approved": kyc_approved,
            "pending": kyc_pending,
            "not_started": kyc_not_started
        },
        "active_this_month": len(active_users),
        "total_volume_this_month": round(total_volume, 2)
    }



# ==================== ADVANCED CRM DASHBOARD ====================

@router.get("/dashboard/advanced")
async def get_advanced_crm_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Get advanced CRM dashboard with all metrics - ADMIN ONLY"""
    # Check if user is admin
    is_admin = getattr(current_user, 'is_admin', False) if hasattr(current_user, 'is_admin') else current_user.get("is_admin", False)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    
    db = get_db()
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)
    three_months_ago = now - timedelta(days=90)
    
    # ===== TOP 10 CLIENTS BY VOLUME =====
    top_clients = []
    
    # Aggregate trading volume per user
    pipeline = [
        {"$match": {"status": "completed", "created_at": {"$gte": month_ago.isoformat()}}},
        {"$group": {
            "_id": "$user_id",
            "total_volume": {"$sum": "$fiat_amount"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"total_volume": -1}},
        {"$limit": 10}
    ]
    
    volume_results = await db.trading_orders.aggregate(pipeline).to_list(10)
    
    for result in volume_results:
        user = await db.users.find_one(
            {"id": result["_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "region": 1, "membership_level": 1}
        )
        if user:
            top_clients.append({
                "user": user,
                "total_volume": round(result["total_volume"], 2),
                "order_count": result["order_count"]
            })
    
    # ===== CHURN ANALYSIS =====
    # Active users: had activity in last 30 days
    # At risk: no activity in 30-60 days
    # Churned: no activity in 60+ days
    
    total_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}})
    
    # Get all client IDs
    all_client_ids = set()
    async for user in db.users.find({"user_type": {"$ne": "internal"}}, {"id": 1}):
        all_client_ids.add(user.get("id"))
    
    # Active users (activity in last 30 days)
    active_ids = set()
    async for order in db.trading_orders.find({"created_at": {"$gte": month_ago.isoformat()}}, {"user_id": 1}):
        active_ids.add(order.get("user_id"))
    async for tx in db.transactions.find({"created_at": {"$gte": month_ago.isoformat()}}, {"user_id": 1}):
        active_ids.add(tx.get("user_id"))
    
    # At risk users (activity 30-90 days ago, none in last 30)
    at_risk_ids = set()
    async for order in db.trading_orders.find({
        "created_at": {"$gte": three_months_ago.isoformat(), "$lt": month_ago.isoformat()}
    }, {"user_id": 1}):
        if order.get("user_id") not in active_ids:
            at_risk_ids.add(order.get("user_id"))
    
    active_count = len(active_ids.intersection(all_client_ids))
    at_risk_count = len(at_risk_ids.intersection(all_client_ids))
    churned_count = total_clients - active_count - at_risk_count
    
    churn_rate = round((churned_count / total_clients * 100), 1) if total_clients > 0 else 0
    
    churn_analysis = {
        "total_clients": total_clients,
        "active": active_count,
        "at_risk": at_risk_count,
        "churned": churned_count,
        "churn_rate": churn_rate
    }
    
    # ===== LEADS/DEALS PIPELINE =====
    # Count leads by status
    leads_new = await db.crm_leads.count_documents({"status": "new"})
    leads_contacted = await db.crm_leads.count_documents({"status": "contacted"})
    leads_qualified = await db.crm_leads.count_documents({"status": "qualified"})
    leads_proposal = await db.crm_leads.count_documents({"status": "proposal"})
    leads_won = await db.crm_leads.count_documents({"status": "won"})
    leads_lost = await db.crm_leads.count_documents({"status": "lost"})
    
    # Count deals by stage
    deals_discovery = await db.crm_deals.count_documents({"stage": "discovery"})
    deals_proposal = await db.crm_deals.count_documents({"stage": "proposal"})
    deals_negotiation = await db.crm_deals.count_documents({"stage": "negotiation"})
    deals_closed_won = await db.crm_deals.count_documents({"stage": "closed_won"})
    deals_closed_lost = await db.crm_deals.count_documents({"stage": "closed_lost"})
    
    # Calculate pipeline value
    pipeline_value = 0
    async for deal in db.crm_deals.find({"stage": {"$nin": ["closed_won", "closed_lost"]}}, {"value": 1, "probability": 1}):
        value = deal.get("value", 0) or 0
        prob = deal.get("probability", 50) or 50
        pipeline_value += value * (prob / 100)
    
    pipeline_stats = {
        "leads": {
            "new": leads_new,
            "contacted": leads_contacted,
            "qualified": leads_qualified,
            "proposal": leads_proposal,
            "won": leads_won,
            "lost": leads_lost,
            "total": leads_new + leads_contacted + leads_qualified + leads_proposal + leads_won + leads_lost,
            "conversion_rate": round((leads_won / (leads_won + leads_lost) * 100), 1) if (leads_won + leads_lost) > 0 else 0
        },
        "deals": {
            "discovery": deals_discovery,
            "proposal": deals_proposal,
            "negotiation": deals_negotiation,
            "closed_won": deals_closed_won,
            "closed_lost": deals_closed_lost,
            "pipeline_value": round(pipeline_value, 2)
        }
    }
    
    # ===== SUPPLIER PERFORMANCE =====
    suppliers = []
    async for supplier in db.crm_suppliers.find({"is_active": True}, {"_id": 0}).limit(10):
        # Calculate mock performance metrics
        suppliers.append({
            "id": supplier.get("id"),
            "name": supplier.get("name"),
            "company": supplier.get("company"),
            "category": supplier.get("category"),
            "volume_30d": supplier.get("total_volume", 0),
            "uptime": 99.5,  # Mock - would come from monitoring
            "avg_response_time": "< 100ms",  # Mock
            "incidents_30d": 0,  # Mock
            "rating": supplier.get("rating", 4.5)
        })
    
    # ===== REGIONAL BREAKDOWN =====
    europe_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "region": "europe"})
    mena_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "region": "mena"})
    latam_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "region": "latam"})
    global_clients = await db.users.count_documents({"user_type": {"$ne": "internal"}, "region": "global"})
    
    # Regional volume
    regional_volume = {
        "europe": 0,
        "mena": 0,
        "latam": 0,
        "global": 0
    }
    
    async for order in db.trading_orders.find({"status": "completed", "created_at": {"$gte": month_ago.isoformat()}}, {"user_id": 1, "fiat_amount": 1}):
        user = await db.users.find_one({"id": order.get("user_id")}, {"region": 1})
        if user:
            region = user.get("region", "global")
            regional_volume[region] = regional_volume.get(region, 0) + order.get("fiat_amount", 0)
    
    regional_stats = {
        "clients": {
            "europe": europe_clients,
            "mena": mena_clients,
            "latam": latam_clients,
            "global": global_clients
        },
        "volume": {
            "europe": round(regional_volume.get("europe", 0), 2),
            "mena": round(regional_volume.get("mena", 0), 2),
            "latam": round(regional_volume.get("latam", 0), 2),
            "global": round(regional_volume.get("global", 0), 2)
        }
    }
    
    # ===== COMPLIANCE OVERVIEW =====
    kyc_approved = await db.users.count_documents({"user_type": {"$ne": "internal"}, "kyc_status": "approved"})
    kyc_pending = await db.users.count_documents({"user_type": {"$ne": "internal"}, "kyc_status": "pending"})
    kyc_rejected = await db.users.count_documents({"user_type": {"$ne": "internal"}, "kyc_status": "rejected"})
    kyc_not_started = await db.users.count_documents({"user_type": {"$ne": "internal"}, "kyc_status": {"$in": ["not_started", None]}})
    
    # Count overdue tasks safely
    now_str = now.isoformat()
    pending_tasks = await db.crm_tasks.count_documents({"status": {"$in": ["pending", "in_progress"]}})
    
    # Count overdue tasks by iterating (safer with mixed date formats)
    overdue_count = 0
    async for task in db.crm_tasks.find({"status": {"$in": ["pending", "in_progress"]}}, {"due_date": 1}):
        due_date = task.get("due_date")
        if due_date:
            try:
                if isinstance(due_date, str) and due_date < now_str:
                    overdue_count += 1
                elif hasattr(due_date, 'isoformat') and due_date < now:
                    overdue_count += 1
            except:
                pass
    
    compliance_stats = {
        "kyc": {
            "approved": kyc_approved,
            "pending": kyc_pending,
            "rejected": kyc_rejected,
            "not_started": kyc_not_started,
            "approval_rate": round((kyc_approved / total_clients * 100), 1) if total_clients > 0 else 0
        },
        "pending_tasks": pending_tasks,
        "overdue_tasks": overdue_count
    }
    
    # ===== RECENT ACTIVITY =====
    recent_activities = []
    
    # Recent orders
    async for order in db.trading_orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5):
        user = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "name": 1})
        recent_activities.append({
            "type": "order",
            "description": f"{user.get('name', 'Unknown')} - {order.get('order_type', 'trade')} {order.get('crypto_amount', 0)} {order.get('crypto_asset', '')}",
            "date": order.get("created_at"),
            "value": order.get("fiat_amount", 0)
        })
    
    # Recent leads
    async for lead in db.crm_leads.find({}, {"_id": 0}).sort("created_at", -1).limit(3):
        recent_activities.append({
            "type": "lead",
            "description": f"Novo lead: {lead.get('company_name', lead.get('contact_name', 'Unknown'))}",
            "date": lead.get("created_at"),
            "value": lead.get("estimated_volume", 0)
        })
    
    # Sort by date (convert to string for safe comparison)
    def get_date_str(x):
        date_val = x.get("date")
        if date_val is None:
            return ""
        if isinstance(date_val, str):
            return date_val
        if hasattr(date_val, 'isoformat'):
            return date_val.isoformat()
        return str(date_val)
    
    recent_activities.sort(key=get_date_str, reverse=True)
    
    return {
        "top_clients": top_clients,
        "churn_analysis": churn_analysis,
        "pipeline": pipeline_stats,
        "suppliers": suppliers,
        "regional": regional_stats,
        "compliance": compliance_stats,
        "recent_activities": recent_activities[:10]
    }


@router.get("/dashboard/top-clients")
async def get_top_clients(
    period: str = "30d",
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get top clients by trading volume - ADMIN ONLY"""
    # Check if user is admin
    is_admin = getattr(current_user, 'is_admin', False) if hasattr(current_user, 'is_admin') else current_user.get("is_admin", False)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    
    db = get_db()
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    
    if period == "7d":
        start_date = now - timedelta(days=7)
    elif period == "30d":
        start_date = now - timedelta(days=30)
    elif period == "90d":
        start_date = now - timedelta(days=90)
    else:
        start_date = now - timedelta(days=30)
    
    pipeline = [
        {"$match": {"status": "completed", "created_at": {"$gte": start_date.isoformat()}}},
        {"$group": {
            "_id": "$user_id",
            "total_volume": {"$sum": "$fiat_amount"},
            "order_count": {"$sum": 1},
            "avg_order": {"$avg": "$fiat_amount"}
        }},
        {"$sort": {"total_volume": -1}},
        {"$limit": limit}
    ]
    
    results = await db.trading_orders.aggregate(pipeline).to_list(limit)
    
    top_clients = []
    for result in results:
        user = await db.users.find_one(
            {"id": result["_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "region": 1, "membership_level": 1, "created_at": 1}
        )
        if user:
            top_clients.append({
                "client": user,
                "total_volume": round(result["total_volume"], 2),
                "order_count": result["order_count"],
                "avg_order": round(result["avg_order"], 2)
            })
    
    return top_clients
