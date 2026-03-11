"""
Knowledge Base Models - Articles, Categories, and Support Tickets
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ArticleStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# ==================== CATEGORY MODELS ====================

class KBCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None  # Icon name from lucide-react
    color: Optional[str] = "#10b981"  # Default emerald
    image_url: Optional[str] = None  # Category image
    order: int = 0
    is_active: bool = True


class KBCategoryCreate(KBCategoryBase):
    pass


class KBCategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    image_url: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class KBCategory(KBCategoryBase):
    id: str
    article_count: int = 0
    created_at: str
    updated_at: str


# ==================== ARTICLE MODELS ====================

class KBArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)
    summary: Optional[str] = Field(None, max_length=500)
    content: str = Field(..., min_length=1)  # HTML content from WYSIWYG editor
    category_id: str
    tags: List[str] = []
    status: ArticleStatus = ArticleStatus.DRAFT
    is_featured: bool = False
    cover_image: Optional[str] = None  # Cover image URL
    order: int = 0
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class KBArticleCreate(KBArticleBase):
    pass


class KBArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[ArticleStatus] = None
    is_featured: Optional[bool] = None
    cover_image: Optional[str] = None
    order: Optional[int] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None


class KBArticle(KBArticleBase):
    id: str
    author_id: str
    author_name: str
    view_count: int = 0
    helpful_yes: int = 0
    helpful_no: int = 0
    created_at: str
    updated_at: str
    published_at: Optional[str] = None


# ==================== SUPPORT TICKET MODELS ====================

class TicketMessage(BaseModel):
    id: str
    sender_id: str
    sender_name: str
    sender_type: str  # "user" or "admin"
    message: str
    attachments: List[str] = []
    created_at: str


class SupportTicketBase(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    category: str = Field(default="general")  # general, technical, billing, kyc, trading
    priority: TicketPriority = TicketPriority.MEDIUM


class SupportTicketCreate(SupportTicketBase):
    pass


class SupportTicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[str] = None
    internal_note: Optional[str] = None


class SupportTicket(SupportTicketBase):
    id: str
    ticket_number: str  # e.g., "TKT-00001"
    user_id: str
    user_email: str
    user_name: str
    status: TicketStatus = TicketStatus.OPEN
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    messages: List[TicketMessage] = []
    internal_notes: List[dict] = []
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None


class TicketReply(BaseModel):
    message: str = Field(..., min_length=1)
    attachments: List[str] = []
