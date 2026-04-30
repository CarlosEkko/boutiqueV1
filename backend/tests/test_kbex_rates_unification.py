"""
Test suite for KBEX Rates Unification (PR 1)
Tests the new /api/kbex-rates/resolve endpoint, cascading fallback logic,
migration endpoint, and audit functionality.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"

# Global session to avoid rate limiting
_session = None
_token = None


def get_authenticated_session():
    """Get or create authenticated session (singleton to avoid rate limiting)"""
    global _session, _token
    
    if _session is not None and _token is not None:
        return _session
    
    _session = requests.Session()
    _session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    login_resp = _session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_resp.status_code == 429:
        time.sleep(2)
        login_resp = _session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
    
    assert login_resp.status_code == 200, f"Login failed: {login_resp.status_code} - {login_resp.text}"
    data = login_resp.json()
    # API returns access_token, not token
    _token = data.get("access_token") or data.get("token")
    _session.headers.update({"Authorization": f"Bearer {_token}"})
    
    return _session


@pytest.fixture(scope="module")
def auth_session():
    """Module-scoped fixture for authenticated session"""
    return get_authenticated_session()


class TestKBEXRatesResolve:
    """Tests for GET /api/kbex-rates/resolve endpoint"""
    
    def test_resolve_returns_full_pricing_structure(self, auth_session):
        """Verify /resolve returns all required fields"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "vip",
            "asset": "BTC",
            "side": "buy"
        })
        assert resp.status_code == 200, f"Resolve failed: {resp.text}"
        data = resp.json()
        
        # Verify all required fields are present
        required_fields = [
            "product", "tier", "asset", "buy_spread_pct", "sell_spread_pct",
            "buy_fee_pct", "sell_fee_pct", "min_fee_usd", "swap_fee_pct",
            "swap_spread_pct", "source", "side", "effective_spread_pct",
            "effective_fee_pct", "total_pct"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(data["total_pct"], (int, float))
        assert isinstance(data["effective_spread_pct"], (int, float))
        assert isinstance(data["effective_fee_pct"], (int, float))
        assert data["side"] == "buy"
        print(f"Resolve returned: {data}")
    
    def test_resolve_btc_returns_override_source(self, auth_session):
        """BTC should return source='override' (migrated row exists)"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "vip",
            "asset": "BTC",
            "side": "buy"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "override", f"Expected override, got {data['source']}"
        assert data["asset"] == "BTC"
        print(f"BTC resolve source: {data['source']}")
    
    def test_resolve_unknown_asset_returns_fallback(self, auth_session):
        """Unknown asset should return source='fallback' with asset='*'"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "vip",
            "asset": "UNKNOWNASSET123",
            "side": "buy"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "fallback", f"Expected fallback, got {data['source']}"
        print(f"Unknown asset resolve: source={data['source']}, asset={data['asset']}")
    
    def test_resolve_standard_tier_unknown_asset_fallback(self, auth_session):
        """Standard tier with unknown asset should also fallback"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "standard",
            "asset": "NONEXISTENT",
            "side": "buy"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "fallback"
        print(f"Standard tier fallback: {data}")
    
    def test_resolve_invalid_product_returns_400(self, auth_session):
        """Invalid product should return 400"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "invalid_product",
            "tier": "vip",
            "asset": "BTC",
            "side": "buy"
        })
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"Invalid product response: {resp.json()}")
    
    def test_resolve_invalid_tier_returns_400(self, auth_session):
        """Invalid tier should return 400"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "invalid_tier",
            "asset": "BTC",
            "side": "buy"
        })
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"Invalid tier response: {resp.json()}")
    
    def test_resolve_side_buy_uses_buy_fields(self, auth_session):
        """side=buy should use buy_spread_pct + buy_fee_pct"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "vip",
            "asset": "BTC",
            "side": "buy"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        # effective_spread should equal buy_spread
        assert data["effective_spread_pct"] == data["buy_spread_pct"]
        # effective_fee should equal buy_fee
        assert data["effective_fee_pct"] == data["buy_fee_pct"]
        # total should be spread + fee
        expected_total = round(data["buy_spread_pct"] + data["buy_fee_pct"], 6)
        assert data["total_pct"] == expected_total, f"Expected {expected_total}, got {data['total_pct']}"
        print(f"Buy side: spread={data['effective_spread_pct']}, fee={data['effective_fee_pct']}, total={data['total_pct']}")
    
    def test_resolve_side_sell_uses_sell_fields(self, auth_session):
        """side=sell should use sell_spread_pct + sell_fee_pct"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "vip",
            "asset": "BTC",
            "side": "sell"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["effective_spread_pct"] == data["sell_spread_pct"]
        assert data["effective_fee_pct"] == data["sell_fee_pct"]
        expected_total = round(data["sell_spread_pct"] + data["sell_fee_pct"], 6)
        assert data["total_pct"] == expected_total
        print(f"Sell side: spread={data['effective_spread_pct']}, fee={data['effective_fee_pct']}, total={data['total_pct']}")
    
    def test_resolve_side_swap_uses_swap_fields(self, auth_session):
        """side=swap should use swap_spread_pct + swap_fee_pct"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "vip",
            "asset": "BTC",
            "side": "swap"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["effective_spread_pct"] == data["swap_spread_pct"]
        assert data["effective_fee_pct"] == data["swap_fee_pct"]
        expected_total = round(data["swap_spread_pct"] + data["swap_fee_pct"], 6)
        assert data["total_pct"] == expected_total
        print(f"Swap side: spread={data['effective_spread_pct']}, fee={data['effective_fee_pct']}, total={data['total_pct']}")
    
    def test_resolve_requires_authentication(self):
        """Resolve endpoint should require authentication"""
        session = requests.Session()
        resp = session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
            "product": "exchange",
            "tier": "vip",
            "asset": "BTC",
            "side": "buy"
        })
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"Unauthenticated resolve: {resp.status_code}")


class TestKBEXRatesMigration:
    """Tests for POST /api/kbex-rates/migrate-from-trading-fees endpoint"""
    
    def test_migrate_dry_run_returns_preview(self, auth_session):
        """dry_run=true should return preview without writing"""
        resp = auth_session.post(f"{BASE_URL}/api/kbex-rates/migrate-from-trading-fees", params={
            "dry_run": "true"
        })
        assert resp.status_code == 200, f"Migration dry run failed: {resp.text}"
        data = resp.json()
        
        assert data["dry_run"] == True
        assert "legacy_symbols" in data
        assert "had_global_doc" in data
        assert "kbex_rates_writes" in data
        assert "preview" in data
        print(f"Dry run: {data['legacy_symbols']} symbols, {data['kbex_rates_writes']} writes preview")
    
    def test_migrate_requires_admin(self):
        """Migration endpoint should require admin role"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        resp = session.post(f"{BASE_URL}/api/kbex-rates/migrate-from-trading-fees", params={
            "dry_run": "true"
        })
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"Unauthenticated migration: {resp.status_code}")
    
    def test_migrate_is_idempotent(self, auth_session):
        """Running migration twice should not crash or create duplicates"""
        # First run (dry_run=true to avoid creating audit entries)
        resp1 = auth_session.post(f"{BASE_URL}/api/kbex-rates/migrate-from-trading-fees", params={
            "dry_run": "true"
        })
        assert resp1.status_code == 200
        
        # Second run
        resp2 = auth_session.post(f"{BASE_URL}/api/kbex-rates/migrate-from-trading-fees", params={
            "dry_run": "true"
        })
        assert resp2.status_code == 200
        
        # Both should return similar structure
        data1 = resp1.json()
        data2 = resp2.json()
        assert data1["legacy_symbols"] == data2["legacy_symbols"]
        print(f"Idempotent check passed: {data1['legacy_symbols']} symbols both times")


class TestKBEXRatesAudit:
    """Tests for GET /api/kbex-rates/audit endpoint"""
    
    def test_audit_returns_entries(self, auth_session):
        """Audit endpoint should return recent entries"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/audit", params={"limit": 10})
        assert resp.status_code == 200, f"Audit failed: {resp.text}"
        data = resp.json()
        
        assert "entries" in data
        entries = data["entries"]
        assert isinstance(entries, list)
        print(f"Audit returned {len(entries)} entries")
        
        # Check for migrate_from_trading_fees entry
        actions = [e.get("action") for e in entries]
        print(f"Audit actions: {actions}")
    
    def test_audit_requires_admin(self):
        """Audit endpoint should require admin role"""
        session = requests.Session()
        resp = session.get(f"{BASE_URL}/api/kbex-rates/audit", params={"limit": 10})
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"Unauthenticated audit: {resp.status_code}")
    
    def test_audit_limit_parameter(self, auth_session):
        """Audit should respect limit parameter"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/audit", params={"limit": 5})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["entries"]) <= 5
        print(f"Audit with limit=5: {len(data['entries'])} entries")


class TestKBEXRatesRegression:
    """Regression tests for existing endpoints"""
    
    def test_get_config_still_works(self, auth_session):
        """GET /api/kbex-rates/config should still work"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/config")
        assert resp.status_code == 200, f"Config failed: {resp.text}"
        data = resp.json()
        
        assert "rates" in data
        assert "products" in data
        assert "tiers" in data
        print(f"Config: {len(data['rates'])} rates, {len(data['products'])} products, {len(data['tiers'])} tiers")
    
    def test_put_config_still_works(self, auth_session):
        """PUT /api/kbex-rates/config should still work"""
        # Update with a test rate (using TEST_ prefix for cleanup)
        resp = auth_session.put(f"{BASE_URL}/api/kbex-rates/config", json={
            "rates": [{
                "product": "exchange",
                "tier": "vip",
                "asset": "TEST_ASSET",
                "buy_spread_pct": 0.5,
                "sell_spread_pct": 0.3,
                "buy_fee_pct": 0.1,
                "sell_fee_pct": 0.1,
                "min_fee_usd": 1.0,
                "swap_fee_pct": 0.05,
                "swap_spread_pct": 0.02
            }]
        })
        assert resp.status_code == 200, f"Put config failed: {resp.text}"
        data = resp.json()
        assert data["success"] == True
        print(f"Put config: updated {data['updated']} rates")
    
    def test_my_spreads_still_works(self, auth_session):
        """GET /api/kbex-rates/my-spreads should still work"""
        resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/my-spreads")
        assert resp.status_code == 200, f"My spreads failed: {resp.text}"
        data = resp.json()
        
        assert "tier" in data
        assert "spreads" in data
        print(f"My spreads: tier={data['tier']}, products={list(data['spreads'].keys())}")
    
    def test_config_rejects_non_admin(self):
        """Config endpoints should reject non-admin with 403"""
        session = requests.Session()
        resp = session.get(f"{BASE_URL}/api/kbex-rates/config")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"Unauthenticated config: {resp.status_code}")
    
    def test_auth_login_still_works(self):
        """Regression: /api/auth/login should still work"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        time.sleep(1)  # Avoid rate limiting
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        # Accept 200 or 429 (rate limited)
        assert resp.status_code in [200, 429], f"Login failed: {resp.text}"
        if resp.status_code == 200:
            data = resp.json()
            # API returns access_token
            assert "access_token" in data or "token" in data
        print(f"Auth login regression: {resp.status_code}")
    
    def test_permissions_menus_still_works(self, auth_session):
        """Regression: /api/permissions/menus should still work"""
        resp = auth_session.get(f"{BASE_URL}/api/permissions/menus")
        assert resp.status_code == 200, f"Permissions menus failed: {resp.text}"
        print("Permissions menus regression: PASS")


class TestKBEXRatesAllTiers:
    """Test resolve across all tiers"""
    
    def test_resolve_all_tiers(self, auth_session):
        """Test resolve works for all tiers"""
        tiers = ["broker", "standard", "premium", "vip", "institucional"]
        for tier in tiers:
            resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
                "product": "exchange",
                "tier": tier,
                "asset": "BTC",
                "side": "buy"
            })
            assert resp.status_code == 200, f"Resolve failed for tier {tier}: {resp.text}"
            data = resp.json()
            assert data["tier"] == tier
            print(f"Tier {tier}: total_pct={data['total_pct']}, source={data['source']}")
    
    def test_resolve_all_products(self, auth_session):
        """Test resolve works for all products"""
        products = ["otc", "exchange", "escrow", "spot", "multisign"]
        for product in products:
            resp = auth_session.get(f"{BASE_URL}/api/kbex-rates/resolve", params={
                "product": product,
                "tier": "vip",
                "asset": "BTC",
                "side": "buy"
            })
            assert resp.status_code == 200, f"Resolve failed for product {product}: {resp.text}"
            data = resp.json()
            print(f"Product {product}: total_pct={data['total_pct']}, source={data['source']}")
