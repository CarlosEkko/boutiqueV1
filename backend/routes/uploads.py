from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from fastapi.responses import FileResponse
from datetime import datetime, timezone
from typing import Optional, List
from pathlib import Path
import uuid
import os
import aiofiles
import mimetypes

from utils.auth import get_current_user_id

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# Database reference
db = None

# Base upload directory
BASE_UPLOAD_DIR = Path("/app/uploads")
BASE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Subdirectories for different upload types
UPLOAD_DIRS = {
    "kyc": BASE_UPLOAD_DIR / "kyc",
    "deposits": BASE_UPLOAD_DIR / "deposits",
    "withdrawals": BASE_UPLOAD_DIR / "withdrawals",
    "documents": BASE_UPLOAD_DIR / "documents",
    "general": BASE_UPLOAD_DIR / "general"
}

# Create all directories
for dir_path in UPLOAD_DIRS.values():
    dir_path.mkdir(parents=True, exist_ok=True)

# Allowed file types
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def set_db(database):
    global db
    db = database


def get_file_extension(content_type: str, filename: str) -> str:
    """Get file extension from content type or filename"""
    # Try to get from filename first
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    
    # Fallback to content type
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "application/pdf": "pdf"
    }
    return ext_map.get(content_type, "bin")


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    category: str = Form(default="general"),
    description: Optional[str] = Form(default=None),
    user_id: str = Depends(get_current_user_id)
):
    """
    Upload a file to the server.
    
    Categories: kyc, deposits, withdrawals, documents, general
    """
    # Validate category
    if category not in UPLOAD_DIRS:
        category = "general"
    
    # Validate file type
    content_type = file.content_type or "application/octet-stream"
    allowed_types = ALLOWED_IMAGE_TYPES | ALLOWED_DOCUMENT_TYPES
    
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique filename
    file_ext = get_file_extension(content_type, file.filename)
    file_id = uuid.uuid4().hex[:12]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    new_filename = f"{timestamp}_{user_id[:8]}_{file_id}.{file_ext}"
    
    # Save file
    upload_dir = UPLOAD_DIRS[category]
    file_path = upload_dir / new_filename
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    # Create file record in database
    file_record = {
        "id": file_id,
        "user_id": user_id,
        "category": category,
        "original_filename": file.filename,
        "stored_filename": new_filename,
        "content_type": content_type,
        "size_bytes": len(content),
        "description": description,
        "url": f"/api/uploads/file/{category}/{new_filename}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.uploaded_files.insert_one(file_record)
    
    return {
        "success": True,
        "file_id": file_id,
        "url": file_record["url"],
        "filename": new_filename,
        "size": len(content),
        "content_type": content_type
    }


@router.get("/file/{category}/{filename}")
async def get_file(category: str, filename: str):
    """Serve an uploaded file"""
    if category not in UPLOAD_DIRS:
        raise HTTPException(status_code=404, detail="Category not found")
    
    file_path = UPLOAD_DIRS[category] / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check - ensure the path is within the upload directory
    try:
        file_path.resolve().relative_to(UPLOAD_DIRS[category].resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get content type
    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        content_type = "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        media_type=content_type,
        filename=filename
    )


@router.get("/my-files")
async def get_my_files(
    category: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get list of files uploaded by the current user"""
    query = {"user_id": user_id}
    if category:
        query["category"] = category
    
    files = await db.uploaded_files.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return files


@router.delete("/file/{file_id}")
async def delete_file(
    file_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete an uploaded file"""
    file_record = await db.uploaded_files.find_one({
        "id": file_id,
        "user_id": user_id
    })
    
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    category = file_record.get("category", "general")
    filename = file_record.get("stored_filename")
    
    if category in UPLOAD_DIRS and filename:
        file_path = UPLOAD_DIRS[category] / filename
        if file_path.exists():
            os.remove(file_path)
    
    # Delete database record
    await db.uploaded_files.delete_one({"id": file_id})
    
    return {"success": True, "message": "File deleted"}


# ==================== DEPOSIT PROOF UPLOAD ====================

@router.post("/deposit-proof/{deposit_id}")
async def upload_deposit_proof(
    deposit_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """Upload proof of deposit (bank transfer receipt)"""
    # Verify the deposit belongs to the user
    deposit = await db.bank_transfers.find_one({
        "id": deposit_id,
        "user_id": user_id,
        "transfer_type": "deposit"
    })
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if deposit.get("status") not in ["pending"]:
        raise HTTPException(status_code=400, detail="Proof already submitted or deposit processed")
    
    # Upload the file
    content_type = file.content_type or "application/octet-stream"
    
    if content_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File type not allowed. Please upload PDF, JPEG, or PNG."
        )
    
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate filename
    file_ext = get_file_extension(content_type, file.filename)
    new_filename = f"deposit_{deposit_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    
    # Save file
    upload_dir = UPLOAD_DIRS["deposits"]
    file_path = upload_dir / new_filename
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    file_url = f"/api/uploads/file/deposits/{new_filename}"
    
    # Update deposit record
    now = datetime.now(timezone.utc).isoformat()
    
    await db.bank_transfers.update_one(
        {"id": deposit_id},
        {
            "$set": {
                "proof_document_url": file_url,
                "proof_filename": new_filename,
                "status": "awaiting_approval",
                "updated_at": now
            }
        }
    )
    
    # Save file record
    file_record = {
        "id": uuid.uuid4().hex[:12],
        "user_id": user_id,
        "category": "deposits",
        "related_id": deposit_id,
        "original_filename": file.filename,
        "stored_filename": new_filename,
        "content_type": content_type,
        "size_bytes": len(content),
        "url": file_url,
        "created_at": now
    }
    
    await db.uploaded_files.insert_one(file_record)
    
    return {
        "success": True,
        "message": "Proof uploaded successfully. Awaiting admin approval.",
        "url": file_url
    }
