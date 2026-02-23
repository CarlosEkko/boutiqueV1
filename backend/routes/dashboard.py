from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import List, Optional
from models.dashboard import (
    InvestmentOpportunity, UserInvestment, Transaction, 
    Wallet, TransparencyReport, PublicWallet,
    InvestmentStatus, TransactionType
)
from models.user import KYCStatus
from utils.auth import get_current_user_id
import uuid

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Database reference
db = None


def set_db(database):
    global db
    db = database


# ==================== MIDDLEWARE: Check Approved User ====================

async def get_approved_user(user_id: str = Depends(get_current_user_id)):
    """Check if user is approved for dashboard access"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_approved", False):
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Your account is pending approval."
        )
    
    return user


# ==================== PORTFOLIO OVERVIEW ====================

@router.get("/overview")
async def get_portfolio_overview(user: dict = Depends(get_approved_user)):
    """Get portfolio overview with total value and allocation"""
    user_id = user["id"]
    
    # Get user's wallets
    wallets = await db.wallets.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Get user's active investments
    investments = await db.user_investments.find(
        {"user_id": user_id, "status": InvestmentStatus.ACTIVE},
        {"_id": 0}
    ).to_list(100)
    
    # Get recent transactions
    transactions = await db.transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    # Calculate totals (mock prices for now)
    mock_prices = {
        "BTC": 95000,
        "ETH": 3200,
        "USDT": 1,
        "USDC": 1,
        "SOL": 180,
        "ADA": 0.95
    }
    
    total_wallet_value = 0
    wallet_allocation = []
    
    for wallet in wallets:
        asset = wallet.get("asset_id", "USDT")
        balance = wallet.get("balance", 0)
        price = mock_prices.get(asset, 1)
        value = balance * price
        total_wallet_value += value
        
        if balance > 0:
            wallet_allocation.append({
                "asset": asset,
                "balance": balance,
                "value_usd": value
            })
    
    total_invested = sum(inv.get("amount", 0) for inv in investments)
    expected_returns = sum(inv.get("expected_return", 0) for inv in investments)
    
    return {
        "total_portfolio_value": total_wallet_value + total_invested,
        "wallet_value": total_wallet_value,
        "invested_value": total_invested,
        "expected_returns": expected_returns,
        "wallet_allocation": wallet_allocation,
        "active_investments": len(investments),
        "recent_transactions": transactions[:5],
        "kyc_status": user.get("kyc_status", "not_started"),
        "membership_level": user.get("membership_level", "standard")
    }


# ==================== WALLETS ====================

@router.get("/wallets", response_model=List[dict])
async def get_user_wallets(user: dict = Depends(get_approved_user)):
    """Get all wallets for the user"""
    wallets = await db.wallets.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    return wallets


@router.get("/wallets/{asset_id}")
async def get_wallet_details(
    asset_id: str,
    user: dict = Depends(get_approved_user)
):
    """Get wallet details for a specific asset"""
    wallet = await db.wallets.find_one(
        {"user_id": user["id"], "asset_id": asset_id.upper()},
        {"_id": 0}
    )
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Get transactions for this wallet
    transactions = await db.transactions.find(
        {"user_id": user["id"], "currency": asset_id.upper()},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        **wallet,
        "transactions": transactions
    }


# ==================== TRANSACTIONS ====================

@router.get("/transactions")
async def get_transactions(
    type: Optional[TransactionType] = None,
    currency: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: dict = Depends(get_approved_user)
):
    """Get transaction history with filters"""
    query = {"user_id": user["id"]}
    
    if type:
        query["type"] = type
    if currency:
        query["currency"] = currency.upper()
    
    transactions = await db.transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).to_list(limit)
    
    total = await db.transactions.count_documents(query)
    
    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ==================== INVESTMENTS ====================

@router.get("/investments/opportunities", response_model=List[dict])
async def get_investment_opportunities(
    status: Optional[InvestmentStatus] = InvestmentStatus.OPEN,
    user: dict = Depends(get_approved_user)
):
    """Get available investment opportunities"""
    query = {}
    if status:
        query["status"] = status
    
    opportunities = await db.investment_opportunities.find(
        query,
        {"_id": 0}
    ).to_list(100)
    
    return opportunities


@router.get("/investments/my")
async def get_my_investments(
    status: Optional[InvestmentStatus] = None,
    user: dict = Depends(get_approved_user)
):
    """Get user's investments"""
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    investments = await db.user_investments.find(
        query,
        {"_id": 0}
    ).sort("invested_at", -1).to_list(100)
    
    # Enrich with opportunity details
    enriched = []
    for inv in investments:
        opp = await db.investment_opportunities.find_one(
            {"id": inv.get("opportunity_id")},
            {"_id": 0}
        )
        enriched.append({
            **inv,
            "opportunity": opp
        })
    
    return enriched


@router.post("/investments/{opportunity_id}/invest")
async def invest_in_opportunity(
    opportunity_id: str,
    amount: float,
    user: dict = Depends(get_approved_user)
):
    """Invest in an opportunity"""
    # Get opportunity
    opportunity = await db.investment_opportunities.find_one(
        {"id": opportunity_id, "status": InvestmentStatus.OPEN},
        {"_id": 0}
    )
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found or closed")
    
    # Validate amount
    if amount < opportunity.get("min_investment", 0):
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum investment is {opportunity['min_investment']} {opportunity['currency']}"
        )
    
    if amount > opportunity.get("max_investment", float('inf')):
        raise HTTPException(
            status_code=400,
            detail=f"Maximum investment is {opportunity['max_investment']} {opportunity['currency']}"
        )
    
    # Check available pool
    remaining = opportunity["total_pool"] - opportunity.get("current_pool", 0)
    if amount > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Only {remaining} {opportunity['currency']} available in pool"
        )
    
    # Check user's wallet balance
    wallet = await db.wallets.find_one(
        {"user_id": user["id"], "asset_id": opportunity["currency"]},
        {"_id": 0}
    )
    
    if not wallet or wallet.get("available_balance", 0) < amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance"
        )
    
    # Calculate expected return
    roi = opportunity.get("expected_roi", 0) / 100
    duration_days = opportunity.get("duration_days", 30)
    expected_return = amount * roi
    
    # Create investment
    investment = UserInvestment(
        user_id=user["id"],
        opportunity_id=opportunity_id,
        amount=amount,
        currency=opportunity["currency"],
        expected_return=expected_return
    )
    
    inv_dict = investment.model_dump()
    inv_dict["invested_at"] = inv_dict["invested_at"].isoformat()
    await db.user_investments.insert_one(inv_dict)
    
    # Update wallet balance
    await db.wallets.update_one(
        {"user_id": user["id"], "asset_id": opportunity["currency"]},
        {
            "$inc": {
                "balance": -amount,
                "available_balance": -amount
            }
        }
    )
    
    # Update opportunity pool
    await db.investment_opportunities.update_one(
        {"id": opportunity_id},
        {"$inc": {"current_pool": amount}}
    )
    
    # Create transaction record
    tx = Transaction(
        user_id=user["id"],
        type=TransactionType.INVESTMENT,
        amount=amount,
        currency=opportunity["currency"],
        description=f"Investment in {opportunity['name']}",
        reference_id=investment.id
    )
    tx_dict = tx.model_dump()
    tx_dict["created_at"] = tx_dict["created_at"].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "investment_id": investment.id,
        "amount": amount,
        "expected_return": expected_return,
        "message": "Investment successful"
    }


# ==================== ROI ====================

@router.get("/roi")
async def get_roi_summary(user: dict = Depends(get_approved_user)):
    """Get ROI summary for all investments"""
    investments = await db.user_investments.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    total_invested = 0
    total_expected_returns = 0
    total_actual_returns = 0
    completed_investments = 0
    active_investments = 0
    
    investment_details = []
    
    for inv in investments:
        opp = await db.investment_opportunities.find_one(
            {"id": inv.get("opportunity_id")},
            {"_id": 0}
        )
        
        amount = inv.get("amount", 0)
        expected = inv.get("expected_return", 0)
        actual = inv.get("actual_return", 0) or 0
        
        total_invested += amount
        total_expected_returns += expected
        
        if inv.get("status") == InvestmentStatus.COMPLETED:
            total_actual_returns += actual
            completed_investments += 1
        elif inv.get("status") == InvestmentStatus.ACTIVE:
            active_investments += 1
        
        investment_details.append({
            "id": inv.get("id"),
            "opportunity_name": opp.get("name") if opp else "Unknown",
            "amount": amount,
            "currency": inv.get("currency"),
            "expected_return": expected,
            "actual_return": actual,
            "roi_percentage": (expected / amount * 100) if amount > 0 else 0,
            "status": inv.get("status"),
            "invested_at": inv.get("invested_at")
        })
    
    return {
        "total_invested": total_invested,
        "total_expected_returns": total_expected_returns,
        "total_actual_returns": total_actual_returns,
        "overall_roi_percentage": (total_expected_returns / total_invested * 100) if total_invested > 0 else 0,
        "realized_roi_percentage": (total_actual_returns / total_invested * 100) if total_invested > 0 else 0,
        "active_investments": active_investments,
        "completed_investments": completed_investments,
        "investments": investment_details
    }


# ==================== TRANSPARENCY ====================

@router.get("/transparency/reports", response_model=List[dict])
async def get_transparency_reports(user: dict = Depends(get_approved_user)):
    """Get transparency and audit reports"""
    reports = await db.transparency_reports.find(
        {},
        {"_id": 0}
    ).sort("report_date", -1).to_list(50)
    
    return reports


@router.get("/transparency/reserves")
async def get_proof_of_reserves(user: dict = Depends(get_approved_user)):
    """Get proof of reserves with public wallet addresses"""
    public_wallets = await db.public_wallets.find(
        {},
        {"_id": 0}
    ).to_list(100)
    
    # Calculate total reserves
    total_by_asset = {}
    for wallet in public_wallets:
        asset = wallet.get("asset_id")
        balance = wallet.get("balance", 0)
        if asset in total_by_asset:
            total_by_asset[asset] += balance
        else:
            total_by_asset[asset] = balance
    
    return {
        "wallets": public_wallets,
        "totals_by_asset": total_by_asset,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
