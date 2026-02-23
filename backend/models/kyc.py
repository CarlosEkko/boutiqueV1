from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class VerificationType(str, Enum):
    KYC = "kyc"  # Individual
    KYB = "kyb"  # Business


class DocumentType(str, Enum):
    # KYC Documents
    PASSPORT = "passport"
    ID_CARD = "id_card"
    DRIVERS_LICENSE = "drivers_license"
    SELFIE_WITH_ID = "selfie_with_id"
    LIVENESS_VIDEO = "liveness_video"
    PROOF_OF_ADDRESS = "proof_of_address"
    
    # KYB Documents
    CERTIFICATE_OF_INCORPORATION = "certificate_of_incorporation"
    ARTICLES_OF_ASSOCIATION = "articles_of_association"
    SHAREHOLDER_REGISTER = "shareholder_register"
    DIRECTOR_ID = "director_id"
    UBO_ID = "ubo_id"  # Ultimate Beneficial Owner
    BUSINESS_ADDRESS_PROOF = "business_address_proof"
    TAX_REGISTRATION = "tax_registration"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class KYCStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class KYCStep(str, Enum):
    PERSONAL_INFO = "personal_info"
    ID_DOCUMENT = "id_document"
    SELFIE = "selfie"
    LIVENESS = "liveness"
    PROOF_OF_ADDRESS = "proof_of_address"
    COMPLETED = "completed"


class KYBStep(str, Enum):
    COMPANY_INFO = "company_info"
    COMPANY_DOCUMENTS = "company_documents"
    REPRESENTATIVES = "representatives"
    ADDRESS_PROOF = "address_proof"
    COMPLETED = "completed"


class VerificationDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    verification_id: str
    document_type: DocumentType
    file_url: str
    file_name: str
    file_size: int  # in bytes
    mime_type: str
    status: DocumentStatus = DocumentStatus.PENDING
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None


class KYCVerification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    verification_type: VerificationType = VerificationType.KYC
    status: KYCStatus = KYCStatus.NOT_STARTED
    current_step: KYCStep = KYCStep.PERSONAL_INFO
    
    # Personal Info
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    country_of_residence: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    
    # ID Document Info
    id_document_type: Optional[DocumentType] = None
    id_document_number: Optional[str] = None
    id_document_expiry: Optional[str] = None
    id_document_country: Optional[str] = None
    
    # Documents (references to VerificationDocument)
    documents: List[str] = []  # List of document IDs
    
    # Review Info
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class CompanyType(str, Enum):
    LLC = "llc"
    CORPORATION = "corporation"
    PARTNERSHIP = "partnership"
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    NON_PROFIT = "non_profit"
    OTHER = "other"


class Representative(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    role: str  # Director, CEO, UBO, etc.
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    ownership_percentage: Optional[float] = None  # For UBOs
    id_document_id: Optional[str] = None  # Reference to uploaded document
    is_ubo: bool = False  # Ultimate Beneficial Owner (>25% ownership)


class KYBVerification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    verification_type: VerificationType = VerificationType.KYB
    status: KYCStatus = KYCStatus.NOT_STARTED
    current_step: KYBStep = KYBStep.COMPANY_INFO
    
    # Company Info
    company_name: Optional[str] = None
    company_type: Optional[CompanyType] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    incorporation_date: Optional[str] = None
    incorporation_country: Optional[str] = None
    
    # Business Address
    business_address: Optional[str] = None
    business_city: Optional[str] = None
    business_postal_code: Optional[str] = None
    business_country: Optional[str] = None
    
    # Contact
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    website: Optional[str] = None
    
    # Representatives
    representatives: List[Representative] = []
    
    # Documents (references to VerificationDocument)
    documents: List[str] = []
    
    # Review Info
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
