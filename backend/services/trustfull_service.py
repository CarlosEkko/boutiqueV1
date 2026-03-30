"""
Trustfull Digital Risk Intelligence Service
Email + Phone scoring via api.fido.id
"""
import os
import logging
import uuid
import httpx

logger = logging.getLogger(__name__)

TRUSTFULL_API_KEY = os.environ.get("TRUSTFULL_API_KEY", "")
BASE_URL = "https://api.fido.id/1.0"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-key": TRUSTFULL_API_KEY,
}


async def score_email(email: str) -> dict:
    """Score an email address via Trustfull. Returns simplified risk data."""
    try:
        payload = {
            "customer_id": str(uuid.uuid4()),
            "claims": ["email"],
            "email": email,
            "max_enrichment_time": 5.0,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{BASE_URL}/email", json=payload, headers=HEADERS)
            if resp.status_code != 200:
                logger.error(f"Trustfull email API error {resp.status_code}: {resp.text}")
                return {"error": resp.text, "score": None}
            data = resp.json()

        email_data = data.get("email", {})
        return {
            "score": email_data.get("score"),
            "score_cluster": email_data.get("score_cluster"),
            "status": email_data.get("status"),
            "is_disposable": email_data.get("is_disposable"),
            "is_free": email_data.get("is_free"),
            "is_spamtrap": email_data.get("is_spamtrap"),
            "domain": email_data.get("domain"),
            "first_name": email_data.get("first_name"),
            "last_name": email_data.get("last_name"),
            "company_name": email_data.get("company_name"),
            "company_industry": email_data.get("company_industry"),
            "company_job_title": email_data.get("company_job_title"),
            "has_linkedin": email_data.get("has_linkedin"),
            "has_twitter": email_data.get("has_twitter"),
            "has_google": email_data.get("has_google"),
            "has_office365": email_data.get("has_office365"),
            "has_binance": email_data.get("has_binance"),
            "avatar": email_data.get("avatar"),
            "data_breaches_count": email_data.get("data_breaches_count"),
            "reason_codes": email_data.get("reason_codes"),
            "first_seen": email_data.get("first_seen"),
            "first_seen_days": email_data.get("first_seen_days"),
        }
    except Exception as e:
        logger.error(f"Trustfull email scoring failed: {e}")
        return {"error": str(e), "score": None}


async def score_phone(phone_number: str) -> dict:
    """Score a phone number via Trustfull. Returns simplified risk data."""
    try:
        clean_phone = phone_number.lstrip("+").replace(" ", "").replace("-", "")
        payload = {
            "customer_id": str(uuid.uuid4()),
            "claims": ["phone"],
            "phone_number": clean_phone,
            "max_enrichment_time": 5.0,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{BASE_URL}/phone", json=payload, headers=HEADERS)
            if resp.status_code != 200:
                logger.error(f"Trustfull phone API error {resp.status_code}: {resp.text}")
                return {"error": resp.text, "score": None}
            data = resp.json()

        phone_data = data.get("phone", {})
        return {
            "score": phone_data.get("score"),
            "score_cluster": phone_data.get("score_cluster"),
            "is_disposable": phone_data.get("is_disposable"),
            "is_valid_format": phone_data.get("is_valid_format"),
            "country_code": phone_data.get("country_code"),
            "number_type": phone_data.get("number_type"),
            "current_network": phone_data.get("current_network"),
            "has_whatsapp": phone_data.get("has_whatsapp"),
            "has_telegram": phone_data.get("has_telegram"),
            "first_name": phone_data.get("first_name"),
            "last_name": phone_data.get("last_name"),
            "caller_type": phone_data.get("caller_type"),
            "caller_company_name": phone_data.get("caller_company_name"),
            "data_breaches_count": phone_data.get("data_breaches_count"),
            "reason_codes": phone_data.get("reason_codes"),
            "first_seen": phone_data.get("first_seen"),
            "first_seen_days": phone_data.get("first_seen_days"),
        }
    except Exception as e:
        logger.error(f"Trustfull phone scoring failed: {e}")
        return {"error": str(e), "score": None}


async def score_lead(email: str, phone: str = None) -> dict:
    """Score a lead using both email and phone (if available). Returns combined risk assessment."""
    result = {"email_risk": None, "phone_risk": None, "combined_score": None, "risk_level": "unknown"}

    email_result = await score_email(email)
    result["email_risk"] = email_result

    if phone:
        phone_result = await score_phone(phone)
        result["phone_risk"] = phone_result

    # Calculate combined score
    scores = []
    if email_result.get("score") is not None:
        scores.append(email_result["score"])
    if result["phone_risk"] and result["phone_risk"].get("score") is not None:
        scores.append(result["phone_risk"]["score"])

    if scores:
        result["combined_score"] = int(sum(scores) / len(scores))
        s = result["combined_score"]
        if s >= 700:
            result["risk_level"] = "very_high"
        elif s >= 500:
            result["risk_level"] = "high"
        elif s >= 300:
            result["risk_level"] = "review"
        elif s >= 150:
            result["risk_level"] = "low"
        else:
            result["risk_level"] = "very_low"

    # Red flags
    flags = []
    if email_result.get("is_disposable"):
        flags.append("Email descartável")
    if email_result.get("is_spamtrap"):
        flags.append("Email spam trap")
    if email_result.get("data_breaches_count") and email_result["data_breaches_count"] > 5:
        flags.append(f"Email em {email_result['data_breaches_count']} data breaches")
    if result["phone_risk"]:
        if result["phone_risk"].get("is_disposable"):
            flags.append("Telefone descartável")
        if result["phone_risk"].get("number_type") == "VOIP":
            flags.append("Telefone VoIP")
    result["red_flags"] = flags

    return result
