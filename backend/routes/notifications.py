from fastapi import APIRouter, Depends
from routes.admin import get_admin_user, get_internal_user
from datetime import datetime, timezone
from models.user import COUNTRY_TO_REGION
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

db = None

def set_db(database):
    global db
    db = database


def _get_region_filter(user: dict) -> dict:
    """Build a region-based filter for notifications.
    Admin/global_manager sees everything. Others see only their region."""
    role = user.get("internal_role") or ("admin" if user.get("is_admin") else None)
    region = user.get("region", "global")
    
    if role in ("admin", "global_manager") or region == "global":
        return {}
    
    # Get country codes for this region
    region_countries = [
        code for code, reg in COUNTRY_TO_REGION.items()
        if (reg.value if hasattr(reg, 'value') else reg) == region
    ]
    return region_countries


def _region_user_query(user: dict) -> dict:
    """Filter for user-collection queries (users have 'region' field directly)."""
    role = user.get("internal_role") or ("admin" if user.get("is_admin") else None)
    region = user.get("region", "global")
    
    if role in ("admin", "global_manager") or region == "global":
        return {}
    return {"region": region}


@router.get("/pending")
async def get_pending_notifications(user: dict = Depends(get_internal_user)):
    """Get all pending items that need approval/attention, filtered by user region"""
    notifications = []
    
    region_countries = _get_region_filter(user)
    user_region_q = _region_user_query(user)
    
    # Build country filter for records that have a 'country' field
    country_q = {"country": {"$in": region_countries}} if region_countries else {}
    
    # Pre-fetch regional user IDs for user-based queries (deposits, withdrawals, etc.)
    region_uids = []
    if user_region_q:
        region_user_ids = await db.users.find({**user_region_q, "user_type": "client"}, {"id": 1}).to_list(5000)
        region_uids = [u["id"] for u in region_user_ids if u.get("id")]
    
    # 1. Pending Fiat Deposits
    deposit_q = {"status": "pending"}
    if user_region_q and region_uids:
        deposit_q["user_id"] = {"$in": region_uids}
    pending_deposits = await db.bank_transfers.count_documents(deposit_q)
    if pending_deposits > 0:
        notifications.append({
            "type": "fiat_deposit",
            "title": "Depósitos Fiat Pendentes",
            "count": pending_deposits,
            "icon": "ArrowUpToLine",
            "color": "yellow",
            "link": "/dashboard/admin/fiat-deposits"
        })
    
    # 2. Pending Admission Fees
    admission_q = {"status": "pending"}
    if user_region_q:
        if region_uids:
            admission_q["user_id"] = {"$in": region_uids}
    pending_admissions = await db.admission_payments.count_documents(admission_q)
    if pending_admissions > 0:
        notifications.append({
            "type": "admission_fee",
            "title": "Taxas de Admissão Pendentes",
            "count": pending_admissions,
            "icon": "CreditCard",
            "color": "orange",
            "link": "/dashboard/admin/admission-fees"
        })
    
    # 3. Pending Fiat Withdrawals
    fiat_wd_q = {"status": "pending"}
    if user_region_q and region_uids:
        fiat_wd_q["user_id"] = {"$in": region_uids}
    pending_fiat_withdrawals = await db.fiat_withdrawals.count_documents(fiat_wd_q)
    if pending_fiat_withdrawals > 0:
        notifications.append({
            "type": "fiat_withdrawal",
            "title": "Levantamentos Fiat Pendentes",
            "count": pending_fiat_withdrawals,
            "icon": "ArrowDownToLine",
            "color": "red",
            "link": "/dashboard/admin/fiat-withdrawals"
        })
    
    # 4. Pending Crypto Withdrawals
    crypto_wd_q = {"status": "pending"}
    if user_region_q and region_uids:
        crypto_wd_q["user_id"] = {"$in": region_uids}
    pending_crypto_withdrawals = await db.crypto_withdrawals.count_documents(crypto_wd_q)
    if pending_crypto_withdrawals > 0:
        notifications.append({
            "type": "crypto_withdrawal",
            "title": "Levantamentos Crypto Pendentes",
            "count": pending_crypto_withdrawals,
            "icon": "Bitcoin",
            "color": "orange",
            "link": "/dashboard/admin/crypto-withdrawals"
        })
    
    # 5. Pending KYC Verifications (filter by user region)
    kyc_q = {"kyc_status": "pending"}
    if user_region_q:
        kyc_q.update(user_region_q)
    pending_kyc = await db.users.count_documents(kyc_q)
    if pending_kyc > 0:
        notifications.append({
            "type": "kyc",
            "title": "Verificações KYC Pendentes",
            "count": pending_kyc,
            "icon": "UserCheck",
            "color": "blue",
            "link": "/dashboard/admin/kyc"
        })
    
    # 6. Pending Bank Account Verifications
    bank_q = {"status": "pending"}
    if user_region_q and region_uids:
        bank_q["user_id"] = {"$in": region_uids}
    pending_bank_accounts = await db.bank_accounts.count_documents(bank_q)
    if pending_bank_accounts > 0:
        notifications.append({
            "type": "bank_account",
            "title": "Contas Bancárias Pendentes",
            "count": pending_bank_accounts,
            "icon": "Landmark",
            "color": "purple",
            "link": "/dashboard/admin/bank-accounts"
        })
    
    # 7. Open Support Tickets
    ticket_q = {"status": {"$in": ["open", "in_progress"]}}
    if user_region_q and region_uids:
        ticket_q["user_id"] = {"$in": region_uids}
    open_tickets = await db.tickets.count_documents(ticket_q)
    if open_tickets > 0:
        notifications.append({
            "type": "ticket",
            "title": "Tickets de Suporte Abertos",
            "count": open_tickets,
            "icon": "MessageSquare",
            "color": "green",
            "link": "/dashboard/admin/tickets"
        })
    
    # 8. New Clients (registered in last 24h, not onboarded)
    yesterday = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    new_client_q = {
        "user_type": {"$ne": "internal"},
        "is_onboarded": {"$ne": True},
        "created_at": {"$gte": yesterday.isoformat()}
    }
    if user_region_q:
        new_client_q.update(user_region_q)
    new_clients = await db.users.count_documents(new_client_q)
    if new_clients > 0:
        notifications.append({
            "type": "new_client",
            "title": "Novos Clientes (Aguardando Onboarding)",
            "count": new_clients,
            "icon": "UserPlus",
            "color": "cyan",
            "link": "/dashboard/admin/users"
        })
    
    # 9. Pending OTC Quotes (filter by country/region)
    otc_deal_q = {"status": "awaiting_quote"}
    pending_otc = await db.otc_deals.count_documents(otc_deal_q)
    if pending_otc > 0:
        notifications.append({
            "type": "otc_quote",
            "title": "Cotações OTC Pendentes",
            "count": pending_otc,
            "icon": "Briefcase",
            "color": "amber",
            "link": "/dashboard/otc/leads"
        })
    
    # 10. New CRM Leads (filter by client country/region)
    crm_lead_q = {"status": {"$in": ["new", "contacted"]}}
    if country_q:
        crm_lead_q.update(country_q)
    new_leads = await db.crm_leads.count_documents(crm_lead_q)
    if new_leads > 0:
        notifications.append({
            "type": "crm_lead",
            "title": "Leads CRM Pendentes",
            "count": new_leads,
            "icon": "UserPlus",
            "color": "cyan",
            "link": "/dashboard/crm"
        })

    # 11. New OTC Leads (filter by client country/region)
    otc_lead_q = {"status": {"$in": ["new", "contacted", "pre_qualified"]}}
    if country_q:
        otc_lead_q.update(country_q)
    new_otc_leads = await db.otc_leads.count_documents(otc_lead_q)
    if new_otc_leads > 0:
        notifications.append({
            "type": "otc_lead",
            "title": "Leads OTC Pendentes",
            "count": new_otc_leads,
            "icon": "Briefcase",
            "color": "orange",
            "link": "/dashboard/otc/leads"
        })
    
    # Calculate total
    total_count = sum(n["count"] for n in notifications)
    
    return {
        "notifications": notifications,
        "total_count": total_count
    }


@router.get("/summary")
async def get_notifications_summary(user: dict = Depends(get_internal_user)):
    """Get quick summary count of all pending notifications, filtered by region"""
    total = 0
    
    region_countries = _get_region_filter(user)
    user_region_q = _region_user_query(user)
    country_q = {"country": {"$in": region_countries}} if region_countries else {}
    
    # For user-based records, get regional user IDs
    region_uids = []
    if user_region_q:
        region_users = await db.users.find({**user_region_q, "user_type": "client"}, {"id": 1}).to_list(5000)
        region_uids = [u["id"] for u in region_users if u.get("id")]
    
    uid_filter = {"user_id": {"$in": region_uids}} if user_region_q and region_uids else {}
    
    # Count pending items with region filtering
    total += await db.bank_transfers.count_documents({**{"status": "pending"}, **uid_filter})
    total += await db.admission_payments.count_documents({**{"status": "pending"}, **uid_filter})
    total += await db.fiat_withdrawals.count_documents({**{"status": "pending"}, **uid_filter})
    total += await db.crypto_withdrawals.count_documents({**{"status": "pending"}, **uid_filter})
    total += await db.users.count_documents({**{"kyc_status": "pending"}, **user_region_q})
    total += await db.bank_accounts.count_documents({**{"status": "pending"}, **uid_filter})
    total += await db.tickets.count_documents({**{"status": {"$in": ["open", "in_progress"]}}, **uid_filter})
    total += await db.otc_deals.count_documents({"status": "awaiting_quote"})
    total += await db.crm_leads.count_documents({**{"status": {"$in": ["new", "contacted"]}}, **country_q})
    total += await db.otc_leads.count_documents({**{"status": {"$in": ["new", "contacted", "pre_qualified"]}}, **country_q})
    
    return {"total": total}
