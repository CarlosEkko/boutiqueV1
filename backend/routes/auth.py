from fastapi import APIRouter, HTTPException, status, Depends, Request, Header
from datetime import datetime, timezone
from typing import Optional
from models.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate, UserInDB, KYCStatus, MembershipLevel, UserType, Region
from utils.auth import get_password_hash, verify_password, create_access_token, get_current_user_id
from utils.i18n import t, I18n
from utils.turnstile import verify_turnstile
from utils.rate_limit import check_rate_limit
from utils.security_logger import log_security_event
from pydantic import BaseModel
import pyotp
import qrcode
import io
import base64

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Database reference - will be set from main server
db = None


def set_db(database):
    global db
    db = database


def get_lang(accept_language: Optional[str] = Header(None, alias="Accept-Language")) -> str:
    """Get language from request headers"""
    return I18n.get_language_from_header(accept_language)


# 2FA Models
class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    
class TwoFAVerifyRequest(BaseModel):
    code: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, request: Request, lang: str = Depends(get_lang)):
    """Register a new user."""
    # Rate limit: 5 requests per minute per IP
    check_rate_limit(request, max_requests=5, window_seconds=60)

    # Verify Turnstile
    if user_data.turnstile_token:
        client_ip = getattr(request.state, 'client_ip', request.client.host if request.client else None)
        if not await verify_turnstile(user_data.turnstile_token, client_ip):
            raise HTTPException(status_code=400, detail="Verificação de segurança falhou. Tente novamente.")

    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=t("auth.email_already_exists", lang)
        )
    
    # Validate invite code if provided
    invited_by = None
    if user_data.invite_code:
        invite = await db.invite_codes.find_one({
            "code": user_data.invite_code,
            "is_active": True
        }, {"_id": 0})
        
        if not invite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired invite code"
            )
        
        if invite.get("uses", 0) >= invite.get("max_uses", 1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite code has reached maximum uses"
            )
        
        # Increment invite code usage
        await db.invite_codes.update_one(
            {"code": user_data.invite_code},
            {"$inc": {"uses": 1}}
        )
        invited_by = invite.get("created_by")
    
    # Check if there is a CRM lead or OTC lead with this email to inherit membership profile
    lead_membership = MembershipLevel.STANDARD
    profile_map = {
        "broker": MembershipLevel.BROKER,
        "standard": MembershipLevel.STANDARD,
        "premium": MembershipLevel.PREMIUM,
        "vip": MembershipLevel.VIP,
        "institucional": MembershipLevel.INSTITUCIONAL,
    }
    try:
        # First check CRM leads
        crm_lead = await db.crm_leads.find_one(
            {"email": {"$regex": f"^{user_data.email}$", "$options": "i"}},
            {"_id": 0, "membership_profile": 1}
        )
        if crm_lead and crm_lead.get("membership_profile"):
            lead_profile = crm_lead["membership_profile"].lower()
            lead_membership = profile_map.get(lead_profile, MembershipLevel.STANDARD)
        
        # Also check OTC leads (potential_tier field)
        if lead_membership == MembershipLevel.STANDARD:
            otc_lead = await db.otc_leads.find_one(
                {"contact_email": {"$regex": f"^{user_data.email}$", "$options": "i"}},
                {"_id": 0, "potential_tier": 1}
            )
            if otc_lead and otc_lead.get("potential_tier"):
                lead_tier = otc_lead["potential_tier"].lower()
                lead_membership = profile_map.get(lead_tier, MembershipLevel.STANDARD)
    except Exception:
        pass
    
    # Create user object
    user_in_db = UserInDB(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        country=user_data.country,
        hashed_password=get_password_hash(user_data.password),
        invite_code_used=user_data.invite_code,
        invited_by=invited_by,
        membership_level=lead_membership
    )
    
    # Convert to dict for MongoDB
    user_dict = user_in_db.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['updated_at'] = user_dict['updated_at'].isoformat()
    
    # Insert into database
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_in_db.id})
    
    # Return response
    user_response = UserResponse(
        id=user_in_db.id,
        email=user_in_db.email,
        name=user_in_db.name,
        phone=user_in_db.phone,
        country=user_in_db.country,
        created_at=user_in_db.created_at,
        updated_at=user_in_db.updated_at,
        is_active=user_in_db.is_active,
        is_approved=user_in_db.is_approved,
        is_admin=user_in_db.is_admin,
        kyc_status=user_in_db.kyc_status,
        membership_level=user_in_db.membership_level,
        is_onboarded=False,
        two_factor_enabled=False
    )
    
    return TokenResponse(
        access_token=access_token,
        user=user_response
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, lang: str = Depends(get_lang)):
    """Login with email and password."""
    # Rate limit: 10 requests per minute per IP
    check_rate_limit(request, max_requests=10, window_seconds=60)

    # Verify Turnstile
    if credentials.turnstile_token:
        client_ip = getattr(request.state, 'client_ip', request.client.host if request.client else None)
        if not await verify_turnstile(credentials.turnstile_token, client_ip):
            await log_security_event("turnstile_rejected", client_ip, "/api/auth/login", email=credentials.email, severity="high")
            raise HTTPException(status_code=400, detail="Verificação de segurança falhou. Tente novamente.")

    # Find user by email
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_doc:
        client_ip = getattr(request.state, 'client_ip', request.client.host if request.client else "unknown")
        await log_security_event("failed_login", client_ip, "/api/auth/login", details={"reason": "user_not_found"}, email=credentials.email, severity="medium")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=t("auth.invalid_credentials", lang)
        )
    
    # Verify password
    if not verify_password(credentials.password, user_doc["hashed_password"]):
        client_ip = getattr(request.state, 'client_ip', request.client.host if request.client else "unknown")
        await log_security_event("failed_login", client_ip, "/api/auth/login", details={"reason": "wrong_password"}, email=credentials.email, severity="medium")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=t("auth.invalid_credentials", lang)
        )
    
    # Check if user is active
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=t("auth.account_disabled", lang)
        )
    
    # Parse dates
    created_at = user_doc['created_at']
    updated_at = user_doc['updated_at']
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_doc["id"]})
    
    # Return response with RBAC fields
    user_response = UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        name=user_doc["name"],
        phone=user_doc.get("phone"),
        country=user_doc.get("country"),
        created_at=created_at,
        updated_at=updated_at,
        is_active=user_doc.get("is_active", True),
        is_approved=user_doc.get("is_approved", False),
        is_admin=user_doc.get("is_admin", False),
        kyc_status=user_doc.get("kyc_status", KYCStatus.NOT_STARTED),
        membership_level=user_doc.get("membership_level", MembershipLevel.STANDARD),
        user_type=user_doc.get("user_type", UserType.CLIENT),
        region=user_doc.get("region", Region.EUROPE),
        internal_role=user_doc.get("internal_role"),
        is_onboarded=user_doc.get("is_onboarded", False),
        two_factor_enabled=user_doc.get("two_factor_enabled", False)
    )
    
    return TokenResponse(
        access_token=access_token,
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """Get current authenticated user."""
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Parse dates
    created_at = user_doc['created_at']
    updated_at = user_doc['updated_at']
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return UserResponse(
        id=user_doc["id"],
        email=user_doc["email"],
        name=user_doc["name"],
        phone=user_doc.get("phone"),
        country=user_doc.get("country"),
        created_at=created_at,
        updated_at=updated_at,
        is_active=user_doc.get("is_active", True),
        is_approved=user_doc.get("is_approved", False),
        is_admin=user_doc.get("is_admin", False),
        kyc_status=user_doc.get("kyc_status", KYCStatus.NOT_STARTED),
        membership_level=user_doc.get("membership_level", MembershipLevel.STANDARD),
        user_type=user_doc.get("user_type", UserType.CLIENT),
        region=user_doc.get("region", Region.EUROPE),
        internal_role=user_doc.get("internal_role"),
        is_onboarded=user_doc.get("is_onboarded", False),
        two_factor_enabled=user_doc.get("two_factor_enabled", False)
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update current user's profile."""
    # Get current user
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prepare update data
    update_dict = {}
    if update_data.name is not None:
        update_dict["name"] = update_data.name
    if update_data.phone is not None:
        update_dict["phone"] = update_data.phone
    if update_data.country is not None:
        update_dict["country"] = update_data.country
    
    if update_dict:
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_dict}
        )
    
    # Get updated user
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    # Parse dates
    created_at = updated_user['created_at']
    updated_at = updated_user['updated_at']
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        phone=updated_user.get("phone"),
        country=updated_user.get("country"),
        created_at=created_at,
        updated_at=updated_at,
        is_active=updated_user.get("is_active", True)
    )


# ==================== SECURITY ENDPOINTS ====================

@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    user_id: str = Depends(get_current_user_id)
):
    """Change user's password"""
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(current_password, user_doc.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Password atual incorreta")
    
    # Validate new password
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Nova password deve ter pelo menos 6 caracteres")
    
    # Update password
    hashed = get_password_hash(new_password)
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "hashed_password": hashed,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": "Password alterada com sucesso"}


@router.post("/set-anti-phishing")
async def set_anti_phishing(
    code: str,
    user_id: str = Depends(get_current_user_id)
):
    """Set anti-phishing code"""
    if len(code) < 4:
        raise HTTPException(status_code=400, detail="Código deve ter pelo menos 4 caracteres")
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "anti_phishing_code": code,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": "Código anti-phishing definido"}


@router.post("/deactivate-account")
async def deactivate_account(
    user_id: str = Depends(get_current_user_id)
):
    """Deactivate user's own account"""
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from self-deactivating
    if user_doc.get("is_admin"):
        raise HTTPException(status_code=400, detail="Administradores não podem desativar a própria conta")
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "is_active": False,
                "deactivated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": "Conta desativada com sucesso"}



# ==================== 2FA ENDPOINTS ====================

@router.post("/2fa/setup", response_model=TwoFASetupResponse)
async def setup_2fa(user_id: str = Depends(get_current_user_id), lang: str = Depends(get_lang)):
    """Generate 2FA secret and QR code for user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail=t("auth.user_not_found", lang))
    
    if user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail=t("2fa.already_enabled", lang))
    
    # Generate secret
    secret = pyotp.random_base32()
    
    # Create TOTP URI for QR code
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=user.get("email"),
        issuer_name="KBEX.io"
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Store secret temporarily (will be confirmed on verification)
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "two_factor_secret_temp": secret,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return TwoFASetupResponse(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_base64}"
    )


@router.post("/2fa/verify")
async def verify_2fa(
    request: TwoFAVerifyRequest,
    user_id: str = Depends(get_current_user_id),
    lang: str = Depends(get_lang)
):
    """Verify 2FA code and enable 2FA for user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail=t("auth.user_not_found", lang))
    
    secret = user.get("two_factor_secret_temp")
    if not secret:
        raise HTTPException(status_code=400, detail=t("2fa.code_required", lang))
    
    # Verify code
    totp = pyotp.TOTP(secret)
    if not totp.verify(request.code):
        raise HTTPException(status_code=400, detail=t("2fa.invalid_code", lang))
    
    # Enable 2FA and mark as onboarded
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "two_factor_enabled": True,
                "two_factor_secret": secret,
                "is_onboarded": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {
                "two_factor_secret_temp": ""
            }
        }
    )
    
    return {"success": True, "message": t("2fa.verify_success", lang)}


@router.post("/2fa/disable")
async def disable_2fa(
    user_id: str = Depends(get_current_user_id),
    lang: str = Depends(get_lang)
):
    """Disable 2FA for user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail=t("auth.user_not_found", lang))
    
    if not user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail=t("2fa.not_enabled", lang))
    
    # Disable 2FA
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "two_factor_enabled": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {
                "two_factor_secret": ""
            }
        }
    )
    
    return {"success": True, "message": t("2fa.disable_success", lang)}


@router.get("/2fa/status")
async def get_2fa_status(user_id: str = Depends(get_current_user_id)):
    """Check if 2FA is enabled for user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "enabled": user.get("two_factor_enabled", False)
    }


@router.post("/complete-onboarding")
async def complete_onboarding(user_id: str = Depends(get_current_user_id)):
    """Mark user as onboarded (can be called after skipping 2FA)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mark as onboarded
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "is_onboarded": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": "Onboarding completo"}

