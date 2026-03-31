"""
Risk & Compliance Routes - KYT Forensic Queue & Risk Dashboard
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk-compliance", tags=["Risk & Compliance"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db

from routes.auth import get_current_user

async def get_current_user_id(current_user=Depends(get_current_user)):
    if hasattr(current_user, 'id'):
        return current_user.id
    return current_user["id"]


# ==================== KYT FORENSIC QUEUE ====================

@router.get("/kyt/queue")
async def get_kyt_queue(
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Get all wallets pending KYT analysis across all deals"""
    db = get_db()

    # Get all compliance records with wallets
    compliance_records = await db.otc_compliance.find({}, {"_id": 0}).to_list(500)

    queue = []
    for record in compliance_records:
        deal_id = record.get("deal_id")
        # Get deal info
        deal = await db.otc_deals.find_one({"id": deal_id}, {"_id": 0, "deal_number": 1, "client_name": 1, "asset": 1, "quantity": 1, "status": 1})
        if not deal:
            continue

        for wallet in record.get("wallets", []):
            wallet_status = wallet.get("status", "pending")
            if status and wallet_status != status:
                continue

            queue.append({
                "wallet_id": wallet.get("id"),
                "address": wallet.get("address"),
                "blockchain": wallet.get("blockchain"),
                "wallet_type": wallet.get("wallet_type"),
                "status": wallet_status,
                "description": wallet.get("description"),
                "added_at": wallet.get("added_at"),
                "verified_at": wallet.get("verified_at"),
                "kyt_score": wallet.get("kyt_score"),
                "kyt_flags": wallet.get("kyt_flags", []),
                "kyt_notes": wallet.get("kyt_notes"),
                "kyt_analyst": wallet.get("kyt_analyst"),
                "kyt_analyzed_at": wallet.get("kyt_analyzed_at"),
                "deal_id": deal_id,
                "deal_number": deal.get("deal_number"),
                "client_name": deal.get("client_name"),
                "deal_asset": deal.get("asset"),
                "deal_quantity": deal.get("quantity"),
                "deal_status": deal.get("status"),
            })

    # Sort: pending first, then by date
    queue.sort(key=lambda x: (0 if x["status"] == "pending" else 1, x.get("added_at", "")))
    return queue


@router.put("/kyt/analyze/{deal_id}/{wallet_id}")
async def analyze_wallet(
    deal_id: str,
    wallet_id: str,
    kyt_score: int = 0,
    kyt_flags: str = "",
    kyt_notes: str = "",
    kyt_status: str = "pending",
    user_id: str = Depends(get_current_user_id)
):
    """Analyze a wallet - set KYT score, flags, notes and status"""
    db = get_db()

    # Get analyst name
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
    analyst_name = user.get("name", "Unknown") if user else "Unknown"

    flags_list = [f.strip() for f in kyt_flags.split(",") if f.strip()] if kyt_flags else []

    # Update the specific wallet in the compliance record
    result = await db.otc_compliance.update_one(
        {"deal_id": deal_id, "wallets.id": wallet_id},
        {"$set": {
            "wallets.$.status": "verified" if kyt_status in ["clean", "verified"] else "flagged" if kyt_status == "flagged" else "failed" if kyt_status == "rejected" else "pending",
            "wallets.$.kyt_score": kyt_score,
            "wallets.$.kyt_flags": flags_list,
            "wallets.$.kyt_notes": kyt_notes,
            "wallets.$.kyt_status": kyt_status,
            "wallets.$.kyt_analyst": analyst_name,
            "wallets.$.kyt_analyzed_at": datetime.now(timezone.utc).isoformat(),
            "wallets.$.verified_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Carteira não encontrada")

    # Also update the overall KYT section of the compliance record
    compliance = await db.otc_compliance.find_one({"deal_id": deal_id}, {"_id": 0})
    if compliance:
        wallets = compliance.get("wallets", [])
        if wallets:
            avg_score = sum(w.get("kyt_score", 0) for w in wallets if w.get("kyt_score")) // max(1, len([w for w in wallets if w.get("kyt_score")]))
            all_flags = []
            for w in wallets:
                all_flags.extend(w.get("kyt_flags", []))

            overall_kyt_status = "clean"
            if any(w.get("kyt_status") == "rejected" for w in wallets):
                overall_kyt_status = "rejected"
            elif any(w.get("kyt_status") == "flagged" for w in wallets):
                overall_kyt_status = "flagged"
            elif all(w.get("kyt_status") in ["clean", "verified"] for w in wallets if w.get("kyt_status")):
                overall_kyt_status = "clean"

            await db.otc_compliance.update_one(
                {"deal_id": deal_id},
                {"$set": {
                    "kyt.risk_score": avg_score,
                    "kyt.flags": list(set(all_flags)),
                    "kyt.status": overall_kyt_status,
                    "kyt.analyst_notes": kyt_notes,
                }}
            )

    return {"success": True, "message": "Análise KYT guardada"}


# ==================== RISK DASHBOARD ====================

@router.get("/dashboard")
async def risk_dashboard(user_id: str = Depends(get_current_user_id)):
    """Get risk dashboard KPIs"""
    db = get_db()

    # Get all compliance records
    compliance_records = await db.otc_compliance.find({}, {"_id": 0}).to_list(500)

    total_wallets = 0
    pending_wallets = 0
    verified_wallets = 0
    flagged_wallets = 0
    rejected_wallets = 0
    high_risk_deals = 0
    compliant_deals = 0
    pending_deals = 0

    for record in compliance_records:
        wallets = record.get("wallets", [])
        total_wallets += len(wallets)

        for w in wallets:
            s = w.get("status", "pending")
            if s == "pending":
                pending_wallets += 1
            elif s == "verified":
                verified_wallets += 1
            elif s == "flagged":
                flagged_wallets += 1
            elif s == "failed":
                rejected_wallets += 1

        overall = record.get("overall_status", "pending")
        if overall == "approved":
            compliant_deals += 1
        elif overall == "pending":
            pending_deals += 1

        kyt = record.get("kyt", {})
        if kyt.get("status") in ["flagged", "rejected"]:
            high_risk_deals += 1

    # Get total active deals
    total_deals = await db.otc_deals.count_documents({"status": {"$nin": ["closed", "cancelled"]}})

    # Recent activity
    recent_analyses = []
    for record in compliance_records:
        for w in record.get("wallets", []):
            if w.get("kyt_analyzed_at"):
                deal = await db.otc_deals.find_one({"id": record["deal_id"]}, {"_id": 0, "deal_number": 1, "client_name": 1})
                recent_analyses.append({
                    "address": w.get("address", "")[:16] + "...",
                    "blockchain": w.get("blockchain"),
                    "score": w.get("kyt_score", 0),
                    "status": w.get("kyt_status", "pending"),
                    "analyst": w.get("kyt_analyst"),
                    "analyzed_at": w.get("kyt_analyzed_at"),
                    "deal_number": deal.get("deal_number") if deal else "N/A",
                    "client_name": deal.get("client_name") if deal else "N/A",
                })

    recent_analyses.sort(key=lambda x: x.get("analyzed_at", ""), reverse=True)

    return {
        "kpis": {
            "total_deals": total_deals,
            "compliant_deals": compliant_deals,
            "pending_deals": pending_deals,
            "high_risk_deals": high_risk_deals,
            "total_wallets": total_wallets,
            "pending_wallets": pending_wallets,
            "verified_wallets": verified_wallets,
            "flagged_wallets": flagged_wallets,
            "rejected_wallets": rejected_wallets,
        },
        "recent_analyses": recent_analyses[:10],
    }
