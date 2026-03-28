from fastapi import APIRouter, HTTPException, Header, status, Depends
from datetime import datetime, timezone
from typing import List, Optional
from models.user import (
    Ticket, TicketCreate, TicketMessage, TicketStatus, TicketPriority,
    TicketCategory, TicketResponse, Region, UserType
)
from utils.auth import get_current_user_id
from utils.i18n import t, I18n
import uuid

router = APIRouter(prefix="/tickets", tags=["Tickets"])

# Database reference
db = None


def set_db(database):
    global db
    db = database


# ==================== CLIENT ENDPOINTS ====================

@router.post("/", response_model=dict)
async def create_ticket(
    ticket_data: TicketCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new support ticket (client)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ticket = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user.get("name", "Unknown"),
        "user_email": user.get("email", ""),
        "region": user.get("region", "europe"),
        "subject": ticket_data.subject,
        "category": ticket_data.category,
        "priority": ticket_data.priority,
        "status": TicketStatus.OPEN,
        "initial_message": ticket_data.message,
        "assigned_to": None,
        "assigned_name": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "resolved_at": None
    }
    
    await db.tickets.insert_one(ticket)
    
    # Create first message
    message = {
        "id": str(uuid.uuid4()),
        "ticket_id": ticket["id"],
        "sender_id": user_id,
        "sender_name": user.get("name", "Unknown"),
        "sender_type": "client",
        "message": ticket_data.message,
        "attachments": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ticket_messages.insert_one(message)
    
    return {"success": True, "ticket_id": ticket["id"]}


@router.get("/my-tickets", response_model=List[dict])
async def get_my_tickets(
    status: Optional[TicketStatus] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get all tickets for current user"""
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add message count
    for ticket in tickets:
        count = await db.ticket_messages.count_documents({"ticket_id": ticket["id"]})
        ticket["message_count"] = count
    
    return tickets


@router.get("/{ticket_id}", response_model=dict)
async def get_ticket(
    ticket_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get ticket details with messages"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access - clients can only see their own tickets
    user_type = user.get("user_type", "client")
    if user_type == "client" and ticket["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Internal users can see tickets from their region
    if user_type == "internal":
        internal_role = user.get("internal_role")
        user_region = user.get("region", "global")
        
        # Admin and Manager can see all
        if internal_role not in ["admin", "manager"]:
            # Local manager and support can only see their region
            if user_region != "global" and ticket.get("region") != user_region:
                raise HTTPException(status_code=403, detail="Access denied to this region")
    
    # Get messages
    messages = await db.ticket_messages.find(
        {"ticket_id": ticket_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    return {
        **ticket,
        "messages": messages
    }


@router.post("/{ticket_id}/reply", response_model=dict)
async def reply_to_ticket(
    ticket_id: str,
    message: str,
    user_id: str = Depends(get_current_user_id)
):
    """Add a reply to a ticket"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    user_type = user.get("user_type", "client")
    
    # Check access
    if user_type == "client" and ticket["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create message
    msg = {
        "id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "sender_id": user_id,
        "sender_name": user.get("name", "Unknown"),
        "sender_type": user_type,
        "message": message,
        "attachments": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ticket_messages.insert_one(msg)
    
    # Update ticket
    new_status = ticket["status"]
    if user_type == "internal" and ticket["status"] == TicketStatus.OPEN:
        new_status = TicketStatus.IN_PROGRESS
    elif user_type == "client" and ticket["status"] == TicketStatus.WAITING_CLIENT:
        new_status = TicketStatus.IN_PROGRESS
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$set": {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message_id": msg["id"]}


# ==================== INTERNAL ENDPOINTS ====================

async def get_internal_user(user_id: str = Depends(get_current_user_id)):
    """Get internal user with role check"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("user_type") != "internal":
        # Check legacy is_admin flag
        if not user.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Internal access required")
    
    return user


@router.get("/internal/all", response_model=List[dict])
async def get_all_tickets(
    status: Optional[TicketStatus] = None,
    region: Optional[Region] = None,
    category: Optional[TicketCategory] = None,
    priority: Optional[TicketPriority] = None,
    assigned_to_me: bool = False,
    user: dict = Depends(get_internal_user)
):
    """Get all tickets (internal users)"""
    query = {}
    
    # Apply filters
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    
    # Region filter based on role
    internal_role = user.get("internal_role") or ("admin" if user.get("is_admin") else None)
    user_region = user.get("region", "global")
    
    if region:
        query["region"] = region
    elif internal_role not in ["admin", "manager"] and user_region != "global":
        # Local manager and support can only see their region
        query["region"] = user_region
    
    if assigned_to_me:
        query["assigned_to"] = user["id"]
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Add message count
    for ticket in tickets:
        count = await db.ticket_messages.count_documents({"ticket_id": ticket["id"]})
        ticket["message_count"] = count
    
    return tickets


@router.post("/internal/{ticket_id}/assign", response_model=dict)
async def assign_ticket(
    ticket_id: str,
    assignee_id: Optional[str] = None,
    user: dict = Depends(get_internal_user)
):
    """Assign ticket to an internal user"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Self-assign if no assignee specified
    if not assignee_id:
        assignee_id = user["id"]
        assignee_name = user.get("name", "Unknown")
    else:
        assignee = await db.users.find_one({"id": assignee_id}, {"_id": 0})
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")
        assignee_name = assignee.get("name", "Unknown")
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$set": {
                "assigned_to": assignee_id,
                "assigned_name": assignee_name,
                "status": TicketStatus.IN_PROGRESS if ticket["status"] == TicketStatus.OPEN else ticket["status"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": f"Ticket assigned to {assignee_name}"}


@router.post("/internal/{ticket_id}/status/{new_status}", response_model=dict)
async def update_ticket_status(
    ticket_id: str,
    new_status: TicketStatus,
    user: dict = Depends(get_internal_user)
):
    """Update ticket status"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if new_status in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    return {"success": True, "message": f"Status updated to {new_status}"}


@router.post("/internal/{ticket_id}/priority/{new_priority}", response_model=dict)
async def update_ticket_priority(
    ticket_id: str,
    new_priority: TicketPriority,
    user: dict = Depends(get_internal_user)
):
    """Update ticket priority"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$set": {
                "priority": new_priority,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": f"Priority updated to {new_priority}"}


@router.get("/internal/stats", response_model=dict)
async def get_ticket_stats(
    region: Optional[Region] = None,
    user: dict = Depends(get_internal_user)
):
    """Get ticket statistics"""
    internal_role = user.get("internal_role") or ("admin" if user.get("is_admin") else None)
    user_region = user.get("region", "global")
    
    # Build region filter
    region_filter = {}
    if region:
        region_filter["region"] = region
    elif internal_role not in ["admin", "manager"] and user_region != "global":
        region_filter["region"] = user_region
    
    # Count by status
    open_count = await db.tickets.count_documents({**region_filter, "status": TicketStatus.OPEN})
    in_progress = await db.tickets.count_documents({**region_filter, "status": TicketStatus.IN_PROGRESS})
    waiting = await db.tickets.count_documents({**region_filter, "status": TicketStatus.WAITING_CLIENT})
    resolved = await db.tickets.count_documents({**region_filter, "status": TicketStatus.RESOLVED})
    closed = await db.tickets.count_documents({**region_filter, "status": TicketStatus.CLOSED})
    
    # Count by priority (only open/in-progress)
    active_filter = {**region_filter, "status": {"$in": [TicketStatus.OPEN, TicketStatus.IN_PROGRESS]}}
    urgent = await db.tickets.count_documents({**active_filter, "priority": TicketPriority.URGENT})
    high = await db.tickets.count_documents({**active_filter, "priority": TicketPriority.HIGH})
    medium = await db.tickets.count_documents({**active_filter, "priority": TicketPriority.MEDIUM})
    low = await db.tickets.count_documents({**active_filter, "priority": TicketPriority.LOW})
    
    # Count by category
    categories = {}
    for cat in TicketCategory:
        categories[cat.value] = await db.tickets.count_documents({**region_filter, "category": cat.value})
    
    # Region stats (for admin/manager)
    region_stats = {}
    if internal_role in ["admin", "manager"]:
        for reg in Region:
            if reg != Region.GLOBAL:
                region_stats[reg.value] = await db.tickets.count_documents({
                    "region": reg.value,
                    "status": {"$in": [TicketStatus.OPEN, TicketStatus.IN_PROGRESS]}
                })
    
    return {
        "by_status": {
            "open": open_count,
            "in_progress": in_progress,
            "waiting_client": waiting,
            "resolved": resolved,
            "closed": closed,
            "total_active": open_count + in_progress + waiting
        },
        "by_priority": {
            "urgent": urgent,
            "high": high,
            "medium": medium,
            "low": low
        },
        "by_category": categories,
        "by_region": region_stats
    }
