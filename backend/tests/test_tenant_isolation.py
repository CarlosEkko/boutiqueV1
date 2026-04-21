"""
White-Label Tenants — Phase 2: Data Isolation tests.

Scenarios:
  1. Legacy migration backfilled tenant_slug="kbex" on existing collections.
  2. `/api/tenants/resolve` falls back to "kbex" for unknown hosts.
  3. Admin `/api/tenants/{slug}/stats` counts users per tenant correctly.
  4. A user registered via tenant A cannot log in via tenant B (cross-tenant
     login rejection).
  5. Admin user list on sub-tenant is automatically filtered.
"""
import os
import uuid
import requests
from conftest import API_BASE, ADMIN_EMAIL, ADMIN_PASSWORD


def _admin_token():
    r = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def test_resolve_unknown_host_returns_default_tenant():
    r = requests.get(f"{API_BASE}/tenants/resolve", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == "kbex"
    assert data["is_default"] is True
    assert "branding" in data


def test_admin_can_list_tenants():
    token = _admin_token()
    r = requests.get(
        f"{API_BASE}/tenants/",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code == 200
    tenants = r.json()
    assert isinstance(tenants, list)
    slugs = [t["slug"] for t in tenants]
    assert "kbex" in slugs, f"default tenant missing from list: {slugs}"


def test_tenant_stats_endpoint_counts_users():
    token = _admin_token()
    r = requests.get(
        f"{API_BASE}/tenants/kbex/stats",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code == 200
    stats = r.json()
    assert stats["slug"] == "kbex"
    assert stats["users"] >= 1  # at least the admin exists
    for key in ("otc_deals", "crypto_wallets", "otc_leads", "tickets"):
        assert key in stats
        assert isinstance(stats[key], int)


def test_admin_user_list_includes_tenant_slug():
    """Admins on default tenant see all users with tenant_slug populated."""
    token = _admin_token()
    r = requests.get(
        f"{API_BASE}/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    users = r.json()
    assert isinstance(users, list)
    # After the startup migration, every user should have tenant_slug set.
    for u in users[:10]:  # sample first 10
        assert u.get("tenant_slug") == "kbex", (
            f"user {u.get('email')} missing tenant_slug or != kbex"
        )


def test_register_new_user_has_tenant_slug():
    """Register a throwaway user; admin list shows it with tenant_slug=kbex."""
    email = f"tenant-test-{uuid.uuid4().hex[:8]}@kbex.io"
    r = requests.post(
        f"{API_BASE}/auth/register",
        json={
            "email": email,
            "name": "Tenant Test",
            "password": "TestPass123!",
        },
        timeout=15,
    )
    assert r.status_code == 201, r.text

    token = _admin_token()
    r2 = requests.get(
        f"{API_BASE}/admin/users",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    users = r2.json()
    match = [u for u in users if u.get("email") == email]
    assert match, f"registered user not found in admin listing"
    assert match[0].get("tenant_slug") == "kbex"


def test_tenant_slug_filter_query_param():
    """Admin can narrow `list_users` with ?tenant_slug=<slug>."""
    token = _admin_token()
    # Filter by existing tenant — should return data.
    r1 = requests.get(
        f"{API_BASE}/admin/users?tenant_slug=kbex",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert r1.status_code == 200
    assert len(r1.json()) >= 1

    # Filter by non-existent tenant — should return empty.
    r2 = requests.get(
        f"{API_BASE}/admin/users?tenant_slug=doesnotexist",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert r2.status_code == 200
    assert r2.json() == []


def test_cross_tenant_login_isolation():
    """A user registered under tenant A cannot log in via tenant B.

    We simulate multi-tenant by:
      1. Creating a temporary sub-tenant 'testco' via admin API with a fake host.
      2. Registering a user with Host: testco.example spoofed (only works in-test
         because the resolver trusts Host header; Cloudflare prevents spoof in prod).
      3. Asserting login from default host (kbex.io) fails.
      4. Asserting login from the sub-tenant host succeeds.
      5. Cleanup: delete sub-tenant and user.

    IMPORTANT: This test MUST hit the backend directly (bypassing Cloudflare)
    because Cloudflare rejects requests with unknown Host headers. Use the
    internal URL, not REACT_APP_BACKEND_URL.
    """
    INTERNAL_API = "http://localhost:8001/api"
    token = _admin_token()
    test_host = f"testco-{uuid.uuid4().hex[:6]}.example"
    slug = f"testco{uuid.uuid4().hex[:4]}"

    # 1. Create sub-tenant (go through whichever URL works for admin)
    r = requests.post(
        f"{API_BASE}/tenants/",
        json={
            "slug": slug,
            "domains": [test_host],
            "branding": {"platform_name": "TestCo"},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert r.status_code == 200, r.text

    try:
        # 2. Register user on the sub-tenant by spoofing Host — INTERNAL URL
        email = f"crosstest-{uuid.uuid4().hex[:8]}@example.com"
        r_reg = requests.post(
            f"{INTERNAL_API}/auth/register",
            json={"email": email, "name": "X", "password": "TestPass123!"},
            headers={"Host": test_host, "X-Forwarded-Host": test_host},
            timeout=15,
        )
        assert r_reg.status_code == 201, r_reg.text

        # 3. Try login WITHOUT the tenant host → should fail
        r_bad = requests.post(
            f"{INTERNAL_API}/auth/login",
            json={"email": email, "password": "TestPass123!"},
            timeout=10,
        )
        assert r_bad.status_code == 401, (
            f"cross-tenant login should be rejected, got {r_bad.status_code}: {r_bad.text}"
        )

        # 4. Login WITH the correct tenant host → should succeed
        r_ok = requests.post(
            f"{INTERNAL_API}/auth/login",
            json={"email": email, "password": "TestPass123!"},
            headers={"Host": test_host, "X-Forwarded-Host": test_host},
            timeout=10,
        )
        assert r_ok.status_code == 200, r_ok.text

        # 5. Verify tenant stats reflect the new user
        r_stats = requests.get(
            f"{API_BASE}/tenants/{slug}/stats",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r_stats.status_code == 200
        assert r_stats.json()["users"] == 1
    finally:
        # Cleanup — delete the sub-tenant
        requests.delete(
            f"{API_BASE}/tenants/{slug}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
