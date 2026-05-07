"""
Fireblocks Venue Adapter — phase 4a (shadow mode) of the OTC Desk.

What this module does
  • Wraps the Fireblocks Python SDK with a clean async interface.
  • Discovers linked exchange accounts (Binance, Kraken, …) at runtime.
  • Reads live balances per venue for liquidity-based routing decisions.
  • Executes "hedge" orders in one of three modes:
      - simulated  → no Fireblocks call, existing mock in the engine
      - shadow     → real venue discovery + balance checks + intent logging
                     but NO transaction is created (safe to run in prod with
                     real keys; gives confidence in the routing logic)
      - live       → real vault-to-vault or exchange transaction is created
                     and polled to completion

Routing strategy
  "Best liquidity" (user choice 2a): pick the venue that currently holds the
  most of the asset we need to hedge (BUY client → desk sells base from the
  venue that has the largest balance; SELL client → desk buys base at the
  venue that holds the most USDT).

Integration surface
  get_venue_adapter() is the singleton accessor.
  VenueAdapter.execute_hedge(symbol, side, size, asset_mid)  → async dict
"""

from __future__ import annotations

import asyncio
import functools
import logging
import os
import time
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class HedgeMode(str, Enum):
    SIMULATED = "simulated"
    SHADOW = "shadow"
    LIVE = "live"


# ---------------------------------------------------------------------------
# Adapter
# ---------------------------------------------------------------------------
class FireblocksVenueAdapter:
    """Thin async wrapper around the (sync) fireblocks-sdk.

    We run SDK calls in a thread executor so they don't block the FastAPI
    event loop. Venue metadata + balances are cached for 30 s to keep the
    admin panel snappy without hammering Fireblocks.
    """

    def __init__(self) -> None:
        self._sdk = None
        self._lock = asyncio.Lock()
        self._cache_ts = 0.0
        self._cache_ttl = 30.0
        self._cached_venues: List[Dict[str, Any]] = []
        self.mode: HedgeMode = HedgeMode.SIMULATED
        self.last_error: Optional[str] = None

    # ------------------------------------------------------------------
    # SDK lifecycle
    # ------------------------------------------------------------------
    def _ensure_sdk(self):
        if self._sdk is not None:
            return self._sdk
        try:
            from fireblocks_sdk import FireblocksSDK
            api_key = os.environ.get("FIREBLOCKS_API_KEY")
            secret_path = os.environ.get("FIREBLOCKS_SECRET_KEY_PATH")
            base_path = os.environ.get("FIREBLOCKS_BASE_PATH", "https://api.fireblocks.io")
            if not api_key or not secret_path:
                raise RuntimeError("Fireblocks credentials not configured")
            with open(secret_path, "r") as f:
                secret = f.read()
            self._sdk = FireblocksSDK(secret, api_key, base_path)
            logger.info("Fireblocks SDK initialised (base=%s)", base_path)
            return self._sdk
        except Exception as e:
            self.last_error = str(e)
            logger.error("Fireblocks SDK init failed: %s", e)
            raise

    async def _run(self, fn, *args, **kwargs):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))

    # ------------------------------------------------------------------
    # Venue discovery / balances
    # ------------------------------------------------------------------
    async def list_venues(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        async with self._lock:
            now = time.time()
            if not force_refresh and self._cached_venues and (now - self._cache_ts) < self._cache_ttl:
                return list(self._cached_venues)
            try:
                sdk = self._ensure_sdk()
                raw = await self._run(sdk.get_exchange_accounts)
                venues: List[Dict[str, Any]] = []
                for e in raw or []:
                    venues.append({
                        "id": e.get("id"),
                        "name": e.get("name"),
                        "type": e.get("type"),
                        "status": e.get("status"),
                        "assets": [
                            {
                                "id": a.get("id"),
                                "balance": float(a.get("balance") or 0.0),
                                "available": float(a.get("available") or 0.0),
                                "total": float(a.get("total") or 0.0),
                            }
                            for a in (e.get("assets") or [])
                        ],
                    })
                self._cached_venues = venues
                self._cache_ts = now
                self.last_error = None
                return list(venues)
            except Exception as exc:
                self.last_error = str(exc)
                logger.warning("list_venues failed: %s", exc)
                return list(self._cached_venues)

    async def refresh_venues(self) -> List[Dict[str, Any]]:
        return await self.list_venues(force_refresh=True)

    # ------------------------------------------------------------------
    # Routing
    # ------------------------------------------------------------------
    async def pick_best_venue(self, base_asset: str, side: str, size: float) -> Optional[Dict[str, Any]]:
        """Best-liquidity routing.
          • buy side  (desk rebuys base) ⇒ the venue with the most USDT available
          • sell side (desk sells base)  ⇒ the venue with the most base available
        """
        venues = await self.list_venues()
        needle_asset = "USDT" if side == "buy" else base_asset
        best = None
        best_amt = -1.0
        for v in venues:
            if v.get("status") != "APPROVED":
                continue
            for a in v.get("assets", []):
                if (a["id"] or "").upper() == needle_asset.upper():
                    if a["available"] > best_amt:
                        best_amt = a["available"]
                        best = {**v, "routing_asset": needle_asset, "routing_available": a["available"]}
                    break
        return best

    # ------------------------------------------------------------------
    # Hedge execution
    # ------------------------------------------------------------------
    async def execute_hedge(
        self,
        symbol: str,
        side: str,
        size: float,
        asset_mid: float,
    ) -> Dict[str, Any]:
        """Returns:
          { mode, venue_id?, venue_name?, fill_price, slippage_bps,
            slippage_cost, hedge_notional, tx_id?, shadow_note? }
        """
        venue = await self.pick_best_venue(symbol, side, size) if self.mode != HedgeMode.SIMULATED else None

        if self.mode == HedgeMode.SIMULATED:
            # Pure mock — engine's own _simulate_hedge continues to be used.
            return {"mode": "simulated"}

        if self.mode == HedgeMode.SHADOW:
            intent = {
                "mode": "shadow",
                "venue_id": venue["id"] if venue else None,
                "venue_name": venue["name"] if venue else None,
                "venue_type": venue["type"] if venue else None,
                "symbol": symbol,
                "side": side,
                "size": size,
                "asset_mid": asset_mid,
                "intended_notional": size * asset_mid,
                "shadow_note": "NO transaction created — intent logged only",
            }
            logger.info("SHADOW hedge intent: %s", intent)
            return intent

        # ----- LIVE mode -------------------------------------------------
        if self.mode == HedgeMode.LIVE:
            if not venue:
                raise RuntimeError("No approved venue available for live hedge")
            # NOTE: this implementation does vault-to-exchange transfer only.
            # Executing an actual SPOT ORDER on the exchange still requires the
            # venue's own trading API. For now, the LIVE path is explicitly
            # disabled and raises — switching it on is a future ticket.
            raise NotImplementedError(
                "Live mode requires spot trading API per venue (Phase 4b). "
                "Use shadow mode to validate the pipeline first."
            )

        return {"mode": "unknown"}


# Singleton
_adapter = FireblocksVenueAdapter()


def get_venue_adapter() -> FireblocksVenueAdapter:
    return _adapter
