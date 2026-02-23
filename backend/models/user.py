from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
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


class UserBase(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    country: Optional[str] = None


class UserCreate(UserBase):
    password: str
    invite_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None


class UserInDB(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    # Membership fields
    is_approved: bool = False
    is_admin: bool = False  # Admin flag
    kyc_status: KYCStatus = KYCStatus.NOT_STARTED
    membership_level: MembershipLevel = MembershipLevel.STANDARD
    invite_code_used: Optional[str] = None
    invited_by: Optional[str] = None
    fireblocks_vault_id: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    is_approved: bool
    is_admin: bool = False
    kyc_status: KYCStatus
    membership_level: MembershipLevel


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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
