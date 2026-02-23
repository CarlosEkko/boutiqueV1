from pydantic import BaseModel, Field
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
    STANDARD = "standard"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class InvestmentStatus(str, Enum):
    OPEN = "open"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    INVESTMENT = "investment"
    RETURN = "return"
    FEE = "fee"


class InvestmentOpportunity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    type: str = "lending"  # lending, staking, etc.
    expected_roi: float  # percentage
    duration_days: int
    min_investment: float
    max_investment: float
    risk_level: str  # low, medium, high
    status: InvestmentStatus = InvestmentStatus.OPEN
    total_pool: float
    current_pool: float = 0
    currency: str = "USDT"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class UserInvestment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    opportunity_id: str
    amount: float
    currency: str = "USDT"
    status: InvestmentStatus = InvestmentStatus.ACTIVE
    expected_return: float
    actual_return: Optional[float] = None
    invested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    maturity_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: TransactionType
    amount: float
    currency: str
    status: str = "completed"  # pending, completed, failed
    description: Optional[str] = None
    reference_id: Optional[str] = None  # investment_id, fireblocks_tx_id, etc.
    tx_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Wallet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    asset_id: str  # BTC, ETH, USDT, etc.
    asset_name: str
    address: str
    balance: float = 0
    available_balance: float = 0
    pending_balance: float = 0
    fireblocks_vault_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransparencyReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    type: str  # audit, proof_of_reserves, financial_report
    file_url: Optional[str] = None
    summary: str
    auditor: Optional[str] = None
    report_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PublicWallet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_id: str
    asset_name: str
    address: str
    balance: float
    label: str  # "Hot Wallet", "Cold Storage", etc.
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
