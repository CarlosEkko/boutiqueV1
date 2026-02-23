from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from datetime import datetime, timezone
from typing import Optional, List
from models.kyc import (
    KYCVerification, KYBVerification, VerificationDocument,
    KYCStatus, KYCStep, KYBStep, DocumentType, DocumentStatus,
    VerificationType, Representative, CompanyType
)
from utils.auth import get_current_user_id
import uuid
import os
import aiofiles
from pathlib import Path

router = APIRouter(prefix="/kyc", tags=["KYC/KYB"])

# Database reference
db = None

# Upload directory
UPLOAD_DIR = Path("/app/uploads/kyc")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def set_db(database):
    global db
    db = database


# ==================== KYC VERIFICATION ====================

@router.get("/status")
async def get_kyc_status(user_id: str = Depends(get_current_user_id)):
    """Get current KYC/KYB status for user"""
    kyc = await db.kyc_verifications.find_one({"user_id": user_id}, {"_id": 0})
    kyb = await db.kyb_verifications.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "kyc": kyc,
        "kyb": kyb,
        "has_kyc": kyc is not None,
        "has_kyb": kyb is not None,
        "kyc_status": kyc.get("status") if kyc else "not_started",
        "kyb_status": kyb.get("status") if kyb else "not_started"
    }


@router.post("/start")
async def start_kyc(
    verification_type: VerificationType = VerificationType.KYC,
    user_id: str = Depends(get_current_user_id)
):
    """Start a new KYC or KYB verification"""
    if verification_type == VerificationType.KYC:
        existing = await db.kyc_verifications.find_one({"user_id": user_id})
        if existing:
            return {"message": "KYC verification already exists", "id": existing.get("id")}
        
        verification = KYCVerification(user_id=user_id)
        v_dict = verification.model_dump()
        v_dict["created_at"] = v_dict["created_at"].isoformat()
        v_dict["updated_at"] = v_dict["updated_at"].isoformat()
        await db.kyc_verifications.insert_one(v_dict)
        
        return {"message": "KYC verification started", "id": verification.id}
    else:
        existing = await db.kyb_verifications.find_one({"user_id": user_id})
        if existing:
            return {"message": "KYB verification already exists", "id": existing.get("id")}
        
        verification = KYBVerification(user_id=user_id)
        v_dict = verification.model_dump()
        v_dict["created_at"] = v_dict["created_at"].isoformat()
        v_dict["updated_at"] = v_dict["updated_at"].isoformat()
        await db.kyb_verifications.insert_one(v_dict)
        
        return {"message": "KYB verification started", "id": verification.id}


# ==================== KYC STEPS ====================

@router.post("/personal-info")
async def submit_personal_info(
    full_name: str = Form(...),
    date_of_birth: str = Form(...),
    nationality: str = Form(...),
    country_of_residence: str = Form(...),
    address: str = Form(...),
    city: str = Form(...),
    postal_code: str = Form(...),
    user_id: str = Depends(get_current_user_id)
):
    """Submit personal information for KYC"""
    kyc = await db.kyc_verifications.find_one({"user_id": user_id})
    if not kyc:
        raise HTTPException(status_code=404, detail="KYC verification not found. Start KYC first.")
    
    await db.kyc_verifications.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "full_name": full_name,
                "date_of_birth": date_of_birth,
                "nationality": nationality,
                "country_of_residence": country_of_residence,
                "address": address,
                "city": city,
                "postal_code": postal_code,
                "current_step": KYCStep.ID_DOCUMENT,
                "status": KYCStatus.IN_PROGRESS,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "next_step": "id_document"}


@router.post("/id-document")
async def submit_id_document(
    document_type: DocumentType = Form(...),
    document_number: str = Form(...),
    document_expiry: str = Form(...),
    document_country: str = Form(...),
    user_id: str = Depends(get_current_user_id)
):
    """Submit ID document information"""
    kyc = await db.kyc_verifications.find_one({"user_id": user_id})
    if not kyc:
        raise HTTPException(status_code=404, detail="KYC verification not found")
    
    await db.kyc_verifications.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "id_document_type": document_type,
                "id_document_number": document_number,
                "id_document_expiry": document_expiry,
                "id_document_country": document_country,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": "ID document info saved. Now upload the document."}


@router.post("/upload-document")
async def upload_document(
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """Upload a verification document"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4", "video/webm"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, PDF, MP4, WebM")
    
    # Validate file size (max 10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 10MB")
    
    # Check for KYC or KYB
    kyc = await db.kyc_verifications.find_one({"user_id": user_id})
    kyb = await db.kyb_verifications.find_one({"user_id": user_id})
    
    if not kyc and not kyb:
        raise HTTPException(status_code=404, detail="No verification found. Start KYC or KYB first.")
    
    verification_id = kyc.get("id") if kyc else kyb.get("id")
    verification_type = "kyc" if kyc else "kyb"
    
    # Save file
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    file_name = f"{user_id}_{document_type}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = UPLOAD_DIR / file_name
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(file_content)
    
    # Create document record
    doc = VerificationDocument(
        user_id=user_id,
        verification_id=verification_id,
        document_type=document_type,
        file_url=f"/uploads/kyc/{file_name}",
        file_name=file.filename,
        file_size=len(file_content),
        mime_type=file.content_type
    )
    
    doc_dict = doc.model_dump()
    doc_dict["uploaded_at"] = doc_dict["uploaded_at"].isoformat()
    await db.kyc_documents.insert_one(doc_dict)
    
    # Update verification with document reference
    if verification_type == "kyc":
        await db.kyc_verifications.update_one(
            {"user_id": user_id},
            {
                "$push": {"documents": doc.id},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Update step based on document type
        step_map = {
            DocumentType.PASSPORT: KYCStep.SELFIE,
            DocumentType.ID_CARD: KYCStep.SELFIE,
            DocumentType.DRIVERS_LICENSE: KYCStep.SELFIE,
            DocumentType.SELFIE_WITH_ID: KYCStep.LIVENESS,
            DocumentType.LIVENESS_VIDEO: KYCStep.PROOF_OF_ADDRESS,
            DocumentType.PROOF_OF_ADDRESS: KYCStep.COMPLETED
        }
        
        if document_type in step_map:
            new_step = step_map[document_type]
            update_data = {"current_step": new_step, "updated_at": datetime.now(timezone.utc).isoformat()}
            
            if new_step == KYCStep.COMPLETED:
                update_data["status"] = KYCStatus.PENDING_REVIEW
                update_data["submitted_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.kyc_verifications.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
    else:
        await db.kyb_verifications.update_one(
            {"user_id": user_id},
            {
                "$push": {"documents": doc.id},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    return {
        "success": True,
        "document_id": doc.id,
        "file_url": doc.file_url,
        "message": "Document uploaded successfully"
    }


@router.get("/documents")
async def get_my_documents(user_id: str = Depends(get_current_user_id)):
    """Get all documents for user's verification"""
    documents = await db.kyc_documents.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    return documents


@router.post("/submit")
async def submit_for_review(
    verification_type: VerificationType = VerificationType.KYC,
    user_id: str = Depends(get_current_user_id)
):
    """Submit verification for admin review"""
    if verification_type == VerificationType.KYC:
        kyc = await db.kyc_verifications.find_one({"user_id": user_id})
        if not kyc:
            raise HTTPException(status_code=404, detail="KYC verification not found")
        
        # Check required documents
        docs = await db.kyc_documents.find({"user_id": user_id}).to_list(100)
        doc_types = [d.get("document_type") for d in docs]
        
        required = [DocumentType.SELFIE_WITH_ID, DocumentType.PROOF_OF_ADDRESS]
        id_docs = [DocumentType.PASSPORT, DocumentType.ID_CARD, DocumentType.DRIVERS_LICENSE]
        
        has_id = any(dt in doc_types for dt in id_docs)
        has_required = all(dt in doc_types for dt in required)
        
        if not has_id or not has_required:
            missing = []
            if not has_id:
                missing.append("ID Document (Passport, ID Card, or Driver's License)")
            if DocumentType.SELFIE_WITH_ID not in doc_types:
                missing.append("Selfie with ID")
            if DocumentType.PROOF_OF_ADDRESS not in doc_types:
                missing.append("Proof of Address")
            
            raise HTTPException(
                status_code=400,
                detail=f"Missing required documents: {', '.join(missing)}"
            )
        
        await db.kyc_verifications.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "status": KYCStatus.PENDING_REVIEW,
                    "current_step": KYCStep.COMPLETED,
                    "submitted_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update user's kyc_status
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"kyc_status": "pending"}}
        )
        
        return {"success": True, "message": "KYC submitted for review"}
    else:
        kyb = await db.kyb_verifications.find_one({"user_id": user_id})
        if not kyb:
            raise HTTPException(status_code=404, detail="KYB verification not found")
        
        await db.kyb_verifications.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "status": KYCStatus.PENDING_REVIEW,
                    "current_step": KYBStep.COMPLETED,
                    "submitted_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"success": True, "message": "KYB submitted for review"}


# ==================== KYB STEPS ====================

@router.post("/company-info")
async def submit_company_info(
    company_name: str = Form(...),
    company_type: CompanyType = Form(...),
    registration_number: str = Form(...),
    tax_id: Optional[str] = Form(None),
    incorporation_date: str = Form(...),
    incorporation_country: str = Form(...),
    business_address: str = Form(...),
    business_city: str = Form(...),
    business_postal_code: str = Form(...),
    business_country: str = Form(...),
    business_email: str = Form(...),
    business_phone: Optional[str] = Form(None),
    website: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id)
):
    """Submit company information for KYB"""
    kyb = await db.kyb_verifications.find_one({"user_id": user_id})
    if not kyb:
        raise HTTPException(status_code=404, detail="KYB verification not found. Start KYB first.")
    
    await db.kyb_verifications.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "company_name": company_name,
                "company_type": company_type,
                "registration_number": registration_number,
                "tax_id": tax_id,
                "incorporation_date": incorporation_date,
                "incorporation_country": incorporation_country,
                "business_address": business_address,
                "business_city": business_city,
                "business_postal_code": business_postal_code,
                "business_country": business_country,
                "business_email": business_email,
                "business_phone": business_phone,
                "website": website,
                "current_step": KYBStep.COMPANY_DOCUMENTS,
                "status": KYCStatus.IN_PROGRESS,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "next_step": "company_documents"}


@router.post("/add-representative")
async def add_representative(
    full_name: str = Form(...),
    role: str = Form(...),
    date_of_birth: Optional[str] = Form(None),
    nationality: Optional[str] = Form(None),
    ownership_percentage: Optional[float] = Form(None),
    is_ubo: bool = Form(False),
    user_id: str = Depends(get_current_user_id)
):
    """Add a company representative (director, UBO, etc.)"""
    kyb = await db.kyb_verifications.find_one({"user_id": user_id})
    if not kyb:
        raise HTTPException(status_code=404, detail="KYB verification not found")
    
    rep = Representative(
        full_name=full_name,
        role=role,
        date_of_birth=date_of_birth,
        nationality=nationality,
        ownership_percentage=ownership_percentage,
        is_ubo=is_ubo
    )
    
    await db.kyb_verifications.update_one(
        {"user_id": user_id},
        {
            "$push": {"representatives": rep.model_dump()},
            "$set": {
                "current_step": KYBStep.REPRESENTATIVES,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "representative_id": rep.id}
