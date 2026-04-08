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



# ==================== BALANCE ADJUSTMENTS ====================

from fastapi import UploadFile, File, Form, HTTPException
from pathlib import Path
import uuid as uuid_mod
import aiofiles

ADJUSTMENTS_UPLOAD_DIR = Path("/app/uploads/adjustments")
ADJUSTMENTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/balance-adjustments")
async def create_balance_adjustment(
    user_id: str = Form(...),
    currency: str = Form(...),
    amount: float = Form(...),
    adjustment_type: str = Form(...),  # "credit" or "debit"
    category: str = Form(...),
    reason: str = Form(...),
    document: Optional[UploadFile] = File(None),
    admin: dict = Depends(get_admin_user)
):
    """
    Create a manual balance adjustment (credit or debit) on a client's wallet.
    Admin only. Records full audit trail.
    """
    # Validate adjustment type
    if adjustment_type not in ("credit", "debit"):
        raise HTTPException(status_code=400, detail="Tipo de ajuste inválido. Use 'credit' ou 'debit'.")
    
    valid_categories = ["correction", "penalty", "fee", "bonus", "refund", "chargeback", "other"]
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Categoria inválida. Use: {', '.join(valid_categories)}")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="O valor deve ser positivo.")
    
    # Find the user
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")
    
    # Find the wallet (or create it if it doesn't exist)
    wallet = await db.wallets.find_one(
        {"user_id": user_id, "asset_id": currency},
        {"_id": 0}
    )
    if not wallet:
        # Auto-create wallet for this currency
        import uuid as uuid_mod2
        fiat_currencies = {"EUR": ("Euro", "€"), "USD": ("US Dollar", "$"), "GBP": ("British Pound", "£"), "BRL": ("Real Brasileiro", "R$"), "CHF": ("Swiss Franc", "CHF"), "AED": ("UAE Dirham", "AED"), "USDT": ("Tether", "₮"), "USDC": ("USD Coin", "USDC")}
        asset_info = fiat_currencies.get(currency.upper(), (currency, currency))
        is_fiat = currency.upper() in fiat_currencies
        
        wallet = {
            "id": str(uuid_mod2.uuid4()),
            "user_id": user_id,
            "asset_id": currency.upper(),
            "asset_name": asset_info[0],
            "asset_type": "fiat" if is_fiat else "crypto",
            "symbol": asset_info[1],
            "address": None,
            "balance": 0,
            "available_balance": 0,
            "pending_balance": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
        wallet.pop("_id", None)
        logger.info(f"Auto-created {currency} wallet for user {user_id}")
    
    previous_balance = wallet.get("balance", 0)
    
    # Calculate new balance
    effective_amount = amount if adjustment_type == "credit" else -amount
    new_balance = previous_balance + effective_amount
    
    # Handle document upload
    document_url = None
    if document:
        ext = document.filename.rsplit(".", 1)[-1].lower() if document.filename and "." in document.filename else "pdf"
        doc_filename = f"adj_{uuid_mod.uuid4().hex[:12]}.{ext}"
        doc_path = ADJUSTMENTS_UPLOAD_DIR / doc_filename
        async with aiofiles.open(doc_path, "wb") as f:
            content = await document.read()
            await f.write(content)
        document_url = f"/api/uploads/file/adjustments/{doc_filename}"
    
    # Create adjustment record
    adjustment_id = str(uuid_mod.uuid4())
    admin_name = admin.get("name", admin.get("email", ""))
    admin_id = admin.get("id", "")
    
    adjustment = {
        "id": adjustment_id,
        "user_id": user_id,
        "user_name": target_user.get("name", ""),
        "user_email": target_user.get("email", ""),
        "currency": currency,
        "amount": amount,
        "effective_amount": effective_amount,
        "adjustment_type": adjustment_type,
        "category": category,
        "reason": reason,
        "previous_balance": previous_balance,
        "new_balance": new_balance,
        "document_url": document_url,
        "admin_id": admin_id,
        "admin_name": admin_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.balance_adjustments.insert_one(adjustment)
    
    # Update wallet balance
    await db.wallets.update_one(
        {"user_id": user_id, "asset_id": currency},
        {"$set": {
            "balance": new_balance,
            "available_balance": new_balance
        }}
    )
    
    # Also record as a transaction for audit
    tx = {
        "id": str(uuid_mod.uuid4()),
        "user_id": user_id,
        "type": "balance_adjustment",
        "adjustment_type": adjustment_type,
        "category": category,
        "amount": effective_amount,
        "currency": currency,
        "status": "completed",
        "description": f"Ajuste de saldo: {reason}",
        "admin_id": admin_id,
        "admin_name": admin_name,
        "adjustment_id": adjustment_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(tx)
    
    # Remove _id before returning
    adjustment.pop("_id", None)
    
    logger.info(f"Balance adjustment {adjustment_id}: {adjustment_type} {amount} {currency} for user {user_id} by admin {admin_name}")
    
    return {"success": True, "adjustment": adjustment}


@router.get("/balance-adjustments")
async def list_balance_adjustments(
    user_id: Optional[str] = None,
    category: Optional[str] = None,
    adjustment_type: Optional[str] = None,
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """List all balance adjustments with optional filters."""
    query = {}
    if user_id:
        query["user_id"] = user_id
    if category:
        query["category"] = category
    if adjustment_type:
        query["adjustment_type"] = adjustment_type
    
    adjustments = await db.balance_adjustments.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Compute stats
    total_credits = sum(a["amount"] for a in adjustments if a["adjustment_type"] == "credit")
    total_debits = sum(a["amount"] for a in adjustments if a["adjustment_type"] == "debit")
    
    return {
        "adjustments": adjustments,
        "total": len(adjustments),
        "stats": {
            "total_credits": total_credits,
            "total_debits": total_debits,
            "net": total_credits - total_debits
        }
    }


@router.get("/balance-adjustments/{adjustment_id}")
async def get_balance_adjustment(
    adjustment_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get a single balance adjustment by ID."""
    adjustment = await db.balance_adjustments.find_one({"id": adjustment_id}, {"_id": 0})
    if not adjustment:
        raise HTTPException(status_code=404, detail="Ajuste não encontrado.")
    return adjustment


@router.get("/client-wallets/{target_user_id}")
async def get_client_wallets(
    target_user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get all wallets for a specific client (admin use for adjustment form)."""
    wallets = await db.wallets.find(
        {"user_id": target_user_id},
        {"_id": 0, "asset_id": 1, "asset_name": 1, "balance": 1, "asset_type": 1}
    ).to_list(50)
    return {"wallets": wallets}


@router.get("/clients-list")
async def get_clients_list(
    search: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get a simple list of clients for the adjustment form dropdown."""
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(
        query,
        {"_id": 0, "id": 1, "name": 1, "email": 1, "first_name": 1, "last_name": 1}
    ).sort("name", 1).to_list(100)
    
    result = []
    for u in users:
        name = u.get("name") or f"{u.get('first_name', '')} {u.get('last_name', '')}".strip()
        result.append({
            "id": u["id"],
            "name": name,
            "email": u.get("email", "")
        })
    
    return {"clients": result}
