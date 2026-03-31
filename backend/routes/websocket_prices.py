from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import logging
import httpx
from typing import Dict, Set, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])

# Binance WebSocket URL for combined streams
BINANCE_WS_URL = "wss://stream.binance.com:9443/ws"
BINANCE_API_URL = "https://api.binance.com/api/v3"

# Tracked symbols
TRACKED_SYMBOLS = ["btc", "eth", "ada", "sol", "xrp", "bnb", "doge", "dot"]

# Symbol names
SYMBOL_NAMES = {
    "BTC": "Bitcoin", "ETH": "Ethereum", "ADA": "Cardano",
    "SOL": "Solana", "XRP": "XRP", "BNB": "BNB",
    "DOGE": "Dogecoin", "DOT": "Polkadot"
}


class PriceConnectionManager:
    """Manages WebSocket connections and broadcasts price updates."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.latest_prices: Dict[str, Any] = {}
        self._broadcast_task = None
        self._binance_task = None
        self._running = False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Client connected. Total: {len(self.active_connections)}")

        # Send current prices immediately
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

        # Start background fetcher if not running
        if not self._running:
            self._running = True
            self._binance_task = asyncio.create_task(self._binance_price_loop())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"Client disconnected. Total: {len(self.active_connections)}")

        # Stop background task if no clients
        if not self.active_connections and self._running:
            self._running = False
            if self._binance_task:
                self._binance_task.cancel()

    async def broadcast(self, message: dict):
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        for conn in disconnected:
            self.active_connections.discard(conn)

    async def _binance_price_loop(self):
        """Fetch prices from Binance REST API every 5 seconds and broadcast."""
        while self._running and self.active_connections:
            try:
                await self._fetch_and_broadcast()
                await asyncio.sleep(5)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Price loop error: {e}")
                await asyncio.sleep(10)

    async def _fetch_and_broadcast(self):
        """Fetch from Binance REST API and broadcast to clients."""
        symbols_param = json.dumps([f"{s.upper()}USDT" for s in TRACKED_SYMBOLS])
        url = f"{BINANCE_API_URL}/ticker/24hr"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            all_tickers = response.json()

        # Build price map
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
                "source": "binance_live",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })


manager = PriceConnectionManager()


@router.websocket("/prices")
async def websocket_prices(websocket: WebSocket):
    """WebSocket endpoint for real-time crypto price updates."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive - listen for client messages (ping/pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
