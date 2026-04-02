"""
CRM Models for KBEX Exchange
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ==================== ENUMS ====================

class SupplierCategory(str, Enum):
    BTC_SELLER = "BTC_SELLER"
    BTC_BUYER = "BTC_BUYER"
    USDT_SELLER = "USDT_SELLER"
    USDT_BUYER = "USDT_BUYER"
    ETH_SELLER = "ETH_SELLER"
    ETH_BUYER = "ETH_BUYER"
    MIXED = "MIXED"

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"

class DealStage(str, Enum):
    QUALIFICATION = "qualification"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class WalletAvailability(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    BLOCKED = "blocked"
    UNDER_REVIEW = "under_review"

class ForensicStatus(str, Enum):
    NOT_VERIFIED = "not_verified"
    PENDING = "pending"
    VERIFIED_CLEAN = "verified_clean"
    VERIFIED_FLAGGED = "verified_flagged"
    REJECTED = "rejected"

# ==================== WALLET MODELS ====================

class WalletInfo(BaseModel):
    """Wallet information for suppliers"""
    address: str = ""
    network: str = ""  # BTC, ETH, TRC20, ERC20, etc.
    description: str = ""
    availability: WalletAvailability = WalletAvailability.AVAILABLE
    forensic_status: ForensicStatus = ForensicStatus.NOT_VERIFIED
    forensic_report_url: Optional[str] = None
    forensic_verified_at: Optional[datetime] = None
    last_transaction_at: Optional[datetime] = None

# ==================== SUPPLIER MODELS ====================

class SupplierBase(BaseModel):
    """Base supplier model"""
    name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None  # Europe, Middle East, Brazil, etc.
    
    # Registration
    registered_on_kryptobox: bool = False
    kryptobox_user_id: Optional[str] = None
    
    # Crypto Info
    cryptocurrencies: List[str] = []  # ["BTC", "USDT_TRC20", "ETH"]
    category: SupplierCategory = SupplierCategory.MIXED
    
    # Pricing
    gross_discount: Optional[float] = None
    net_discount: Optional[float] = None
    min_volume: Optional[float] = None  # Minimum transaction volume
    max_volume: Optional[float] = None  # Maximum transaction volume
    preferred_currency: str = "EUR"  # EUR, USD, AED, BRL
    
    # Wallets
    handshake_wallet: Optional[WalletInfo] = None  # Carteira de aperto de mão
    transaction_wallet: Optional[WalletInfo] = None  # Carteira de transação
    additional_wallets: List[WalletInfo] = []
    
    # Delivery
    delivery_map: Optional[str] = None  # Description of delivery process/locations
    delivery_countries: List[str] = []
    delivery_time_hours: Optional[int] = None
    
    # Status
    is_active: bool = True
    is_verified: bool = False
    verification_date: Optional[datetime] = None
    notes: Optional[str] = None
    tags: List[str] = []

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    registered_on_kryptobox: Optional[bool] = None
    kryptobox_user_id: Optional[str] = None
    cryptocurrencies: Optional[List[str]] = None
    category: Optional[SupplierCategory] = None
    gross_discount: Optional[float] = None
    net_discount: Optional[float] = None
    min_volume: Optional[float] = None
    max_volume: Optional[float] = None
    preferred_currency: Optional[str] = None
    handshake_wallet: Optional[WalletInfo] = None
    transaction_wallet: Optional[WalletInfo] = None
    additional_wallets: Optional[List[WalletInfo]] = None
    delivery_map: Optional[str] = None
    delivery_countries: Optional[List[str]] = None
    delivery_time_hours: Optional[int] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class SupplierResponse(SupplierBase):
    id: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    total_transactions: int = 0
    total_volume: float = 0.0

# ==================== LEAD MODELS ====================

class LeadBase(BaseModel):
    """Base lead model"""
    name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    
    # Lead Info
    source: Optional[str] = None  # Website, Referral, Event, etc.
    status: LeadStatus = LeadStatus.NEW
    interest: Optional[str] = None  # What they're interested in
    
    # Crypto Interest
    interested_cryptos: List[str] = []
    estimated_volume: Optional[float] = None
    preferred_currency: str = "EUR"
    
    # Client Profile (for onboarding)
    membership_profile: str = "standard"  # broker, standard, premium, vip, institucional
    
    # Qualification
    is_qualified: bool = False
    qualification_score: int = 0  # 0-100
    
    # Assignment
    assigned_to: Optional[str] = None  # Staff user ID
    
    notes: Optional[str] = None
    tags: List[str] = []

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    source: Optional[str] = None
    status: Optional[LeadStatus] = None
    interest: Optional[str] = None
    interested_cryptos: Optional[List[str]] = None
    estimated_volume: Optional[float] = None
    preferred_currency: Optional[str] = None
    membership_profile: Optional[str] = None
    is_qualified: Optional[bool] = None
    qualification_score: Optional[int] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class LeadResponse(BaseModel):
    """Response model with flexible validation for leads"""
    model_config = {"extra": "ignore"}
    
    id: str
    name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = "new"
    interest: Optional[str] = None
    interested_cryptos: List[str] = []
    estimated_volume: Optional[float] = None
    preferred_currency: str = "EUR"
    membership_profile: Optional[str] = "standard"
    is_qualified: bool = False
    qualification_score: int = 0
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None
    converted_to_client: bool = False
    converted_at: Optional[datetime] = None
    risk_intelligence_data: Optional[dict] = None

# ==================== DEAL MODELS ====================

class DealBase(BaseModel):
    """Base deal model"""
    title: str
    description: Optional[str] = None
    
    # Related entities
    lead_id: Optional[str] = None
    supplier_id: Optional[str] = None
    client_id: Optional[str] = None
    contact_id: Optional[str] = None
    
    # Deal Info
    stage: DealStage = DealStage.QUALIFICATION
    amount: float = 0.0
    currency: str = "EUR"
    cryptocurrency: Optional[str] = None
    crypto_amount: Optional[float] = None
    
    # Probability & Timeline
    probability: int = 0  # 0-100
    expected_close_date: Optional[datetime] = None
    actual_close_date: Optional[datetime] = None
    
    # Assignment
    assigned_to: Optional[str] = None
    
    notes: Optional[str] = None
    tags: List[str] = []

class DealCreate(DealBase):
    pass

class DealUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None
    supplier_id: Optional[str] = None
    client_id: Optional[str] = None
    contact_id: Optional[str] = None
    stage: Optional[DealStage] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    cryptocurrency: Optional[str] = None
    crypto_amount: Optional[float] = None
    probability: Optional[int] = None
    expected_close_date: Optional[datetime] = None
    actual_close_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class DealResponse(DealBase):
    id: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    lead_name: Optional[str] = None
    supplier_name: Optional[str] = None
    client_name: Optional[str] = None

# ==================== CONTACT MODELS ====================

class ContactBase(BaseModel):
    """Base contact model"""
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    
    # Company
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    
    # Related entities
    supplier_id: Optional[str] = None
    client_id: Optional[str] = None
    lead_id: Optional[str] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    
    # Communication preferences
    preferred_contact_method: str = "email"  # email, phone, whatsapp
    whatsapp: Optional[str] = None
    telegram: Optional[str] = None
    
    is_primary: bool = False  # Primary contact for the company
    notes: Optional[str] = None
    tags: List[str] = []

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    supplier_id: Optional[str] = None
    client_id: Optional[str] = None
    lead_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    whatsapp: Optional[str] = None
    telegram: Optional[str] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class ContactResponse(ContactBase):
    id: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    full_name: str = ""

# ==================== TASK MODELS ====================

class TaskBase(BaseModel):
    """Base task model"""
    title: str
    description: Optional[str] = None
    
    # Related entities
    lead_id: Optional[str] = None
    supplier_id: Optional[str] = None
    client_id: Optional[str] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    
    # Task Info
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    task_type: str = "follow_up"  # follow_up, call, email, meeting, other
    
    # Timeline
    due_date: Optional[datetime] = None
    reminder_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Assignment
    assigned_to: Optional[str] = None
    
    notes: Optional[str] = None
    tags: List[str] = []

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None
    supplier_id: Optional[str] = None
    client_id: Optional[str] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    task_type: Optional[str] = None
    due_date: Optional[datetime] = None
    reminder_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class TaskResponse(TaskBase):
    id: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    is_overdue: bool = False

# ==================== TRANSACTION HISTORY ====================

class TransactionRecord(BaseModel):
    """Record of transactions with suppliers"""
    id: str
    supplier_id: str
    deal_id: Optional[str] = None
    
    # Transaction details
    transaction_type: str  # buy, sell
    cryptocurrency: str
    crypto_amount: float
    fiat_amount: float
    fiat_currency: str
    exchange_rate: float
    
    # Wallets used
    from_wallet: Optional[str] = None
    to_wallet: Optional[str] = None
    
    # Status
    status: str  # pending, completed, cancelled, failed
    
    # Timestamps
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    notes: Optional[str] = None

# ==================== CRM DASHBOARD ====================

class CRMDashboardStats(BaseModel):
    """CRM Dashboard statistics"""
    # Counts
    total_suppliers: int = 0
    active_suppliers: int = 0
    verified_suppliers: int = 0
    
    total_leads: int = 0
    new_leads: int = 0
    qualified_leads: int = 0
    
    total_deals: int = 0
    open_deals: int = 0
    won_deals: int = 0
    lost_deals: int = 0
    
    total_contacts: int = 0
    
    pending_tasks: int = 0
    overdue_tasks: int = 0
    
    # Values
    total_deal_value: float = 0.0
    won_deal_value: float = 0.0
    pipeline_value: float = 0.0
    
    # Recent activity
    leads_this_month: int = 0
    deals_this_month: int = 0
    transactions_this_month: int = 0
