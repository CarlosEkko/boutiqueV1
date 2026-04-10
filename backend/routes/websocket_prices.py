from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import logging
import httpx
import websockets
from typing import Dict, Set, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])

# Binance WebSocket combined stream URL
BINANCE_WS_STREAM_URL = "wss://stream.binance.com:9443/stream"
BINANCE_API_URL = "https://api.binance.com/api/v3"

# Tracked symbols
TRACKED_SYMBOLS = ["btc", "eth", "ada", "sol", "xrp", "bnb", "doge", "dot",
                   "avax", "link", "matic", "uni", "aave", "arb", "ftm",
                   "algo", "apt", "usdt", "usdc", "trx"]

# Symbol names
SYMBOL_NAMES = {
    "BTC": "Bitcoin", "ETH": "Ethereum", "ADA": "Cardano",
    "SOL": "Solana", "XRP": "XRP", "BNB": "BNB",
    "DOGE": "Dogecoin", "DOT": "Polkadot", "AVAX": "Avalanche",
    "LINK": "Chainlink", "MATIC": "Polygon", "UNI": "Uniswap",
    "AAVE": "Aave", "ARB": "Arbitrum", "FTM": "Fantom",
    "ALGO": "Algorand", "APT": "Aptos", "USDT": "Tether",
    "USDC": "USD Coin", "TRX": "TRON",
}


class PriceConnectionManager:
    """Manages WebSocket connections and broadcasts price updates via Binance WebSocket streams."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.latest_prices: Dict[str, Any] = {}
        self._binance_ws_task = None
        self._running = False
        self._binance_connected = False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Client connected. Total: {len(self.active_connections)}")

        # Send cached prices immediately
        if self.latest_prices:
            try:
                await websocket.send_json({
                    "type": "prices",
                    "data": list(self.latest_prices.values()),
                    "source": "cache",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            except Exception:
                pass

        # Start Binance WebSocket stream if not running
        if not self._running:
            self._running = True
            self._binance_ws_task = asyncio.create_task(self._binance_ws_loop())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"Client disconnected. Total: {len(self.active_connections)}")

        if not self.active_connections and self._running:
            self._running = False
            if self._binance_ws_task:
                self._binance_ws_task.cancel()
            self._binance_connected = False

    async def broadcast(self, message: dict):
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        for conn in disconnected:
            self.active_connections.discard(conn)

    async def _binance_ws_loop(self):
        """Connect to Binance WebSocket combined stream for real-time ticker data."""
        # First, do an initial REST fetch for fast first paint
        await self._initial_rest_fetch()

        # Build the combined stream URL
        streams = "/".join([f"{s}usdt@miniTicker" for s in TRACKED_SYMBOLS])
        ws_url = f"{BINANCE_WS_STREAM_URL}?streams={streams}"

        while self._running and self.active_connections:
            try:
                logger.info("Connecting to Binance WebSocket stream...")
                async with websockets.connect(ws_url, ping_interval=20, ping_timeout=10) as ws:
                    self._binance_connected = True
                    logger.info("Binance WebSocket connected - real-time streaming active")

                    # Batch updates: collect for 1 second then broadcast
                    batch_buffer = {}
                    last_broadcast = asyncio.get_event_loop().time()

                    async for raw_msg in ws:
                        if not self._running:
                            break

                        try:
                            msg = json.loads(raw_msg)
                            data = msg.get("data", {})
                            event = data.get("e", "")

                            if event == "24hrMiniTicker":
                                symbol = data.get("s", "")  # e.g., "BTCUSDT"
                                if symbol.endswith("USDT"):
                                    base = symbol[:-4]
                                    price_data = {
                                        "symbol": base,
                                        "name": SYMBOL_NAMES.get(base, base),
                                        "price": float(data.get("c", 0)),
                                        "high_24h": float(data.get("h", 0)),
                                        "low_24h": float(data.get("l", 0)),
                                        "volume_24h": float(data.get("v", 0)) * float(data.get("c", 0)),
                                        "change_24h": _calc_change(data),
                                    }
                                    batch_buffer[base] = price_data
                                    self.latest_prices[base] = price_data

                            # Broadcast every ~1 second
                            now = asyncio.get_event_loop().time()
                            if now - last_broadcast >= 1.0 and batch_buffer:
                                if self.active_connections:
                                    await self.broadcast({
                                        "type": "prices",
                                        "data": list(self.latest_prices.values()),
                                        "source": "binance_ws",
                                        "timestamp": datetime.now(timezone.utc).isoformat()
                                    })
                                batch_buffer.clear()
                                last_broadcast = now

                        except json.JSONDecodeError:
                            continue

            except asyncio.CancelledError:
                logger.info("Binance WS task cancelled")
                break
            except Exception as e:
                self._binance_connected = False
                logger.warning(f"Binance WS disconnected: {e}. Reconnecting in 5s...")
                # Fallback to REST while disconnected
                await self._initial_rest_fetch()
                await asyncio.sleep(5)

        self._binance_connected = False

    async def _initial_rest_fetch(self):
        """One-time REST fetch for initial price data."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{BINANCE_API_URL}/ticker/24hr")
                response.raise_for_status()
                all_tickers = response.json()

            usdt_map = {}
            for ticker in all_tickers:
                sym = ticker.get("symbol", "")
                if sym.endswith("USDT"):
                    usdt_map[sym[:-4]] = ticker

            prices = []
            for symbol in TRACKED_SYMBOLS:
                upper = symbol.upper()
                ticker = usdt_map.get(upper)
                if ticker:
                    price_data = {
                        "symbol": upper,
                        "name": SYMBOL_NAMES.get(upper, upper),
                        "price": float(ticker.get("lastPrice", 0)),
                        "change_24h": float(ticker.get("priceChangePercent", 0)),
                        "volume_24h": float(ticker.get("volume", 0)) * float(ticker.get("lastPrice", 0)),
                        "high_24h": float(ticker.get("highPrice", 0)),
                        "low_24h": float(ticker.get("lowPrice", 0)),
                    }
                    prices.append(price_data)
                    self.latest_prices[upper] = price_data

            if prices and self.active_connections:
                await self.broadcast({
                    "type": "prices",
                    "data": prices,
                    "source": "binance_rest",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                logger.info(f"Initial REST fetch: {len(prices)} prices loaded")

        except Exception as e:
            logger.error(f"REST fetch failed: {e}")


def _calc_change(data: dict) -> float:
    """Calculate 24h % change from miniTicker data."""
    close = float(data.get("c", 0))
    open_price = float(data.get("o", 0))
    if open_price > 0:
        return ((close - open_price) / open_price) * 100
    return 0.0


manager = PriceConnectionManager()


@router.websocket("/prices")
async def websocket_prices(websocket: WebSocket):
    """WebSocket endpoint for real-time crypto price updates via Binance streams."""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
