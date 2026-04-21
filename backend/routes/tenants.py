"""
Tenant (White-label) management.

A Tenant represents a white-labeled deployment of the KBEX platform.
Each tenant has:
  - Unique `slug` (identifier)
  - One or more `domains` (hostnames that resolve to this tenant)
  - Branding (logo, colors, platform name)
  - Optional email sender override
  - Feature flags (enabled fiat currencies, etc.)

The DEFAULT tenant (`slug: "kbex"`, domain: `kbex.io`) is seeded automatically and
cannot be deleted. All existing users/data implicitly belong to the default tenant
until Phase 2 adds `tenant_id` scoping.

Resolution:
  Any request carrying a `Host` header (or explicit `?tenant=slug` query) returns
  the matching tenant. Unknown hosts fall back to the default tenant.
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient

from routes.admin import get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tenants", tags=["tenants"])

# --- DB ---
_mongo_url = os.environ.get("MONGO_URL")
_db_name = os.environ.get("DB_NAME")
_client = AsyncIOMotorClient(_mongo_url) if _mongo_url else None
db = _client[_db_name] if _client and _db_name else None

DEFAULT_SLUG = "kbex"
DEFAULT_DOMAIN = "kbex.io"


def _iso(dt: datetime) -> str:
    return dt.isoformat()


# --- Models ---
class TenantBranding(BaseModel):
    platform_name: str = "KBEX"
    logo_url: Optional[str] = None  # Public URL (e.g. /uploads/tenants/<slug>/logo.svg)
    favicon_url: Optional[str] = None
    primary_color: str = "#d4af37"   # KBEX gold
    accent_color: str = "#0b0b0b"
    tagline: Optional[str] = "Institutional Crypto Custody"


class TenantEmail(BaseModel):
    sender_email: Optional[str] = None  # e.g. no-reply@bancox.com (falls back to global)
    sender_name: Optional[str] = None   # e.g. "Banco X Custody"


class Tenant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str                         # unique identifier, e.g. "kbex", "bancox"
    domains: list[str] = []           # hostnames that map to this tenant
    is_default: bool = False          # only one tenant can be default
    is_active: bool = True
    branding: TenantBranding = Field(default_factory=TenantBranding)
    email: TenantEmail = Field(default_factory=TenantEmail)
    supported_fiat: list[str] = ["EUR", "USD", "GBP"]
    created_at: str = Field(default_factory=lambda: _iso(datetime.now(timezone.utc)))
    updated_at: str = Field(default_factory=lambda: _iso(datetime.now(timezone.utc)))


class TenantCreate(BaseModel):
    slug: str
    domains: list[str] = []
    branding: TenantBranding = Field(default_factory=TenantBranding)
    email: TenantEmail = Field(default_factory=TenantEmail)
    supported_fiat: list[str] = ["EUR", "USD", "GBP"]


class TenantUpdate(BaseModel):
    domains: Optional[list[str]] = None
    is_active: Optional[bool] = None
    branding: Optional[TenantBranding] = None
    email: Optional[TenantEmail] = None
    supported_fiat: Optional[list[str]] = None


# --- Helpers ---
async def _ensure_default_tenant():
    """Seed the default KBEX tenant on first access if missing."""
    existing = await db.tenants.find_one({"slug": DEFAULT_SLUG}, {"_id": 0})
    if existing:
        return existing

    t = Tenant(
        slug=DEFAULT_SLUG,
        domains=[DEFAULT_DOMAIN, "www.kbex.io", "boutique-exchange.preview.emergentagent.com"],
        is_default=True,
        branding=TenantBranding(
            platform_name="KBEX",
            tagline="Institutional Crypto Custody",
        ),
    )
    await db.tenants.insert_one(t.model_dump())
    logger.info("Seeded default KBEX tenant")
    return t.model_dump()


async def resolve_tenant_by_host(host: Optional[str]) -> dict:
    """Public resolver — returns the tenant matching the Host header, or default."""
    await _ensure_default_tenant()
    if host:
        host_clean = host.split(":")[0].lower().strip()
        tenant = await db.tenants.find_one(
            {"domains": host_clean, "is_active": True},
            {"_id": 0},
        )
        if tenant:
            return tenant
    # Fallback: default tenant
    return await db.tenants.find_one({"is_default": True}, {"_id": 0})


# --- Public routes ---
@router.get("/resolve")
async def resolve_current_tenant(request: Request):
    """Public endpoint — frontend calls this on boot to get branding for the
    current hostname. No auth required.
    """
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    tenant = await resolve_tenant_by_host(host)
    if not tenant:
        raise HTTPException(status_code=500, detail="No tenant configured")
    # Strip internal flags client-doesn't-need
    return {
        "slug": tenant["slug"],
        "is_default": tenant.get("is_default", False),
        "branding": tenant.get("branding") or {},
        "supported_fiat": tenant.get("supported_fiat") or ["EUR", "USD", "GBP"],
    }


# --- Admin routes (super-admin only) ---
@router.get("/")
async def list_tenants(admin: dict = Depends(get_admin_user)):
    await _ensure_default_tenant()
    rows = await db.tenants.find({}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return rows


@router.post("/")
async def create_tenant(payload: TenantCreate, admin: dict = Depends(get_admin_user)):
    slug = payload.slug.strip().lower()
    if not slug or not slug.replace("-", "").replace("_", "").isalnum():
        raise HTTPException(400, "Invalid slug (only letters, digits, - and _ allowed)")

    if await db.tenants.find_one({"slug": slug}):
        raise HTTPException(409, f"Tenant '{slug}' already exists")

    # Check domain uniqueness
    for d in payload.domains:
        d_clean = d.lower().strip()
        if await db.tenants.find_one({"domains": d_clean}):
            raise HTTPException(409, f"Domain '{d_clean}' is already assigned to another tenant")

    t = Tenant(
        slug=slug,
        domains=[d.lower().strip() for d in payload.domains],
        branding=payload.branding,
        email=payload.email,
        supported_fiat=payload.supported_fiat,
    )
    await db.tenants.insert_one(t.model_dump())
    logger.info(f"Tenant created: {slug} by admin={admin.get('email')}")
    return t.model_dump()


@router.put("/{slug}")
async def update_tenant(slug: str, payload: TenantUpdate, admin: dict = Depends(get_admin_user)):
    existing = await db.tenants.find_one({"slug": slug.lower()}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Tenant not found")

    update: dict = {"updated_at": _iso(datetime.now(timezone.utc))}

    if payload.domains is not None:
        cleaned = [d.lower().strip() for d in payload.domains]
        # Check domain uniqueness vs OTHER tenants
        for d in cleaned:
            conflict = await db.tenants.find_one(
                {"domains": d, "slug": {"$ne": slug.lower()}}, {"_id": 0, "slug": 1}
            )
            if conflict:
                raise HTTPException(409, f"Domain '{d}' already used by tenant '{conflict['slug']}'")
        update["domains"] = cleaned

    if payload.is_active is not None:
        if existing.get("is_default") and payload.is_active is False:
            raise HTTPException(400, "Cannot deactivate the default tenant")
        update["is_active"] = payload.is_active

    if payload.branding is not None:
        update["branding"] = payload.branding.model_dump()

    if payload.email is not None:
        update["email"] = payload.email.model_dump()

    if payload.supported_fiat is not None:
        update["supported_fiat"] = payload.supported_fiat

    await db.tenants.update_one({"slug": slug.lower()}, {"$set": update})
    return await db.tenants.find_one({"slug": slug.lower()}, {"_id": 0})


@router.delete("/{slug}")
async def delete_tenant(slug: str, admin: dict = Depends(get_admin_user)):
    existing = await db.tenants.find_one({"slug": slug.lower()}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Tenant not found")
    if existing.get("is_default"):
        raise HTTPException(400, "Cannot delete the default tenant")
    await db.tenants.delete_one({"slug": slug.lower()})
    logger.info(f"Tenant deleted: {slug} by admin={admin.get('email')}")
    return {"success": True, "slug": slug.lower()}
