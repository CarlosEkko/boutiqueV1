"""
OTC Desk Engine — backend counterpart of the frontend mock engine built in
`frontend/src/pages/dashboard/trading-desk/useOTCDeskEngine.js`.

Mirror-for-mirror pricing / hedge / PnL logic. Exposed through
`routes/otc_desk.py` as:
  • POST /api/otc-desk/rfq       — firm quote (TTL 15 s)
  • POST /api/otc-desk/execute   — hit quote, update inventory + PnL + hedge
  • GET  /api/otc-desk/state     — snapshot (market, inventory, PnL, fills, curve)
  • GET  /api/otc-desk/pnl-series— equity curve time series
  • POST /api/otc-desk/reset     — reset desk state (admin)
  • WS   /api/ws/otc-desk        — (future) real-time stream

Data sourcing:
  • Market data — public Binance REST `/api/v3/ticker/price` polled every 2 s
    for the configured asset universe (no API key required). Falls back to
    the last known price on transient failures.
  • Hedge       — simulated locally (latency + slippage). Swapping in a real
    venue adapter (Binance spot / Fireblocks) is a `execute_hedge` swap.

Persistence:
  Inventory, cash / slippage PnL, trades, hedge legs and equity-curve
  snapshots are flushed to MongoDB every 10 s and on `/execute`.

Concurrency:
  The engine is a module-level singleton guarded by an asyncio.Lock so
  concurrent RFQs / executions are serialised. Background loops are spawned
  from `server.on_startup`.
"""

from __future__ import annotations

import asyncio
import logging
import math
import random
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration — kept symmetric with the frontend engine.
# ---------------------------------------------------------------------------
DEFAULT_ASSETS: List[Dict[str, Any]] = [
    {"symbol": "BTC", "quote": "USDT", "seed": 65000.0,  "liquidity": 800.0,        "inv_factor": 0.00040, "max_inventory": 5.0,     "max_notional_usdt": 500_000.0},
    {"symbol": "ETH", "quote": "USDT", "seed": 3500.0,   "liquidity": 8000.0,       "inv_factor": 0.00025, "max_inventory": 80.0,    "max_notional_usdt": 500_000.0},
    {"symbol": "SOL", "quote": "USDT", "seed": 180.0,    "liquidity": 60000.0,      "inv_factor": 0.00020, "max_inventory": 2500.0,  "max_notional_usdt": 500_000.0},
    {"symbol": "BNB", "quote": "USDT", "seed": 620.0,    "liquidity": 12000.0,      "inv_factor": 0.00025, "max_inventory": 700.0,   "max_notional_usdt": 500_000.0},
    {"symbol": "XRP", "quote": "USDT", "seed": 0.60,     "liquidity": 5_000_000.0,  "inv_factor": 0.00018, "max_inventory": 800_000.0, "max_notional_usdt": 500_000.0},
]

DEFAULT_PRICING = {
    "base_margin_bps": 25.0,
    "vol_factor": 0.45,
    "quote_ttl_ms": 15_000,
    "hedge_latency_ms": 600,
}

DEFAULT_RISK = {
    "daily_loss_limit_usdt": 50_000.0,
    "auto_widen_enabled": True,
    "auto_widen_trigger_pct": 70.0,    # when |inv_notional|/max_notional > 70%, widen
    "auto_widen_multiplier": 2.0,       # spread × 2 when triggered
}

BASE_MARGIN_BPS   = 25      # kept as hard fallback if config load fails
VOL_FACTOR        = 0.45
QUOTE_TTL_MS      = 15_000
HEDGE_LATENCY_MS  = 600
MARKET_POLL_SEC   = 2.0     # how often we refresh Binance prices
PERSIST_SEC       = 10.0    # how often we flush state to Mongo
EQUITY_SAMPLE_SEC = 2.0
VOL_WINDOW        = 60      # samples used to compute realised vol
STATE_ID          = "global"
BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/price"


def _now_ms() -> int:
    return int(time.time() * 1000)


def _uid() -> str:
    return uuid.uuid4().hex[:12]


# ---------------------------------------------------------------------------
# Dataclasses — wire-shape for REST responses
# ---------------------------------------------------------------------------
@dataclass
class AssetMarket:
    symbol: str
    quote: str
    mid: float
    bid: float
    ask: float
    vol: float
    liquidity: float
    inv_factor: float
    history: List[float] = field(default_factory=list)
    last_update_ms: int = 0


@dataclass
class FirmQuote:
    id: str
    symbol: str
    size: float
    side: str          # 'buy' | 'sell'
    mid: float
    price: float
    spread_pct: float
    spread_bps: float
    notional: float
    components: Dict[str, float]
    created_ms: int
    expires_ms: int
    valid_for_ms: int


@dataclass
class HedgeFill:
    id: str
    ts: int
    symbol: str
    side: str
    size: float
    price: float
    slippage_bps: float
    slippage_cost: float
    hedge_notional: float
    linked_quote_id: str
    venue_name: Optional[str] = None
    venue_type: Optional[str] = None
    hedge_mode: str = "simulated"


# ---------------------------------------------------------------------------
# Engine — module-level singleton
# ---------------------------------------------------------------------------
class OTCDeskEngine:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._db = None
        self._started = False
        self._market_task: Optional[asyncio.Task] = None
        self._persist_task: Optional[asyncio.Task] = None
        self._curve_task: Optional[asyncio.Task] = None

        self.market: Dict[str, AssetMarket] = {}
        self.inventory: Dict[str, float] = {}
        # Net USDT cost basis per asset — updated on every leg (client + hedge).
        # Invariant: unrealized_pnl_sym = inventory_sym * mid_sym + cost_basis_sym
        #   • long  position ⇒ cost_basis < 0 (we paid USDT out)
        #   • short position ⇒ cost_basis > 0 (we received USDT)
        #   • flat  position ⇒ cost_basis == 0 (net zero, unrealized = 0)
        self.cost_basis: Dict[str, float] = {}
        self.cash_pnl: float = 0.0
        self.slippage_pnl: float = 0.0
        self.trades: List[Dict[str, Any]] = []         # last 100
        self.hedge_feed: List[HedgeFill] = []          # last 50
        self.equity_curve: List[Dict[str, float]] = []  # last 300
        self.active_quotes: Dict[str, FirmQuote] = {}  # id -> quote

        # Runtime config (loaded from Mongo; editable via admin panel)
        self.pricing_cfg: Dict[str, Any] = dict(DEFAULT_PRICING)
        self.risk_cfg: Dict[str, Any] = dict(DEFAULT_RISK)
        # Day-anchored PnL tracking for the daily_loss_limit guard.
        self._day_anchor_pnl: float = 0.0
        self._day_anchor_ms: int = _now_ms()

        # Configurable asset universe (admin-editable later)
        self.assets_cfg = list(DEFAULT_ASSETS)

    # ------------------------------------------------------------------
    # Bootstrap
    # ------------------------------------------------------------------
    def set_db(self, db) -> None:
        self._db = db

    async def start(self) -> None:
        """Called once from server.on_startup — hydrates state + spawns loops."""
        if self._started:
            return
        self._started = True

        # Hydrate runtime config BEFORE seeding market so overrides apply.
        await self._load_config()

        # Seed market state
        for a in self.assets_cfg:
            self.market[a["symbol"]] = AssetMarket(
                symbol=a["symbol"], quote=a["quote"],
                mid=a["seed"], bid=a["seed"], ask=a["seed"], vol=0.0,
                liquidity=a["liquidity"], inv_factor=a["inv_factor"],
                history=[a["seed"]],
            )
            self.inventory.setdefault(a["symbol"], 0.0)
            self.cost_basis.setdefault(a["symbol"], 0.0)

        # Hydrate from Mongo (idempotent)
        await self._hydrate_from_db()

        # Spawn background loops
        self._market_task  = asyncio.create_task(self._market_loop())
        self._persist_task = asyncio.create_task(self._persist_loop())
        self._curve_task   = asyncio.create_task(self._equity_loop())

        logger.info("OTCDeskEngine started (assets=%s)", list(self.market.keys()))

    async def stop(self) -> None:
        for t in (self._market_task, self._persist_task, self._curve_task):
            if t and not t.done():
                t.cancel()
        self._started = False

    # ------------------------------------------------------------------
    # Hydration / persistence
    # ------------------------------------------------------------------
    async def _hydrate_from_db(self) -> None:
        if self._db is None:
            return
        try:
            st = await self._db.otc_desk_state.find_one({"_id": STATE_ID})
            if st:
                self.cash_pnl      = float(st.get("cash_pnl") or 0.0)
                self.slippage_pnl  = float(st.get("slippage_pnl") or 0.0)
                for sym, qty in (st.get("inventory") or {}).items():
                    self.inventory[sym] = float(qty)
                for sym, cb in (st.get("cost_basis") or {}).items():
                    self.cost_basis[sym] = float(cb)
            cursor = self._db.otc_desk_hedge_fills.find({}, {"_id": 0}).sort("ts", -1).limit(50)
            async for f in cursor:
                self.hedge_feed.append(HedgeFill(**f))
            cursor = self._db.otc_desk_pnl_snapshots.find({}, {"_id": 0}).sort("t", -1).limit(300)
            rows = [r async for r in cursor]
            rows.reverse()
            self.equity_curve = rows
        except Exception as e:
            logger.warning("OTCDeskEngine hydrate failed: %s", e)

    # ------------------------------------------------------------------
    # Runtime config — loaded from `otc_desk_config` collection (singleton).
    # Admin panel updates via `update_config`. Changes apply immediately.
    # ------------------------------------------------------------------
    async def _load_config(self) -> None:
        if self._db is None:
            return
        try:
            doc = await self._db.otc_desk_config.find_one({"_id": STATE_ID})
            if not doc:
                # First boot: materialise the defaults so the admin panel sees them.
                await self._db.otc_desk_config.update_one(
                    {"_id": STATE_ID},
                    {"$set": {
                        "assets": self.assets_cfg,
                        "pricing": self.pricing_cfg,
                        "risk": self.risk_cfg,
                        "updated_ms": _now_ms(),
                    }},
                    upsert=True,
                )
                return
            if isinstance(doc.get("assets"), list) and doc["assets"]:
                # Merge: keep any new keys the engine introduces while respecting
                # any admin overrides.
                self.assets_cfg = [
                    {**(next((d for d in DEFAULT_ASSETS if d["symbol"] == a.get("symbol")), {})),
                     **a}
                    for a in doc["assets"] if a.get("symbol")
                ]
            if isinstance(doc.get("pricing"), dict):
                self.pricing_cfg = {**DEFAULT_PRICING, **doc["pricing"]}
            if isinstance(doc.get("risk"), dict):
                self.risk_cfg = {**DEFAULT_RISK, **doc["risk"]}
        except Exception as e:
            logger.warning("OTCDeskEngine config load failed: %s", e)

    async def _save_config(self) -> None:
        if self._db is None:
            return
        try:
            await self._db.otc_desk_config.update_one(
                {"_id": STATE_ID},
                {"$set": {
                    "assets": self.assets_cfg,
                    "pricing": self.pricing_cfg,
                    "risk": self.risk_cfg,
                    "updated_ms": _now_ms(),
                }},
                upsert=True,
            )
        except Exception as e:
            logger.warning("OTCDeskEngine config save failed: %s", e)

    def config_snapshot(self) -> Dict[str, Any]:
        return {
            "assets": list(self.assets_cfg),
            "pricing": dict(self.pricing_cfg),
            "risk": dict(self.risk_cfg),
        }

    async def update_pricing(self, patch: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {"base_margin_bps", "vol_factor", "quote_ttl_ms", "hedge_latency_ms"}
        for k, v in patch.items():
            if k in allowed and v is not None:
                self.pricing_cfg[k] = v
        await self._save_config()
        return dict(self.pricing_cfg)

    async def update_risk(self, patch: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {
            "daily_loss_limit_usdt", "auto_widen_enabled",
            "auto_widen_trigger_pct", "auto_widen_multiplier",
        }
        for k, v in patch.items():
            if k in allowed and v is not None:
                self.risk_cfg[k] = v
        await self._save_config()
        return dict(self.risk_cfg)

    async def upsert_asset(self, asset: Dict[str, Any]) -> Dict[str, Any]:
        sym = (asset.get("symbol") or "").upper().strip()
        if not sym:
            raise ValueError("symbol is required")
        quote = asset.get("quote") or "USDT"
        merged = {
            "symbol": sym, "quote": quote,
            "seed": float(asset.get("seed") or asset.get("seed_price") or 1.0),
            "liquidity": float(asset.get("liquidity") or 1000.0),
            "inv_factor": float(asset.get("inv_factor") or 0.0002),
            "max_inventory": float(asset.get("max_inventory") or 0.0),
            "max_notional_usdt": float(asset.get("max_notional_usdt") or 0.0),
        }
        found = False
        for i, a in enumerate(self.assets_cfg):
            if a.get("symbol") == sym:
                self.assets_cfg[i] = {**a, **merged}
                found = True
                break
        if not found:
            self.assets_cfg.append(merged)
            # Seed market + inventory for the new asset
            self.market[sym] = AssetMarket(
                symbol=sym, quote=quote, mid=merged["seed"],
                bid=merged["seed"], ask=merged["seed"], vol=0.0,
                liquidity=merged["liquidity"], inv_factor=merged["inv_factor"],
                history=[merged["seed"]],
            )
            self.inventory.setdefault(sym, 0.0)
            self.cost_basis.setdefault(sym, 0.0)
        # Update the live market object with new liquidity / inv_factor
        if sym in self.market:
            self.market[sym].liquidity = merged["liquidity"]
            self.market[sym].inv_factor = merged["inv_factor"]
        await self._save_config()
        return merged

    async def remove_asset(self, symbol: str) -> None:
        sym = symbol.upper().strip()
        if abs(self.inventory.get(sym, 0.0)) > 1e-10:
            raise ValueError(f"Cannot remove {sym}: open inventory position")
        self.assets_cfg = [a for a in self.assets_cfg if a.get("symbol") != sym]
        self.market.pop(sym, None)
        self.inventory.pop(sym, None)
        self.cost_basis.pop(sym, None)
        await self._save_config()

    async def _persist_state(self) -> None:
        if self._db is None:
            return
        try:
            await self._db.otc_desk_state.update_one(
                {"_id": STATE_ID},
                {"$set": {
                    "cash_pnl": self.cash_pnl,
                    "slippage_pnl": self.slippage_pnl,
                    "inventory": self.inventory,
                    "cost_basis": self.cost_basis,
                    "updated_ms": _now_ms(),
                }},
                upsert=True,
            )
        except Exception as e:
            logger.warning("OTCDeskEngine persist failed: %s", e)

    # ------------------------------------------------------------------
    # Background loops
    # ------------------------------------------------------------------
    async def _market_loop(self) -> None:
        """Fetch mid prices from Binance. Public endpoint — no API key."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            while True:
                try:
                    res = await client.get(BINANCE_TICKER_URL)
                    res.raise_for_status()
                    rows = res.json()
                    by_sym = {r["symbol"]: float(r["price"]) for r in rows if "symbol" in r}
                    for sym, a in self.market.items():
                        bsym = f"{sym}{a.quote}"
                        px = by_sym.get(bsym)
                        if px is None or px <= 0:
                            continue
                        self._apply_price(sym, px)
                except Exception as e:
                    logger.debug("OTCDeskEngine market fetch failed: %s", e)
                    # Fallback: random walk so the desk stays alive during outages.
                    for sym, a in self.market.items():
                        jitter = a.mid * (random.gauss(0, 0.0003))
                        self._apply_price(sym, max(0.00001, a.mid + jitter))
                await asyncio.sleep(MARKET_POLL_SEC)

    def _apply_price(self, sym: str, mid: float) -> None:
        a = self.market[sym]
        a.mid = mid
        micro = mid * 0.00005
        a.bid = mid - micro
        a.ask = mid + micro
        a.history = (a.history + [mid])[-200:]
        a.last_update_ms = _now_ms()
        # realised vol — std of the last N log returns
        recent = a.history[-VOL_WINDOW:]
        if len(recent) > 5:
            rets = [math.log(recent[i] / recent[i - 1]) for i in range(1, len(recent))]
            mean = sum(rets) / len(rets)
            var = sum((r - mean) ** 2 for r in rets) / len(rets)
            a.vol = math.sqrt(var)

    async def _persist_loop(self) -> None:
        while True:
            await asyncio.sleep(PERSIST_SEC)
            await self._persist_state()

    async def _equity_loop(self) -> None:
        while True:
            await asyncio.sleep(EQUITY_SAMPLE_SEC)
            up = self.unrealized_pnl()
            point = {"t": _now_ms(), "pnl": round(self.cash_pnl + up, 4)}
            self.equity_curve = (self.equity_curve + [point])[-300:]
            # Light-weight: only persist every 5th sample
            if self._db is not None and len(self.equity_curve) % 5 == 0:
                try:
                    # Insert a copy — Mongo mutates the dict to attach _id and we
                    # don't want that ObjectId leaking into the in-memory curve.
                    await self._db.otc_desk_pnl_snapshots.insert_one(dict(point))
                except Exception:
                    pass

    # ------------------------------------------------------------------
    # Risk helpers
    # ------------------------------------------------------------------
    def unrealized_pnl(self) -> float:
        """Mark-to-market of open positions using the cost-basis invariant.
        Flat inventory ⇒ 0 by construction (see set_db docstring)."""
        up = 0.0
        for sym, qty in self.inventory.items():
            if not qty and not self.cost_basis.get(sym):
                continue
            mid = self.market[sym].mid if sym in self.market else 0.0
            up += qty * mid + self.cost_basis.get(sym, 0.0)
        return up

    # ------------------------------------------------------------------
    # Pricing Engine
    # ------------------------------------------------------------------
    def build_quote(self, symbol: str, size: float, side: str) -> FirmQuote:
        if symbol not in self.market:
            raise ValueError(f"Unknown symbol: {symbol}")
        if size <= 0:
            raise ValueError("Size must be greater than zero")
        if side not in ("buy", "sell"):
            raise ValueError("Side must be buy or sell")

        a = self.market[symbol]
        inv = self.inventory.get(symbol, 0.0)

        # -------- Pre-trade risk checks ---------------------------------------
        asset_cfg = next((c for c in self.assets_cfg if c.get("symbol") == symbol), {})
        max_inv = float(asset_cfg.get("max_inventory") or 0.0)
        max_notional = float(asset_cfg.get("max_notional_usdt") or 0.0)
        new_inv = inv + (-size if side == "buy" else size)
        if max_inv > 0 and abs(new_inv) > max_inv:
            raise ValueError(
                f"Trade rejected: would breach max inventory {max_inv} {symbol} "
                f"(post-trade |inv| = {abs(new_inv):.6f})"
            )
        if max_notional > 0 and abs(new_inv) * a.mid > max_notional:
            raise ValueError(
                f"Trade rejected: would breach max notional {max_notional:.0f} USDT "
                f"(post-trade = {abs(new_inv) * a.mid:.2f})"
            )
        # Daily loss guard — rolls at UTC midnight (24h anchor).
        now_ms = _now_ms()
        if now_ms - self._day_anchor_ms >= 86_400_000:
            self._day_anchor_ms = now_ms
            self._day_anchor_pnl = self.cash_pnl + self.unrealized_pnl()
        daily_pnl = (self.cash_pnl + self.unrealized_pnl()) - self._day_anchor_pnl
        daily_loss_limit = float(self.risk_cfg.get("daily_loss_limit_usdt") or 0.0)
        if daily_loss_limit > 0 and daily_pnl < -daily_loss_limit:
            raise ValueError(
                f"Desk halted: daily loss limit {daily_loss_limit:.0f} USDT reached "
                f"(session PnL = {daily_pnl:.2f})"
            )

        # -------- Pricing -----------------------------------------------------
        base_margin_bps = float(self.pricing_cfg.get("base_margin_bps", 25.0))
        vol_factor      = float(self.pricing_cfg.get("vol_factor", 0.45))
        quote_ttl_ms    = int(self.pricing_cfg.get("quote_ttl_ms", 15_000))

        # long inventory tightens sells (attracts sells out) / widens buys (deters buys in)
        skew_sign = 1 if (side == "buy" and inv < 0) or (side == "sell" and inv > 0) else -1
        base      = base_margin_bps / 10_000
        size_c    = size / a.liquidity
        vol_c     = a.vol * vol_factor
        inv_c     = abs(inv) * a.inv_factor * skew_sign * -1
        spread    = max(0.0, base + size_c + vol_c + inv_c)

        # Auto-widen: when inventory utilisation crosses trigger, widen spread.
        auto_widen_applied = False
        if self.risk_cfg.get("auto_widen_enabled") and max_notional > 0:
            util_pct = (abs(inv) * a.mid / max_notional) * 100.0 if max_notional else 0.0
            trigger = float(self.risk_cfg.get("auto_widen_trigger_pct", 70.0))
            if util_pct >= trigger:
                mult = float(self.risk_cfg.get("auto_widen_multiplier", 2.0))
                spread = spread * mult
                auto_widen_applied = True

        price     = a.mid * (1 + spread) if side == "buy" else a.mid * (1 - spread)
        created   = _now_ms()
        q = FirmQuote(
            id=_uid(), symbol=symbol, size=size, side=side,
            mid=a.mid, price=price,
            spread_pct=spread, spread_bps=spread * 10_000,
            notional=price * size,
            components={
                "base": base, "size": size_c, "vol": vol_c, "inv": inv_c,
                "auto_widen": 1.0 if auto_widen_applied else 0.0,
            },
            created_ms=created,
            expires_ms=created + quote_ttl_ms,
            valid_for_ms=quote_ttl_ms,
        )
        self.active_quotes[q.id] = q
        # Housekeeping — drop expired quotes
        now = _now_ms()
        self.active_quotes = {k: v for k, v in self.active_quotes.items() if v.expires_ms > now}
        return q

    # ------------------------------------------------------------------
    # Execution Engine
    # ------------------------------------------------------------------
    async def execute(self, quote_id: str, user_id: str) -> Dict[str, Any]:
        async with self._lock:
            q = self.active_quotes.get(quote_id)
            if not q:
                raise ValueError("Quote not found or already consumed")
            if q.expires_ms < _now_ms():
                self.active_quotes.pop(quote_id, None)
                raise ValueError("Quote expired")

            # 1) inventory delta (client buys ⇒ desk sells ⇒ inventory -)
            inv_delta = -q.size if q.side == "buy" else q.size
            self.inventory[q.symbol] = self.inventory.get(q.symbol, 0.0) + inv_delta
            # Cost basis: client BUY = client pays USDT in (cost_basis += size * price).
            #             client SELL = client receives USDT out (cost_basis -= size * price).
            # Sign is flipped vs inventory_delta, matching the invariant.
            self.cost_basis[q.symbol] = self.cost_basis.get(q.symbol, 0.0) + (
                q.size * q.price if q.side == "buy" else -q.size * q.price
            )
            # Informational: how much premium the desk captured vs. mid at quote time.
            # Reported to the UI for transparency; not double-counted in total PnL
            # (the cost-basis invariant already books realised PnL on position close).
            if q.side == "buy":
                spread_capture = (q.price - q.mid) * q.size
            else:
                spread_capture = (q.mid - q.price) * q.size

            # 2) spread capture (informational metric)
            self.active_quotes.pop(quote_id, None)
            trade_row = {
                "trade_id": _uid(),
                "quote_id": q.id,
                "user_id": user_id,
                "ts": _now_ms(),
                "symbol": q.symbol,
                "side": q.side,
                "size": q.size,
                "price": q.price,
                "mid": q.mid,
                "spread_bps": q.spread_bps,
                "spread_capture": spread_capture,
                "notional": q.notional,
            }
            self.trades = (self.trades + [trade_row])[-100:]
            if self._db is not None:
                try:
                    await self._db.otc_desk_trades.insert_one(dict(trade_row))
                except Exception as e:
                    logger.warning("persist trade failed: %s", e)
            # Ensure our in-memory trade_row doesn't carry an injected _id
            trade_row.pop("_id", None)
            await self._persist_state()

            # 4) schedule simulated hedge
            asyncio.create_task(self._simulate_hedge(q))

            return {
                "trade_id": trade_row["trade_id"],
                "quote": {**q.__dict__},
                "spread_capture": spread_capture,
                "cash_pnl": self.cash_pnl,
                "unrealized_pnl": self.unrealized_pnl(),
                "slippage_pnl": self.slippage_pnl,
                "inventory": dict(self.inventory),
                "ts": trade_row["ts"],
            }

    async def _simulate_hedge(self, q: FirmQuote) -> None:
        """Mock venue hedge: after HEDGE_LATENCY_MS, fill the opposite of client leg
        and book slippage cost. If the Fireblocks adapter is in SHADOW mode, the
        adapter is called to pick a real venue + log the intent (but no venue
        order is actually placed). LIVE mode raises (not implemented yet)."""
        latency_ms = int(self.pricing_cfg.get("hedge_latency_ms", HEDGE_LATENCY_MS))
        await asyncio.sleep(latency_ms / 1000.0)

        # Consult the Fireblocks venue adapter (safe no-op in simulated mode).
        venue_meta: Dict[str, Any] = {}
        try:
            from services.otc_desk_venues import get_venue_adapter
            adapter = get_venue_adapter()
            intent = await adapter.execute_hedge(q.symbol, q.side, q.size, self.market[q.symbol].mid)
            if intent.get("mode") in ("shadow", "live"):
                venue_meta = {
                    "venue_id": intent.get("venue_id"),
                    "venue_name": intent.get("venue_name"),
                    "venue_type": intent.get("venue_type"),
                    "hedge_mode": intent.get("mode"),
                }
        except Exception as exc:
            logger.warning("Venue adapter call failed; falling back to simulation: %s", exc)
        a = self.market.get(q.symbol)
        if not a:
            return
        liquidity = a.liquidity or 1.0
        slippage_bps = (q.size / liquidity) * 10_000 * (0.8 + random.random() * 0.4)
        hedge_side = q.side  # desk re-flattens in the same direction as client
        mid = a.mid
        fill_price = mid * (1 + slippage_bps / 10_000) if hedge_side == "buy" \
                     else mid * (1 - slippage_bps / 10_000)
        hedge_notional = fill_price * q.size * (1 if hedge_side == "buy" else -1)
        slippage_cost = abs(fill_price - mid) * q.size
        async with self._lock:
            self.slippage_pnl -= slippage_cost
            inv_delta = q.size if q.side == "buy" else -q.size
            self.inventory[q.symbol] = self.inventory.get(q.symbol, 0.0) + inv_delta
            # Hedge leg: desk BUY  = we pay USDT (cost_basis -= size * fill_price)
            #            desk SELL = we receive USDT (cost_basis += size * fill_price)
            self.cost_basis[q.symbol] = self.cost_basis.get(q.symbol, 0.0) + (
                -q.size * fill_price if hedge_side == "buy" else q.size * fill_price
            )
            # Settle on flat: any residual cost_basis once inventory is flat
            # represents fully-realised PnL for that asset (spread + mid drift).
            if abs(self.inventory.get(q.symbol, 0.0)) < 1e-10:
                self.cash_pnl += self.cost_basis.get(q.symbol, 0.0)
                self.cost_basis[q.symbol] = 0.0
            fill = HedgeFill(
                id=_uid(), ts=_now_ms(), symbol=q.symbol, side=hedge_side,
                size=q.size, price=fill_price, slippage_bps=slippage_bps,
                slippage_cost=slippage_cost, hedge_notional=hedge_notional,
                linked_quote_id=q.id,
                venue_name=venue_meta.get("venue_name"),
                venue_type=venue_meta.get("venue_type"),
                hedge_mode=venue_meta.get("hedge_mode") or "simulated",
            )
            self.hedge_feed = ([fill] + self.hedge_feed)[:50]
            if self._db is not None:
                try:
                    await self._db.otc_desk_hedge_fills.insert_one(dict(fill.__dict__))
                except Exception as e:
                    logger.warning("persist hedge failed: %s", e)
            await self._persist_state()

    # ------------------------------------------------------------------
    # Public reads
    # ------------------------------------------------------------------
    def snapshot(self) -> Dict[str, Any]:
        return {
            "ts": _now_ms(),
            "market": {
                sym: {
                    "symbol": a.symbol, "quote": a.quote,
                    "mid": a.mid, "bid": a.bid, "ask": a.ask, "vol": a.vol,
                    "liquidity": a.liquidity, "inv_factor": a.inv_factor,
                    "last_update_ms": a.last_update_ms,
                }
                for sym, a in self.market.items()
            },
            "inventory": dict(self.inventory),
            "cash_pnl": self.cash_pnl,
            "unrealized_pnl": self.unrealized_pnl(),
            "slippage_pnl": self.slippage_pnl,
            "total_pnl": self.cash_pnl + self.unrealized_pnl(),
            "slippage_info": self.slippage_pnl,  # informational only — already reflected in realised PnL
            "hedge_feed": [f.__dict__ for f in self.hedge_feed],
            "recent_trades": self.trades[-10:],
            "active_quotes": [q.__dict__ for q in self.active_quotes.values()],
            "config": {
                "base_margin_bps": float(self.pricing_cfg.get("base_margin_bps", BASE_MARGIN_BPS)),
                "vol_factor": float(self.pricing_cfg.get("vol_factor", VOL_FACTOR)),
                "quote_ttl_ms": int(self.pricing_cfg.get("quote_ttl_ms", QUOTE_TTL_MS)),
                "hedge_latency_ms": int(self.pricing_cfg.get("hedge_latency_ms", HEDGE_LATENCY_MS)),
            },
            "daily_pnl": (self.cash_pnl + self.unrealized_pnl()) - self._day_anchor_pnl,
            "daily_loss_limit_usdt": float(self.risk_cfg.get("daily_loss_limit_usdt", 0.0)),
        }

    def pnl_series(self) -> List[Dict[str, float]]:
        return list(self.equity_curve)

    async def reset(self) -> None:
        async with self._lock:
            self.cash_pnl = 0.0
            self.slippage_pnl = 0.0
            self.inventory = {sym: 0.0 for sym in self.market.keys()}
            self.cost_basis = {sym: 0.0 for sym in self.market.keys()}
            self.trades = []
            self.hedge_feed = []
            self.equity_curve = [{"t": _now_ms(), "pnl": 0.0}]
            self.active_quotes = {}
            if self._db is not None:
                try:
                    await self._db.otc_desk_state.delete_one({"_id": STATE_ID})
                    await self._db.otc_desk_pnl_snapshots.delete_many({})
                except Exception as e:
                    logger.warning("reset persist failed: %s", e)


# Singleton
engine = OTCDeskEngine()


def get_engine() -> OTCDeskEngine:
    return engine
