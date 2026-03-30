"""
Microsoft 365 Integration Tests
Tests for O365 Email, Calendar, and Tasks API endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"


class TestO365Auth:
    """O365 Authentication and Status Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns 'access_token' not 'token'
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_o365_auth_status_connected(self, headers):
        """Test GET /api/o365/auth/status returns connected=true for admin"""
        response = requests.get(f"{BASE_URL}/api/o365/auth/status", headers=headers)
        assert response.status_code == 200, f"Status check failed: {response.text}"
        data = response.json()
        assert data.get("connected") == True, f"O365 not connected: {data}"
        assert "account_email" in data, "Missing account_email in response"
        print(f"O365 connected: {data.get('account_email')}")
    
    def test_o365_auth_status_requires_auth(self):
        """Test GET /api/o365/auth/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/o365/auth/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestO365MailFolders:
    """O365 Mail Folders Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_mail_folders(self, headers):
        """Test GET /api/o365/mail/folders returns folder list"""
        response = requests.get(f"{BASE_URL}/api/o365/mail/folders", headers=headers)
        assert response.status_code == 200, f"Failed to get folders: {response.text}"
        data = response.json()
        assert "folders" in data, "Missing 'folders' key in response"
        folders = data["folders"]
        assert isinstance(folders, list), "Folders should be a list"
        assert len(folders) > 0, "Should have at least one folder"
        
        # Check folder structure
        folder = folders[0]
        assert "id" in folder, "Folder missing 'id'"
        assert "name" in folder, "Folder missing 'name'"
        
        # Check for expected folders
        folder_names = [f["name"] for f in folders]
        print(f"Found folders: {folder_names}")
        
        # Should have Inbox at minimum
        has_inbox = any("inbox" in name.lower() or "caixa" in name.lower() for name in folder_names)
        assert has_inbox, f"No Inbox folder found in: {folder_names}"
    
    def test_mail_folders_requires_auth(self):
        """Test GET /api/o365/mail/folders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/o365/mail/folders")
        assert response.status_code in [401, 403]


class TestO365MailMessages:
    """O365 Mail Messages Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def inbox_folder_id(self, headers):
        """Get the Inbox folder ID"""
        response = requests.get(f"{BASE_URL}/api/o365/mail/folders", headers=headers)
        assert response.status_code == 200
        folders = response.json().get("folders", [])
        # Find Inbox folder
        for folder in folders:
            if "inbox" in folder["name"].lower() or "caixa" in folder["name"].lower():
                return folder["id"]
        # Return first folder if no Inbox found
        return folders[0]["id"] if folders else None
    
    def test_get_messages_from_inbox(self, headers, inbox_folder_id):
        """Test GET /api/o365/mail/messages returns messages from inbox"""
        assert inbox_folder_id, "No inbox folder ID available"
        response = requests.get(
            f"{BASE_URL}/api/o365/mail/messages",
            params={"folder_id": inbox_folder_id, "top": "10"},
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get messages: {response.text}"
        data = response.json()
        assert "messages" in data, "Missing 'messages' key"
        messages = data["messages"]
        assert isinstance(messages, list), "Messages should be a list"
        
        if len(messages) > 0:
            msg = messages[0]
            # Check message structure
            assert "id" in msg, "Message missing 'id'"
            assert "subject" in msg, "Message missing 'subject'"
            assert "from_email" in msg, "Message missing 'from_email'"
            assert "received_at" in msg, "Message missing 'received_at'"
            print(f"Found {len(messages)} messages, first: {msg.get('subject', 'No subject')}")
        else:
            print("Inbox is empty")
    
    def test_get_message_detail(self, headers, inbox_folder_id):
        """Test GET /api/o365/mail/messages/{id} returns full message detail"""
        # First get a message ID
        response = requests.get(
            f"{BASE_URL}/api/o365/mail/messages",
            params={"folder_id": inbox_folder_id, "top": "1"},
            headers=headers
        )
        assert response.status_code == 200
        messages = response.json().get("messages", [])
        
        if len(messages) == 0:
            pytest.skip("No messages in inbox to test detail view")
        
        message_id = messages[0]["id"]
        
        # Get message detail
        response = requests.get(
            f"{BASE_URL}/api/o365/mail/messages/{message_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get message detail: {response.text}"
        data = response.json()
        
        # Check detail structure
        assert "id" in data, "Detail missing 'id'"
        assert "subject" in data, "Detail missing 'subject'"
        assert "from_email" in data, "Detail missing 'from_email'"
        assert "body_html" in data, "Detail missing 'body_html'"
        assert "to" in data, "Detail missing 'to'"
        print(f"Message detail: {data.get('subject')} from {data.get('from_email')}")


class TestO365Calendar:
    """O365 Calendar Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_calendar_events(self, headers):
        """Test GET /api/o365/calendar/events returns events"""
        from datetime import datetime, timedelta
        
        # Get events for current month
        now = datetime.now()
        start = datetime(now.year, now.month, 1).isoformat() + "Z"
        end = datetime(now.year, now.month + 1 if now.month < 12 else 1, 1).isoformat() + "Z"
        
        response = requests.get(
            f"{BASE_URL}/api/o365/calendar/events",
            params={"start": start, "end": end},
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get events: {response.text}"
        data = response.json()
        assert "events" in data, "Missing 'events' key"
        events = data["events"]
        assert isinstance(events, list), "Events should be a list"
        print(f"Found {len(events)} calendar events")
        
        if len(events) > 0:
            event = events[0]
            assert "id" in event, "Event missing 'id'"
            assert "title" in event, "Event missing 'title'"
            assert "start_date" in event, "Event missing 'start_date'"
    
    def test_calendar_requires_auth(self):
        """Test calendar endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/o365/calendar/events",
            params={"start": "2026-01-01T00:00:00Z", "end": "2026-01-31T23:59:59Z"}
        )
        assert response.status_code in [401, 403]


class TestO365Tasks:
    """O365 Tasks (Microsoft To Do) Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_task_lists(self, headers):
        """Test GET /api/o365/tasks/lists returns task lists"""
        response = requests.get(f"{BASE_URL}/api/o365/tasks/lists", headers=headers)
        assert response.status_code == 200, f"Failed to get task lists: {response.text}"
        data = response.json()
        assert "lists" in data, "Missing 'lists' key"
        lists = data["lists"]
        assert isinstance(lists, list), "Lists should be a list"
        assert len(lists) > 0, "Should have at least one task list"
        
        task_list = lists[0]
        assert "id" in task_list, "Task list missing 'id'"
        assert "name" in task_list, "Task list missing 'name'"
        print(f"Found {len(lists)} task lists: {[l['name'] for l in lists]}")
        return lists[0]["id"]
    
    def test_get_tasks_from_list(self, headers):
        """Test GET /api/o365/tasks/lists/{id}/tasks returns tasks"""
        # First get a task list ID
        response = requests.get(f"{BASE_URL}/api/o365/tasks/lists", headers=headers)
        assert response.status_code == 200
        lists = response.json().get("lists", [])
        
        if len(lists) == 0:
            pytest.skip("No task lists available")
        
        list_id = lists[0]["id"]
        
        # Get tasks from the list
        response = requests.get(
            f"{BASE_URL}/api/o365/tasks/lists/{list_id}/tasks",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get tasks: {response.text}"
        data = response.json()
        assert "tasks" in data, "Missing 'tasks' key"
        tasks = data["tasks"]
        assert isinstance(tasks, list), "Tasks should be a list"
        print(f"Found {len(tasks)} tasks in list")
        
        if len(tasks) > 0:
            task = tasks[0]
            assert "id" in task, "Task missing 'id'"
            assert "title" in task, "Task missing 'title'"
            assert "status" in task, "Task missing 'status'"
    
    def test_tasks_requires_auth(self):
        """Test tasks endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/o365/tasks/lists")
        assert response.status_code in [401, 403]


class TestTeamHubStats:
    """Team Hub Stats Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_team_hub_stats(self, headers):
        """Test GET /api/team-hub/stats returns stats"""
        response = requests.get(f"{BASE_URL}/api/team-hub/stats", headers=headers)
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        # Stats should have some numeric fields
        print(f"Team Hub stats: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
