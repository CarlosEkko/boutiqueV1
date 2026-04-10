"""
Test WebSocket prices endpoint and Trading/Markets API endpoints
Tests for P2 tasks: WebSocket real-time prices and translations
"""
import pytest
import requests
import os
import json
import asyncio
import websockets
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTradingMarketsAPI:
    """Test /api/trading/markets and /api/trading/markets/stats endpoints"""
    
    def test_markets_endpoint_returns_200(self):
        """GET /api/trading/markets should return 200"""
        response = requests.get(f"{BASE_URL}/api/trading/markets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/trading/markets returns 200")
    
    def test_markets_returns_markets_array(self):
        """Markets endpoint should return markets array with crypto data"""
        response = requests.get(f"{BASE_URL}/api/trading/markets")
        data = response.json()
        
        assert "markets" in data, "Response should contain 'markets' key"
        assert isinstance(data["markets"], list), "markets should be a list"
        assert len(data["markets"]) > 0, "markets should not be empty"
        print(f"✓ Markets endpoint returns {len(data['markets'])} cryptocurrencies")
    
    def test_markets_data_structure(self):
        """Each market should have required fields"""
        response = requests.get(f"{BASE_URL}/api/trading/markets")
        data = response.json()
        
        required_fields = ["symbol", "name", "price", "change_24h", "volume_24h"]
        
        for market in data["markets"][:5]:  # Check first 5
            for field in required_fields:
                assert field in market, f"Market {market.get('symbol', 'unknown')} missing field: {field}"
        
        print("✓ Markets data structure is correct with all required fields")
    
    def test_markets_includes_btc_eth_sol_xrp(self):
        """Markets should include BTC, ETH, SOL, XRP (featured charts)"""
        response = requests.get(f"{BASE_URL}/api/trading/markets")
        data = response.json()
        
        symbols = [m["symbol"] for m in data["markets"]]
        required_symbols = ["BTC", "ETH", "SOL", "XRP"]
        
        for sym in required_symbols:
            assert sym in symbols, f"Missing required symbol: {sym}"
        
        print(f"✓ Markets includes all featured chart symbols: {required_symbols}")
    
    def test_markets_stats_endpoint_returns_200(self):
        """GET /api/trading/markets/stats should return 200"""
        response = requests.get(f"{BASE_URL}/api/trading/markets/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/trading/markets/stats returns 200")
    
    def test_markets_stats_data_structure(self):
        """Stats endpoint should return top_gainer and top_loser"""
        response = requests.get(f"{BASE_URL}/api/trading/markets/stats")
        data = response.json()
        
        assert "top_gainer" in data, "Stats should include top_gainer"
        assert "top_loser" in data, "Stats should include top_loser"
        assert "total_volume_24h" in data, "Stats should include total_volume_24h"
        
        if data["top_gainer"]:
            assert "symbol" in data["top_gainer"], "top_gainer should have symbol"
            assert "change_24h" in data["top_gainer"], "top_gainer should have change_24h"
        
        if data["top_loser"]:
            assert "symbol" in data["top_loser"], "top_loser should have symbol"
            assert "change_24h" in data["top_loser"], "top_loser should have change_24h"
        
        print(f"✓ Stats: Top Gainer={data.get('top_gainer', {}).get('symbol')}, Top Loser={data.get('top_loser', {}).get('symbol')}")
    
    def test_markets_currency_parameter(self):
        """Markets endpoint should accept currency parameter"""
        for currency in ["USD", "EUR", "BRL"]:
            response = requests.get(f"{BASE_URL}/api/trading/markets", params={"currency": currency})
            assert response.status_code == 200, f"Failed for currency {currency}"
            data = response.json()
            assert data.get("currency") == currency, f"Currency mismatch for {currency}"
        
        print("✓ Markets endpoint accepts currency parameter (USD, EUR, BRL)")


class TestCryptoPricesAPI:
    """Test /api/crypto-prices endpoint (fallback for WebSocket)"""
    
    def test_crypto_prices_endpoint_returns_200(self):
        """GET /api/crypto-prices should return 200"""
        response = requests.get(f"{BASE_URL}/api/crypto-prices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/crypto-prices returns 200")
    
    def test_crypto_prices_returns_prices_array(self):
        """Crypto prices endpoint should return prices array"""
        response = requests.get(f"{BASE_URL}/api/crypto-prices")
        data = response.json()
        
        assert "prices" in data, "Response should contain 'prices' key"
        assert isinstance(data["prices"], list), "prices should be a list"
        print(f"✓ Crypto prices endpoint returns {len(data['prices'])} prices")


class TestWebSocketPrices:
    """Test WebSocket /api/ws/prices endpoint"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """WebSocket should accept connections"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/prices"
        
        try:
            async with websockets.connect(ws_url, close_timeout=5) as ws:
                # Wait for initial message (should be cached prices or initial fetch)
                message = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(message)
                
                assert data.get("type") == "prices", f"Expected type='prices', got {data.get('type')}"
                assert "data" in data, "Message should contain 'data' field"
                assert "source" in data, "Message should contain 'source' field"
                
                print(f"✓ WebSocket connected and received initial prices (source: {data.get('source')})")
                
        except Exception as e:
            pytest.fail(f"WebSocket connection failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_price_data_structure(self):
        """WebSocket price data should have correct structure"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/prices"
        
        try:
            async with websockets.connect(ws_url, close_timeout=5) as ws:
                message = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(message)
                
                prices = data.get("data", [])
                assert len(prices) > 0, "Should receive at least one price"
                
                # Check first price structure
                price = prices[0]
                required_fields = ["symbol", "name", "price"]
                for field in required_fields:
                    assert field in price, f"Price missing field: {field}"
                
                print(f"✓ WebSocket price data structure correct, received {len(prices)} prices")
                
        except Exception as e:
            pytest.fail(f"WebSocket test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_source_field(self):
        """WebSocket should indicate source (binance_ws, binance_rest, or cache)"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/prices"
        
        try:
            async with websockets.connect(ws_url, close_timeout=5) as ws:
                message = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(message)
                
                source = data.get("source", "")
                valid_sources = ["binance_ws", "binance_rest", "cache"]
                assert source in valid_sources, f"Source '{source}' not in valid sources: {valid_sources}"
                
                print(f"✓ WebSocket source field is valid: {source}")
                
        except Exception as e:
            pytest.fail(f"WebSocket test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self):
        """WebSocket should respond to ping with pong"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/prices"
        
        try:
            async with websockets.connect(ws_url, close_timeout=5) as ws:
                # First receive initial prices
                await asyncio.wait_for(ws.recv(), timeout=10)
                
                # Send ping
                await ws.send("ping")
                
                # Should receive pong
                response = await asyncio.wait_for(ws.recv(), timeout=5)
                assert response == "pong", f"Expected 'pong', got '{response}'"
                
                print("✓ WebSocket ping/pong working correctly")
                
        except Exception as e:
            pytest.fail(f"WebSocket ping/pong test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_receives_updates(self):
        """WebSocket should receive price updates over time"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/prices"
        
        try:
            async with websockets.connect(ws_url, close_timeout=10) as ws:
                messages_received = 0
                sources_seen = set()
                
                # Try to receive up to 3 messages within 15 seconds
                start_time = asyncio.get_event_loop().time()
                while messages_received < 3 and (asyncio.get_event_loop().time() - start_time) < 15:
                    try:
                        message = await asyncio.wait_for(ws.recv(), timeout=5)
                        if message == "pong":
                            continue
                        data = json.loads(message)
                        if data.get("type") == "prices":
                            messages_received += 1
                            sources_seen.add(data.get("source", "unknown"))
                    except asyncio.TimeoutError:
                        break
                
                assert messages_received >= 1, "Should receive at least 1 price update"
                print(f"✓ WebSocket received {messages_received} price updates, sources: {sources_seen}")
                
        except Exception as e:
            pytest.fail(f"WebSocket updates test failed: {e}")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Health endpoint returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
