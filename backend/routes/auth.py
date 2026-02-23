from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from models.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate, UserInDB, KYCStatus, MembershipLevel
from utils.auth import get_password_hash, verify_password, create_access_token, get_current_user_id

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Database reference - will be set from main server
db = None


def set_db(database):
    global db
    db = database


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
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
    
    # Create user object
    user_in_db = UserInDB(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        country=user_data.country,
        hashed_password=get_password_hash(user_data.password),
        invite_code_used=user_data.invite_code,
        invited_by=invited_by
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
        membership_level=user_in_db.membership_level
    )
    
    return TokenResponse(
        access_token=access_token,
        user=user_response
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password."""
    # Find user by email
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
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
    
    # Return response
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
        membership_level=user_doc.get("membership_level", MembershipLevel.STANDARD)
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
        membership_level=user_doc.get("membership_level", MembershipLevel.STANDARD)
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
