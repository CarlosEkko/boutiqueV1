"""
CRM Routes for KBEX Exchange
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import uuid

from models.crm import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    LeadCreate, LeadUpdate, LeadResponse, LeadStatus,
    DealCreate, DealUpdate, DealResponse, DealStage,
    ContactCreate, ContactUpdate, ContactResponse,
    TaskCreate, TaskUpdate, TaskResponse, TaskStatus, TaskPriority,
    CRMDashboardStats, WalletInfo
)
from routes.auth import get_current_user

router = APIRouter(prefix="/crm", tags=["CRM"])

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

@router.post("/leads/{lead_id}/convert")
async def convert_lead_to_client(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Convert a lead to a client"""
    db = get_db()
    
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Mark lead as converted
    await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {
            "converted_to_client": True,
            "converted_at": datetime.now(timezone.utc),
            "status": LeadStatus.WON.value
        }}
    )
    
    return {"message": "Lead converted to client", "lead_id": lead_id}

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
