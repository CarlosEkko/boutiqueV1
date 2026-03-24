"""
OTC Desk Models
Defines all data structures for the OTC trading desk module
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================

class OTCLeadSource(str, Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    EVENT = "event"
    BROKER = "broker"
    COLD_OUTREACH = "cold_outreach"
    EXISTING_CLIENT = "existing_client"
    OTHER = "other"


class OTCLeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    PRE_QUALIFIED = "pre_qualified"
    NOT_QUALIFIED = "not_qualified"
    KYC_PENDING = "kyc_pending"
    KYC_APPROVED = "kyc_approved"
    KYC_REJECTED = "kyc_rejected"
    SETUP_PENDING = "setup_pending"
    ACTIVE_CLIENT = "active_client"
    LOST = "lost"


class TransactionType(str, Enum):
    BUY = "buy"
    SELL = "sell"
    SWAP = "swap"


class SettlementMethod(str, Enum):
    SEPA = "sepa"
    SWIFT = "swift"
    PIX = "pix"
    FASTER_PAYMENTS = "faster_payments"
    USDT_ONCHAIN = "usdt_onchain"
    USDC_ONCHAIN = "usdc_onchain"
    CRYPTO_ONCHAIN = "crypto_onchain"
    INTERNAL = "internal"


class TradingFrequency(str, Enum):
    ONE_SHOT = "one_shot"
    WEEKLY = "weekly"
    DAILY = "daily"
    MULTIPLE_DAILY = "multiple_daily"


class OTCDealStage(str, Enum):
    # Pipeline stages
    LEAD = "lead"
    PRE_QUALIFICATION = "pre_qualification"
    KYC_KYB = "kyc_kyb"
    APPROVAL = "approval"
    RFQ = "rfq"
    QUOTE = "quote"
    ACCEPTANCE = "acceptance"
    EXECUTION = "execution"
    SETTLEMENT = "settlement"
    INVOICE = "invoice"
    POST_SALE = "post_sale"
    # Terminal stages
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class QuoteStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ExecutionStatus(str, Enum):
    PENDING_FUNDS = "pending_funds"
    FUNDS_RECEIVED = "funds_received"
    EXECUTING = "executing"
    EXECUTED = "executed"
    FAILED = "failed"


class SettlementStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    CANCELLED = "cancelled"


class FundingType(str, Enum):
    PREFUNDED = "prefunded"
    POST_FUNDED = "post_funded"


# ==================== MODELS ====================

class OTCLead(BaseModel):
    """OTC Lead - potential OTC client"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Basic Info
    entity_name: str  # Company or person name
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    country: str
    jurisdiction: Optional[str] = None
    
    # Lead Details
    source: OTCLeadSource = OTCLeadSource.WEBSITE
    source_detail: Optional[str] = None  # e.g., broker name, event name
    status: OTCLeadStatus = OTCLeadStatus.NEW
    
    # OTC Specifics
    estimated_volume_usd: float = 0
    target_asset: Optional[str] = None  # BTC, ETH, USDT, etc.
    transaction_type: TransactionType = TransactionType.BUY
    preferred_settlement: Optional[SettlementMethod] = None
    trading_frequency: Optional[TradingFrequency] = None
    
    # Pre-qualification
    volume_per_operation: Optional[float] = None
    current_exchange: Optional[str] = None
    problem_to_solve: Optional[str] = None
    timeframe: Optional[str] = None
    
    # Assignment
    assigned_to: Optional[str] = None  # User ID
    
    # Notes & History
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    converted_to_client_id: Optional[str] = None
    

class OTCClient(BaseModel):
    """OTC Client - approved client with setup complete"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Link to user/lead
    user_id: Optional[str] = None  # Link to main users collection
    lead_id: Optional[str] = None  # Original lead
    
    # Client Info
    entity_name: str
    entity_type: str = "individual"  # individual, company
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    country: str
    
    # OTC Setup
    account_manager_id: Optional[str] = None
    daily_limit_usd: float = 100000
    monthly_limit_usd: float = 1000000
    default_settlement_method: SettlementMethod = SettlementMethod.SEPA
    funding_type: FundingType = FundingType.PREFUNDED
    
    # Fireblocks
    fireblocks_vault_id: Optional[str] = None
    wallet_addresses: List[dict] = []  # [{asset, address, network}]
    
    # Bank Details
    bank_details: Optional[dict] = None  # {bank_name, iban, swift, etc.}
    
    # Communication
    telegram_group: Optional[str] = None
    preferred_contact: str = "email"  # email, telegram, phone
    
    # Status
    is_active: bool = True
    kyc_status: str = "approved"
    risk_level: str = "medium"  # low, medium, high
    
    # Stats
    total_volume_usd: float = 0
    total_trades: int = 0
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OTCDeal(BaseModel):
    """OTC Deal - a single OTC transaction through the pipeline"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_number: Optional[str] = None  # e.g., OTC-2026-0001
    
    # Client
    client_id: str
    client_name: Optional[str] = None
    
    # Deal Details
    stage: OTCDealStage = OTCDealStage.RFQ
    transaction_type: TransactionType = TransactionType.BUY
    
    # Assets
    base_asset: str  # What client wants (e.g., BTC)
    quote_asset: str  # What client pays with (e.g., EUR)
    amount: float  # Amount of base_asset
    
    # Pricing (filled during quote)
    market_price: Optional[float] = None
    spread_percent: Optional[float] = None
    final_price: Optional[float] = None
    total_value: Optional[float] = None  # amount * final_price
    fees: Optional[float] = None
    
    # Settlement
    settlement_method: Optional[SettlementMethod] = None
    funding_type: FundingType = FundingType.PREFUNDED
    
    # Assignment
    assigned_operator_id: Optional[str] = None
    
    # Timeline
    rfq_received_at: Optional[str] = None
    quote_sent_at: Optional[str] = None
    quote_expires_at: Optional[str] = None
    accepted_at: Optional[str] = None
    executed_at: Optional[str] = None
    settled_at: Optional[str] = None
    
    # References
    quote_id: Optional[str] = None
    execution_id: Optional[str] = None
    settlement_id: Optional[str] = None
    invoice_id: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OTCQuote(BaseModel):
    """Quote for an OTC deal"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_id: str
    
    # Quote Details
    base_asset: str
    quote_asset: str
    amount: float
    
    # Pricing
    market_price: float
    spread_percent: float
    final_price: float
    total_value: float
    fees: float = 0
    
    # Quote Type
    is_manual: bool = False  # True if manually set, False if semi-automatic
    price_source: Optional[str] = None  # e.g., "binance", "manual"
    
    # Validity
    valid_for_minutes: int = 5
    expires_at: str
    
    # Status
    status: QuoteStatus = QuoteStatus.PENDING
    
    # Response
    client_response: Optional[str] = None
    response_at: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: Optional[str] = None


class OTCExecution(BaseModel):
    """Execution record for an OTC deal"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_id: str
    quote_id: str
    
    # Execution Details
    status: ExecutionStatus = ExecutionStatus.PENDING_FUNDS
    funding_type: FundingType
    
    # Funds Tracking
    funds_expected: float
    funds_expected_asset: str
    funds_received: float = 0
    funds_received_at: Optional[str] = None
    funds_tx_hash: Optional[str] = None
    
    # Execution
    executed_amount: float = 0
    executed_price: float = 0
    execution_venue: Optional[str] = None  # e.g., "internal", "binance"
    
    # Delivery
    delivery_amount: float = 0
    delivery_asset: str = ""
    delivery_address: Optional[str] = None
    delivery_tx_hash: Optional[str] = None
    delivery_at: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    executed_by: Optional[str] = None


class OTCSettlement(BaseModel):
    """Settlement record for an OTC deal"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_id: str
    execution_id: str
    
    # Settlement Details
    status: SettlementStatus = SettlementStatus.PENDING
    method: SettlementMethod
    
    # Fiat Settlement
    fiat_amount: Optional[float] = None
    fiat_currency: Optional[str] = None
    bank_reference: Optional[str] = None
    
    # Crypto Settlement
    crypto_amount: Optional[float] = None
    crypto_asset: Optional[str] = None
    tx_hash: Optional[str] = None
    network: Optional[str] = None
    
    # Confirmation
    confirmed_at: Optional[str] = None
    confirmed_by: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OTCInvoice(BaseModel):
    """Invoice for an OTC deal"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    deal_id: str
    client_id: str
    
    # Invoice Details
    client_name: str
    client_address: Optional[str] = None
    
    # Line Items
    base_asset: str
    quote_asset: str
    amount: float
    price: float
    subtotal: float
    fees: float = 0
    total: float
    
    # Status
    status: InvoiceStatus = InvoiceStatus.DRAFT
    sent_at: Optional[str] = None
    paid_at: Optional[str] = None
    payment_reference: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # PDF
    pdf_url: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    due_date: Optional[str] = None
    created_by: Optional[str] = None


# ==================== REQUEST/RESPONSE MODELS ====================

class CreateOTCLeadRequest(BaseModel):
    entity_name: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    country: str
    jurisdiction: Optional[str] = None
    source: OTCLeadSource = OTCLeadSource.WEBSITE
    source_detail: Optional[str] = None
    estimated_volume_usd: float = 0
    target_asset: Optional[str] = None
    transaction_type: TransactionType = TransactionType.BUY
    preferred_settlement: Optional[SettlementMethod] = None
    trading_frequency: Optional[TradingFrequency] = None
    notes: Optional[str] = None


class UpdateOTCLeadRequest(BaseModel):
    entity_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    country: Optional[str] = None
    status: Optional[OTCLeadStatus] = None
    estimated_volume_usd: Optional[float] = None
    target_asset: Optional[str] = None
    transaction_type: Optional[TransactionType] = None
    preferred_settlement: Optional[SettlementMethod] = None
    trading_frequency: Optional[TradingFrequency] = None
    volume_per_operation: Optional[float] = None
    current_exchange: Optional[str] = None
    problem_to_solve: Optional[str] = None
    timeframe: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class CreateOTCDealRequest(BaseModel):
    client_id: str
    transaction_type: TransactionType
    base_asset: str
    quote_asset: str
    amount: float
    settlement_method: Optional[SettlementMethod] = None
    notes: Optional[str] = None


class CreateQuoteRequest(BaseModel):
    deal_id: str
    market_price: Optional[float] = None  # If None, will fetch automatically
    spread_percent: float = 1.0
    fees: float = 0
    valid_for_minutes: int = 5
    is_manual: bool = False
