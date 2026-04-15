"""
Team Hub Routes - Email, Calendar & Tasks for internal team
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/team-hub", tags=["team-hub"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db

# Auth dependency (reuse from existing)
from routes.auth import get_current_user, get_current_user_id


# ==================== MODELS ====================

class EmailCompose(BaseModel):
    to_email: str
    to_name: str = ""
    subject: str
    body_html: str
    related_to: Optional[str] = None
    related_type: Optional[str] = None  # lead, client, deal

class EventCreate(BaseModel):
    title: str
    description: str = ""
    start_date: str
    end_date: str
    all_day: bool = False
    location: str = ""
    attendees: List[str] = []
    color: str = "#D4AF37"
    related_to: Optional[str] = None
    related_type: Optional[str] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    all_day: Optional[bool] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    color: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"  # low, medium, high, urgent
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    related_to: Optional[str] = None
    related_type: Optional[str] = None
    tags: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None  # todo, in_progress, done
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[List[str]] = None


# ==================== EMAIL ====================

@router.post("/emails/send")
async def send_team_email(
    to_email: str = Form(...),
    subject: str = Form(...),
    body_html: str = Form(...),
    to_name: str = Form(""),
    related_to: str = Form(None),
    related_type: str = Form(None),
    files: List[UploadFile] = File(default=[]),
    current_user = Depends(get_current_user)
):
    """Compose and send an email via Brevo with optional attachments"""
    db = get_db()
    
    from services.email_service import email_service
    
    # Process attachments
    brevo_attachments = []
    attachment_names = []
    for f in files:
        content = await f.read()
        import base64
        brevo_attachments.append({
            "name": f.filename,
            "content": base64.b64encode(content).decode("utf-8"),
        })
        attachment_names.append(f.filename)
    
    result = await email_service.send_email(
        to_email=to_email,
        to_name=to_name,
        subject=subject,
        html_content=body_html,
        reply_to=current_user.email,
        attachments=brevo_attachments if brevo_attachments else None,
    )
    
    email_record = {
        "id": str(uuid.uuid4()),
        "from_email": current_user.email,
        "from_name": current_user.name,
        "from_user_id": current_user.id,
        "to_email": to_email,
        "to_name": to_name,
        "subject": subject,
        "body_html": body_html,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": "sent" if result.get("success") else "failed",
        "folder": "sent",
        "brevo_message_id": result.get("message_id"),
        "attachments": attachment_names,
        "related_to": related_to,
        "related_type": related_type,
        "error": result.get("error") if not result.get("success") else None,
    }
    
    await db.team_emails.insert_one(email_record)
    email_record.pop("_id", None)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Erro ao enviar email"))
    
    return {"success": True, "email": email_record}


@router.get("/emails")
async def get_team_emails(
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    folder: str = "sent",
    current_user = Depends(get_current_user)
):
    """Get emails filtered by folder"""
    db = get_db()
    
    query = {"folder": folder}
    if search:
        query["$or"] = [
            {"to_email": {"$regex": search, "$options": "i"}},
            {"to_name": {"$regex": search, "$options": "i"}},
            {"subject": {"$regex": search, "$options": "i"}},
            {"from_email": {"$regex": search, "$options": "i"}},
        ]
    
    emails = await db.team_emails.find(query, {"_id": 0}).sort("sent_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.team_emails.count_documents(query)
    
    return {"emails": emails, "total": total}


@router.get("/emails/{email_id}")
async def get_email_detail(email_id: str, current_user = Depends(get_current_user)):
    """Get a single email detail"""
    db = get_db()
    email = await db.team_emails.find_one({"id": email_id}, {"_id": 0})
    if not email:
        raise HTTPException(status_code=404, detail="Email não encontrado")
    return email


class EmailMoveRequest(BaseModel):
    folder: str  # sent, archive, trash, junk

@router.put("/emails/{email_id}/move")
async def move_email(email_id: str, data: EmailMoveRequest, current_user = Depends(get_current_user)):
    """Move an email to a different folder"""
    db = get_db()
    valid_folders = ["sent", "archive", "trash", "junk"]
    if data.folder not in valid_folders:
        raise HTTPException(status_code=400, detail=f"Pasta inválida. Pastas válidas: {valid_folders}")
    
    result = await db.team_emails.update_one(
        {"id": email_id},
        {"$set": {"folder": data.folder, "moved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Email não encontrado")
    return {"success": True, "folder": data.folder}


@router.delete("/emails/{email_id}")
async def permanently_delete_email(email_id: str, current_user = Depends(get_current_user)):
    """Permanently delete an email"""
    db = get_db()
    result = await db.team_emails.delete_one({"id": email_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Email não encontrado")
    return {"success": True}


@router.get("/emails/folders/counts")
async def get_folder_counts(current_user = Depends(get_current_user)):
    """Get email count per folder"""
    db = get_db()
    pipeline = [
        {"$group": {"_id": "$folder", "count": {"$sum": 1}}}
    ]
    results = await db.team_emails.aggregate(pipeline).to_list(20)
    counts = {r["_id"]: r["count"] for r in results if r["_id"]}
    # Add drafts count
    drafts_count = await db.team_drafts.count_documents({"from_user_id": current_user.id})
    counts["drafts"] = drafts_count
    return counts


# ==================== CALENDAR ====================

@router.post("/events")
async def create_event(data: EventCreate, current_user: dict = Depends(get_current_user)):
    """Create a calendar event"""
    db = get_db()
    
    event = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "all_day": data.all_day,
        "location": data.location,
        "attendees": data.attendees,
        "color": data.color,
        "related_to": data.related_to,
        "related_type": data.related_type,
        "created_by": current_user.id,
        "created_by_name": current_user.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.team_events.insert_one(event)
    event.pop("_id", None)
    
    return event


@router.get("/events")
async def get_events(
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get calendar events, optionally filtered by date range"""
    db = get_db()
    
    query = {}
    if start and end:
        query["$or"] = [
            {"start_date": {"$gte": start, "$lte": end}},
            {"end_date": {"$gte": start, "$lte": end}},
        ]
    
    events = await db.team_events.find(query, {"_id": 0}).sort("start_date", 1).to_list(500)
    return {"events": events}


@router.put("/events/{event_id}")
async def update_event(event_id: str, data: EventUpdate, current_user: dict = Depends(get_current_user)):
    """Update a calendar event"""
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.team_events.update_one({"id": event_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    event = await db.team_events.find_one({"id": event_id}, {"_id": 0})
    return event


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a calendar event"""
    db = get_db()
    result = await db.team_events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return {"success": True}


# ==================== TASKS ====================

@router.post("/tasks")
async def create_task(data: TaskCreate, current_user: dict = Depends(get_current_user)):
    """Create a new task"""
    db = get_db()
    
    task = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "description": data.description,
        "status": "todo",
        "priority": data.priority,
        "assigned_to": data.assigned_to,
        "due_date": data.due_date,
        "related_to": data.related_to,
        "related_type": data.related_type,
        "tags": data.tags,
        "created_by": current_user.id,
        "created_by_name": current_user.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    
    await db.team_tasks.insert_one(task)
    task.pop("_id", None)
    
    return task


@router.get("/tasks")
async def get_tasks(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get tasks with optional filters"""
    db = get_db()
    
    query = {}
    if status and status != "all":
        query["status"] = status
    if assigned_to and assigned_to != "all":
        query["assigned_to"] = assigned_to
    if priority and priority != "all":
        query["priority"] = priority
    
    tasks = await db.team_tasks.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.team_tasks.count_documents(query)
    
    # Resolve assigned_to names
    user_ids = list(set(t.get("assigned_to") for t in tasks if t.get("assigned_to")))
    users_map = {}
    if user_ids:
        users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
        users_map = {u["id"]: u["name"] for u in users}
    
    for t in tasks:
        t["assigned_to_name"] = users_map.get(t.get("assigned_to"), "")
    
    return {"tasks": tasks, "total": total}


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """Update a task"""
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_data.get("status") == "done":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif update_data.get("status") in ("todo", "in_progress"):
        update_data["completed_at"] = None
    
    result = await db.team_tasks.update_one({"id": task_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    task = await db.team_tasks.find_one({"id": task_id}, {"_id": 0})
    return task


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    db = get_db()
    result = await db.team_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return {"success": True}


# ==================== STATS ====================

@router.get("/stats")
async def get_hub_stats(current_user: dict = Depends(get_current_user)):
    """Get team hub stats"""
    db = get_db()
    
    emails_today = await db.team_emails.count_documents({
        "sent_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
    })
    total_emails = await db.team_emails.count_documents({})
    pending_tasks = await db.team_tasks.count_documents({"status": {"$in": ["todo", "in_progress"]}})
    upcoming_events = await db.team_events.count_documents({
        "start_date": {"$gte": datetime.now(timezone.utc).isoformat()}
    })
    
    return {
        "emails_today": emails_today,
        "total_emails": total_emails,
        "pending_tasks": pending_tasks,
        "upcoming_events": upcoming_events,
    }



# ==================== EMAIL SIGNATURE ====================

class SignatureUpdate(BaseModel):
    signature_html: str = ""
    signature_name: str = ""

@router.get("/signature")
async def get_signature(current_user = Depends(get_current_user)):
    """Get user's email signature"""
    db = get_db()
    sig = await db.email_signatures.find_one({"user_id": current_user.id}, {"_id": 0})
    if not sig:
        return {"signature_html": "", "signature_name": ""}
    return sig

@router.put("/signature")
async def update_signature(data: SignatureUpdate, current_user = Depends(get_current_user)):
    """Update user's email signature"""
    db = get_db()
    await db.email_signatures.update_one(
        {"user_id": current_user.id},
        {"$set": {
            "user_id": current_user.id,
            "signature_html": data.signature_html,
            "signature_name": data.signature_name,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )
    return {"success": True}


# ==================== EMAIL DRAFTS ====================

class DraftCreate(BaseModel):
    to_email: str = ""
    to_name: str = ""
    subject: str = ""
    body_html: str = ""
    related_to: Optional[str] = None
    related_type: Optional[str] = None

@router.post("/drafts")
async def save_draft(data: DraftCreate, current_user = Depends(get_current_user)):
    """Save an email draft"""
    db = get_db()
    draft = {
        "id": str(uuid.uuid4()),
        "from_email": current_user.email,
        "from_name": current_user.name,
        "from_user_id": current_user.id,
        "to_email": data.to_email,
        "to_name": data.to_name,
        "subject": data.subject,
        "body_html": data.body_html,
        "related_to": data.related_to,
        "related_type": data.related_type,
        "folder": "drafts",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.team_drafts.insert_one(draft)
    draft.pop("_id", None)
    return draft

@router.get("/drafts")
async def get_drafts(current_user = Depends(get_current_user)):
    """Get user's email drafts"""
    db = get_db()
    drafts = await db.team_drafts.find({"from_user_id": current_user.id}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return {"drafts": drafts, "total": len(drafts)}

@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str, current_user = Depends(get_current_user)):
    """Delete a draft"""
    db = get_db()
    await db.team_drafts.delete_one({"id": draft_id, "from_user_id": current_user.id})
    return {"success": True}
