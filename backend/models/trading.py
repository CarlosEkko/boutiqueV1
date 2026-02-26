from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class OrderType(str, Enum):
    BUY = "buy"
    SELL = "sell"
    SWAP = "swap"


class OrderStatus(str, Enum):
    PENDING = "pending"
    AWAITING_PAYMENT = "awaiting_payment"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"
    AWAITING_ADMIN_APPROVAL = "awaiting_admin_approval"


class PaymentMethod(str, Enum):
    CARD = "card"  # Stripe
    BANK_TRANSFER = "bank_transfer"
    CRYPTO = "crypto"  # For sell/swap operations


class BankTransferStatus(str, Enum):
    PENDING = "pending"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


# ==================== TRADING FEES ====================

class CurrencyFees(BaseModel):
    """Fees for a specific currency"""
    model_config = ConfigDict(extra="ignore")
    
    # Buy fees (percentage)
    buy_fee_percent: float = 2.0
    buy_spread_percent: float = 1.0
    
    # Sell fees (percentage)
    sell_fee_percent: float = 2.0
    sell_spread_percent: float = 1.0
    
    # Swap fees
    swap_fee_percent: float = 1.5
    swap_spread_percent: float = 0.5
    
    # Minimum fees (in the currency)
    min_buy_fee: float = 5.0
    min_sell_fee: float = 5.0
    min_swap_fee: float = 3.0


class TradingFees(BaseModel):
    """Admin-configurable trading fees per currency"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Fees per currency
    fees_by_currency: dict = Field(default_factory=lambda: {
        "EUR": {
            "buy_fee_percent": 2.0,
            "buy_spread_percent": 1.0,
            "sell_fee_percent": 2.0,
            "sell_spread_percent": 1.0,
            "swap_fee_percent": 1.5,
            "swap_spread_percent": 0.5,
            "min_buy_fee": 5.0,
            "min_sell_fee": 5.0,
            "min_swap_fee": 3.0
        },
        "USD": {
            "buy_fee_percent": 2.0,
            "buy_spread_percent": 1.0,
            "sell_fee_percent": 2.0,
            "sell_spread_percent": 1.0,
            "swap_fee_percent": 1.5,
            "swap_spread_percent": 0.5,
            "min_buy_fee": 5.0,
            "min_sell_fee": 5.0,
            "min_swap_fee": 3.0
        },
        "AED": {
            "buy_fee_percent": 2.5,
            "buy_spread_percent": 1.0,
            "sell_fee_percent": 2.5,
            "sell_spread_percent": 1.0,
            "swap_fee_percent": 2.0,
            "swap_spread_percent": 0.5,
            "min_buy_fee": 20.0,
            "min_sell_fee": 20.0,
            "min_swap_fee": 15.0
        },
        "BRL": {
            "buy_fee_percent": 3.0,
            "buy_spread_percent": 1.5,
            "sell_fee_percent": 3.0,
            "sell_spread_percent": 1.5,
            "swap_fee_percent": 2.5,
            "swap_spread_percent": 1.0,
            "min_buy_fee": 30.0,
            "min_sell_fee": 30.0,
            "min_swap_fee": 20.0
        }
    })
    
    # Legacy fields for backward compatibility
    buy_fee_percent: float = 2.0
    buy_spread_percent: float = 1.0
    sell_fee_percent: float = 2.0
    sell_spread_percent: float = 1.0
    swap_fee_percent: float = 1.5
    swap_spread_percent: float = 0.5
    min_buy_fee_usd: float = 5.0
    min_sell_fee_usd: float = 5.0
    min_swap_fee_usd: float = 3.0
    
    # Network fees (configurable per network, in USD)
    network_fees: dict = Field(default_factory=lambda: {
        "bitcoin": 10.0,
        "ethereum": 5.0,
        "bsc": 0.5,
        "polygon": 0.1,
        "tron": 1.0,
        "solana": 0.1
    })
    
    updated_by: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CurrencyFeesUpdate(BaseModel):
    """Update fees for a specific currency"""
    buy_fee_percent: Optional[float] = None
    buy_spread_percent: Optional[float] = None
    sell_fee_percent: Optional[float] = None
    sell_spread_percent: Optional[float] = None
    swap_fee_percent: Optional[float] = None
    swap_spread_percent: Optional[float] = None
    min_buy_fee: Optional[float] = None
    min_sell_fee: Optional[float] = None
    min_swap_fee: Optional[float] = None


class TradingFeesUpdate(BaseModel):
    """Update trading fees"""
    buy_fee_percent: Optional[float] = None
    buy_spread_percent: Optional[float] = None
    sell_fee_percent: Optional[float] = None
    sell_spread_percent: Optional[float] = None
    swap_fee_percent: Optional[float] = None
    swap_spread_percent: Optional[float] = None
    min_buy_fee_usd: Optional[float] = None
    min_sell_fee_usd: Optional[float] = None
    min_swap_fee_usd: Optional[float] = None
    network_fees: Optional[dict] = None


# ==================== USER LIMITS ====================

class UserTradingLimits(BaseModel):
    """Admin-configurable user trading limits"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Limits per membership tier
    tier: str = "standard"  # standard, premium, vip
    
    # Daily limits (USD)
    daily_buy_limit: float = 5000.0
    daily_sell_limit: float = 5000.0
    daily_swap_limit: float = 10000.0
    
    # Monthly limits (USD)
    monthly_buy_limit: float = 50000.0
    monthly_sell_limit: float = 50000.0
    monthly_swap_limit: float = 100000.0
    
    # Per-transaction limits (USD)
    min_buy_amount: float = 50.0
    max_buy_amount: float = 10000.0
    min_sell_amount: float = 50.0
    max_sell_amount: float = 10000.0
    min_swap_amount: float = 20.0
    max_swap_amount: float = 20000.0
    
    updated_by: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserTradingLimitsUpdate(BaseModel):
    """Update user limits"""
    daily_buy_limit: Optional[float] = None
    daily_sell_limit: Optional[float] = None
    daily_swap_limit: Optional[float] = None
    monthly_buy_limit: Optional[float] = None
    monthly_sell_limit: Optional[float] = None
    monthly_swap_limit: Optional[float] = None
    min_buy_amount: Optional[float] = None
    max_buy_amount: Optional[float] = None
    min_sell_amount: Optional[float] = None
    max_sell_amount: Optional[float] = None
    min_swap_amount: Optional[float] = None
    max_swap_amount: Optional[float] = None


# ==================== SUPPORTED CRYPTOCURRENCIES ====================

class SupportedCrypto(BaseModel):
    """Supported cryptocurrency with networks"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str  # BTC, ETH, etc.
    name: str  # Bitcoin, Ethereum, etc.
    cmc_id: int  # CoinMarketCap ID
    
    # Supported networks for this crypto
    networks: List[str] = Field(default_factory=list)  # ["bitcoin", "lightning"], ["ethereum", "bsc", "polygon"]
    
    # Current price (cached from CoinMarketCap)
    price_usd: float = 0.0
    change_24h: float = 0.0
    market_cap: Optional[float] = None
    
    # Status
    is_active: bool = True
    can_buy: bool = True
    can_sell: bool = True
    can_swap: bool = True
    
    # Decimal places
    decimals: int = 8
    
    # Logo URL
    logo_url: Optional[str] = None
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== TRADING ORDERS ====================

class TradingOrder(BaseModel):
    """User trading order"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    
    # Order details
    order_type: OrderType
    status: OrderStatus = OrderStatus.PENDING
    
    # Crypto details
    crypto_symbol: str  # BTC, ETH, etc.
    crypto_name: str
    network: Optional[str] = None  # For withdrawals
    
    # For SWAP orders
    from_crypto: Optional[str] = None
    to_crypto: Optional[str] = None
    
    # Amounts
    crypto_amount: float  # Amount of crypto
    fiat_amount: float  # Amount in USD/EUR
    
    # Prices
    market_price: float  # Price at time of order
    execution_price: float  # Price with spread applied
    
    # Fees
    fee_percent: float
    fee_amount: float  # In fiat
    network_fee: float = 0.0  # In fiat
    total_amount: float  # Total charged/received
    
    # Payment
    payment_method: PaymentMethod
    stripe_session_id: Optional[str] = None
    bank_transfer_id: Optional[str] = None
    
    # Wallet address (for sell/withdrawals)
    wallet_address: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    
    # Admin actions
    approved_by: Optional[str] = None
    rejected_by: Optional[str] = None
    rejection_reason: Optional[str] = None


class CreateBuyOrder(BaseModel):
    """Create buy order request"""
    crypto_symbol: str
    fiat_amount: float  # Amount in USD to spend
    payment_method: PaymentMethod
    network: Optional[str] = None  # Preferred network for delivery


class CreateSellOrder(BaseModel):
    """Create sell order request"""
    crypto_symbol: str
    crypto_amount: float  # Amount of crypto to sell
    payment_method: PaymentMethod = PaymentMethod.BANK_TRANSFER
    bank_account_id: Optional[str] = None  # For bank transfer


class CreateSwapOrder(BaseModel):
    """Create swap order request"""
    from_crypto: str
    to_crypto: str
    from_amount: float


# ==================== BANK TRANSFERS ====================

class BankAccount(BaseModel):
    """User's saved bank account for withdrawals"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Account details
    account_holder: str
    iban: str
    bic_swift: Optional[str] = None
    bank_name: str
    bank_country: str
    
    # Verification
    is_verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    
    # Status
    is_active: bool = True
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BankTransfer(BaseModel):
    """Bank transfer for deposits or withdrawals"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    order_id: Optional[str] = None  # Related trading order
    
    # Transfer type
    transfer_type: str  # "deposit" or "withdrawal"
    
    # Amounts
    amount: float
    currency: str = "EUR"
    
    # Bank details (for deposits - user sends to these)
    recipient_iban: Optional[str] = None
    recipient_bank: Optional[str] = None
    reference_code: str  # Unique code to identify the transfer
    
    # User's bank (for withdrawals - we send to these)
    user_iban: Optional[str] = None
    user_bank: Optional[str] = None
    user_account_holder: Optional[str] = None
    
    # Status
    status: BankTransferStatus = BankTransferStatus.PENDING
    
    # Admin actions
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Proof of transfer (for deposits)
    proof_document_url: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class CreateBankTransferDeposit(BaseModel):
    """Create bank transfer deposit request"""
    amount: float
    currency: str = "EUR"


class SubmitBankTransferProof(BaseModel):
    """Submit proof of bank transfer"""
    transfer_id: str
    proof_document_url: str


class CreateBankAccount(BaseModel):
    """Create bank account for withdrawals"""
    account_holder: str
    iban: str
    bic_swift: Optional[str] = None
    bank_name: str
    bank_country: str


# ==================== PAYMENT TRANSACTIONS ====================

class PaymentTransaction(BaseModel):
    """Stripe payment transaction tracking"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    order_id: str  # Related trading order
    
    # Stripe details
    stripe_session_id: str
    stripe_payment_intent: Optional[str] = None
    
    # Amount
    amount: float
    currency: str = "usd"
    
    # Status
    status: str = "initiated"  # initiated, pending, completed, failed, expired
    payment_status: str = "unpaid"  # unpaid, paid, failed
    
    # Metadata
    metadata: dict = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
