"""
Billing auto-renewal cycle — production validation tests.

Scenarios:
  1. Cycle is running on startup (/cycle-status shows running=true).
  2. Dry-run execution returns a sensible shape without side-effects.
  3. Dry-run does NOT create admission_payments rows (isolation guarantee).
  4. Dry-run with a seeded upcoming renewal REPORTS it without actually creating
     the payment row.
  5. Cycle history grows on each run (manual or scheduled).
"""
import uuid
import requests
from datetime import datetime, timezone, timedelta
from conftest import API_BASE, ADMIN_EMAIL, ADMIN_PASSWORD


def _admin_token():
    r = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200
    return r.json()["access_token"]


# Module-scoped cache — avoids hitting the 10/min login rate limit when
# running the full suite alongside other test files.
_cached_token = None
def _token():
    global _cached_token
    if _cached_token is None:
        _cached_token = _admin_token()
    return _cached_token


def _headers(tok=None):
    return {"Authorization": f"Bearer {tok or _token()}"}


def test_cycle_is_running_on_startup():
    tok = _token()
    r = requests.get(f"{API_BASE}/billing/cycle-status", headers=_headers(tok), timeout=10)
    assert r.status_code == 200
    state = r.json()
    assert state["running"] is True, f"auto-cycle should be running: {state}"
    assert state["interval_s"] == 86400, f"interval should be daily: {state['interval_s']}"


def test_dry_run_returns_expected_shape():
    tok = _token()
    r = requests.post(
        f"{API_BASE}/billing/run-cycle?dry_run=true",
        headers=_headers(tok),
        timeout=30,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["dry_run"] is True
    assert "duration_ms" in body
    r_inner = body["result"]
    for key in ("created_payments", "notified_clients", "suspended", "flagged_overdue"):
        assert key in r_inner, f"missing key {key} in dry-run result"
        assert isinstance(r_inner[key], int)


def test_dry_run_creates_no_admission_payments_rows():
    """Even if there are eligible users, dry-run must not write to DB."""
    tok = _token()

    # Count current rows created by auto_renewal_cycle
    # We probe via admin/billing/renewals and count "pending annual" items —
    # the renewals endpoint exposes those.
    before = requests.get(
        f"{API_BASE}/billing/renewals", headers=_headers(tok), timeout=10
    ).json()
    before_pending = len([p for p in before.get("pending", []) if p.get("fee_type") == "annual"])

    # Run dry-run three times
    for _ in range(3):
        r = requests.post(
            f"{API_BASE}/billing/run-cycle?dry_run=true",
            headers=_headers(tok),
            timeout=30,
        )
        assert r.status_code == 200

    after = requests.get(
        f"{API_BASE}/billing/renewals", headers=_headers(tok), timeout=10
    ).json()
    after_pending = len([p for p in after.get("pending", []) if p.get("fee_type") == "annual"])

    assert before_pending == after_pending, (
        f"Dry-run leaked writes: pending annual {before_pending} → {after_pending}"
    )


def test_cycle_history_grows_and_records_dry_run():
    tok = _token()

    before = requests.get(
        f"{API_BASE}/billing/cycle-history", headers=_headers(tok), timeout=10
    ).json()
    n_before = len(before.get("runs", []))

    # Trigger a dry-run
    trig = requests.post(
        f"{API_BASE}/billing/run-cycle?dry_run=true",
        headers=_headers(tok),
        timeout=30,
    )
    assert trig.status_code == 200

    after = requests.get(
        f"{API_BASE}/billing/cycle-history", headers=_headers(tok), timeout=10
    ).json()
    runs = after.get("runs", [])
    assert len(runs) == n_before + 1 or len(runs) == 30, (
        f"history should grow by 1 (or stay at limit 30), got {n_before} → {len(runs)}"
    )

    # Newest entry is the one we just triggered.
    newest = runs[0]
    assert newest["trigger"] == "manual"
    assert newest["dry_run"] is True
    assert newest["error"] is None
    assert newest["admin_email"] == ADMIN_EMAIL
    assert "duration_ms" in newest
    assert newest["duration_ms"] >= 0


def test_dry_run_with_seeded_upcoming_renewal_reports_it():
    """Seed a fake user with annual_fee_next_due in 10 days; dry-run must
    report `created_payments >= 1` without actually creating a payment."""
    import os
    from pymongo import MongoClient

    mongo = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db_name = os.environ.get("DB_NAME", "kbex_production")
    db = mongo[db_name]

    # Seed a fake user eligible for upcoming renewal
    test_email = f"renewal-test-{uuid.uuid4().hex[:8]}@kbex.test"
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    db.users.insert_one({
        "id": user_id,
        "email": test_email,
        "name": "Renewal Cycle Test",
        "user_type": "client",
        "membership_level": "standard",
        "is_active": True,
        "hashed_password": "x",
        "annual_fee_next_due": (now + timedelta(days=10)).isoformat(),
        "billing_status": "active",
        "tenant_slug": "kbex",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    })

    try:
        tok = _token()
        r = requests.post(
            f"{API_BASE}/billing/run-cycle?dry_run=true",
            headers=_headers(tok),
            timeout=30,
        )
        assert r.status_code == 200
        result = r.json()["result"]
        # Must detect at least the seeded user
        assert result["created_payments"] >= 1, (
            f"dry-run should detect upcoming renewal: {result}"
        )

        # And must NOT have actually inserted the row
        pending = db.admission_payments.find_one({
            "user_id": user_id, "fee_type": "annual"
        })
        assert pending is None, (
            f"dry-run leaked a write: admission_payments row exists for test user"
        )
    finally:
        # Cleanup
        db.users.delete_one({"id": user_id})
        db.admission_payments.delete_many({"user_id": user_id})
        mongo.close()
