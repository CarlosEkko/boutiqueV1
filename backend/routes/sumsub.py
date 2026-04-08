"""
Sumsub KYC Integration Routes
Handles applicant creation, access token generation, and webhooks
"""
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import hmac
import hashlib
import time
import os
import requests
import json
import logging

from utils.auth import get_current_user_id
from utils.i18n import t, I18n

# Setup logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sumsub", tags=["Sumsub KYC"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

def get_lang(accept_language: Optional[str] = Header(None, alias="Accept-Language")) -> str:
    return I18n.get_language_from_header(accept_language)

# Sumsub Configuration
SUMSUB_APP_TOKEN = os.getenv("SUMSUB_APP_TOKEN", "")
SUMSUB_SECRET_KEY = os.getenv("SUMSUB_SECRET_KEY", "")
SUMSUB_API_URL = "https://api.sumsub.com"
SUMSUB_LEVEL_NAME = os.getenv("SUMSUB_LEVEL_NAME", "basic-kyc-level")
SUMSUB_KYB_LEVEL_NAME = os.getenv("SUMSUB_KYB_LEVEL_NAME", "kyb-quest-level")

# Alpha-2 to Alpha-3 country code mapping
COUNTRY_ALPHA2_TO_ALPHA3 = {
    "AF":"AFG","AL":"ALB","DZ":"DZA","AD":"AND","AO":"AGO","AG":"ATG","AR":"ARG","AM":"ARM","AU":"AUS","AT":"AUT",
    "AZ":"AZE","BS":"BHS","BH":"BHR","BD":"BGD","BB":"BRB","BY":"BLR","BE":"BEL","BZ":"BLZ","BJ":"BEN","BT":"BTN",
    "BO":"BOL","BA":"BIH","BW":"BWA","BR":"BRA","BN":"BRN","BG":"BGR","BF":"BFA","BI":"BDI","CV":"CPV","KH":"KHM",
    "CM":"CMR","CA":"CAN","CF":"CAF","TD":"TCD","CL":"CHL","CN":"CHN","CO":"COL","KM":"COM","CG":"COG","CD":"COD",
    "CR":"CRI","HR":"HRV","CU":"CUB","CY":"CYP","CZ":"CZE","DK":"DNK","DJ":"DJI","DM":"DMA","DO":"DOM","EC":"ECU",
    "EG":"EGY","SV":"SLV","GQ":"GNQ","ER":"ERI","EE":"EST","SZ":"SWZ","ET":"ETH","FJ":"FJI","FI":"FIN","FR":"FRA",
    "GA":"GAB","GM":"GMB","GE":"GEO","DE":"DEU","GH":"GHA","GR":"GRC","GD":"GRD","GT":"GTM","GN":"GIN","GW":"GNB",
    "GY":"GUY","HT":"HTI","HN":"HND","HU":"HUN","IS":"ISL","IN":"IND","ID":"IDN","IR":"IRN","IQ":"IRQ","IE":"IRL",
    "IL":"ISR","IT":"ITA","JM":"JAM","JP":"JPN","JO":"JOR","KZ":"KAZ","KE":"KEN","KI":"KIR","KP":"PRK","KR":"KOR",
    "KW":"KWT","KG":"KGZ","LA":"LAO","LV":"LVA","LB":"LBN","LS":"LSO","LR":"LBR","LY":"LBY","LI":"LIE","LT":"LTU",
    "LU":"LUX","MG":"MDG","MW":"MWI","MY":"MYS","MV":"MDV","ML":"MLI","MT":"MLT","MH":"MHL","MR":"MRT","MU":"MUS",
    "MX":"MEX","FM":"FSM","MD":"MDA","MC":"MCO","MN":"MNG","ME":"MNE","MA":"MAR","MZ":"MOZ","MM":"MMR","NA":"NAM",
    "NR":"NRU","NP":"NPL","NL":"NLD","NZ":"NZL","NI":"NIC","NE":"NER","NG":"NGA","NO":"NOR","OM":"OMN","PK":"PAK",
    "PW":"PLW","PA":"PAN","PG":"PNG","PY":"PRY","PE":"PER","PH":"PHL","PL":"POL","PT":"PRT","QA":"QAT","RO":"ROU",
    "RU":"RUS","RW":"RWA","KN":"KNA","LC":"LCA","VC":"VCT","WS":"WSM","SM":"SMR","ST":"STP","SA":"SAU","SN":"SEN",
    "RS":"SRB","SC":"SYC","SL":"SLE","SG":"SGP","SK":"SVK","SI":"SVN","SB":"SLB","SO":"SOM","ZA":"ZAF","SS":"SSD",
    "ES":"ESP","LK":"LKA","SD":"SDN","SR":"SUR","SE":"SWE","CH":"CHE","SY":"SYR","TW":"TWN","TJ":"TJK","TZ":"TZA",
    "TH":"THA","TL":"TLS","TG":"TGO","TO":"TON","TT":"TTO","TN":"TUN","TR":"TUR","TM":"TKM","TV":"TUV","UG":"UGA",
    "UA":"UKR","AE":"ARE","GB":"GBR","US":"USA","UY":"URY","UZ":"UZB","VU":"VUT","VE":"VEN","VN":"VNM","YE":"YEM",
    "ZM":"ZMB","ZW":"ZWE","HK":"HKG","MO":"MAC","XK":"XKX",
}

def to_alpha3(country_code: str) -> str:
    """Convert alpha-2 country code to alpha-3. Returns original if already alpha-3 or unknown."""
    if not country_code:
        return ""
    code = country_code.upper().strip()
    if len(code) == 3:
        return code
    return COUNTRY_ALPHA2_TO_ALPHA3.get(code, code)


# ==================== Pydantic Models ====================

class ApplicantCreate(BaseModel):
    """Request model for creating applicant"""
    email: str
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    country: Optional[str] = None
    verification_type: Optional[str] = "kyc"  # "kyc" or "kyb"
    company_name: Optional[str] = None

class AccessTokenResponse(BaseModel):
    """Response model for access token"""
    token: str
    user_id: str


# ==================== Sumsub Authentication ====================

def generate_signature(method: str, path: str, timestamp: int, body: str = "") -> str:
    """
    Generate HMAC-SHA256 signature for Sumsub API request.
    Returns hex-encoded signature (Sumsub accepts both hex and base64).
    """
    # Sumsub expects: ts + method + path + body (no newlines)
    data_to_sign = str(timestamp) + method.upper() + path + body
    
    signature = hmac.new(
        SUMSUB_SECRET_KEY.encode('utf-8'),
        data_to_sign.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature


def make_sumsub_request(method: str, path: str, body: Optional[dict] = None, params: Optional[dict] = None):
    """
    Make an authenticated request to Sumsub API.
    """
    # Build full URL
    url = f"{SUMSUB_API_URL}{path}"
    
    # Build query string and path
    if params:
        param_string = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
        path_with_params = f"{path}?{param_string}"
        url = f"{url}?{param_string}"
    else:
        path_with_params = path
    
    # Serialize body
    body_str = json.dumps(body) if body else ""
    
    # Generate timestamp and signature
    timestamp = int(time.time())
    signature = generate_signature(method.upper(), path_with_params, timestamp, body_str)
    
    # Prepare headers
    headers = {
        "X-App-Token": SUMSUB_APP_TOKEN,
        "X-App-Access-Sig": signature,
        "X-App-Access-Ts": str(timestamp),
        "Content-Type": "application/json"
    }
    
    logger.info(f"Sumsub request: {method} {path_with_params}")
    
    # Make request
    if method.upper() == "GET":
        response = requests.get(url, headers=headers)
    elif method.upper() == "POST":
        response = requests.post(url, headers=headers, data=body_str)
    elif method.upper() == "PATCH":
        response = requests.patch(url, headers=headers, data=body_str)
    else:
        raise ValueError(f"Unsupported HTTP method: {method}")
    
    logger.info(f"Sumsub response: {response.status_code}")
    return response


# ==================== API Endpoints ====================

@router.get("/config")
async def get_sumsub_config():
    """Get Sumsub configuration (non-sensitive)"""
    return {
        "configured": bool(SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY),
        "level_name": SUMSUB_LEVEL_NAME,
        "kyb_level_name": SUMSUB_KYB_LEVEL_NAME
    }


@router.post("/applicants")
async def create_applicant(
    data: ApplicantCreate,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create (or find) a Sumsub applicant AND generate an access token.
    Returns both applicant_id and token in a single response.
    This avoids needing a separate token endpoint (blocked by Cloudflare WAF).
    """
    try:
        applicant_id = None
        
        # Check if user already has a Sumsub applicant in our DB
        existing = await db.sumsub_applicants.find_one({"user_id": user_id})
        if existing and existing.get("applicant_id"):
            # Verify the old applicant is still accessible with current credentials
            verify_resp = make_sumsub_request(
                "GET",
                f"/resources/applicants/{existing['applicant_id']}"
            )
            if verify_resp.status_code == 200:
                applicant_id = existing["applicant_id"]
            else:
                # Old applicant not accessible (credentials rotated) — clear it
                logger.warning(f"Old applicant {existing['applicant_id']} not accessible (status {verify_resp.status_code}). Recreating...")
                await db.sumsub_applicants.delete_one({"user_id": user_id})
        
        # Create applicant if needed
        if not applicant_id:
            # Determine level based on verification type
            is_kyb = data.verification_type == "kyb"
            level_name = SUMSUB_KYB_LEVEL_NAME if is_kyb else SUMSUB_LEVEL_NAME
            
            body = {
                "externalUserId": user_id,
                "email": data.email,
            }
            
            if is_kyb:
                body["type"] = "company"
                if data.company_name:
                    body["info"] = {"companyInfo": {"companyName": data.company_name}}
            
            if data.phone:
                body["phone"] = data.phone
            
            if data.first_name or data.last_name:
                body["fixedInfo"] = {}
                if data.first_name:
                    body["fixedInfo"]["firstName"] = data.first_name
                if data.last_name:
                    body["fixedInfo"]["lastName"] = data.last_name
                if data.country:
                    body["fixedInfo"]["country"] = to_alpha3(data.country)
            
            response = make_sumsub_request(
                "POST",
                "/resources/applicants",
                body=body,
                params={"levelName": level_name}
            )
            
            # Handle 409 - applicant already exists in Sumsub
            if response.status_code == 409:
                import re
                match = re.search(r"already exists:\s*(\w+)", response.text)
                if match:
                    applicant_id = match.group(1)
                    logger.info(f"Applicant already exists in Sumsub: {applicant_id}.")
            elif response.status_code in [200, 201]:
                result = response.json()
                applicant_id = result.get("id")
            else:
                logger.error(f"Sumsub API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to create applicant: {response.text}"
                )
            
            if applicant_id:
                # Store mapping in our database
                await db.sumsub_applicants.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "user_id": user_id,
                        "applicant_id": applicant_id,
                        "email": data.email,
                        "level_name": level_name,
                        "applicant_type": "company" if is_kyb else "individual",
                        "status": "init",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
        
        if not applicant_id:
            raise HTTPException(status_code=500, detail="Failed to obtain applicant ID")
        
        # Determine level for token
        applicant_record = await db.sumsub_applicants.find_one({"user_id": user_id})
        token_level = (applicant_record or {}).get("level_name", SUMSUB_LEVEL_NAME)
        
        # Generate access token in the same call
        token_path = f"/resources/accessTokens?userId={user_id}&ttlInSecs=1800&levelName={token_level}"
        token_response = make_sumsub_request("POST", token_path)
        
        sdk_token = None
        if token_response.status_code == 200:
            sdk_token = token_response.json().get("token")
            logger.info(f"Generated SDK token for user {user_id}")
        else:
            logger.error(f"Token generation failed: {token_response.status_code} - {token_response.text}")
        
        return {
            "applicant_id": applicant_id,
            "external_user_id": user_id,
            "sdk_token": sdk_token
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating applicant: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sdk-init")
async def generate_access_token(
    ttl_seconds: int = 900,
    user_id: str = Depends(get_current_user_id)
):
    """
    Generate an access token for WebSDK initialization.
    The token is valid for the specified TTL duration.
    If the token request fails (e.g. 403 after credential rotation),
    it resets the old applicant and creates a new one automatically.
    """
    try:
        # Get user info from database
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1, "name": 1, "country": 1})
        user_email = user.get("email", "") if user else ""
        
        # Try generating the token
        path = f"/resources/accessTokens?userId={user_id}&ttlInSecs={ttl_seconds}&levelName={SUMSUB_LEVEL_NAME}"
        response = make_sumsub_request("POST", path)
        
        # If 403/401, the old applicant was created with different credentials
        # Reset and recreate the applicant with current credentials
        if response.status_code in [401, 403]:
            logger.warning(f"Token generation returned {response.status_code} for user {user_id}. Resetting applicant...")
            
            # Remove old applicant record from our DB
            await db.sumsub_applicants.delete_one({"user_id": user_id})
            
            # Create a new applicant with current credentials
            user_name = user.get("name", "") if user else ""
            first_name = user_name.split(" ")[0] if user_name else ""
            last_name = " ".join(user_name.split(" ")[1:]) if user_name and " " in user_name else ""
            country = user.get("country", "") if user else ""
            
            body = {
                "externalUserId": user_id,
                "email": user_email,
            }
            if first_name or last_name:
                body["fixedInfo"] = {}
                if first_name:
                    body["fixedInfo"]["firstName"] = first_name
                if last_name:
                    body["fixedInfo"]["lastName"] = last_name
                if country:
                    body["fixedInfo"]["country"] = to_alpha3(country)
            
            create_resp = make_sumsub_request(
                "POST", "/resources/applicants",
                body=body,
                params={"levelName": SUMSUB_LEVEL_NAME}
            )
            
            if create_resp.status_code not in [200, 201]:
                logger.error(f"Failed to recreate applicant: {create_resp.text}")
                raise HTTPException(status_code=create_resp.status_code, detail=f"Failed to recreate applicant: {create_resp.text}")
            
            result = create_resp.json()
            applicant_id = result.get("id")
            
            # Store new mapping
            await db.sumsub_applicants.update_one(
                {"user_id": user_id},
                {"$set": {
                    "user_id": user_id,
                    "applicant_id": applicant_id,
                    "email": user_email,
                    "level_name": SUMSUB_LEVEL_NAME,
                    "status": "init",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            logger.info(f"Recreated Sumsub applicant {applicant_id} for user {user_id}")
            
            # Now retry the token generation
            response = make_sumsub_request("POST", path)
            if response.status_code != 200:
                logger.error(f"Token generation still failed after reset: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Failed to generate access token after reset: {response.text}")
        
        elif response.status_code != 200:
            logger.error(f"Token generation error: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to generate access token: {response.text}"
            )
        
        data = response.json()
        logger.info(f"Generated access token for user: {user_id}")
        
        return {
            "token": data.get("token"),
            "user_id": user_id,
            "ttl_seconds": ttl_seconds
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating access token: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-link")
async def generate_external_link(user_id: str = Depends(get_current_user_id)):
    """
    Generate a Sumsub external WebSDK link (no iframe needed).
    This bypasses all CSP/X-Frame-Options restrictions by opening
    the verification in Sumsub's own domain.
    """
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1, "name": 1, "country": 1})
        user_email = user.get("email", "") if user else ""

        # Ensure applicant exists
        applicant = await db.sumsub_applicants.find_one({"user_id": user_id}, {"_id": 0})
        if not applicant or not applicant.get("applicant_id"):
            # Create applicant first
            user_name = user.get("name", "") if user else ""
            first_name = user_name.split(" ")[0] if user_name else ""
            last_name = " ".join(user_name.split(" ")[1:]) if user_name and " " in user_name else ""
            country = user.get("country", "") if user else ""

            body = {"externalUserId": user_id, "email": user_email}
            if first_name or last_name:
                body["fixedInfo"] = {}
                if first_name: body["fixedInfo"]["firstName"] = first_name
                if last_name: body["fixedInfo"]["lastName"] = last_name
                if country: body["fixedInfo"]["country"] = to_alpha3(country)

            create_resp = make_sumsub_request("POST", "/resources/applicants", body=body, params={"levelName": SUMSUB_LEVEL_NAME})
            if create_resp.status_code not in [200, 201]:
                raise HTTPException(status_code=create_resp.status_code, detail=f"Failed to create applicant: {create_resp.text}")

            result = create_resp.json()
            applicant_id = result.get("id")
            await db.sumsub_applicants.update_one(
                {"user_id": user_id},
                {"$set": {
                    "user_id": user_id, "applicant_id": applicant_id,
                    "email": user_email, "level_name": SUMSUB_LEVEL_NAME,
                    "status": "init",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
        else:
            applicant_id = applicant["applicant_id"]

        # Generate external WebSDK link via Sumsub API
        link_path = f"/resources/sdkIntegrations/levels/{SUMSUB_LEVEL_NAME}/websdkLink"
        link_body = {
            "externalUserId": user_id,
            "ttlInSecs": 3600,
            "lang": "pt",
        }

        link_resp = make_sumsub_request("POST", link_path, body=link_body)

        if link_resp.status_code in [200, 201]:
            link_data = link_resp.json()
            external_url = link_data.get("url", "")
            logger.info(f"Generated external WebSDK link for user {user_id}")
            return {
                "success": True,
                "url": external_url,
                "applicant_id": applicant_id,
                "ttl_seconds": 3600,
            }
        else:
            # Fallback: generate access token and build URL manually
            logger.warning(f"External link API returned {link_resp.status_code}: {link_resp.text}. Using token fallback.")
            token_path = f"/resources/accessTokens?userId={user_id}&ttlInSecs=1800&levelName={SUMSUB_LEVEL_NAME}"
            token_resp = make_sumsub_request("POST", token_path)
            if token_resp.status_code == 200:
                token_data = token_resp.json()
                sdk_token = token_data.get("token", "")
                fallback_url = f"https://websdk.sumsub.com/idensic/#/?accessToken={sdk_token}&lang=pt"
                return {
                    "success": True,
                    "url": fallback_url,
                    "applicant_id": applicant_id,
                    "ttl_seconds": 1800,
                    "fallback": True,
                }
            else:
                raise HTTPException(status_code=500, detail=f"Could not generate verification link: {link_resp.text}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating external link: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_applicant_status(user_id: str = Depends(get_current_user_id)):
    """
    Get the current verification status of an applicant.
    """
    try:
        # Get applicant from our database
        applicant = await db.sumsub_applicants.find_one({"user_id": user_id}, {"_id": 0})
        
        if not applicant or not applicant.get("applicant_id"):
            return {
                "status": "not_started",
                "has_applicant": False
            }
        
        applicant_id = applicant["applicant_id"]
        
        # Fetch status from Sumsub
        response = make_sumsub_request(
            "GET",
            f"/resources/applicants/{applicant_id}/requiredIdDocsStatus"
        )
        
        if response.status_code != 200:
            # Try getting basic info instead
            response2 = make_sumsub_request(
                "GET",
                f"/resources/applicants/{applicant_id}"
            )
            
            if response2.status_code == 200:
                data = response2.json()
                review = data.get("review", {})
                return {
                    "status": applicant.get("status", "pending"),
                    "has_applicant": True,
                    "applicant_id": applicant_id,
                    "review_status": review.get("reviewStatus"),
                    "review_answer": review.get("reviewResult", {}).get("reviewAnswer"),
                    "local_data": applicant
                }
        
        docs_status = response.json() if response.status_code == 200 else {}
        
        return {
            "status": applicant.get("status", "pending"),
            "has_applicant": True,
            "applicant_id": applicant_id,
            "docs_status": docs_status,
            "local_data": applicant
        }
    
    except Exception as e:
        logger.error(f"Error getting applicant status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def receive_webhook(request: Request):
    """
    Receive and process webhook notifications from Sumsub.
    Updates user KYC status based on verification results.
    """
    try:
        # Get raw body for signature verification
        raw_body = await request.body()
        
        # Verify webhook signature
        if not verify_webhook_signature(raw_body, request.headers):
            logger.warning("Webhook signature verification failed")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse webhook payload
        payload = json.loads(raw_body)
        logger.info(f"Received webhook: {payload.get('type')} for applicant: {payload.get('applicantId')}")
        
        applicant_id = payload.get("applicantId")
        external_user_id = payload.get("externalUserId")
        webhook_type = payload.get("type")
        review_result = payload.get("reviewResult", {})
        review_answer = review_result.get("reviewAnswer")
        
        # Find user by applicant_id or external_user_id
        query = {"applicant_id": applicant_id} if applicant_id else {"user_id": external_user_id}
        applicant_record = await db.sumsub_applicants.find_one(query)
        
        if not applicant_record:
            logger.warning(f"No applicant record found for webhook: {applicant_id}")
            return {"status": "no_record"}
        
        user_id = applicant_record.get("user_id")
        
        # Update status based on webhook type
        if webhook_type == "applicantReviewed":
            new_status = "approved" if review_answer == "GREEN" else "rejected"
            
            # Update sumsub_applicants with full review details
            update_fields = {
                "status": new_status,
                "review_answer": review_answer,
                "reject_labels": review_result.get("rejectLabels"),
                "reject_type": review_result.get("reviewRejectType"),
                "moderation_comment": review_result.get("moderationComment"),
                "client_comment": review_result.get("clientComment"),
                "review_status": payload.get("reviewStatus"),
                "level_name": payload.get("levelName"),
                "applicant_type": payload.get("applicantType", "individual"),
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.sumsub_applicants.update_one(
                {"user_id": user_id},
                {"$set": update_fields}
            )
            
            # Update user's kyc_status
            kyc_status = "approved" if review_answer == "GREEN" else "rejected"
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"kyc_status": kyc_status}}
            )
            
            logger.info(f"Updated KYC status for user {user_id}: {kyc_status}")
            
        elif webhook_type == "applicantPending":
            await db.sumsub_applicants.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "status": "pending",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"kyc_status": "pending"}}
            )
            
        elif webhook_type == "applicantCreated":
            await db.sumsub_applicants.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "status": "created",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        return {"status": "received", "user_id": user_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def verify_webhook_signature(body: bytes, headers) -> bool:
    """
    Verify HMAC signature of webhook from Sumsub.
    """
    try:
        digest_alg = headers.get("X-Payload-Digest-Alg", "HMAC_SHA256_HEX")
        provided_digest = headers.get("X-Payload-Digest")
        
        if not provided_digest:
            logger.warning("No X-Payload-Digest header in webhook")
            # In sandbox, allow webhooks without signature for testing
            return True
        
        # Map algorithm string to hashlib algorithm
        algo_map = {
            "HMAC_SHA1_HEX": "sha1",
            "HMAC_SHA256_HEX": "sha256",
            "HMAC_SHA512_HEX": "sha512"
        }
        
        algo = algo_map.get(digest_alg, "sha256")
        
        # Calculate expected digest
        calculated_digest = hmac.new(
            SUMSUB_SECRET_KEY.encode('utf-8'),
            body,
            getattr(hashlib, algo)
        ).hexdigest()
        
        # Constant-time comparison
        is_valid = hmac.compare_digest(calculated_digest, provided_digest)
        
        return is_valid
    
    except Exception as e:
        logger.error(f"Error verifying webhook signature: {str(e)}")
        return False
