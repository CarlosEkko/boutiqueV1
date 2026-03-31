from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class KYCStatus(str, Enum):
    NOT_STARTED = "not_started"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class MembershipLevel(str, Enum):
    """Client membership levels"""
    BROKER = "broker"
    STANDARD = "standard"
    PREMIUM = "premium"
    VIP = "vip"
    INSTITUCIONAL = "institucional"


class InternalRole(str, Enum):
    """Internal staff roles"""
    ADMIN = "admin"
    GLOBAL_MANAGER = "global_manager"
    MANAGER = "manager"
    SALES_MANAGER = "sales_manager"
    SALES = "sales"
    FINANCE_GENERAL = "finance_general"
    FINANCE_LOCAL = "finance_local"
    FINANCE = "finance"
    SUPPORT_MANAGER = "support_manager"
    SUPPORT_AGENT = "support_agent"
    # Legacy roles for backward compatibility
    LOCAL_MANAGER = "local_manager"
    SUPPORT = "support"


class Region(str, Enum):
    """Geographic regions"""
    EUROPE = "europe"
    MENA = "mena"  # Middle East & North Africa
    LATAM = "latam"  # Latin America
    GLOBAL = "global"  # For admins/managers with global access


class UserType(str, Enum):
    """User type"""
    CLIENT = "client"
    INTERNAL = "internal"


class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    country: Optional[str] = None


class UserCreate(UserBase):
    password: str
    invite_code: Optional[str] = None
    region: Optional[Region] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    region: Optional[Region] = None


class InternalUserCreate(BaseModel):
    """Create internal user (admin only)"""
    email: EmailStr
    name: str
    password: str
    internal_role: InternalRole
    region: Region = Region.GLOBAL
    phone: Optional[str] = None


class InternalUserUpdate(BaseModel):
    """Update internal user"""
    name: Optional[str] = None
    phone: Optional[str] = None
    internal_role: Optional[InternalRole] = None
    region: Optional[Region] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    
    # User type
    user_type: UserType = UserType.CLIENT
    
    # Region
    region: Region = Region.EUROPE
    
    # Client fields
    is_approved: bool = False
    kyc_status: KYCStatus = KYCStatus.NOT_STARTED
    membership_level: MembershipLevel = MembershipLevel.STANDARD
    invite_code_used: Optional[str] = None
    invited_by: Optional[str] = None
    
    # Internal staff fields
    is_admin: bool = False  # Legacy - kept for backward compatibility
    internal_role: Optional[InternalRole] = None  # New role system
    
    # External integrations
    fireblocks_vault_id: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    user_type: UserType = UserType.CLIENT
    region: Region = Region.EUROPE
    
    # Client fields
    is_approved: bool = False
    kyc_status: KYCStatus = KYCStatus.NOT_STARTED
    membership_level: MembershipLevel = MembershipLevel.STANDARD
    
    # Internal fields
    is_admin: bool = False
    internal_role: Optional[str] = None  # String for JSON serialization
    
    # Onboarding fields
    is_onboarded: bool = False
    two_factor_enabled: bool = False


class UserResponseAdmin(UserResponse):
    """Extended response for admin views"""
    invite_code_used: Optional[str] = None
    invited_by: Optional[str] = None
    fireblocks_vault_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class InviteCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    created_by: str  # admin user id
    max_uses: int = 1
    uses: int = 0
    is_active: bool = True
    region: Region = Region.EUROPE  # Region for invited users
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None


# ==================== TICKET SYSTEM ====================

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CLIENT = "waiting_client"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketCategory(str, Enum):
    GENERAL = "general"
    KYC = "kyc"
    TRANSACTION = "transaction"
    ACCOUNT = "account"
    TECHNICAL = "technical"
    COMPLAINT = "complaint"


class TicketCreate(BaseModel):
    subject: str
    message: str
    category: TicketCategory = TicketCategory.GENERAL
    priority: TicketPriority = TicketPriority.MEDIUM


class TicketMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_id: str
    sender_id: str
    sender_name: str
    sender_type: UserType  # client or internal
    message: str
    attachments: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Client who created the ticket
    user_name: str
    user_email: str
    region: Region
    
    subject: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus = TicketStatus.OPEN
    
    assigned_to: Optional[str] = None  # Internal user ID
    assigned_name: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    
    # First message
    initial_message: str


class TicketResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    user_id: str
    user_name: str
    user_email: str
    region: Region
    subject: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    message_count: int = 0


# ==================== REGION MAPPING ====================

COUNTRY_TO_REGION = {
    # Europe
    "PT": Region.EUROPE, "ES": Region.EUROPE, "FR": Region.EUROPE, "DE": Region.EUROPE,
    "IT": Region.EUROPE, "NL": Region.EUROPE, "BE": Region.EUROPE, "AT": Region.EUROPE,
    "CH": Region.EUROPE, "GB": Region.EUROPE, "IE": Region.EUROPE, "PL": Region.EUROPE,
    "CZ": Region.EUROPE, "SK": Region.EUROPE, "HU": Region.EUROPE, "RO": Region.EUROPE,
    "BG": Region.EUROPE, "GR": Region.EUROPE, "HR": Region.EUROPE, "SI": Region.EUROPE,
    "LU": Region.EUROPE, "MT": Region.EUROPE, "CY": Region.EUROPE, "EE": Region.EUROPE,
    "LV": Region.EUROPE, "LT": Region.EUROPE, "FI": Region.EUROPE, "SE": Region.EUROPE,
    "DK": Region.EUROPE, "NO": Region.EUROPE, "IS": Region.EUROPE,
    
    # MENA (Middle East & North Africa)
    "AE": Region.MENA, "SA": Region.MENA, "QA": Region.MENA, "KW": Region.MENA,
    "BH": Region.MENA, "OM": Region.MENA, "JO": Region.MENA, "LB": Region.MENA,
    "EG": Region.MENA, "MA": Region.MENA, "TN": Region.MENA, "DZ": Region.MENA,
    "LY": Region.MENA, "IQ": Region.MENA, "SY": Region.MENA, "YE": Region.MENA,
    "PS": Region.MENA, "IL": Region.MENA, "TR": Region.MENA, "IR": Region.MENA,
    
    # LATAM (Latin America)
    "BR": Region.LATAM, "MX": Region.LATAM, "AR": Region.LATAM, "CL": Region.LATAM,
    "CO": Region.LATAM, "PE": Region.LATAM, "VE": Region.LATAM, "EC": Region.LATAM,
    "BO": Region.LATAM, "PY": Region.LATAM, "UY": Region.LATAM, "GY": Region.LATAM,
    "SR": Region.LATAM, "PA": Region.LATAM, "CR": Region.LATAM, "NI": Region.LATAM,
    "HN": Region.LATAM, "SV": Region.LATAM, "GT": Region.LATAM, "BZ": Region.LATAM,
    "CU": Region.LATAM, "DO": Region.LATAM, "HT": Region.LATAM, "JM": Region.LATAM,
    "TT": Region.LATAM, "BB": Region.LATAM, "PR": Region.LATAM,
}


def get_region_from_country(country_code: str) -> Region:
    """Get region from country code (ISO 3166-1 alpha-2)"""
    return COUNTRY_TO_REGION.get(country_code.upper(), Region.EUROPE)
