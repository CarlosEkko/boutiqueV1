"""
Knowledge Base Routes - Articles, Categories, and Support Tickets
"""
from fastapi import APIRouter, HTTPException, Header, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re

from models.knowledge_base import (
    KBCategory, KBCategoryCreate, KBCategoryUpdate,
    KBArticle, KBArticleCreate, KBArticleUpdate, ArticleStatus,
    SupportTicket, SupportTicketCreate, SupportTicketUpdate,
    TicketStatus, TicketPriority, TicketMessage, TicketReply
)
from utils.auth import get_current_user_id
from utils.i18n import t, I18n
from routes.admin import get_admin_user

router = APIRouter(prefix="/kb", tags=["Knowledge Base"])

# Database reference
db = None

def set_db(database):
    global db
    db = database


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text


# ==================== PUBLIC ENDPOINTS ====================

@router.get("/categories")
async def get_public_categories():
    """Get all active categories with article counts"""
    categories = await db.kb_categories.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    # Get article counts
    for cat in categories:
        count = await db.kb_articles.count_documents({
            "category_id": cat["id"],
            "status": "published"
        })
        cat["article_count"] = count
    
    return categories


@router.get("/categories/{slug}")
async def get_category_by_slug(slug: str):
    """Get category by slug with its articles"""
    category = await db.kb_categories.find_one(
        {"slug": slug, "is_active": True},
        {"_id": 0}
    )
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get published articles in this category
    articles = await db.kb_articles.find(
        {"category_id": category["id"], "status": "published"},
        {"_id": 0, "content": 0}  # Exclude full content for listing
    ).sort([("is_featured", -1), ("order", 1), ("published_at", -1)]).to_list(100)
    
    return {
        "category": category,
        "articles": articles
    }


@router.get("/articles")
async def get_public_articles(
    category: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = 0
):
    """Get published articles with optional filters"""
    query = {"status": "published"}
    
    if category:
        cat = await db.kb_categories.find_one({"slug": category})
        if cat:
            query["category_id"] = cat["id"]
    
    if tag:
        query["tags"] = tag
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"summary": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.kb_articles.count_documents(query)
    
    articles = await db.kb_articles.find(
        query,
        {"_id": 0, "content": 0}
    ).sort([("is_featured", -1), ("published_at", -1)]).skip(offset).limit(limit).to_list(limit)
    
    return {
        "articles": articles,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/articles/{slug}")
async def get_article_by_slug(slug: str):
    """Get full article by slug and increment view count"""
    article = await db.kb_articles.find_one(
        {"slug": slug, "status": "published"},
        {"_id": 0}
    )
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    # Increment view count
    await db.kb_articles.update_one(
        {"id": article["id"]},
        {"$inc": {"view_count": 1}}
    )
    
    # Get category info
    category = await db.kb_categories.find_one(
        {"id": article["category_id"]},
        {"_id": 0}
    )
    
    # Get related articles
    related = await db.kb_articles.find(
        {
            "category_id": article["category_id"],
            "id": {"$ne": article["id"]},
            "status": "published"
        },
        {"_id": 0, "content": 0}
    ).limit(5).to_list(5)
    
    return {
        "article": article,
        "category": category,
        "related": related
    }


@router.post("/articles/{article_id}/feedback")
async def article_feedback(article_id: str, helpful: bool):
    """Submit feedback on article helpfulness"""
    field = "helpful_yes" if helpful else "helpful_no"
    
    result = await db.kb_articles.update_one(
        {"id": article_id},
        {"$inc": {field: 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"success": True, "message": "Thank you for your feedback!"}


@router.get("/featured")
async def get_featured_articles():
    """Get featured articles for homepage"""
    articles = await db.kb_articles.find(
        {"status": "published", "is_featured": True},
        {"_id": 0, "content": 0}
    ).sort("published_at", -1).limit(6).to_list(6)
    
    return articles


@router.get("/recent")
async def get_recent_articles(limit: int = Query(5, le=20)):
    """Get most recent articles"""
    articles = await db.kb_articles.find(
        {"status": "published"},
        {"_id": 0, "content": 0}
    ).sort("published_at", -1).limit(limit).to_list(limit)
    
    return articles


@router.get("/popular")
async def get_popular_articles(limit: int = Query(5, le=20)):
    """Get most viewed articles"""
    articles = await db.kb_articles.find(
        {"status": "published"},
        {"_id": 0, "content": 0}
    ).sort("view_count", -1).limit(limit).to_list(limit)
    
    return articles


# ==================== PUBLIC TICKET SUBMISSION ====================

from pydantic import BaseModel

class PublicTicketCreate(BaseModel):
    name: str
    email: str
    subject: str
    description: str
    category: str = "general"
    priority: str = "medium"
    attachments: List[str] = []


@router.post("/public-ticket")
async def create_public_ticket(ticket_data: PublicTicketCreate):
    """Create a support ticket without authentication (public form)"""
    import re
    
    # Basic email validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, ticket_data.email):
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    # Validate required fields
    if len(ticket_data.name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    if len(ticket_data.subject) < 5:
        raise HTTPException(status_code=400, detail="Subject must be at least 5 characters")
    if len(ticket_data.description) < 10:
        raise HTTPException(status_code=400, detail="Description must be at least 10 characters")
    
    now = datetime.now(timezone.utc).isoformat()
    ticket_number = await generate_ticket_number()
    
    ticket_dict = {
        "id": str(uuid.uuid4()),
        "ticket_number": ticket_number,
        "user_id": None,  # No user ID for public tickets
        "user_email": ticket_data.email,
        "user_name": ticket_data.name,
        "subject": ticket_data.subject,
        "description": ticket_data.description,
        "category": ticket_data.category,
        "priority": ticket_data.priority,
        "status": TicketStatus.OPEN.value,
        "assigned_to": None,
        "assigned_name": None,
        "is_public_ticket": True,
        "messages": [{
            "id": str(uuid.uuid4()),
            "sender_id": None,
            "sender_name": ticket_data.name,
            "sender_email": ticket_data.email,
            "sender_type": "visitor",
            "message": ticket_data.description,
            "attachments": ticket_data.attachments,
            "created_at": now
        }],
        "internal_notes": [],
        "created_at": now,
        "updated_at": now,
        "resolved_at": None
    }
    
    await db.support_tickets.insert_one(ticket_dict)
    
    return {
        "success": True,
        "ticket_id": ticket_dict["id"],
        "ticket_number": ticket_number,
        "message": "Your support request has been submitted. We will respond to your email shortly."
    }


# ==================== ADMIN: CATEGORIES ====================

@router.get("/admin/categories")
async def admin_list_categories(admin: dict = Depends(get_admin_user)):
    """Admin: List all categories"""
    categories = await db.kb_categories.find(
        {},
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    
    for cat in categories:
        cat["article_count"] = await db.kb_articles.count_documents({"category_id": cat["id"]})
    
    return categories


@router.post("/admin/categories")
async def admin_create_category(
    category: KBCategoryCreate,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Create new category"""
    # Check if slug exists
    existing = await db.kb_categories.find_one({"slug": category.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this slug already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    
    category_dict = category.model_dump()
    category_dict["id"] = str(uuid.uuid4())
    category_dict["created_at"] = now
    category_dict["updated_at"] = now
    
    await db.kb_categories.insert_one(category_dict)
    
    return {"success": True, "category_id": category_dict["id"]}


@router.put("/admin/categories/{category_id}")
async def admin_update_category(
    category_id: str,
    update: KBCategoryUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Update category"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.kb_categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"success": True}


@router.delete("/admin/categories/{category_id}")
async def admin_delete_category(
    category_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Delete category (only if empty)"""
    # Check for articles
    article_count = await db.kb_articles.count_documents({"category_id": category_id})
    if article_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {article_count} articles. Move or delete articles first."
        )
    
    result = await db.kb_categories.delete_one({"id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"success": True}


# ==================== ADMIN: ARTICLES ====================

@router.get("/admin/articles")
async def admin_list_articles(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Admin: List all articles"""
    query = {}
    
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    articles = await db.kb_articles.find(
        query,
        {"_id": 0, "content": 0}
    ).sort("updated_at", -1).to_list(200)
    
    # Add category names
    categories = {c["id"]: c["name"] for c in await db.kb_categories.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)}
    for article in articles:
        article["category_name"] = categories.get(article.get("category_id"), "Unknown")
    
    return articles


@router.get("/admin/articles/{article_id}")
async def admin_get_article(
    article_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Get article with full content"""
    article = await db.kb_articles.find_one({"id": article_id}, {"_id": 0})
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return article


@router.post("/admin/articles")
async def admin_create_article(
    article: KBArticleCreate,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Create new article"""
    # Check if slug exists
    existing = await db.kb_articles.find_one({"slug": article.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Article with this slug already exists")
    
    # Verify category exists
    category = await db.kb_categories.find_one({"id": article.category_id})
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    article_dict = article.model_dump()
    article_dict["id"] = str(uuid.uuid4())
    article_dict["author_id"] = admin["id"]
    article_dict["author_name"] = admin.get("name", admin.get("email", "Admin"))
    article_dict["view_count"] = 0
    article_dict["helpful_yes"] = 0
    article_dict["helpful_no"] = 0
    article_dict["created_at"] = now
    article_dict["updated_at"] = now
    article_dict["published_at"] = now if article.status == ArticleStatus.PUBLISHED else None
    
    await db.kb_articles.insert_one(article_dict)
    
    return {"success": True, "article_id": article_dict["id"]}


@router.put("/admin/articles/{article_id}")
async def admin_update_article(
    article_id: str,
    update: KBArticleUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Update article"""
    existing = await db.kb_articles.find_one({"id": article_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now
    
    # Set published_at when publishing
    if update.status == ArticleStatus.PUBLISHED and existing.get("status") != "published":
        update_data["published_at"] = now
    
    _ = await db.kb_articles.update_one(
        {"id": article_id},
        {"$set": update_data}
    )
    
    return {"success": True}


@router.delete("/admin/articles/{article_id}")
async def admin_delete_article(
    article_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Delete article"""
    result = await db.kb_articles.delete_one({"id": article_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"success": True}


# ==================== SUPPORT TICKETS ====================

async def generate_ticket_number() -> str:
    """Generate unique ticket number"""
    count = await db.support_tickets.count_documents({})
    return f"TKT-{str(count + 1).zfill(5)}"


@router.post("/tickets")
async def create_ticket(
    ticket: SupportTicketCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new support ticket"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc).isoformat()
    ticket_number = await generate_ticket_number()
    
    ticket_dict = ticket.model_dump()
    ticket_dict["id"] = str(uuid.uuid4())
    ticket_dict["ticket_number"] = ticket_number
    ticket_dict["user_id"] = user_id
    ticket_dict["user_email"] = user.get("email")
    ticket_dict["user_name"] = user.get("name", user.get("email"))
    ticket_dict["status"] = TicketStatus.OPEN.value
    ticket_dict["assigned_to"] = None
    ticket_dict["assigned_name"] = None
    ticket_dict["messages"] = [{
        "id": str(uuid.uuid4()),
        "sender_id": user_id,
        "sender_name": user.get("name", user.get("email")),
        "sender_type": "user",
        "message": ticket.description,
        "attachments": [],
        "created_at": now
    }]
    ticket_dict["internal_notes"] = []
    ticket_dict["created_at"] = now
    ticket_dict["updated_at"] = now
    ticket_dict["resolved_at"] = None
    
    await db.support_tickets.insert_one(ticket_dict)
    
    return {
        "success": True,
        "ticket_id": ticket_dict["id"],
        "ticket_number": ticket_number
    }


@router.get("/tickets")
async def get_my_tickets(
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get current user's tickets"""
    query = {"user_id": user_id}
    if status:
        query["status"] = status
    
    tickets = await db.support_tickets.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    return tickets


@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get ticket details"""
    ticket = await db.support_tickets.find_one(
        {"id": ticket_id, "user_id": user_id},
        {"_id": 0, "internal_notes": 0}  # Hide internal notes from users
    )
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return ticket


@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    reply: TicketReply,
    user_id: str = Depends(get_current_user_id)
):
    """Reply to a ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id, "user_id": user_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.get("status") == TicketStatus.CLOSED.value:
        raise HTTPException(status_code=400, detail="Cannot reply to closed ticket")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    now = datetime.now(timezone.utc).isoformat()
    
    message = {
        "id": str(uuid.uuid4()),
        "sender_id": user_id,
        "sender_name": user.get("name", user.get("email")),
        "sender_type": "user",
        "message": reply.message,
        "attachments": reply.attachments,
        "created_at": now
    }
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"messages": message},
            "$set": {
                "status": TicketStatus.OPEN.value,  # Reopen if waiting for customer
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message_id": message["id"]}


@router.post("/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Close a ticket"""
    result = await db.support_tickets.update_one(
        {"id": ticket_id, "user_id": user_id},
        {
            "$set": {
                "status": TicketStatus.CLOSED.value,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"success": True}


# ==================== ADMIN: TICKETS ====================

@router.get("/admin/tickets")
async def admin_list_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Admin: List all tickets"""
    query = {}
    
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    tickets = await db.support_tickets.find(
        query,
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(200)
    
    # Add computed fields for each ticket
    for ticket in tickets:
        # Message count
        ticket["message_count"] = len(ticket.get("messages", []))
        # Ensure is_public_ticket field exists
        if "is_public_ticket" not in ticket:
            ticket["is_public_ticket"] = ticket.get("user_id") is None
    
    # Count by status
    stats = {
        "open": await db.support_tickets.count_documents({"status": "open"}),
        "in_progress": await db.support_tickets.count_documents({"status": "in_progress"}),
        "waiting_customer": await db.support_tickets.count_documents({"status": "waiting_customer"}),
        "resolved": await db.support_tickets.count_documents({"status": "resolved"}),
        "closed": await db.support_tickets.count_documents({"status": "closed"})
    }
    
    # Count by priority
    priority_stats = {
        "urgent": await db.support_tickets.count_documents({"priority": "urgent"}),
        "high": await db.support_tickets.count_documents({"priority": "high"}),
        "medium": await db.support_tickets.count_documents({"priority": "medium"}),
        "low": await db.support_tickets.count_documents({"priority": "low"})
    }
    
    return {
        "tickets": tickets, 
        "stats": {
            "by_status": stats,
            "by_priority": priority_stats
        }
    }


@router.get("/admin/tickets/{ticket_id}")
async def admin_get_ticket(
    ticket_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Get ticket with full details"""
    ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return ticket


@router.put("/admin/tickets/{ticket_id}")
async def admin_update_ticket(
    ticket_id: str,
    update: SupportTicketUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Update ticket status, priority, or assignment"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now
    
    # Get assigned user name if assigning
    if "assigned_to" in update_data:
        assigned_user = await db.users.find_one({"id": update_data["assigned_to"]})
        if assigned_user:
            update_data["assigned_name"] = assigned_user.get("name", assigned_user.get("email"))
    
    # Set resolved_at if resolving
    if update_data.get("status") in [TicketStatus.RESOLVED.value, TicketStatus.CLOSED.value]:
        update_data["resolved_at"] = now
    
    # Add internal note if provided
    internal_note = update_data.pop("internal_note", None)
    
    update_ops = {"$set": update_data}
    
    if internal_note:
        update_ops["$push"] = {
            "internal_notes": {
                "id": str(uuid.uuid4()),
                "admin_id": admin["id"],
                "admin_name": admin.get("name", admin.get("email")),
                "note": internal_note,
                "created_at": now
            }
        }
    
    result = await db.support_tickets.update_one(
        {"id": ticket_id},
        update_ops
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"success": True}


@router.post("/admin/tickets/{ticket_id}/reply")
async def admin_reply_to_ticket(
    ticket_id: str,
    reply: TicketReply,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Reply to a ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    message = {
        "id": str(uuid.uuid4()),
        "sender_id": admin["id"],
        "sender_name": admin.get("name", admin.get("email")),
        "sender_type": "admin",
        "message": reply.message,
        "attachments": reply.attachments,
        "created_at": now
    }
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"messages": message},
            "$set": {
                "status": TicketStatus.WAITING_CUSTOMER.value,
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message_id": message["id"]}
