from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
from routes.admin import get_admin_user, get_internal_user
import logging

router = APIRouter(prefix="/finance", tags=["Finance"])

db = None
logger = logging.getLogger(__name__)


def set_db(database):
    global db
    db = database


@router.get("/dashboard")
async def get_finance_dashboard(admin: dict = Depends(get_internal_user)):
    """Aggregated financial dashboard data for admin/finance staff"""
    now = datetime.now(timezone.utc)
    day_ago = (now - timedelta(days=1)).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    # --- AUM: Sum all client wallet balances ---
    wallets = await db.wallets.find({}, {"_id": 0, "balance": 1, "asset_id": 1, "asset_type": 1, "user_id": 1}).to_list(50000)

    # Approximate USD rates for aggregation
    usd_rates = {
        "EUR": 1.08, "USD": 1.0, "AED": 0.27, "BRL": 0.17,
        "BTC": 95000, "ETH": 3200, "USDT": 1, "USDC": 1,
        "SOL": 180, "XRP": 2.5, "BNB": 600, "ADA": 0.95,
        "DOGE": 0.32, "DOT": 7.5, "AVAX": 35, "LINK": 15,
    }

    total_aum_usd = 0
    fiat_total = 0
    crypto_total = 0
    asset_breakdown = {}
    client_aum = {}

    for w in wallets:
        bal = w.get("balance", 0)
        if bal <= 0:
            continue
        asset = w.get("asset_id", "")
        rate = usd_rates.get(asset, 1)
        val_usd = bal * rate
        total_aum_usd += val_usd

        if w.get("asset_type") == "fiat":
            fiat_total += val_usd
        else:
            crypto_total += val_usd

        asset_breakdown[asset] = asset_breakdown.get(asset, 0) + val_usd

        uid = w.get("user_id", "")
        client_aum[uid] = client_aum.get(uid, 0) + val_usd

    # --- Revenue: admission fees (paid) + trading order fees ---
    admission_pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    adm_result = await db.admission_payments.aggregate(admission_pipeline).to_list(1)
    admission_revenue = adm_result[0]["total"] if adm_result else 0
    admission_count = adm_result[0]["count"] if adm_result else 0

    order_pipeline = [
        {"$match": {"status": {"$in": ["completed", "processing"]}}},
        {"$group": {"_id": None, "total_fees": {"$sum": "$fee_amount"}, "total_volume": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
    ]
    order_result = await db.trading_orders.aggregate(order_pipeline).to_list(1)
    trading_fee_revenue = order_result[0]["total_fees"] if order_result else 0
    trading_volume_total = order_result[0]["total_volume"] if order_result else 0
    trading_count = order_result[0]["count"] if order_result else 0

    total_revenue = admission_revenue + trading_fee_revenue

    # --- Trading Volume by period ---
    async def volume_since(since_iso):
        pipeline = [
            {"$match": {"created_at": {"$gte": since_iso}, "status": {"$in": ["completed", "processing", "awaiting_payment"]}}},
            {"$group": {"_id": None, "vol": {"$sum": "$total_amount"}, "count": {"$sum": 1}}}
        ]
        r = await db.trading_orders.aggregate(pipeline).to_list(1)
        return {"volume": r[0]["vol"] if r else 0, "count": r[0]["count"] if r else 0}

    vol_24h = await volume_since(day_ago)
    vol_7d = await volume_since(week_ago)
    vol_30d = await volume_since(month_ago)

    # --- Pending Operations ---
    pending_deposits = await db.bank_transfers.count_documents({"status": "pending_proof"})
    pending_deposits += await db.bank_transfers.count_documents({"status": "submitted"})
    pending_withdrawals = await db.fiat_withdrawals.count_documents({"status": {"$in": ["pending", "processing"]}})
    pending_orders = await db.trading_orders.count_documents({"status": "awaiting_payment"})

    # --- Revenue trend (last 30 days, grouped by day) ---
    revenue_trend = []
    for i in range(30, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        ds = day_start.isoformat()
        de = day_end.isoformat()

        # Admission fees paid on this day
        adm_day = await db.admission_payments.aggregate([
            {"$match": {"status": "paid", "paid_at": {"$gte": ds, "$lt": de}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)

        # Trading fees on this day
        trade_day = await db.trading_orders.aggregate([
            {"$match": {"status": {"$in": ["completed", "processing"]}, "created_at": {"$gte": ds, "$lt": de}}},
            {"$group": {"_id": None, "total": {"$sum": "$fee_amount"}}}
        ]).to_list(1)

        day_revenue = (adm_day[0]["total"] if adm_day else 0) + (trade_day[0]["total"] if trade_day else 0)
        revenue_trend.append({
            "date": day_start.strftime("%d/%m"),
            "revenue": round(day_revenue, 2)
        })

    # --- Asset Distribution (top assets by value) ---
    sorted_assets = sorted(asset_breakdown.items(), key=lambda x: x[1], reverse=True)
    asset_distribution = []
    other_val = 0
    for idx, (asset, val) in enumerate(sorted_assets):
        if idx < 8:
            asset_distribution.append({"asset": asset, "value": round(val, 2)})
        else:
            other_val += val
    if other_val > 0:
        asset_distribution.append({"asset": "Outros", "value": round(other_val, 2)})

    # --- Top Clients by AUM ---
    sorted_clients = sorted(client_aum.items(), key=lambda x: x[1], reverse=True)[:10]
    top_clients = []
    for uid, aum_val in sorted_clients:
        user = await db.users.find_one({"id": uid}, {"_id": 0, "name": 1, "email": 1, "membership_level": 1, "region": 1})
        if user:
            top_clients.append({
                "name": user.get("name", "N/A"),
                "email": user.get("email", ""),
                "membership": user.get("membership_level", "standard"),
                "region": user.get("region", ""),
                "aum_usd": round(aum_val, 2)
            })

    # --- Recent financial transactions ---
    recent_orders = await db.trading_orders.find(
        {}, {"_id": 0, "id": 1, "user_email": 1, "order_type": 1, "crypto_symbol": 1, "total_amount": 1, "fee_amount": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(10)

    recent_deposits = await db.bank_transfers.find(
        {}, {"_id": 0, "id": 1, "user_email": 1, "amount": 1, "currency": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(5)

    return {
        "aum": {
            "total_usd": round(total_aum_usd, 2),
            "fiat_usd": round(fiat_total, 2),
            "crypto_usd": round(crypto_total, 2),
        },
        "revenue": {
            "total": round(total_revenue, 2),
            "admission_fees": round(admission_revenue, 2),
            "admission_count": admission_count,
            "trading_fees": round(trading_fee_revenue, 2),
            "trading_count": trading_count,
        },
        "volume": {
            "h24": vol_24h,
            "d7": vol_7d,
            "d30": vol_30d,
            "all_time": round(trading_volume_total, 2),
        },
        "pending": {
            "deposits": pending_deposits,
            "withdrawals": pending_withdrawals,
            "orders": pending_orders,
        },
        "revenue_trend": revenue_trend,
        "asset_distribution": asset_distribution,
        "fiat_vs_crypto": {
            "fiat": round(fiat_total, 2),
            "crypto": round(crypto_total, 2),
        },
        "top_clients": top_clients,
        "recent_orders": recent_orders,
        "recent_deposits": recent_deposits,
    }
