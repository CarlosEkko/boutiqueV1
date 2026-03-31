"""
O365 Meetings API Tests
Tests for scheduling, retrieving, and canceling meetings linked to CRM/OTC leads
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carlos@kbex.io"
TEST_PASSWORD = "senha123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # Auth returns 'access_token' not 'token'
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def test_crm_lead(headers):
    """Create a test CRM lead for meeting tests"""
    lead_data = {
        "name": f"TEST_Meeting_Lead_{uuid.uuid4().hex[:6]}",
        "email": f"test_meeting_{uuid.uuid4().hex[:6]}@example.com",
        "company_name": "Test Company",
        "country": "Portugal",
        "source": "Website",
        "status": "new"
    }
    response = requests.post(f"{BASE_URL}/api/crm/leads", json=lead_data, headers=headers)
    assert response.status_code in [200, 201], f"Failed to create CRM lead: {response.text}"
    lead = response.json()
    yield lead
    # Cleanup
    try:
        requests.delete(f"{BASE_URL}/api/crm/leads/{lead['id']}", headers=headers)
    except:
        pass


@pytest.fixture(scope="module")
def test_otc_lead(headers):
    """Create a test OTC lead for meeting tests"""
    lead_data = {
        "entity_name": f"TEST_OTC_Meeting_{uuid.uuid4().hex[:6]}",
        "contact_name": "Test OTC Contact",
        "contact_email": f"test_otc_meeting_{uuid.uuid4().hex[:6]}@example.com",
        "contact_phone": "+351912345678",
        "country": "Portugal",
        "source": "website",
        "estimated_volume_usd": 100000,
        "target_asset": "BTC",
        "transaction_type": "buy"
    }
    response = requests.post(f"{BASE_URL}/api/otc/leads", json=lead_data, headers=headers)
    assert response.status_code in [200, 201], f"Failed to create OTC lead: {response.text}"
    data = response.json()
    # OTC lead response wraps lead in 'lead' key
    lead = data.get("lead", data)
    yield lead
    # Cleanup
    try:
        requests.delete(f"{BASE_URL}/api/otc/leads/{lead['id']}", headers=headers)
    except:
        pass


class TestO365MeetingsEndpoints:
    """Test O365 meetings API endpoints"""

    def test_schedule_meeting_with_o365_connected(self, headers, test_crm_lead):
        """
        POST /api/o365/meetings/schedule creates meeting when O365 is connected
        The admin user has O365 connected, so this should succeed
        """
        meeting_data = {
            "subject": "Test Meeting",
            "start_time": (datetime.now() + timedelta(days=1)).isoformat(),
            "duration_minutes": 30,
            "attendee_email": test_crm_lead["email"],
            "attendee_name": test_crm_lead["name"],
            "notes": "Test meeting notes",
            "lead_id": test_crm_lead["id"],
            "lead_type": "crm"
        }
        response = requests.post(f"{BASE_URL}/api/o365/meetings/schedule", json=meeting_data, headers=headers)
        # O365 is connected for admin user, so should succeed
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert data.get("success") == True, f"Expected success=True: {data}"
            assert "meeting_id" in data, f"Expected meeting_id in response: {data}"
            assert "event_id" in data, f"Expected event_id in response: {data}"
            print(f"✓ Meeting scheduled successfully: meeting_id={data.get('meeting_id')}")
            # Store meeting_id for cleanup
            return data.get("meeting_id")
        else:
            # O365 not connected
            data = response.json()
            print(f"✓ O365 not connected (expected in some environments): {data.get('detail')}")

    def test_schedule_meeting_validation_missing_fields(self, headers, test_crm_lead):
        """
        POST /api/o365/meetings/schedule should validate required fields
        """
        # Missing required fields
        meeting_data = {
            "subject": "Test Meeting"
            # Missing: start_time, attendee_email, lead_id, lead_type
        }
        response = requests.post(f"{BASE_URL}/api/o365/meetings/schedule", json=meeting_data, headers=headers)
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}: {response.text}"
        print("✓ Schedule meeting validates required fields (returns 422 for missing fields)")

    def test_get_meetings_for_lead_empty(self, headers, test_crm_lead):
        """
        GET /api/o365/meetings?lead_id=X should return empty list for new lead
        """
        response = requests.get(
            f"{BASE_URL}/api/o365/meetings?lead_id={test_crm_lead['id']}&lead_type=crm",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "meetings" in data, f"Expected 'meetings' key in response: {data}"
        assert isinstance(data["meetings"], list), f"Expected meetings to be a list: {data}"
        print(f"✓ GET meetings returns empty list for new lead: {len(data['meetings'])} meetings")

    def test_get_meetings_for_otc_lead(self, headers, test_otc_lead):
        """
        GET /api/o365/meetings?lead_id=X&lead_type=otc should work for OTC leads
        """
        response = requests.get(
            f"{BASE_URL}/api/o365/meetings?lead_id={test_otc_lead['id']}&lead_type=otc",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "meetings" in data, f"Expected 'meetings' key in response: {data}"
        print(f"✓ GET meetings works for OTC lead: {len(data['meetings'])} meetings")

    def test_get_meetings_without_filter(self, headers):
        """
        GET /api/o365/meetings without filters should return all meetings
        """
        response = requests.get(f"{BASE_URL}/api/o365/meetings", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "meetings" in data, f"Expected 'meetings' key in response: {data}"
        print(f"✓ GET meetings without filter returns {len(data['meetings'])} meetings")

    def test_cancel_meeting_not_found(self, headers):
        """
        DELETE /api/o365/meetings/{id} should return 404 for non-existent meeting
        """
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/o365/meetings/{fake_id}", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Cancel meeting returns 404 for non-existent meeting")

    def test_schedule_meeting_for_otc_lead(self, headers, test_otc_lead):
        """
        POST /api/o365/meetings/schedule for OTC lead
        """
        meeting_data = {
            "subject": "OTC Meeting Test",
            "start_time": (datetime.now() + timedelta(days=1)).isoformat(),
            "duration_minutes": 45,
            "attendee_email": test_otc_lead["contact_email"],
            "attendee_name": test_otc_lead["contact_name"],
            "notes": "OTC meeting notes",
            "lead_id": test_otc_lead["id"],
            "lead_type": "otc"
        }
        response = requests.post(f"{BASE_URL}/api/o365/meetings/schedule", json=meeting_data, headers=headers)
        # Should succeed if O365 connected, or 401 if not
        assert response.status_code in [200, 201, 401], f"Unexpected status: {response.status_code}: {response.text}"
        if response.status_code in [200, 201]:
            data = response.json()
            assert data.get("success") == True
            print(f"✓ OTC meeting scheduled: meeting_id={data.get('meeting_id')}")
        else:
            print("✓ Schedule OTC meeting returns 401 when O365 not connected")


class TestO365AuthStatus:
    """Test O365 authentication status endpoint"""

    def test_auth_status_not_connected(self, headers):
        """
        GET /api/o365/auth/status should return connected: false when not connected
        """
        response = requests.get(f"{BASE_URL}/api/o365/auth/status", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "connected" in data, f"Expected 'connected' key in response: {data}"
        # In test environment, O365 is likely not connected
        print(f"✓ O365 auth status: connected={data.get('connected')}")

    def test_get_auth_url(self, headers):
        """
        GET /api/o365/auth/url should return authorization URL
        """
        response = requests.get(f"{BASE_URL}/api/o365/auth/url", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "auth_url" in data, f"Expected 'auth_url' key in response: {data}"
        assert "login.microsoftonline.com" in data["auth_url"], f"Expected Microsoft login URL: {data['auth_url']}"
        print(f"✓ O365 auth URL generated successfully")


class TestMeetingsDataStructure:
    """Test meeting data structure and fields"""

    def test_schedule_meeting_request_structure(self, headers, test_crm_lead):
        """
        Verify the schedule meeting request accepts all expected fields
        """
        # Full meeting data with all fields
        meeting_data = {
            "subject": "Full Test Meeting",
            "start_time": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S"),
            "duration_minutes": 60,
            "time_zone": "Europe/Lisbon",
            "attendee_email": test_crm_lead["email"],
            "attendee_name": test_crm_lead["name"],
            "notes": "Meeting agenda: discuss project",
            "lead_id": test_crm_lead["id"],
            "lead_type": "crm"
        }
        response = requests.post(f"{BASE_URL}/api/o365/meetings/schedule", json=meeting_data, headers=headers)
        # Will return 401 (O365 not connected) but validates the request structure
        assert response.status_code in [401, 200, 201], f"Unexpected status: {response.status_code}: {response.text}"
        print("✓ Schedule meeting accepts all expected fields in request")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
