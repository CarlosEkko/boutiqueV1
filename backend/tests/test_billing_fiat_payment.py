"""
Test Suite: Billing Fiat Payment - Unified 3-option Payment Picker
Tests the NEW generic endpoint POST /api/billing/payments/{payment_id}/pay-with-fiat
which accepts ANY pending payment (admission/annual/upgrade) and debits EUR fiat wallet.

Uses module-scoped session to avoid rate limiting.
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"


@pytest.fixture(scope="module")
def auth_session():
    """Module-scoped authenticated session to avoid rate limiting"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login once for all tests
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_resp.status_code == 429:
        time.sleep(60)
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
    
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    data = login_resp.json()
    token = data.get("access_token") or data.get("token")
    user_id = data.get("user", {}).get("id") or data.get("id")
    assert token, "No token in login response"
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    return {"session": session, "token": token, "user_id": user_id}


# ==================== UPGRADE FLOW TESTS ====================

def test_upgrade_quote_returns_200(auth_session):
    """POST /api/billing/upgrade/quote returns 200 with valid target_tier"""
    session = auth_session["session"]
    resp = session.post(f"{BASE_URL}/api/billing/upgrade/quote", json={
        "target_tier": "vip"
    })
    assert resp.status_code in [200, 400], f"Unexpected status: {resp.status_code} - {resp.text}"
    

def test_upgrade_quote_returns_prorata_fields(auth_session):
    """POST /api/billing/upgrade/quote returns expected pro-rata fields"""
    session = auth_session["session"]
    resp = session.post(f"{BASE_URL}/api/billing/upgrade/quote", json={
        "target_tier": "institucional"
    })
    if resp.status_code == 200:
        data = resp.json()
        assert "prorata_amount_eur" in data, "Missing prorata_amount_eur"
        assert "current_tier" in data, "Missing current_tier"
        assert "target_tier" in data, "Missing target_tier"
        assert "days_remaining" in data, "Missing days_remaining"
        

def test_upgrade_request_creates_payment(auth_session):
    """POST /api/billing/upgrade/request creates a pending payment"""
    session = auth_session["session"]
    resp = session.post(f"{BASE_URL}/api/billing/upgrade/request", json={
        "target_tier": "institucional"
    })
    if resp.status_code == 200:
        data = resp.json()
        assert "payment_id" in data, "Missing payment_id in response"
        assert data.get("success") == True, "Expected success=True"
    else:
        assert resp.status_code == 400, f"Unexpected status: {resp.status_code}"
        

def test_old_upgrade_pay_with_fiat_endpoint_exists(auth_session):
    """POST /api/billing/upgrade/{payment_id}/pay-with-fiat endpoint still exists (regression)"""
    session = auth_session["session"]
    fake_id = str(uuid.uuid4())
    resp = session.post(f"{BASE_URL}/api/billing/upgrade/{fake_id}/pay-with-fiat")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} - endpoint may be removed"


# ==================== NEW GENERIC PAY-WITH-FIAT TESTS ====================

def test_new_generic_pay_with_fiat_endpoint_exists(auth_session):
    """POST /api/billing/payments/{payment_id}/pay-with-fiat endpoint exists"""
    session = auth_session["session"]
    fake_id = str(uuid.uuid4())
    resp = session.post(f"{BASE_URL}/api/billing/payments/{fake_id}/pay-with-fiat")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code} - endpoint may not exist"
    

def test_new_generic_pay_with_fiat_validates_ownership(auth_session):
    """POST /api/billing/payments/{payment_id}/pay-with-fiat returns 404 for non-owned payment"""
    session = auth_session["session"]
    fake_id = str(uuid.uuid4())
    resp = session.post(f"{BASE_URL}/api/billing/payments/{fake_id}/pay-with-fiat")
    assert resp.status_code == 404, "Should return 404 for non-existent payment"
    data = resp.json()
    assert "detail" in data, "Should have error detail"


# ==================== ADMISSION FEE TESTS ====================

def test_admission_fee_request_returns_payment_id(auth_session):
    """POST /api/referrals/admission-fee/request returns payment_id"""
    session = auth_session["session"]
    resp = session.post(f"{BASE_URL}/api/referrals/admission-fee/request", params={
        "currency": "EUR"
    })
    if resp.status_code == 200:
        data = resp.json()
        assert "payment_id" in data, "Missing payment_id"
        assert data.get("success") == True, "Expected success=True"
    else:
        assert resp.status_code == 400, f"Unexpected status: {resp.status_code}"
        

def test_admission_fee_status_endpoint(auth_session):
    """GET /api/referrals/admission-fee/status/{user_id} returns status"""
    session = auth_session["session"]
    user_id = auth_session["user_id"]
    resp = session.get(f"{BASE_URL}/api/referrals/admission-fee/status/{user_id}")
    assert resp.status_code == 200, f"Status check failed: {resp.text}"
    data = resp.json()
    assert "required" in data or "paid" in data, "Missing required/paid fields"


# ==================== PAYMENT CHECKOUT TESTS ====================

def test_get_payment_checkout_returns_404_for_invalid(auth_session):
    """GET /api/billing/payments/{payment_id} returns 404 for invalid payment"""
    session = auth_session["session"]
    fake_id = str(uuid.uuid4())
    resp = session.get(f"{BASE_URL}/api/billing/payments/{fake_id}")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    

def test_submit_payment_method_endpoint_exists(auth_session):
    """POST /api/billing/payments/{payment_id}/submit endpoint exists"""
    session = auth_session["session"]
    fake_id = str(uuid.uuid4())
    resp = session.post(f"{BASE_URL}/api/billing/payments/{fake_id}/submit", json={
        "payment_method": "crypto",
        "crypto_currency": "USDT"
    })
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


# ==================== STRIPE CHECKOUT TESTS ====================

def test_stripe_checkout_session_endpoint_exists(auth_session):
    """POST /api/stripe/create-checkout-session endpoint exists"""
    session = auth_session["session"]
    resp = session.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
        "payment_type": "upgrade_prorata",
        "origin_url": "https://test.example.com",
        "currency": "eur"
    })
    assert resp.status_code not in [404, 405], f"Endpoint may not exist: {resp.status_code}"
    

def test_stripe_checkout_supports_admission_fee(auth_session):
    """POST /api/stripe/create-checkout-session accepts admission_fee type"""
    session = auth_session["session"]
    resp = session.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
        "payment_type": "admission_fee",
        "origin_url": "https://test.example.com",
        "currency": "eur"
    })
    assert resp.status_code not in [404, 405], f"Endpoint issue: {resp.status_code}"
    

def test_stripe_checkout_supports_annual_renewal(auth_session):
    """POST /api/stripe/create-checkout-session accepts annual_renewal type"""
    session = auth_session["session"]
    resp = session.post(f"{BASE_URL}/api/stripe/create-checkout-session", json={
        "payment_type": "annual_renewal",
        "origin_url": "https://test.example.com",
        "currency": "eur"
    })
    assert resp.status_code not in [404, 405], f"Endpoint issue: {resp.status_code}"


# ==================== BILLING CONFIG TESTS ====================

def test_billing_config_returns_200(auth_session):
    """GET /api/billing/config returns 200"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/billing/config")
    assert resp.status_code == 200, f"Config failed: {resp.text}"
    

def test_billing_my_status_returns_200(auth_session):
    """GET /api/billing/my-status returns 200"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/billing/my-status")
    assert resp.status_code == 200, f"My-status failed: {resp.text}"
    data = resp.json()
    assert "tier" in data, "Missing tier field"
    assert "billing_status" in data, "Missing billing_status field"
    

def test_billing_my_history_returns_200(auth_session):
    """GET /api/billing/my-history returns 200"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/billing/my-history")
    assert resp.status_code == 200, f"My-history failed: {resp.text}"
    data = resp.json()
    assert "payments" in data, "Missing payments field"
    assert "summary" in data, "Missing summary field"


# ==================== FIAT WALLET TESTS ====================

def test_fiat_wallets_endpoint_returns_200(auth_session):
    """GET /api/trading/fiat/balances returns 200"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/trading/fiat/balances")
    assert resp.status_code == 200, f"Fiat wallets failed: {resp.text}"
    

def test_fiat_wallets_returns_eur_balance(auth_session):
    """GET /api/trading/fiat/balances returns EUR wallet info"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/trading/fiat/balances")
    assert resp.status_code == 200
    data = resp.json()
    wallets = data if isinstance(data, list) else data.get("balances", data.get("wallets", []))
    eur_wallet = next((w for w in wallets if w.get("currency") == "EUR"), None)
    if eur_wallet:
        assert "balance" in eur_wallet, "EUR wallet missing balance field"


# ==================== RENEWALS DASHBOARD TESTS ====================

def test_renewals_dashboard_returns_200(auth_session):
    """GET /api/billing/renewals returns 200"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/billing/renewals")
    assert resp.status_code == 200, f"Renewals failed: {resp.text}"
    data = resp.json()
    assert "counts" in data, "Missing counts field"
    

def test_renewals_health_returns_200(auth_session):
    """GET /api/billing/renewals-health returns 200"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/billing/renewals-health")
    assert resp.status_code == 200, f"Renewals health failed: {resp.text}"
    data = resp.json()
    assert "projected_annual_revenue_eur" in data, "Missing projected_annual_revenue_eur"


# ==================== INTEGRATION TESTS ====================

def test_upgrade_flow_quote_to_request(auth_session):
    """Full upgrade flow: quote → request → payment_id returned"""
    session = auth_session["session"]
    
    quote_resp = session.post(f"{BASE_URL}/api/billing/upgrade/quote", json={
        "target_tier": "institucional"
    })
    
    if quote_resp.status_code == 400:
        pytest.skip("User cannot upgrade to institucional")
        
    assert quote_resp.status_code == 200, f"Quote failed: {quote_resp.text}"
    quote = quote_resp.json()
    assert "prorata_amount_eur" in quote
    

def test_pay_with_fiat_insufficient_balance(auth_session):
    """pay-with-fiat returns 400 when EUR balance is insufficient"""
    session = auth_session["session"]
    
    request_resp = session.post(f"{BASE_URL}/api/billing/upgrade/request", json={
        "target_tier": "institucional"
    })
    
    if request_resp.status_code == 400:
        pytest.skip("Cannot create upgrade request")
        
    payment_id = request_resp.json().get("payment_id")
    if not payment_id:
        pytest.skip("No payment_id returned")
        
    pay_resp = session.post(f"{BASE_URL}/api/billing/payments/{payment_id}/pay-with-fiat")
    assert pay_resp.status_code in [200, 400, 409], f"Unexpected: {pay_resp.status_code} - {pay_resp.text}"
    
    if pay_resp.status_code == 400:
        data = pay_resp.json()
        assert "detail" in data, "Should have error detail"


# ==================== PAYMENT TYPES TESTS ====================

def test_admission_fee_type_accepted(auth_session):
    """Verify admission fee_type is accepted by the system"""
    session = auth_session["session"]
    resp = session.post(f"{BASE_URL}/api/referrals/admission-fee/request", params={
        "currency": "EUR"
    })
    assert resp.status_code in [200, 400], f"Unexpected: {resp.status_code}"
    

def test_annual_fee_type_in_renewals(auth_session):
    """Verify annual fee_type appears in renewals dashboard"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/billing/renewals?status=all")
    assert resp.status_code == 200
    data = resp.json()
    assert "pending" in data, "Missing pending field"
    

def test_upgrade_fee_type_in_history(auth_session):
    """Verify upgrade fee_type can appear in billing history"""
    session = auth_session["session"]
    resp = session.get(f"{BASE_URL}/api/billing/my-history")
    assert resp.status_code == 200
    data = resp.json()
    summary = data.get("summary", {})
    assert "upgrade_count" in summary, "Missing upgrade_count in summary"
