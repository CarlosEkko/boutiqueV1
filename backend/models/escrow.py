"""
OTC Escrow Models for KBEX Exchange
Defines data structures for the professional escrow module
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================

class EscrowDealType(str, Enum):
    BLOCK_TRADE = "block_trade"
    STABLECOIN_SWAP = "stablecoin_swap"
    CROSS_CHAIN = "cross_chain"
    CRYPTO_FIAT = "crypto_fiat"
    CRYPTO_CRYPTO = "crypto_crypto"


class EscrowStatus(str, Enum):
    DRAFT = "draft"
    AWAITING_DEPOSIT = "awaiting_deposit"
    FUNDED = "funded"
    IN_VERIFICATION = "in_verification"
    READY_FOR_SETTLEMENT = "ready_for_settlement"
    SETTLED = "settled"
    CLOSED = "closed"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class EscrowStructure(str, Enum):
    ONE_SIDED = "one_sided"
    TWO_SIDED = "two_sided"


class FeePayerType(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"
    SPLIT = "split"


class SettlementType(str, Enum):
    CRYPTO_CRYPTO = "crypto_crypto"
    STABLECOIN_CRYPTO = "stablecoin_crypto"
    CROSS_CHAIN = "cross_chain"
    CRYPTO_FIAT = "crypto_fiat"


class ComplianceCheckStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUIRES_REVIEW = "requires_review"


class DisputeStatus(str, Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    EVIDENCE_REQUIRED = "evidence_required"
    RESOLVED_BUYER = "resolved_buyer"
    RESOLVED_SELLER = "resolved_seller"
    RESOLVED_SPLIT = "resolved_split"
    CLOSED = "closed"


# ==================== STATUS FLOW ====================

ESCROW_STATUS_TRANSITIONS = {
    EscrowStatus.DRAFT: [EscrowStatus.AWAITING_DEPOSIT, EscrowStatus.CANCELLED],
    EscrowStatus.AWAITING_DEPOSIT: [EscrowStatus.FUNDED, EscrowStatus.CANCELLED, EscrowStatus.EXPIRED],
    EscrowStatus.FUNDED: [EscrowStatus.IN_VERIFICATION, EscrowStatus.DISPUTED, EscrowStatus.CANCELLED],
    EscrowStatus.IN_VERIFICATION: [EscrowStatus.READY_FOR_SETTLEMENT, EscrowStatus.DISPUTED, EscrowStatus.CANCELLED],
    EscrowStatus.READY_FOR_SETTLEMENT: [EscrowStatus.SETTLED, EscrowStatus.DISPUTED],
    EscrowStatus.SETTLED: [EscrowStatus.CLOSED],
    EscrowStatus.DISPUTED: [EscrowStatus.READY_FOR_SETTLEMENT, EscrowStatus.CANCELLED, EscrowStatus.CLOSED],
    EscrowStatus.CANCELLED: [],
    EscrowStatus.CLOSED: [],
    EscrowStatus.EXPIRED: [],
}


# ==================== FEE ENGINE ====================

DEFAULT_FEE_SCHEDULES = {
    "standard": {"rate": 0.005, "min_fee": 50.0},       # 0.5%, min $50
    "premium": {"rate": 0.003, "min_fee": 100.0},        # 0.3%, min $100
    "institutional": {"rate": 0.001, "min_fee": 250.0},  # 0.1%, min $250
    "custom": {"rate": 0.0, "min_fee": 0.0},
}

# Volume-based progressive tiers (applied over DEFAULT_FEE_SCHEDULES)
VOLUME_TIERS = [
    {"min": 0,         "max": 100_000,    "discount": 0.0},
    {"min": 100_000,   "max": 500_000,    "discount": 0.10},   # 10% discount
    {"min": 500_000,   "max": 1_000_000,  "discount": 0.20},   # 20% discount
    {"min": 1_000_000, "max": 5_000_000,  "discount": 0.30},   # 30% discount
    {"min": 5_000_000, "max": float("inf"), "discount": 0.40}, # 40% discount
]


def get_volume_discount(ticket_size: float) -> float:
    """Get volume discount factor for a given ticket size."""
    for tier in VOLUME_TIERS:
        if tier["min"] <= ticket_size < tier["max"]:
            return tier["discount"]
    return 0.0


def calculate_fee(ticket_size: float, schedule: str = "standard", custom_rate: float = None, custom_min: float = None, apply_volume_discount: bool = True) -> dict:
    """Calculate escrow fee based on ticket size, fee schedule and volume tiers."""
    if schedule == "custom" and custom_rate is not None:
        rate = custom_rate
        min_fee = custom_min or 0.0
    else:
        config = DEFAULT_FEE_SCHEDULES.get(schedule, DEFAULT_FEE_SCHEDULES["standard"])
        rate = config["rate"]
        min_fee = config["min_fee"]

    calculated = ticket_size * rate
    discount = 0.0
    discount_pct = 0.0

    if apply_volume_discount and schedule != "custom":
        discount_pct = get_volume_discount(ticket_size)
        discount = round(calculated * discount_pct, 2)

    total = max(calculated - discount, min_fee)
    return {
        "fee_total": round(total, 2),
        "fee_rate": rate,
        "fee_min": min_fee,
        "calculated_fee": round(calculated, 2),
        "volume_discount_pct": discount_pct,
        "volume_discount": discount,
    }


def split_fee(total_fee: float, payer: str) -> dict:
    """Split fee between buyer and seller."""
    if payer == FeePayerType.BUYER:
        return {"fee_buyer": round(total_fee, 2), "fee_seller": 0.0}
    elif payer == FeePayerType.SELLER:
        return {"fee_buyer": 0.0, "fee_seller": round(total_fee, 2)}
    else:
        half = round(total_fee / 2, 2)
        return {"fee_buyer": half, "fee_seller": round(total_fee - half, 2)}


# ==================== PYDANTIC MODELS ====================

class TimelineEntry(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str
    action: str
    performed_by: Optional[str] = None
    notes: Optional[str] = None


class PartyInfo(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    client_id: Optional[str] = None
    kyc_status: str = "pending"
    wallet_address: Optional[str] = None


class DisputeEvidence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    uploaded_by: str
    file_name: str
    file_url: Optional[str] = None
    description: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DisputeInfo(BaseModel):
    status: str = DisputeStatus.OPEN
    reason: Optional[str] = None
    opened_by: Optional[str] = None
    opened_at: Optional[datetime] = None
    evidence: List[DisputeEvidence] = []
    resolution: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    messages: List[Dict[str, Any]] = []


class ComplianceInfo(BaseModel):
    buyer_kyc: str = ComplianceCheckStatus.PENDING
    seller_kyc: str = ComplianceCheckStatus.PENDING
    aml_check: str = ComplianceCheckStatus.PENDING
    source_of_funds: str = ComplianceCheckStatus.PENDING
    risk_score: Optional[float] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None


# ==================== CREATE / UPDATE MODELS ====================

class CreateEscrowDeal(BaseModel):
    deal_type: str = EscrowDealType.CRYPTO_CRYPTO
    otc_deal_id: Optional[str] = None
    structure: str = EscrowStructure.TWO_SIDED
    asset_a: str
    asset_b: str
    quantity_a: float
    quantity_b: float
    agreed_price: float
    settlement_deadline_hours: int = 24
    fee_schedule: str = "standard"
    fee_payer: str = FeePayerType.SPLIT
    custom_fee_rate: Optional[float] = None
    custom_fee_min: Optional[float] = None
    buyer: Dict[str, Any]
    seller: Dict[str, Any]
    settlement_type: str = SettlementType.CRYPTO_CRYPTO
    notes: Optional[str] = None


class UpdateEscrowDeal(BaseModel):
    notes: Optional[str] = None
    settlement_deadline_hours: Optional[int] = None
    fee_schedule: Optional[str] = None
    fee_payer: Optional[str] = None
    custom_fee_rate: Optional[float] = None
    custom_fee_min: Optional[float] = None
    buyer: Optional[Dict[str, Any]] = None
    seller: Optional[Dict[str, Any]] = None


class AdvanceEscrowStatus(BaseModel):
    new_status: str
    notes: Optional[str] = None
    override: bool = False


class OpenDispute(BaseModel):
    reason: str
    evidence_description: Optional[str] = None


class ResolveDispute(BaseModel):
    resolution: str
    winner: Optional[str] = None
    notes: Optional[str] = None


# ==================== PHASE 2 MODELS ====================

class DepositRequest(BaseModel):
    party: str  # "buyer" or "seller"
    amount: float
    asset: str
    tx_hash: Optional[str] = None
    source_address: Optional[str] = None
    notes: Optional[str] = None


class ConfirmDeposit(BaseModel):
    deposit_id: str
    confirmed: bool = True
    notes: Optional[str] = None


class SettleRequest(BaseModel):
    notes: Optional[str] = None
    buyer_destination: Optional[str] = None
    seller_destination: Optional[str] = None


class WhitelistAddress(BaseModel):
    address: str
    label: str
    asset: str
    party: str  # "buyer" or "seller"


def calculate_risk_score(deal: dict) -> float:
    """Calculate risk score for a deal based on multiple factors."""
    score = 50.0  # baseline
    ticket = deal.get("ticket_size", 0)

    # Ticket size risk
    if ticket > 5_000_000:
        score += 30
    elif ticket > 1_000_000:
        score += 20
    elif ticket > 500_000:
        score += 10

    # Compliance risk
    compliance = deal.get("compliance", {})
    for field in ["buyer_kyc", "seller_kyc", "aml_check", "source_of_funds"]:
        status = compliance.get(field, "pending")
        if status == "rejected":
            score += 15
        elif status == "pending":
            score += 5
        elif status == "approved":
            score -= 5

    # Structure risk
    if deal.get("structure") == "one_sided":
        score += 10

    # Cross-chain risk
    if deal.get("settlement_type") == "cross_chain":
        score += 10

    return max(0, min(100, round(score, 1)))
