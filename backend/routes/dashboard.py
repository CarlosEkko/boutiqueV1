from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone, timedelta
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
    """Check if user is approved for dashboard access. In demo mode, swaps to demo client."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_approved", False):
        raise HTTPException(
            status_code=403, 
            detail="Access denied. Your account is pending approval."
        )
    
    # Demo mode: swap identity to demo client for rich data viewing
    if user.get("demo_mode"):
        from routes.demo import DEMO_CLIENT_ID
        demo_user = await db.users.find_one({"id": DEMO_CLIENT_ID}, {"_id": 0})
        if demo_user:
            demo_user["_real_user_id"] = user_id
            demo_user["demo_mode"] = True
            demo_user["is_admin"] = user.get("is_admin", False)
            demo_user["is_approved"] = True
            return demo_user
    
    return user


# ==================== PORTFOLIO OVERVIEW ====================

@router.get("/overview")
async def get_portfolio_overview(user: dict = Depends(get_approved_user)):
    """Get portfolio overview with total value and allocation"""
    user_id = user["id"]
    
    # Get user's wallets
    wallets = await db.wallets.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Check and create fiat wallets if missing
    fiat_currencies = [
        {"asset_id": "EUR", "asset_name": "Euro", "asset_type": "fiat", "symbol": "€"},
        {"asset_id": "USD", "asset_name": "US Dollar", "asset_type": "fiat", "symbol": "$"},
        {"asset_id": "AED", "asset_name": "UAE Dirham", "asset_type": "fiat", "symbol": "د.إ"},
        {"asset_id": "BRL", "asset_name": "Brazilian Real", "asset_type": "fiat", "symbol": "R$"},
        {"asset_id": "GBP", "asset_name": "British Pound", "asset_type": "fiat", "symbol": "£"},
        {"asset_id": "CHF", "asset_name": "Swiss Franc", "asset_type": "fiat", "symbol": "CHF"},
        {"asset_id": "QAR", "asset_name": "Qatari Riyal", "asset_type": "fiat", "symbol": "QAR"},
        {"asset_id": "SAR", "asset_name": "Saudi Riyal", "asset_type": "fiat", "symbol": "SAR"},
        {"asset_id": "HKD", "asset_name": "Hong Kong Dollar", "asset_type": "fiat", "symbol": "HK$"},
    ]
    
    existing_asset_ids = {w.get("asset_id") for w in wallets}
    
    for fiat in fiat_currencies:
        if fiat["asset_id"] not in existing_asset_ids:
            new_wallet = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "asset_id": fiat["asset_id"],
                "asset_name": fiat["asset_name"],
                "asset_type": fiat["asset_type"],
                "symbol": fiat["symbol"],
                "address": None,
                "balance": 0,
                "available_balance": 0,
                "pending_balance": 0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.wallets.insert_one(new_wallet)
            wallets.append(new_wallet)
    
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
    
    # Calculate totals (mock prices for crypto, 1:1 for stablecoins and fiat)
    mock_prices = {
        "BTC": 95000,
        "ETH": 3200,
        "USDT": 1,
        "USDC": 1,
        "SOL": 180,
        "ADA": 0.95,
        # Fiat currencies (converted to USD)
        "EUR": 1.08,
        "USD": 1,
        "AED": 0.27,
        "BRL": 0.17
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
    """Get all wallets for the user - creates missing wallets for approved users"""
    user_id = user["id"]
    
    # Get existing wallets
    wallets = await db.wallets.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    existing_asset_ids = {w.get("asset_id") for w in wallets}
    
    # Define all assets (fiat + 50 cryptos)
    fiat_assets = [
        {"asset_id": "EUR", "asset_name": "Euro", "asset_type": "fiat", "symbol": "€"},
        {"asset_id": "USD", "asset_name": "US Dollar", "asset_type": "fiat", "symbol": "$"},
        {"asset_id": "AED", "asset_name": "UAE Dirham", "asset_type": "fiat", "symbol": "د.إ"},
        {"asset_id": "BRL", "asset_name": "Brazilian Real", "asset_type": "fiat", "symbol": "R$"},
    ]
    
    crypto_assets = [
        {"asset_id": "BTC", "asset_name": "Bitcoin"},
        {"asset_id": "ETH", "asset_name": "Ethereum"},
        {"asset_id": "USDT", "asset_name": "Tether"},
        {"asset_id": "BNB", "asset_name": "BNB"},
        {"asset_id": "SOL", "asset_name": "Solana"},
        {"asset_id": "XRP", "asset_name": "XRP"},
        {"asset_id": "USDC", "asset_name": "USD Coin"},
        {"asset_id": "ADA", "asset_name": "Cardano"},
        {"asset_id": "DOGE", "asset_name": "Dogecoin"},
        {"asset_id": "TRX", "asset_name": "TRON"},
        {"asset_id": "AVAX", "asset_name": "Avalanche"},
        {"asset_id": "LINK", "asset_name": "Chainlink"},
        {"asset_id": "TON", "asset_name": "Toncoin"},
        {"asset_id": "SHIB", "asset_name": "Shiba Inu"},
        {"asset_id": "DOT", "asset_name": "Polkadot"},
        {"asset_id": "BCH", "asset_name": "Bitcoin Cash"},
        {"asset_id": "NEAR", "asset_name": "NEAR Protocol"},
        {"asset_id": "MATIC", "asset_name": "Polygon"},
        {"asset_id": "LTC", "asset_name": "Litecoin"},
        {"asset_id": "UNI", "asset_name": "Uniswap"},
        {"asset_id": "ICP", "asset_name": "Internet Computer"},
        {"asset_id": "DAI", "asset_name": "Dai"},
        {"asset_id": "APT", "asset_name": "Aptos"},
        {"asset_id": "ETC", "asset_name": "Ethereum Classic"},
        {"asset_id": "ATOM", "asset_name": "Cosmos"},
        {"asset_id": "XLM", "asset_name": "Stellar"},
        {"asset_id": "XMR", "asset_name": "Monero"},
        {"asset_id": "OKB", "asset_name": "OKB"},
        {"asset_id": "FIL", "asset_name": "Filecoin"},
        {"asset_id": "HBAR", "asset_name": "Hedera"},
        {"asset_id": "ARB", "asset_name": "Arbitrum"},
        {"asset_id": "CRO", "asset_name": "Cronos"},
        {"asset_id": "MKR", "asset_name": "Maker"},
        {"asset_id": "VET", "asset_name": "VeChain"},
        {"asset_id": "INJ", "asset_name": "Injective"},
        {"asset_id": "OP", "asset_name": "Optimism"},
        {"asset_id": "AAVE", "asset_name": "Aave"},
        {"asset_id": "GRT", "asset_name": "The Graph"},
        {"asset_id": "RUNE", "asset_name": "THORChain"},
        {"asset_id": "ALGO", "asset_name": "Algorand"},
        {"asset_id": "FTM", "asset_name": "Fantom"},
        {"asset_id": "THETA", "asset_name": "Theta Network"},
        {"asset_id": "SAND", "asset_name": "The Sandbox"},
        {"asset_id": "AXS", "asset_name": "Axie Infinity"},
        {"asset_id": "MANA", "asset_name": "Decentraland"},
        {"asset_id": "EGLD", "asset_name": "MultiversX"},
        {"asset_id": "EOS", "asset_name": "EOS"},
        {"asset_id": "XTZ", "asset_name": "Tezos"},
        {"asset_id": "FLOW", "asset_name": "Flow"},
        {"asset_id": "NEO", "asset_name": "Neo"},
    ]
    
    all_assets = fiat_assets + [{"asset_type": "crypto", **c} for c in crypto_assets]
    
    # Get user's Fireblocks vault for real addresses
    fireblocks_vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    fireblocks_assets = {}
    if fireblocks_vault:
        for asset in fireblocks_vault.get("assets", []):
            fireblocks_assets[asset.get("symbol")] = asset.get("deposit_address")
    
    # Create missing wallets
    for asset in all_assets:
        if asset["asset_id"] not in existing_asset_ids:
            # Get real address from Fireblocks if available, otherwise None
            real_address = None
            if asset.get("asset_type") == "crypto" and asset["asset_id"] in fireblocks_assets:
                real_address = fireblocks_assets[asset["asset_id"]]
            
            new_wallet = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "asset_id": asset["asset_id"],
                "asset_name": asset["asset_name"],
                "asset_type": asset.get("asset_type", "crypto"),
                "symbol": asset.get("symbol"),
                "address": real_address,
                "balance": 0,
                "available_balance": 0,
                "pending_balance": 0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.wallets.insert_one(new_wallet.copy())
            wallets.append(new_wallet)
    
    # Update existing crypto wallets with real Fireblocks addresses if needed
    for wallet in wallets:
        if wallet.get("asset_type") == "crypto":
            asset_id = wallet.get("asset_id")
            current_address = wallet.get("address")
            real_address = fireblocks_assets.get(asset_id)
            
            # Check if address needs updating:
            # 1. No address or mock address
            # 2. BTC should start with bc1, 1, or 3 (not 0x)
            # 3. SOL should be 32-44 chars base58 (not 0x)
            # 4. XRP should start with r (not 0x)
            # 5. Address doesn't match real Fireblocks address
            needs_update = False
            if not current_address or current_address.startswith("mock_"):
                needs_update = True
            elif asset_id == "BTC" and current_address.startswith("0x"):
                needs_update = True  # BTC can't have 0x address
            elif asset_id == "SOL" and current_address.startswith("0x"):
                needs_update = True  # SOL can't have 0x address
            elif asset_id == "XRP" and current_address.startswith("0x"):
                needs_update = True  # XRP can't have 0x address
            elif asset_id in ["DOGE", "LTC", "BCH"] and current_address.startswith("0x"):
                needs_update = True  # These can't have 0x addresses
            elif real_address and current_address != real_address:
                # Address doesn't match real Fireblocks address - update it
                needs_update = True
            
            if needs_update and real_address:
                await db.wallets.update_one(
                    {"user_id": user_id, "asset_id": asset_id},
                    {"$set": {"address": real_address}}
                )
                wallet["address"] = real_address
    
    # Fetch real balances from Fireblocks and update wallets
    # Only sync if Fireblocks vault exists and we can connect
    if fireblocks_vault:
        try:
            from services.fireblocks_service import FireblocksService
            vault_id = fireblocks_vault.get("fireblocks_vault_id")
            if vault_id:
                account = await FireblocksService.get_vault_account(vault_id)
                fb_assets = account.get("assets", [])
                
                # Create a mapping of Fireblocks balances
                fb_balances = {}
                for fb_asset in fb_assets:
                    # Map Fireblocks asset ID to our asset ID
                    fb_id = fb_asset.get("id", "")
                    # Remove common suffixes
                    clean_id = fb_id.replace("_TEST", "").replace("_ERC20", "").replace("_TEST3", "")
                    # Handle special cases like ETH_TEST3 -> ETH, BTC_TEST -> BTC
                    if clean_id.endswith("_"):
                        clean_id = clean_id[:-1]
                    
                    fb_balances[clean_id] = {
                        "total": float(fb_asset.get("total", 0)),
                        "available": float(fb_asset.get("available", 0)),
                        "pending": float(fb_asset.get("pending", 0))
                    }
                
                # Update wallet balances ONLY if Fireblocks returns data
                # This preserves webhook-updated balances when Fireblocks API fails
                if fb_balances:
                    for wallet in wallets:
                        if wallet.get("asset_type") == "crypto":
                            asset_id = wallet.get("asset_id")
                            if asset_id in fb_balances:
                                balance_data = fb_balances[asset_id]
                                wallet["balance"] = balance_data["total"]
                                wallet["available_balance"] = balance_data["available"]
                                wallet["pending_balance"] = balance_data["pending"]
                                
                                # Also update in database for persistence
                                await db.wallets.update_one(
                                    {"user_id": user_id, "asset_id": asset_id},
                                    {"$set": {
                                        "balance": balance_data["total"],
                                        "available_balance": balance_data["available"],
                                        "pending_balance": balance_data["pending"],
                                        "last_fireblocks_sync": datetime.now(timezone.utc).isoformat()
                                    }}
                                )
        except Exception as e:
            import logging
            logging.error(f"Error fetching Fireblocks balances: {e}")
            # On error, use balances from database (possibly updated via webhook)
            # Don't reset balances to 0
    
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
    status: Optional[InvestmentStatus] = None,
    user: dict = Depends(get_approved_user)
):
    """Get available investment opportunities filtered by user's region and tier"""
    user_region = user.get("region", "europe").lower()
    user_tier = user.get("membership_level", "standard").lower()
    
    # By default, show open and active opportunities
    query = {}
    if status:
        query["status"] = status.value
    else:
        # Show both open and active opportunities
        query["status"] = {"$in": ["open", "active"]}
    
    opportunities = await db.investment_opportunities.find(
        query,
        {"_id": 0}
    ).to_list(100)
    
    # Filter by user's region and tier
    filtered = []
    for opp in opportunities:
        allowed_regions = [r.lower() for r in opp.get("allowed_regions", [])]
        allowed_tiers = [t.lower() for t in opp.get("allowed_tiers", [])]
        
        # Empty list means available to ALL
        region_ok = len(allowed_regions) == 0 or user_region in allowed_regions or "all" in allowed_regions
        tier_ok = len(allowed_tiers) == 0 or user_tier in allowed_tiers or "all" in allowed_tiers
        
        if region_ok and tier_ok:
            # Add eligibility info
            opp["user_eligible"] = True
            filtered.append(opp)
    
    return filtered


@router.get("/investments/opportunities/all", response_model=List[dict])
async def get_all_investment_opportunities(
    status: Optional[InvestmentStatus] = None,
    user: dict = Depends(get_approved_user)
):
    """Get ALL investment opportunities with eligibility status"""
    user_region = user.get("region", "europe").lower()
    user_tier = user.get("membership_level", "standard").lower()
    
    query = {}
    if status:
        query["status"] = status
    
    opportunities = await db.investment_opportunities.find(
        query,
        {"_id": 0}
    ).to_list(100)
    
    # Add eligibility info to each opportunity
    for opp in opportunities:
        allowed_regions = [r.lower() for r in opp.get("allowed_regions", [])]
        allowed_tiers = [t.lower() for t in opp.get("allowed_tiers", [])]
        
        # Empty list means available to ALL
        region_ok = len(allowed_regions) == 0 or user_region in allowed_regions or "all" in allowed_regions
        tier_ok = len(allowed_tiers) == 0 or user_tier in allowed_tiers or "all" in allowed_tiers
        
        opp["user_eligible"] = region_ok and tier_ok
        opp["ineligible_reason"] = None
        if not region_ok:
            opp["ineligible_reason"] = f"Not available in your region ({user_region})"
        elif not tier_ok:
            opp["ineligible_reason"] = f"Requires {', '.join(allowed_tiers)} membership"
    
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
    user_region = user.get("region", "europe").lower()
    user_tier = user.get("membership_level", "standard").lower()
    
    # Get opportunity
    opportunity = await db.investment_opportunities.find_one(
        {"id": opportunity_id, "status": InvestmentStatus.OPEN},
        {"_id": 0}
    )
    
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found or closed")
    
    # Check region eligibility
    allowed_regions = [r.lower() for r in opportunity.get("allowed_regions", ["europe", "middle_east", "brazil"])]
    if user_region not in allowed_regions and "all" not in allowed_regions:
        raise HTTPException(
            status_code=403,
            detail=f"This opportunity is not available in your region"
        )
    
    # Check tier eligibility
    allowed_tiers = [t.lower() for t in opportunity.get("allowed_tiers", ["standard", "premium", "vip"])]
    if user_tier not in allowed_tiers and "all" not in allowed_tiers:
        raise HTTPException(
            status_code=403,
            detail=f"This opportunity requires {', '.join(allowed_tiers)} membership"
        )
    
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
    
    # Calculate expected return using fixed + variable rates
    fixed_rate = opportunity.get("fixed_rate", 0) / 100
    variable_rate = opportunity.get("variable_rate", 0) / 100
    # For now, use full variable rate; actual may vary based on performance
    total_rate = fixed_rate + variable_rate
    expected_return = amount * total_rate
    
    # Calculate maturity date
    duration_days = opportunity.get("duration_days", 30)
    maturity_date = datetime.now(timezone.utc) + timedelta(days=duration_days)
    
    # Create investment
    investment = UserInvestment(
        user_id=user["id"],
        opportunity_id=opportunity_id,
        amount=amount,
        currency=opportunity["currency"],
        expected_return=expected_return
    )
    
    inv_dict = investment.model_dump()
    inv_dict["invested_at"] = datetime.now(timezone.utc).isoformat()
    inv_dict["maturity_date"] = maturity_date.isoformat()
    inv_dict["fixed_rate"] = opportunity.get("fixed_rate", 0)
    inv_dict["variable_rate"] = opportunity.get("variable_rate", 0)
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
