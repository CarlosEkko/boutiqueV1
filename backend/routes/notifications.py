from fastapi import APIRouter, Depends
from routes.admin import get_admin_user, get_internal_user
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])

db = None

def set_db(database):
    global db
    db = database


@router.get("/pending")
async def get_pending_notifications(user: dict = Depends(get_internal_user)):
    """Get all pending items that need approval/attention"""
    notifications = []
    
    # 1. Pending Fiat Deposits
    pending_deposits = await db.bank_transfers.count_documents({"status": "pending"})
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
    pending_admissions = await db.admission_payments.count_documents({"status": "pending"})
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
    pending_fiat_withdrawals = await db.fiat_withdrawals.count_documents({"status": "pending"})
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
    pending_crypto_withdrawals = await db.crypto_withdrawals.count_documents({"status": "pending"})
    if pending_crypto_withdrawals > 0:
        notifications.append({
            "type": "crypto_withdrawal",
            "title": "Levantamentos Crypto Pendentes",
            "count": pending_crypto_withdrawals,
            "icon": "Bitcoin",
            "color": "orange",
            "link": "/dashboard/admin/crypto-withdrawals"
        })
    
    # 5. Pending KYC Verifications
    pending_kyc = await db.users.count_documents({"kyc_status": "pending"})
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
    pending_bank_accounts = await db.bank_accounts.count_documents({"status": "pending"})
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
    open_tickets = await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})
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
    new_clients = await db.users.count_documents({
        "user_type": {"$ne": "internal"},
        "is_onboarded": {"$ne": True},
        "created_at": {"$gte": yesterday.isoformat()}
    })
    if new_clients > 0:
        notifications.append({
            "type": "new_client",
            "title": "Novos Clientes (Aguardando Onboarding)",
            "count": new_clients,
            "icon": "UserPlus",
            "color": "cyan",
            "link": "/dashboard/admin/users"
        })
    
    # 9. Pending OTC Quotes
    pending_otc = await db.otc_deals.count_documents({"status": "awaiting_quote"})
    if pending_otc > 0:
        notifications.append({
            "type": "otc_quote",
            "title": "Cotações OTC Pendentes",
            "count": pending_otc,
            "icon": "Briefcase",
            "color": "amber",
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
    """Get quick summary count of all pending notifications"""
    total = 0
    
    # Count all pending items
    total += await db.bank_transfers.count_documents({"status": "pending"})
    total += await db.admission_payments.count_documents({"status": "pending"})
    total += await db.fiat_withdrawals.count_documents({"status": "pending"})
    total += await db.crypto_withdrawals.count_documents({"status": "pending"})
    total += await db.users.count_documents({"kyc_status": "pending"})
    total += await db.bank_accounts.count_documents({"status": "pending"})
    total += await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})
    total += await db.otc_deals.count_documents({"status": "awaiting_quote"})
    
    return {"total": total}
