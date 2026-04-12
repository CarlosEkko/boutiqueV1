"""
Launchpad / ICO Module Tests
Tests for token sale creation, management, subscription, and public listing.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        # The login response uses 'access_token' not 'token'
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestPublicLaunchpadEndpoints:
    """Public endpoints - no auth required"""
    
    def test_list_token_sales(self, api_client):
        """GET /api/launchpad/sales - List all token sales"""
        response = api_client.get(f"{BASE_URL}/api/launchpad/sales")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sales" in data, "Response should contain 'sales' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["sales"], list), "Sales should be a list"
        
        # Check that existing sales have computed_status and progress_pct
        if len(data["sales"]) > 0:
            sale = data["sales"][0]
            assert "computed_status" in sale, "Sale should have computed_status"
            assert "progress_pct" in sale, "Sale should have progress_pct"
            assert "id" in sale, "Sale should have id"
            assert "name" in sale, "Sale should have name"
            assert "symbol" in sale, "Sale should have symbol"
        print(f"✓ Found {data['total']} token sales")
    
    def test_list_token_sales_filter_by_status(self, api_client):
        """GET /api/launchpad/sales?status=active - Filter by status"""
        response = api_client.get(f"{BASE_URL}/api/launchpad/sales?status=active")
        assert response.status_code == 200
        
        data = response.json()
        # All returned sales should have computed_status = 'active'
        for sale in data["sales"]:
            assert sale["computed_status"] == "active", f"Expected active status, got {sale['computed_status']}"
        print(f"✓ Filter by status works - {len(data['sales'])} active sales")
    
    def test_get_token_sale_detail(self, api_client):
        """GET /api/launchpad/sales/{id} - Get single sale detail"""
        # First get list to find an existing sale
        list_response = api_client.get(f"{BASE_URL}/api/launchpad/sales")
        assert list_response.status_code == 200
        
        sales = list_response.json()["sales"]
        if len(sales) == 0:
            pytest.skip("No token sales exist to test detail endpoint")
        
        sale_id = sales[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/launchpad/sales/{sale_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        sale = response.json()
        assert sale["id"] == sale_id
        assert "computed_status" in sale
        assert "progress_pct" in sale
        assert "total_participants" in sale, "Detail should include total_participants"
        print(f"✓ Sale detail: {sale['name']} ({sale['symbol']}) - {sale['total_participants']} participants")
    
    def test_get_nonexistent_sale(self, api_client):
        """GET /api/launchpad/sales/{id} - 404 for non-existent sale"""
        fake_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/launchpad/sales/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent sale returns 404")


class TestAdminLaunchpadEndpoints:
    """Admin endpoints - require admin auth"""
    
    def test_create_token_sale(self, api_client, admin_headers):
        """POST /api/launchpad/admin/sales - Create new token sale"""
        # Create a sale with start_date in the past and end_date in the future (active)
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(hours=1)).isoformat()
        end_date = (now + timedelta(days=7)).isoformat()
        
        payload = {
            "name": f"TEST Token Sale {uuid.uuid4().hex[:6]}",
            "symbol": "TEST",
            "description": "Test token sale for automated testing",
            "price": 0.50,
            "total_supply": 10000,
            "hard_cap": 5000,
            "soft_cap": 1000,
            "min_allocation": 10,
            "max_allocation": 1000,
            "start_date": start_date,
            "end_date": end_date,
            "network": "Ethereum",
            "token_type": "ERC-20"
        }
        
        response = api_client.post(f"{BASE_URL}/api/launchpad/admin/sales", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        sale = response.json()
        assert "id" in sale, "Created sale should have id"
        assert sale["name"] == payload["name"]
        assert sale["symbol"] == payload["symbol"]
        assert sale["price"] == payload["price"]
        assert sale["total_supply"] == payload["total_supply"]
        assert sale["tokens_sold"] == 0, "New sale should have 0 tokens sold"
        assert sale["raised_amount"] == 0, "New sale should have 0 raised"
        
        # Store for later tests
        TestAdminLaunchpadEndpoints.created_sale_id = sale["id"]
        print(f"✓ Created token sale: {sale['name']} (ID: {sale['id']})")
        return sale["id"]
    
    def test_update_token_sale(self, api_client, admin_headers):
        """PUT /api/launchpad/admin/sales/{id} - Update token sale"""
        sale_id = getattr(TestAdminLaunchpadEndpoints, 'created_sale_id', None)
        if not sale_id:
            pytest.skip("No sale created to update")
        
        update_payload = {
            "description": "Updated description for testing",
            "soft_cap": 2000
        }
        
        response = api_client.put(f"{BASE_URL}/api/launchpad/admin/sales/{sale_id}", json=update_payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        sale = response.json()
        assert sale["description"] == update_payload["description"]
        assert sale["soft_cap"] == update_payload["soft_cap"]
        print(f"✓ Updated token sale: {sale_id}")
    
    def test_update_nonexistent_sale(self, api_client, admin_headers):
        """PUT /api/launchpad/admin/sales/{id} - 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        response = api_client.put(f"{BASE_URL}/api/launchpad/admin/sales/{fake_id}", json={"description": "test"}, headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Update non-existent sale returns 404")
    
    def test_get_sale_subscriptions_empty(self, api_client, admin_headers):
        """GET /api/launchpad/admin/sales/{id}/subscriptions - Get subscriptions for a sale"""
        sale_id = getattr(TestAdminLaunchpadEndpoints, 'created_sale_id', None)
        if not sale_id:
            pytest.skip("No sale created to check subscriptions")
        
        response = api_client.get(f"{BASE_URL}/api/launchpad/admin/sales/{sale_id}/subscriptions", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subscriptions" in data
        assert "total" in data
        print(f"✓ Sale subscriptions: {data['total']} subscriptions")


class TestClientSubscriptionEndpoints:
    """Client subscription endpoints - require auth"""
    
    def test_subscribe_to_active_sale(self, api_client, admin_headers):
        """POST /api/launchpad/sales/{id}/subscribe - Subscribe to active sale"""
        # Use the sale created in admin tests
        sale_id = getattr(TestAdminLaunchpadEndpoints, 'created_sale_id', None)
        if not sale_id:
            pytest.skip("No active sale to subscribe to")
        
        # First verify the sale is active
        sale_response = api_client.get(f"{BASE_URL}/api/launchpad/sales/{sale_id}")
        if sale_response.status_code != 200:
            pytest.skip("Could not fetch sale details")
        
        sale = sale_response.json()
        if sale["computed_status"] != "active":
            pytest.skip(f"Sale is not active (status: {sale['computed_status']})")
        
        payload = {
            "amount_tokens": 50,
            "payment_currency": "EUR"
        }
        
        response = api_client.post(f"{BASE_URL}/api/launchpad/sales/{sale_id}/subscribe", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subscription_id" in data
        assert data["amount_tokens"] == payload["amount_tokens"]
        assert "amount_usd" in data
        
        # Store for later tests
        TestClientSubscriptionEndpoints.subscription_id = data["subscription_id"]
        print(f"✓ Subscribed to sale: {data['amount_tokens']} tokens, ${data['amount_usd']}")
    
    def test_subscribe_duplicate_fails(self, api_client, admin_headers):
        """POST /api/launchpad/sales/{id}/subscribe - Duplicate subscription fails"""
        sale_id = getattr(TestAdminLaunchpadEndpoints, 'created_sale_id', None)
        if not sale_id:
            pytest.skip("No sale to test duplicate subscription")
        
        payload = {
            "amount_tokens": 50,
            "payment_currency": "EUR"
        }
        
        response = api_client.post(f"{BASE_URL}/api/launchpad/sales/{sale_id}/subscribe", json=payload, headers=admin_headers)
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        assert "already subscribed" in response.text.lower()
        print("✓ Duplicate subscription correctly rejected")
    
    def test_subscribe_below_min_allocation(self, api_client, admin_headers):
        """POST /api/launchpad/sales/{id}/subscribe - Below min allocation fails"""
        # Create a new sale with min_allocation
        now = datetime.now(timezone.utc)
        payload = {
            "name": f"Min Alloc Test {uuid.uuid4().hex[:6]}",
            "symbol": "MINT",
            "price": 1.0,
            "total_supply": 1000,
            "hard_cap": 1000,
            "min_allocation": 100,
            "max_allocation": 500,
            "start_date": (now - timedelta(hours=1)).isoformat(),
            "end_date": (now + timedelta(days=1)).isoformat(),
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/launchpad/admin/sales", json=payload, headers=admin_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create test sale")
        
        sale_id = create_response.json()["id"]
        
        # Try to subscribe below min
        sub_response = api_client.post(f"{BASE_URL}/api/launchpad/sales/{sale_id}/subscribe", 
                                       json={"amount_tokens": 10, "payment_currency": "EUR"}, 
                                       headers=admin_headers)
        assert sub_response.status_code == 400, f"Expected 400, got {sub_response.status_code}"
        assert "minimum" in sub_response.text.lower()
        
        # Cleanup - delete the sale
        api_client.delete(f"{BASE_URL}/api/launchpad/admin/sales/{sale_id}", headers=admin_headers)
        print("✓ Below min allocation correctly rejected")
    
    def test_my_subscriptions(self, api_client, admin_headers):
        """GET /api/launchpad/my-subscriptions - Get user's subscriptions"""
        response = api_client.get(f"{BASE_URL}/api/launchpad/my-subscriptions", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subscriptions" in data
        assert isinstance(data["subscriptions"], list)
        
        # Should have at least the subscription we created
        if len(data["subscriptions"]) > 0:
            sub = data["subscriptions"][0]
            assert "id" in sub
            assert "sale_id" in sub
            assert "amount_tokens" in sub
            assert "status" in sub
        print(f"✓ My subscriptions: {len(data['subscriptions'])} subscriptions")


class TestAdminSubscriptionManagement:
    """Admin subscription management endpoints"""
    
    def test_distribute_subscription(self, api_client, admin_headers):
        """PUT /api/launchpad/admin/subscriptions/{id}/distribute - Mark as distributed"""
        sub_id = getattr(TestClientSubscriptionEndpoints, 'subscription_id', None)
        if not sub_id:
            pytest.skip("No subscription to distribute")
        
        response = api_client.put(f"{BASE_URL}/api/launchpad/admin/subscriptions/{sub_id}/distribute", json={}, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Subscription distributed: {sub_id}")
    
    def test_distribute_already_processed(self, api_client, admin_headers):
        """PUT /api/launchpad/admin/subscriptions/{id}/distribute - Already processed fails"""
        sub_id = getattr(TestClientSubscriptionEndpoints, 'subscription_id', None)
        if not sub_id:
            pytest.skip("No subscription to test")
        
        response = api_client.put(f"{BASE_URL}/api/launchpad/admin/subscriptions/{sub_id}/distribute", json={}, headers=admin_headers)
        assert response.status_code == 404, f"Expected 404 for already processed, got {response.status_code}"
        print("✓ Already distributed subscription correctly rejected")


class TestDeleteTokenSale:
    """Delete token sale tests - run last"""
    
    def test_delete_sale_with_subscriptions_fails(self, api_client, admin_headers):
        """DELETE /api/launchpad/admin/sales/{id} - Fails if subscriptions exist"""
        sale_id = getattr(TestAdminLaunchpadEndpoints, 'created_sale_id', None)
        if not sale_id:
            pytest.skip("No sale to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/launchpad/admin/sales/{sale_id}", headers=admin_headers)
        # Should fail because we have a subscription
        assert response.status_code == 400, f"Expected 400 (has subscriptions), got {response.status_code}"
        assert "subscriptions" in response.text.lower()
        print("✓ Delete with subscriptions correctly rejected")
    
    def test_delete_sale_without_subscriptions(self, api_client, admin_headers):
        """DELETE /api/launchpad/admin/sales/{id} - Success if no subscriptions"""
        # Create a new sale without subscriptions
        now = datetime.now(timezone.utc)
        payload = {
            "name": f"Delete Test {uuid.uuid4().hex[:6]}",
            "symbol": "DEL",
            "price": 1.0,
            "total_supply": 1000,
            "hard_cap": 1000,
            "start_date": (now + timedelta(days=1)).isoformat(),  # Future = upcoming, can't subscribe
            "end_date": (now + timedelta(days=7)).isoformat(),
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/launchpad/admin/sales", json=payload, headers=admin_headers)
        assert create_response.status_code == 200
        
        sale_id = create_response.json()["id"]
        
        # Delete should succeed
        delete_response = api_client.delete(f"{BASE_URL}/api/launchpad/admin/sales/{sale_id}", headers=admin_headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify deleted
        get_response = api_client.get(f"{BASE_URL}/api/launchpad/sales/{sale_id}")
        assert get_response.status_code == 404
        print("✓ Sale without subscriptions deleted successfully")


class TestRefundSubscription:
    """Refund subscription tests"""
    
    def test_refund_subscription(self, api_client, admin_headers):
        """PUT /api/launchpad/admin/subscriptions/{id}/refund - Refund a subscription"""
        # Create a new sale and subscription to refund
        now = datetime.now(timezone.utc)
        sale_payload = {
            "name": f"Refund Test {uuid.uuid4().hex[:6]}",
            "symbol": "REF",
            "price": 1.0,
            "total_supply": 1000,
            "hard_cap": 1000,
            "start_date": (now - timedelta(hours=1)).isoformat(),
            "end_date": (now + timedelta(days=1)).isoformat(),
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/launchpad/admin/sales", json=sale_payload, headers=admin_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create test sale for refund")
        
        sale_id = create_response.json()["id"]
        
        # Subscribe
        sub_response = api_client.post(f"{BASE_URL}/api/launchpad/sales/{sale_id}/subscribe",
                                       json={"amount_tokens": 100, "payment_currency": "EUR"},
                                       headers=admin_headers)
        if sub_response.status_code != 200:
            pytest.skip("Could not create subscription for refund test")
        
        sub_id = sub_response.json()["subscription_id"]
        
        # Get sale stats before refund
        sale_before = api_client.get(f"{BASE_URL}/api/launchpad/sales/{sale_id}").json()
        tokens_sold_before = sale_before.get("tokens_sold", 0)
        
        # Refund
        refund_response = api_client.put(f"{BASE_URL}/api/launchpad/admin/subscriptions/{sub_id}/refund", json={}, headers=admin_headers)
        assert refund_response.status_code == 200, f"Expected 200, got {refund_response.status_code}: {refund_response.text}"
        
        # Verify tokens returned to pool
        sale_after = api_client.get(f"{BASE_URL}/api/launchpad/sales/{sale_id}").json()
        assert sale_after["tokens_sold"] < tokens_sold_before, "Tokens should be returned to pool after refund"
        
        # Cleanup - now we can delete since subscription is refunded
        api_client.delete(f"{BASE_URL}/api/launchpad/admin/sales/{sale_id}", headers=admin_headers)
        print("✓ Subscription refunded and tokens returned to pool")
    
    def test_refund_already_refunded(self, api_client, admin_headers):
        """PUT /api/launchpad/admin/subscriptions/{id}/refund - Already refunded fails"""
        # Create sale and subscription
        now = datetime.now(timezone.utc)
        sale_payload = {
            "name": f"Double Refund Test {uuid.uuid4().hex[:6]}",
            "symbol": "DRF",
            "price": 1.0,
            "total_supply": 1000,
            "hard_cap": 1000,
            "start_date": (now - timedelta(hours=1)).isoformat(),
            "end_date": (now + timedelta(days=1)).isoformat(),
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/launchpad/admin/sales", json=sale_payload, headers=admin_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create test sale")
        
        sale_id = create_response.json()["id"]
        
        sub_response = api_client.post(f"{BASE_URL}/api/launchpad/sales/{sale_id}/subscribe",
                                       json={"amount_tokens": 50, "payment_currency": "EUR"},
                                       headers=admin_headers)
        if sub_response.status_code != 200:
            pytest.skip("Could not create subscription")
        
        sub_id = sub_response.json()["subscription_id"]
        
        # First refund
        api_client.put(f"{BASE_URL}/api/launchpad/admin/subscriptions/{sub_id}/refund", json={}, headers=admin_headers)
        
        # Second refund should fail
        second_refund = api_client.put(f"{BASE_URL}/api/launchpad/admin/subscriptions/{sub_id}/refund", json={}, headers=admin_headers)
        assert second_refund.status_code == 400, f"Expected 400 for double refund, got {second_refund.status_code}"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/launchpad/admin/sales/{sale_id}", headers=admin_headers)
        print("✓ Double refund correctly rejected")


class TestSubscribeToNonActiveSale:
    """Test subscription to non-active sales"""
    
    def test_subscribe_to_upcoming_sale_fails(self, api_client, admin_headers):
        """POST /api/launchpad/sales/{id}/subscribe - Upcoming sale fails"""
        # Create an upcoming sale (start_date in future)
        now = datetime.now(timezone.utc)
        payload = {
            "name": f"Upcoming Test {uuid.uuid4().hex[:6]}",
            "symbol": "UPC",
            "price": 1.0,
            "total_supply": 1000,
            "hard_cap": 1000,
            "start_date": (now + timedelta(days=1)).isoformat(),
            "end_date": (now + timedelta(days=7)).isoformat(),
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/launchpad/admin/sales", json=payload, headers=admin_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create upcoming sale")
        
        sale_id = create_response.json()["id"]
        
        # Try to subscribe
        sub_response = api_client.post(f"{BASE_URL}/api/launchpad/sales/{sale_id}/subscribe",
                                       json={"amount_tokens": 50, "payment_currency": "EUR"},
                                       headers=admin_headers)
        assert sub_response.status_code == 400, f"Expected 400 for upcoming sale, got {sub_response.status_code}"
        assert "not active" in sub_response.text.lower()
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/launchpad/admin/sales/{sale_id}", headers=admin_headers)
        print("✓ Subscribe to upcoming sale correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
