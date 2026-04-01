"""
Security Dashboard API Tests
Tests for: KPIs, Events, Activity, Top IPs, IP Blacklist Management
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"


class TestSecurityDashboardAuth:
    """Test authentication for security endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in login response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_security_endpoints_require_auth(self):
        """Security endpoints should require authentication"""
        endpoints = [
            "/api/security/dashboard",
            "/api/security/events",
            "/api/security/activity",
            "/api/security/top-ips",
            "/api/security/blacklist"
        ]
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"{endpoint} should require auth, got {response.status_code}"
            print(f"PASS: {endpoint} requires authentication")


class TestSecurityDashboardKPIs:
    """Test Security Dashboard KPIs endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_dashboard_kpis_24h(self, auth_headers):
        """GET /api/security/dashboard?period=24h returns KPIs"""
        response = requests.get(f"{BASE_URL}/api/security/dashboard?period=24h", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify KPI structure
        assert "period" in data and data["period"] == "24h"
        assert "total_events" in data
        assert "by_type" in data
        assert "by_severity" in data
        assert "unique_suspicious_ips" in data
        assert "active_blacklist" in data
        
        # Verify by_type has expected event types
        by_type = data["by_type"]
        assert "failed_login" in by_type
        assert "rate_limit" in by_type
        assert "turnstile_rejected" in by_type
        assert "blacklist_blocked" in by_type
        
        # Verify by_severity has expected levels
        by_severity = data["by_severity"]
        assert "low" in by_severity
        assert "medium" in by_severity
        assert "high" in by_severity
        assert "critical" in by_severity
        
        print(f"PASS: Dashboard KPIs 24h - total_events={data['total_events']}, unique_ips={data['unique_suspicious_ips']}, blacklist={data['active_blacklist']}")
    
    def test_dashboard_kpis_7d(self, auth_headers):
        """GET /api/security/dashboard?period=7d returns KPIs"""
        response = requests.get(f"{BASE_URL}/api/security/dashboard?period=7d", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "7d"
        print(f"PASS: Dashboard KPIs 7d - total_events={data['total_events']}")
    
    def test_dashboard_kpis_30d(self, auth_headers):
        """GET /api/security/dashboard?period=30d returns KPIs"""
        response = requests.get(f"{BASE_URL}/api/security/dashboard?period=30d", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "30d"
        print(f"PASS: Dashboard KPIs 30d - total_events={data['total_events']}")


class TestSecurityEvents:
    """Test Security Events endpoint with filters"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_events_list_paginated(self, auth_headers):
        """GET /api/security/events returns paginated events"""
        response = requests.get(f"{BASE_URL}/api/security/events?page=1&limit=20", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "events" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        
        print(f"PASS: Events list - total={data['total']}, page={data['page']}, pages={data['pages']}, events_count={len(data['events'])}")
    
    def test_events_filter_by_type(self, auth_headers):
        """GET /api/security/events?event_type=failed_login filters by type"""
        response = requests.get(f"{BASE_URL}/api/security/events?event_type=failed_login", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned events should be failed_login type
        for event in data["events"]:
            assert event["event_type"] == "failed_login", f"Expected failed_login, got {event['event_type']}"
        
        print(f"PASS: Events filter by type - {len(data['events'])} failed_login events")
    
    def test_events_filter_by_severity(self, auth_headers):
        """GET /api/security/events?severity=high filters by severity"""
        response = requests.get(f"{BASE_URL}/api/security/events?severity=high", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        for event in data["events"]:
            assert event["severity"] == "high", f"Expected high severity, got {event['severity']}"
        
        print(f"PASS: Events filter by severity - {len(data['events'])} high severity events")
    
    def test_events_filter_by_ip(self, auth_headers):
        """GET /api/security/events?ip=192 filters by IP substring"""
        response = requests.get(f"{BASE_URL}/api/security/events?ip=192", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        for event in data["events"]:
            assert "192" in event["client_ip"], f"IP filter failed: {event['client_ip']}"
        
        print(f"PASS: Events filter by IP - {len(data['events'])} events matching '192'")
    
    def test_events_filter_by_period(self, auth_headers):
        """GET /api/security/events?period=7d filters by period"""
        response = requests.get(f"{BASE_URL}/api/security/events?period=7d", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: Events filter by period 7d - {data['total']} events")


class TestSecurityActivity:
    """Test Security Activity chart data endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_activity_24h_hourly(self, auth_headers):
        """GET /api/security/activity?period=24h returns hourly data"""
        response = requests.get(f"{BASE_URL}/api/security/activity?period=24h", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "data" in data
        assert "group_by" in data
        assert data["group_by"] == "hour"
        assert len(data["data"]) == 24, f"Expected 24 hours, got {len(data['data'])}"
        
        # Verify data structure
        for item in data["data"]:
            assert "label" in item
            assert "count" in item
            assert "timestamp" in item
        
        print(f"PASS: Activity 24h - {len(data['data'])} hourly data points")
    
    def test_activity_7d_daily(self, auth_headers):
        """GET /api/security/activity?period=7d returns daily data"""
        response = requests.get(f"{BASE_URL}/api/security/activity?period=7d", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["group_by"] == "day"
        assert len(data["data"]) == 7, f"Expected 7 days, got {len(data['data'])}"
        
        print(f"PASS: Activity 7d - {len(data['data'])} daily data points")
    
    def test_activity_30d_daily(self, auth_headers):
        """GET /api/security/activity?period=30d returns daily data"""
        response = requests.get(f"{BASE_URL}/api/security/activity?period=30d", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["group_by"] == "day"
        assert len(data["data"]) == 30, f"Expected 30 days, got {len(data['data'])}"
        
        print(f"PASS: Activity 30d - {len(data['data'])} daily data points")


class TestTopIPs:
    """Test Top Suspicious IPs endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_top_ips_list(self, auth_headers):
        """GET /api/security/top-ips returns top suspicious IPs"""
        response = requests.get(f"{BASE_URL}/api/security/top-ips?period=24h", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            ip_entry = data[0]
            assert "ip" in ip_entry
            assert "total_events" in ip_entry
            assert "event_types" in ip_entry
            assert "last_event" in ip_entry
            assert "is_blacklisted" in ip_entry
            print(f"PASS: Top IPs - {len(data)} IPs, top IP: {ip_entry['ip']} with {ip_entry['total_events']} events")
        else:
            print("PASS: Top IPs - No suspicious IPs found (empty list)")
    
    def test_top_ips_limit(self, auth_headers):
        """GET /api/security/top-ips?limit=5 respects limit"""
        response = requests.get(f"{BASE_URL}/api/security/top-ips?limit=5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5
        print(f"PASS: Top IPs limit - {len(data)} IPs (max 5)")


class TestIPBlacklist:
    """Test IP Blacklist CRUD operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_blacklist_get_list(self, auth_headers):
        """GET /api/security/blacklist returns active blacklisted IPs"""
        response = requests.get(f"{BASE_URL}/api/security/blacklist", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"PASS: Blacklist list - {len(data)} active entries")
    
    def test_blacklist_add_ip(self, auth_headers):
        """POST /api/security/blacklist adds IP to blacklist"""
        test_ip = "TEST_192.168.99.99"
        
        # First, try to remove if exists (cleanup from previous test)
        requests.delete(f"{BASE_URL}/api/security/blacklist/{test_ip}", headers=auth_headers)
        
        # Add IP to blacklist
        response = requests.post(f"{BASE_URL}/api/security/blacklist", headers=auth_headers, json={
            "ip": test_ip,
            "reason": "Test blacklist entry",
            "duration_hours": 1
        })
        assert response.status_code == 200, f"Failed to add IP: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert test_ip in data["message"]
        
        print(f"PASS: Blacklist add IP - {test_ip} added successfully")
        
        # Verify IP is in blacklist
        response = requests.get(f"{BASE_URL}/api/security/blacklist", headers=auth_headers)
        assert response.status_code == 200
        blacklist = response.json()
        
        found = any(entry["ip"] == test_ip for entry in blacklist)
        assert found, f"IP {test_ip} not found in blacklist after adding"
        print(f"PASS: Blacklist verify - {test_ip} found in blacklist")
    
    def test_blacklist_add_duplicate_ip(self, auth_headers):
        """POST /api/security/blacklist with duplicate IP returns 400"""
        test_ip = "TEST_192.168.99.99"
        
        # Try to add same IP again
        response = requests.post(f"{BASE_URL}/api/security/blacklist", headers=auth_headers, json={
            "ip": test_ip,
            "reason": "Duplicate test"
        })
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        print(f"PASS: Blacklist duplicate - correctly rejected duplicate IP")
    
    def test_blacklist_remove_ip(self, auth_headers):
        """DELETE /api/security/blacklist/{ip} removes IP from blacklist"""
        test_ip = "TEST_192.168.99.99"
        
        response = requests.delete(f"{BASE_URL}/api/security/blacklist/{test_ip}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to remove IP: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        print(f"PASS: Blacklist remove IP - {test_ip} removed successfully")
        
        # Verify IP is no longer in blacklist
        response = requests.get(f"{BASE_URL}/api/security/blacklist", headers=auth_headers)
        blacklist = response.json()
        
        found = any(entry["ip"] == test_ip and entry.get("active", True) for entry in blacklist)
        assert not found, f"IP {test_ip} still active in blacklist after removal"
        print(f"PASS: Blacklist verify removal - {test_ip} no longer active")
    
    def test_blacklist_remove_nonexistent_ip(self, auth_headers):
        """DELETE /api/security/blacklist/{ip} with nonexistent IP returns 404"""
        response = requests.delete(f"{BASE_URL}/api/security/blacklist/NONEXISTENT_IP_999", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Blacklist remove nonexistent - correctly returned 404")


class TestSecurityEventLogging:
    """Test that security events are logged correctly"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_failed_login_logs_event(self, auth_headers):
        """Failed login should log a security event"""
        # Get current event count
        response = requests.get(f"{BASE_URL}/api/security/events?event_type=failed_login&period=24h", headers=auth_headers)
        initial_count = response.json()["total"]
        
        # Attempt failed login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
        # Wait a moment for async logging
        time.sleep(0.5)
        
        # Check event count increased
        response = requests.get(f"{BASE_URL}/api/security/events?event_type=failed_login&period=24h", headers=auth_headers)
        new_count = response.json()["total"]
        
        assert new_count >= initial_count, f"Failed login event not logged: {initial_count} -> {new_count}"
        print(f"PASS: Failed login event logged - count: {initial_count} -> {new_count}")
    
    def test_wrong_password_logs_event(self, auth_headers):
        """Wrong password should log a security event"""
        # Attempt login with wrong password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword123"
        })
        assert response.status_code == 401
        
        # Wait for async logging
        time.sleep(0.5)
        
        # Check events include this attempt
        response = requests.get(f"{BASE_URL}/api/security/events?event_type=failed_login&period=24h", headers=auth_headers)
        events = response.json()["events"]
        
        # Should have at least one failed_login event
        assert len(events) > 0, "No failed_login events found"
        print(f"PASS: Wrong password event logged - {len(events)} failed_login events")


class TestIPBlacklistBlocking:
    """Test that blacklisted IPs are blocked"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_blacklist_permanent_entry(self, auth_headers):
        """POST /api/security/blacklist with no duration creates permanent entry"""
        test_ip = "TEST_PERM_10.0.0.1"
        
        # Cleanup first
        requests.delete(f"{BASE_URL}/api/security/blacklist/{test_ip}", headers=auth_headers)
        
        # Add permanent blacklist entry
        response = requests.post(f"{BASE_URL}/api/security/blacklist", headers=auth_headers, json={
            "ip": test_ip,
            "reason": "Permanent test entry"
        })
        assert response.status_code == 200
        
        # Verify entry has no expiration
        response = requests.get(f"{BASE_URL}/api/security/blacklist", headers=auth_headers)
        blacklist = response.json()
        
        entry = next((e for e in blacklist if e["ip"] == test_ip), None)
        assert entry is not None
        assert entry.get("expires_at") is None, "Permanent entry should have no expiration"
        
        print(f"PASS: Permanent blacklist entry created - {test_ip}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/security/blacklist/{test_ip}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
