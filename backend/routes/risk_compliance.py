"""
Risk & Compliance Routes - KYT Forensic Queue & Risk Dashboard
"""
from fastapi import APIRouter, HTTPException, Depends, Request
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
            kyt_status = wallet.get("kyt_status", "pending")
            if status and kyt_status != status:
                continue

            queue.append({
                "wallet_id": wallet.get("id"),
                "address": wallet.get("address"),
                "blockchain": wallet.get("blockchain"),
                "wallet_type": wallet.get("wallet_type"),
                "status": wallet.get("status", "pending"),
                "kyt_status": kyt_status,
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
    # Clamp score to 0-10
    kyt_score = max(0, min(10, kyt_score))
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



# ==================== KYC/KYB VERIFICATIONS ====================

@router.get("/kyc-verifications")
async def get_kyc_verifications(
    status: Optional[str] = None,
    verification_type: Optional[str] = None,
    search: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    List all Sumsub verification applicants with their current status.
    Joins sumsub_applicants with users to provide complete info.
    Optionally fetches live status from Sumsub API.
    """
    db = get_db()
    
    query = {}
    if status and status != "all":
        query["status"] = status
    if verification_type == "kyb":
        query["level_name"] = {"$regex": "kyb", "$options": "i"}
    elif verification_type == "kyc":
        query["$or"] = [
            {"level_name": {"$not": {"$regex": "kyb", "$options": "i"}}},
            {"level_name": {"$exists": False}}
        ]
    
    applicants = await db.sumsub_applicants.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
    
    results = []
    for app in applicants:
        app_user_id = app.get("user_id")
        
        # Get user info
        user = await db.users.find_one(
            {"id": app_user_id},
            {"_id": 0, "id": 1, "email": 1, "name": 1, "first_name": 1, "last_name": 1,
             "country": 1, "phone": 1, "kyc_status": 1, "company_name": 1, "membership_level": 1,
             "created_at": 1}
        )
        
        if not user:
            continue
        
        user_name = user.get("name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        
        # Apply search filter
        if search:
            search_lower = search.lower()
            searchable = f"{user_name} {user.get('email', '')} {user.get('company_name', '')}".lower()
            if search_lower not in searchable:
                continue
        
        is_kyb = "kyb" in (app.get("level_name") or "").lower()
        
        entry = {
            "user_id": app_user_id,
            "applicant_id": app.get("applicant_id"),
            "email": user.get("email", app.get("email", "")),
            "name": user_name,
            "company_name": user.get("company_name"),
            "country": user.get("country"),
            "phone": user.get("phone"),
            "membership_level": user.get("membership_level"),
            "verification_type": "kyb" if is_kyb else "kyc",
            "level_name": app.get("level_name"),
            "status": app.get("status", "init"),
            "review_answer": app.get("review_answer"),
            "review_status": app.get("review_status"),
            "reject_labels": app.get("reject_labels"),
            "reject_type": app.get("reject_type"),
            "moderation_comment": app.get("moderation_comment"),
            "docs_status": app.get("docs_status"),
            "created_at": app.get("created_at"),
            "updated_at": app.get("updated_at"),
            "reviewed_at": app.get("reviewed_at"),
            "sumsub_link": f"https://cockpit.sumsub.com/checkus#/applicant/{app.get('applicant_id')}" if app.get("applicant_id") else None,
        }
        results.append(entry)
    
    # Compute stats
    total = len(results)
    stats = {
        "total": total,
        "init": len([r for r in results if r["status"] == "init"]),
        "created": len([r for r in results if r["status"] == "created"]),
        "pending": len([r for r in results if r["status"] == "pending"]),
        "approved": len([r for r in results if r["status"] == "approved"]),
        "rejected": len([r for r in results if r["status"] == "rejected"]),
        "kyc_count": len([r for r in results if r["verification_type"] == "kyc"]),
        "kyb_count": len([r for r in results if r["verification_type"] == "kyb"]),
    }
    
    return {"verifications": results, "stats": stats}


@router.get("/kyc-verifications/{target_user_id}")
async def get_kyc_verification_detail(
    target_user_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get detailed verification info for a specific user.
    Fetches live data from Sumsub API including document statuses.
    """
    db = get_db()
    
    applicant = await db.sumsub_applicants.find_one({"user_id": target_user_id}, {"_id": 0})
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    user = await db.users.find_one(
        {"id": target_user_id},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "first_name": 1, "last_name": 1,
         "country": 1, "phone": 1, "kyc_status": 1, "company_name": 1, "membership_level": 1}
    )
    
    applicant_id = applicant.get("applicant_id")
    sumsub_data = None
    docs_status = None
    
    if applicant_id:
        try:
            from routes.sumsub import make_sumsub_request
            
            # Fetch applicant info from Sumsub
            resp = make_sumsub_request("GET", f"/resources/applicants/{applicant_id}")
            if resp.status_code == 200:
                sumsub_data = resp.json()
                # Update local record with latest review info
                review = sumsub_data.get("review", {})
                review_result = review.get("reviewResult", {})
                update_fields = {
                    "review_status": review.get("reviewStatus"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                if review_result.get("reviewAnswer"):
                    update_fields["review_answer"] = review_result["reviewAnswer"]
                    new_status = "approved" if review_result["reviewAnswer"] == "GREEN" else "rejected"
                    update_fields["status"] = new_status
                if review_result.get("rejectLabels"):
                    update_fields["reject_labels"] = review_result["rejectLabels"]
                
                await db.sumsub_applicants.update_one(
                    {"user_id": target_user_id},
                    {"$set": update_fields}
                )
            
            # Fetch document status
            docs_resp = make_sumsub_request("GET", f"/resources/applicants/{applicant_id}/requiredIdDocsStatus")
            if docs_resp.status_code == 200:
                docs_status = docs_resp.json()
                
        except Exception as e:
            logger.warning(f"Failed to fetch Sumsub data for {applicant_id}: {e}")
    
    is_kyb = "kyb" in (applicant.get("level_name") or "").lower()
    user_name = ""
    if user:
        user_name = user.get("name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    
    return {
        "user_id": target_user_id,
        "applicant_id": applicant_id,
        "email": user.get("email", applicant.get("email", "")) if user else applicant.get("email", ""),
        "name": user_name,
        "company_name": user.get("company_name") if user else None,
        "country": user.get("country") if user else None,
        "phone": user.get("phone") if user else None,
        "membership_level": user.get("membership_level") if user else None,
        "verification_type": "kyb" if is_kyb else "kyc",
        "level_name": applicant.get("level_name"),
        "status": applicant.get("status", "init"),
        "review_answer": applicant.get("review_answer"),
        "review_status": applicant.get("review_status"),
        "reject_labels": applicant.get("reject_labels"),
        "reject_type": applicant.get("reject_type"),
        "moderation_comment": applicant.get("moderation_comment"),
        "created_at": applicant.get("created_at"),
        "updated_at": applicant.get("updated_at"),
        "reviewed_at": applicant.get("reviewed_at"),
        "sumsub_link": f"https://cockpit.sumsub.com/checkus#/applicant/{applicant_id}" if applicant_id else None,
        "sumsub_data": sumsub_data,
        "docs_status": docs_status,
        "manual_review": applicant.get("manual_review", False),
        "manual_review_by": applicant.get("manual_review_by"),
        "manual_review_reason": applicant.get("manual_review_reason"),
    }


@router.post("/kyc-verifications/{target_user_id}/refresh")
async def refresh_kyc_verification(
    target_user_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Fetch latest status from Sumsub and update local records."""
    db = get_db()
    
    applicant = await db.sumsub_applicants.find_one({"user_id": target_user_id}, {"_id": 0})
    if not applicant or not applicant.get("applicant_id"):
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    applicant_id = applicant["applicant_id"]
    
    try:
        from routes.sumsub import make_sumsub_request
        
        resp = make_sumsub_request("GET", f"/resources/applicants/{applicant_id}")
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch from Sumsub")
        
        sumsub_data = resp.json()
        review = sumsub_data.get("review", {})
        review_result = review.get("reviewResult", {})
        review_answer = review_result.get("reviewAnswer")
        
        update_fields = {
            "review_status": review.get("reviewStatus"),
            "applicant_type": sumsub_data.get("type", "individual"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if review_answer:
            update_fields["review_answer"] = review_answer
            if review_answer == "GREEN":
                update_fields["status"] = "approved"
            elif review_answer == "RED":
                update_fields["status"] = "rejected"
        elif review.get("reviewStatus") == "pending":
            update_fields["status"] = "pending"
        
        if review_result.get("rejectLabels"):
            update_fields["reject_labels"] = review_result["rejectLabels"]
        if review_result.get("reviewRejectType"):
            update_fields["reject_type"] = review_result["reviewRejectType"]
        if review_result.get("moderationComment"):
            update_fields["moderation_comment"] = review_result["moderationComment"]
        
        # Fetch docs status too
        docs_resp = make_sumsub_request("GET", f"/resources/applicants/{applicant_id}/requiredIdDocsStatus")
        if docs_resp.status_code == 200:
            update_fields["docs_status"] = docs_resp.json()
        
        await db.sumsub_applicants.update_one(
            {"user_id": target_user_id},
            {"$set": update_fields}
        )
        
        # Sync user kyc_status
        if review_answer:
            kyc_status = "approved" if review_answer == "GREEN" else "rejected"
            await db.users.update_one(
                {"id": target_user_id},
                {"$set": {"kyc_status": kyc_status}}
            )
        
        return {"success": True, "status": update_fields.get("status", applicant.get("status")), "review_answer": review_answer}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing verification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kyc-verifications/{target_user_id}/manual-review")
async def manual_kyc_review(
    target_user_id: str,
    request: Request,
    user_id: str = Depends(get_current_user_id)
):
    """Manually approve or reject a KYC/KYB verification (fallback for Sumsub failures)."""
    db = get_db()
    data = await request.json()
    
    action = data.get("action")  # "approve" or "reject"
    reason = data.get("reason", "")
    
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Ação inválida. Use 'approve' ou 'reject'.")
    
    applicant = await db.sumsub_applicants.find_one({"user_id": target_user_id}, {"_id": 0})
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant não encontrado.")
    
    admin = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    admin_name = admin.get("name", admin.get("email", "")) if admin else ""
    
    new_status = "approved" if action == "approve" else "rejected"
    
    update_fields = {
        "status": new_status,
        "review_answer": "GREEN" if action == "approve" else "RED",
        "review_status": "completed",
        "manual_review": True,
        "manual_review_by": admin_name,
        "manual_review_reason": reason,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if action == "reject" and reason:
        update_fields["moderation_comment"] = reason
        update_fields["reject_labels"] = ["MANUAL_REVIEW"]
    
    await db.sumsub_applicants.update_one(
        {"user_id": target_user_id},
        {"$set": update_fields}
    )
    
    # Update user kyc_status
    await db.users.update_one(
        {"id": target_user_id},
        {"$set": {"kyc_status": new_status}}
    )
    
    logger.info(f"Manual KYC review: {action} for user {target_user_id} by {admin_name}. Reason: {reason}")
    
    return {"success": True, "status": new_status, "action": action}
