from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
from routes.admin import get_admin_user, get_internal_user
from services.fireblocks_service import FireblocksService
from services.email_service import BrevoEmailService
import logging

router = APIRouter(prefix="/finance", tags=["Finance"])

db = None
logger = logging.getLogger(__name__)

# Gas Station alert thresholds (in native units)
GAS_THRESHOLDS = {
    "ETH": {"warning": 0.1, "critical": 0.02},
    "BNB_BSC": {"warning": 0.1, "critical": 0.02},
    "MATIC_POLYGON": {"warning": 5.0, "critical": 1.0},
    "TRX": {"warning": 50, "critical": 10},
}

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

    # --- Gas Station Health ---
    gas_station = None
    try:
        gas_data = await _get_gas_station_data()
        gas_station = gas_data
    except Exception as e:
        logger.error(f"Gas station fetch failed in finance dashboard: {e}")
        gas_station = {"health": "unknown", "error": str(e)}

    # --- Pending Crypto Withdrawals ---
    pending_crypto_wd = await db.crypto_withdrawals.count_documents({"status": "pending"})
    processing_crypto_wd = await db.crypto_withdrawals.count_documents({"status": "processing"})

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
            "crypto_withdrawals": pending_crypto_wd,
            "crypto_processing": processing_crypto_wd,
        },
        "gas_station": gas_station,
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


async def _get_gas_station_data():
    """Fetch Gas Station vault data from Fireblocks"""
    accounts = await FireblocksService.get_vault_accounts()
    
    gas_vault = None
    for acc in accounts:
        name = (acc.get("name") or "").upper()
        if "GAS STATION" in name or "GAS_STATION" in name or "GASSTATION" in name:
            gas_vault = acc
            break
    
    if not gas_vault:
        return {"health": "unknown", "error": "Gas Station vault not found", "assets": [], "warnings": []}
    
    assets = []
    warnings = []
    health = "healthy"
    
    for asset in gas_vault.get("assets", []):
        asset_id = asset.get("id", "")
        total = float(asset.get("total", 0))
        available = float(asset.get("available", 0))
        
        # Only include gas-relevant assets
        thresholds = GAS_THRESHOLDS.get(asset_id)
        if total > 0 or thresholds:
            asset_data = {
                "asset_id": asset_id,
                "total": total,
                "available": available,
                "pending": float(asset.get("pending", 0)),
            }
            
            if thresholds:
                if available < thresholds["critical"]:
                    asset_data["status"] = "critical"
                    health = "critical"
                    warnings.append(f"{asset_id}: {available:.6f} — CRÍTICO (min: {thresholds['critical']})")
                elif available < thresholds["warning"]:
                    asset_data["status"] = "warning"
                    if health == "healthy":
                        health = "warning"
                    warnings.append(f"{asset_id}: {available:.6f} — BAIXO (min: {thresholds['warning']})")
                else:
                    asset_data["status"] = "healthy"
            else:
                asset_data["status"] = "ok"
            
            assets.append(asset_data)
    
    return {
        "vault_id": gas_vault.get("id"),
        "vault_name": gas_vault.get("name"),
        "health": health,
        "assets": assets,
        "warnings": warnings,
    }


@router.post("/gas-station/check-alerts")
async def check_gas_station_alerts(admin: dict = Depends(get_internal_user)):
    """Check Gas Station levels and send Brevo email alert if critical/low"""
    try:
        gas_data = await _get_gas_station_data()
    except Exception as e:
        return {"success": False, "error": f"Failed to fetch Gas Station: {e}"}
    
    health = gas_data.get("health", "healthy")
    warnings = gas_data.get("warnings", [])
    
    if health == "healthy":
        return {"success": True, "alert_sent": False, "health": health, "message": "Gas Station levels OK"}
    
    # Check if we already sent an alert recently (prevent spam)
    last_alert = await db.system_alerts.find_one(
        {"type": "gas_station", "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()}},
        {"_id": 0}
    )
    
    if last_alert:
        return {
            "success": True, "alert_sent": False, "health": health,
            "message": f"Alert already sent at {last_alert.get('created_at')}. Next alert after 6h cooldown."
        }
    
    # Build and send alert email
    email_service = BrevoEmailService()
    
    asset_rows = ""
    for a in gas_data.get("assets", []):
        status_color = "#EF4444" if a["status"] == "critical" else "#F59E0B" if a["status"] == "warning" else "#22C55E"
        status_label = "CRÍTICO" if a["status"] == "critical" else "BAIXO" if a["status"] == "warning" else "OK"
        asset_rows += f"""
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #333; color: #fff; font-family: monospace;">{a['asset_id']}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #333; color: #D4AF37; font-family: monospace;">{a['available']:.6f}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #333;">
                <span style="color: {status_color}; font-weight: bold;">{status_label}</span>
            </td>
        </tr>"""
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; border: 1px solid #333; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, {'#7f1d1d' if health == 'critical' else '#78350f'}, #0a0a0a); padding: 30px; text-align: center;">
            <h1 style="color: {'#EF4444' if health == 'critical' else '#F59E0B'}; margin: 0; font-size: 24px;">
                {'ALERTA CRÍTICO' if health == 'critical' else 'AVISO'} — Gas Station
            </h1>
            <p style="color: #999; margin-top: 8px; font-size: 14px;">Fireblocks Gas Station — Saldos {health.upper()}</p>
        </div>
        <div style="padding: 24px;">
            <p style="color: #ccc; font-size: 14px; line-height: 1.6;">
                Os saldos da Gas Station Fireblocks estão abaixo dos limites configurados.
                <strong style="color: #F59E0B;">Transferências ERC20/BEP20 podem falhar</strong> se não forem reabastecidos.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="background: #1a1a1a;">
                        <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 12px;">ATIVO</th>
                        <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 12px;">SALDO</th>
                        <th style="padding: 8px 12px; text-align: left; color: #888; font-size: 12px;">STATUS</th>
                    </tr>
                </thead>
                <tbody>{asset_rows}</tbody>
            </table>
            <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 16px; margin-top: 16px;">
                <p style="color: #D4AF37; font-size: 13px; margin: 0 0 8px 0; font-weight: bold;">Ação Necessária:</p>
                <p style="color: #999; font-size: 13px; margin: 0;">
                    Transfira ETH/BNB para o vault <strong style="color: #fff;">GAS STATION</strong> na Fireblocks Console
                    para garantir que as transações de tokens ERC20/BEP20 continuem a funcionar.
                </p>
            </div>
        </div>
        <div style="background: #111; padding: 16px; text-align: center;">
            <p style="color: #555; font-size: 11px; margin: 0;">KBEX.io — Sistema de Monitorização Financeira</p>
        </div>
    </div>"""
    
    # Send to admin
    admin_email = admin.get("email", "carlos@kbex.io")
    result = await email_service.send_email(
        to_email=admin_email,
        to_name="KBEX Admin",
        subject=f"{'CRÍTICO' if health == 'critical' else 'AVISO'}: Gas Station Fireblocks — Saldos {health.upper()}",
        html_content=html
    )
    
    # Record alert in DB
    await db.system_alerts.insert_one({
        "type": "gas_station",
        "health": health,
        "warnings": warnings,
        "email_sent_to": admin_email,
        "email_result": result,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "alert_sent": True,
        "health": health,
        "warnings": warnings,
        "email_sent_to": admin_email,
        "email_result": result
    }


@router.get("/gas-station")
async def get_gas_station_finance(admin: dict = Depends(get_internal_user)):
    """Get Gas Station data for the finance dashboard"""
    try:
        gas_data = await _get_gas_station_data()
        
        # Get last alert info
        last_alert = await db.system_alerts.find_one(
            {"type": "gas_station"},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        
        gas_data["last_alert"] = last_alert
        return gas_data
    except Exception as e:
        logger.error(f"Gas station fetch failed: {e}")
        return {"health": "unknown", "error": str(e)}
