"""
Cookie Consent — GDPR auditable cookie preference storage.

Stores one document per consent event (insert-only / append-log) so that the
user's choice history is fully auditable for compliance audits. Categories:
  - essential : always on (auth, anti-CSRF, theme, language)
  - analytics : opt-in (Google Analytics, Hotjar, etc. — none yet enabled)
  - marketing : opt-in (Facebook Pixel, LinkedIn Insight, etc. — none yet)

Endpoints:
  POST /api/legal/cookie-consent          public — record a consent event
  GET  /api/legal/cookie-consent/me       authenticated — read latest consent
  GET  /api/legal/cookie-consent/admin    admin — list all events for audit
  GET  /api/legal/cookie-consent/stats    admin — aggregate stats
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, Dict, List
import hashlib
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from utils.auth import get_current_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/legal", tags=["Legal / Cookie Consent"])

db = None
COLLECTION = "cookie_consents"

# Current policy version — bump when the policy text materially changes.
# Recording it with each consent event lets us re-prompt users whose stored
# consent corresponds to an older version.
POLICY_VERSION = "1.0"


def set_db(database):
    global db
    db = database


# ---------------------- MODELS ----------------------

class ConsentCategories(BaseModel):
    """Per-category boolean opt-in. essential is always True."""
    essential: bool = Field(True, description="Always True — strictly necessary")
    analytics: bool = False
    marketing: bool = False


class ConsentSubmit(BaseModel):
    categories: ConsentCategories
    # Public-only fields (filled client-side; cross-checked server-side)
    language: Optional[str] = Field(None, max_length=8)
    tenant_slug: Optional[str] = Field(None, max_length=64)
    # How the user expressed the consent — for audit clarity
    method: str = Field(
        "banner",
        pattern="^(banner|preferences_dialog|policy_page|api)$",
    )


# ---------------------- HELPERS ----------------------

def _client_ip(request: Request) -> str:
    return (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )


def _hash_ip(ip: str) -> str:
    """Privacy: store SHA-256 of IP+salt instead of raw IP. Sufficient for
    rate-limiting and abuse detection without keeping a PII reverse-lookup."""
    salt = "kbex-cookie-consent-v1"
    return hashlib.sha256(f"{salt}:{ip}".encode("utf-8")).hexdigest()[:32]


# ---------------------- ROUTES ----------------------

@router.post("/cookie-consent")
async def submit_cookie_consent(
    payload: ConsentSubmit,
    request: Request,
):
    """Record a cookie consent event. Public — works for anonymous visitors
    and authenticated users alike. Idempotent on a per-(user|ip)+choice basis
    via the timestamp; consecutive identical submits create new events so we
    keep a true audit trail."""
    if db is None:
        raise HTTPException(503, "DB not ready")

    # Optional auth — if a token is present we associate the event.
    user_id: Optional[str] = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        try:
            token = auth_header.split(" ", 1)[1].strip()
            from utils.auth import decode_token  # type: ignore
            data = decode_token(token)
            user_id = data.get("sub") if isinstance(data, dict) else None
        except Exception:
            user_id = None  # silent — anonymous fallback

    now = datetime.now(timezone.utc)
    cats = payload.categories.model_dump()
    cats["essential"] = True  # always force-on regardless of payload

    record: Dict = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "categories": cats,
        "policy_version": POLICY_VERSION,
        "language": payload.language,
        "tenant_slug": payload.tenant_slug,
        "method": payload.method,
        "user_agent": request.headers.get("user-agent", "")[:512],
        "ip_hash": _hash_ip(_client_ip(request)),
        "created_at": now.isoformat(),
    }
    await db[COLLECTION].insert_one(record)

    logger.info(
        f"Cookie consent recorded — user={user_id or 'anon'} "
        f"analytics={cats['analytics']} marketing={cats['marketing']} "
        f"version={POLICY_VERSION}"
    )

    return {
        "success": True,
        "consent_id": record["id"],
        "policy_version": POLICY_VERSION,
        "categories": cats,
    }


@router.get("/cookie-consent/me")
async def get_my_consent(user_id: str = Depends(get_current_user_id)):
    """Return the most recent consent event for the authenticated user."""
    if db is None:
        raise HTTPException(503, "DB not ready")
    doc = await db[COLLECTION].find_one(
        {"user_id": user_id},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not doc:
        return {"has_consent": False, "policy_version": POLICY_VERSION}
    return {"has_consent": True, **doc}


@router.get("/cookie-consent/admin")
async def admin_list_consents(
    limit: int = 200,
    user_id: Optional[str] = None,
    admin: dict = Depends(__import__("routes.admin", fromlist=["get_admin_user"]).get_admin_user),
) -> List[dict]:
    """Admin: list consent events for compliance audit. Newest first."""
    if db is None:
        raise HTTPException(503, "DB not ready")
    q: Dict = {}
    if user_id:
        q["user_id"] = user_id
    docs = await db[COLLECTION].find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 1000)).to_list(1000)
    return docs


@router.get("/cookie-consent/stats")
async def admin_consent_stats(
    admin: dict = Depends(__import__("routes.admin", fromlist=["get_admin_user"]).get_admin_user),
):
    """Admin: aggregated stats for the dashboard widget."""
    if db is None:
        raise HTTPException(503, "DB not ready")
    total = await db[COLLECTION].count_documents({})
    analytics_in = await db[COLLECTION].count_documents({"categories.analytics": True})
    marketing_in = await db[COLLECTION].count_documents({"categories.marketing": True})
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$user_id", "first": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$first"}},
    ]
    last_per_user = await db[COLLECTION].aggregate(pipeline).to_list(50_000)
    unique_users = sum(1 for d in last_per_user if d.get("user_id"))
    anon = sum(1 for d in last_per_user if not d.get("user_id"))
    accept_all = sum(
        1 for d in last_per_user
        if d.get("categories", {}).get("analytics") and d.get("categories", {}).get("marketing")
    )
    reject_all = sum(
        1 for d in last_per_user
        if not d.get("categories", {}).get("analytics") and not d.get("categories", {}).get("marketing")
    )
    return {
        "total_events": total,
        "unique_users": unique_users,
        "anonymous_consents": anon,
        "currently_optin_analytics": analytics_in,
        "currently_optin_marketing": marketing_in,
        "accept_all_users": accept_all,
        "reject_all_users": reject_all,
        "policy_version": POLICY_VERSION,
    }
