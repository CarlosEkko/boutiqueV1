"""
Pricing Service — Central place to apply KBEX Spread to market prices.

KBEX Spread (`kbex_rates` collection) holds per-product / per-tier / per-asset
buy_spread_pct and sell_spread_pct values. This service resolves them and
applies the result to a base market price.

Semantics:
  buy_price  = base * (1 + buy_spread_pct  / 100)   # client pays more when buying
  sell_price = base * (1 - sell_spread_pct / 100)   # client receives less when selling

Fallback chain (same as routes/kbex_rates.py resolve_spread):
  product+tier+asset → product+tier+"*" → "*"+tier+"*" → {0, 0}

Valid products: "otc", "exchange", "spot", "escrow", "multisign"
"""
from typing import Optional


async def _db():
    # lazy import avoids circular deps
    from routes.kbex_rates import get_db
    return get_db()


async def resolve(product: str, tier: Optional[str], asset: Optional[str]) -> dict:
    """Return {buy_spread_pct, sell_spread_pct}. Defaults to standard tier for public callers."""
    db = await _db()
    if db is None:
        return {"buy_spread_pct": 0.0, "sell_spread_pct": 0.0}

    t = (tier or "standard").lower()
    a = (asset or "*").upper() if asset else "*"

    for q in (
        {"product": product, "tier": t, "asset": a},
        {"product": product, "tier": t, "asset": "*"},
        {"product": "*", "tier": t, "asset": "*"},
    ):
        rate = await db.kbex_rates.find_one(q, {"_id": 0, "buy_spread_pct": 1, "sell_spread_pct": 1})
        if rate:
            return {
                "buy_spread_pct": float(rate.get("buy_spread_pct", 0) or 0),
                "sell_spread_pct": float(rate.get("sell_spread_pct", 0) or 0),
            }
    return {"buy_spread_pct": 0.0, "sell_spread_pct": 0.0}


async def apply_spread(base_price: float, product: str, tier: Optional[str], asset: Optional[str]) -> dict:
    """Apply KBEX Spread to a base market price.

    Returns: {mid, buy, sell, buy_spread_pct, sell_spread_pct}
    """
    try:
        base = float(base_price or 0)
    except (TypeError, ValueError):
        base = 0.0

    if base <= 0:
        return {
            "mid": base, "buy": base, "sell": base,
            "buy_spread_pct": 0.0, "sell_spread_pct": 0.0,
        }

    spread = await resolve(product, tier, asset)
    buy_pct = spread["buy_spread_pct"]
    sell_pct = spread["sell_spread_pct"]

    return {
        "mid": round(base, 8),
        "buy": round(base * (1.0 + buy_pct / 100.0), 8),
        "sell": round(base * (1.0 - sell_pct / 100.0), 8),
        "buy_spread_pct": buy_pct,
        "sell_spread_pct": sell_pct,
    }


async def get_user_tier(db, user_id: Optional[str]) -> str:
    """Convenience: look up membership tier for a user; default standard."""
    if not user_id:
        return "standard"
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "membership_level": 1})
    return ((user or {}).get("membership_level") or "standard").lower()
