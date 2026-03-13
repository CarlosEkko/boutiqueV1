"""
Test CRM APIs for KBEX - Leads, Deals, Contacts, Tasks
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCRMAuth:
    """Test authentication for CRM endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kryptobox.io",
            "password": "senha123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("access_token")
        assert token, "No access token returned"
        return token
    
    def test_crm_endpoints_require_auth(self):
        """Test that CRM endpoints require authentication"""
        endpoints = [
            "/api/crm/leads",
            "/api/crm/deals",
            "/api/crm/contacts",
            "/api/crm/tasks",
            "/api/crm/dashboard"
        ]
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"{endpoint} should require auth"
            print(f"PASS: {endpoint} requires authentication")


class TestCRMLeads:
    """CRM Leads CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kryptobox.io",
            "password": "senha123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_lead_statuses(self, api_client):
        """Test fetching lead status enums"""
        response = api_client.get(f"{BASE_URL}/api/crm/enums/lead-statuses")
        assert response.status_code == 200
        statuses = response.json()
        assert len(statuses) > 0
        # Check for expected statuses
        status_values = [s['value'] for s in statuses]
        assert 'new' in status_values
        assert 'qualified' in status_values
        print(f"PASS: Lead statuses returned: {status_values}")
    
    def test_create_lead(self, api_client):
        """Test creating a new lead"""
        lead_data = {
            "name": "TEST_Lead_Integration",
            "company_name": "Test Company Ltd",
            "email": "testlead@example.com",
            "phone": "+351 912 345 678",
            "country": "Portugal",
            "region": "Europe",
            "source": "Website",
            "status": "new",
            "interest": "Buying BTC",
            "interested_cryptos": ["BTC", "ETH"],
            "estimated_volume": 50000,
            "preferred_currency": "EUR",
            "is_qualified": False,
            "qualification_score": 30,
            "notes": "Integration test lead"
        }
        response = api_client.post(f"{BASE_URL}/api/crm/leads", json=lead_data)
        assert response.status_code == 200, f"Create lead failed: {response.text}"
        
        lead = response.json()
        assert lead.get("id"), "Lead ID not returned"
        assert lead["name"] == lead_data["name"]
        assert lead["email"] == lead_data["email"]
        assert lead["status"] == "new"
        print(f"PASS: Lead created with ID: {lead['id']}")
        
        # Store for cleanup
        TestCRMLeads.created_lead_id = lead["id"]
        return lead
    
    def test_get_leads_list(self, api_client):
        """Test fetching leads list"""
        response = api_client.get(f"{BASE_URL}/api/crm/leads")
        assert response.status_code == 200
        leads = response.json()
        assert isinstance(leads, list)
        print(f"PASS: Fetched {len(leads)} leads")
    
    def test_get_lead_by_id(self, api_client):
        """Test fetching lead by ID"""
        if not hasattr(TestCRMLeads, 'created_lead_id'):
            pytest.skip("No lead created")
        
        lead_id = TestCRMLeads.created_lead_id
        response = api_client.get(f"{BASE_URL}/api/crm/leads/{lead_id}")
        assert response.status_code == 200
        lead = response.json()
        assert lead["id"] == lead_id
        print(f"PASS: Lead {lead_id} fetched successfully")
    
    def test_update_lead(self, api_client):
        """Test updating a lead"""
        if not hasattr(TestCRMLeads, 'created_lead_id'):
            pytest.skip("No lead created")
        
        lead_id = TestCRMLeads.created_lead_id
        update_data = {
            "status": "contacted",
            "is_qualified": True,
            "qualification_score": 75,
            "notes": "Updated - qualified lead"
        }
        response = api_client.put(f"{BASE_URL}/api/crm/leads/{lead_id}", json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        lead = response.json()
        assert lead["status"] == "contacted"
        assert lead["is_qualified"] == True
        assert lead["qualification_score"] == 75
        print(f"PASS: Lead {lead_id} updated successfully")
    
    def test_filter_leads_by_status(self, api_client):
        """Test filtering leads by status"""
        response = api_client.get(f"{BASE_URL}/api/crm/leads?status=contacted")
        assert response.status_code == 200
        leads = response.json()
        for lead in leads:
            assert lead["status"] == "contacted"
        print(f"PASS: Filtered leads by status, found {len(leads)}")
    
    def test_convert_lead_to_client(self, api_client):
        """Test converting a lead to client"""
        if not hasattr(TestCRMLeads, 'created_lead_id'):
            pytest.skip("No lead created")
        
        lead_id = TestCRMLeads.created_lead_id
        response = api_client.post(f"{BASE_URL}/api/crm/leads/{lead_id}/convert")
        assert response.status_code == 200, f"Convert failed: {response.text}"
        
        result = response.json()
        assert "message" in result
        
        # Verify lead was updated
        get_response = api_client.get(f"{BASE_URL}/api/crm/leads/{lead_id}")
        lead = get_response.json()
        assert lead["converted_to_client"] == True
        assert lead["status"] == "won"
        print(f"PASS: Lead {lead_id} converted to client")
    
    def test_delete_lead(self, api_client):
        """Test deleting a lead"""
        if not hasattr(TestCRMLeads, 'created_lead_id'):
            pytest.skip("No lead created")
        
        lead_id = TestCRMLeads.created_lead_id
        response = api_client.delete(f"{BASE_URL}/api/crm/leads/{lead_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/crm/leads/{lead_id}")
        assert get_response.status_code == 404
        print(f"PASS: Lead {lead_id} deleted successfully")


class TestCRMDeals:
    """CRM Deals CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kryptobox.io",
            "password": "senha123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_deal_stages(self, api_client):
        """Test fetching deal stage enums"""
        response = api_client.get(f"{BASE_URL}/api/crm/enums/deal-stages")
        assert response.status_code == 200
        stages = response.json()
        assert len(stages) > 0
        stage_values = [s['value'] for s in stages]
        assert 'qualification' in stage_values
        assert 'closed_won' in stage_values
        print(f"PASS: Deal stages returned: {stage_values}")
    
    def test_create_deal(self, api_client):
        """Test creating a new deal"""
        deal_data = {
            "title": "TEST_Deal_BTC_Trade",
            "description": "Test deal for BTC trading",
            "stage": "qualification",
            "amount": 100000,
            "currency": "EUR",
            "cryptocurrency": "BTC",
            "crypto_amount": 1.5,
            "probability": 50,
            "expected_close_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "notes": "Integration test deal"
        }
        response = api_client.post(f"{BASE_URL}/api/crm/deals", json=deal_data)
        assert response.status_code == 200, f"Create deal failed: {response.text}"
        
        deal = response.json()
        assert deal.get("id"), "Deal ID not returned"
        assert deal["title"] == deal_data["title"]
        assert deal["amount"] == 100000
        assert deal["stage"] == "qualification"
        print(f"PASS: Deal created with ID: {deal['id']}")
        
        TestCRMDeals.created_deal_id = deal["id"]
        return deal
    
    def test_get_deals_list(self, api_client):
        """Test fetching deals list"""
        response = api_client.get(f"{BASE_URL}/api/crm/deals")
        assert response.status_code == 200
        deals = response.json()
        assert isinstance(deals, list)
        print(f"PASS: Fetched {len(deals)} deals")
    
    def test_get_deal_by_id(self, api_client):
        """Test fetching deal by ID"""
        if not hasattr(TestCRMDeals, 'created_deal_id'):
            pytest.skip("No deal created")
        
        deal_id = TestCRMDeals.created_deal_id
        response = api_client.get(f"{BASE_URL}/api/crm/deals/{deal_id}")
        assert response.status_code == 200
        deal = response.json()
        assert deal["id"] == deal_id
        print(f"PASS: Deal {deal_id} fetched successfully")
    
    def test_update_deal_stage(self, api_client):
        """Test updating deal stage (pipeline movement)"""
        if not hasattr(TestCRMDeals, 'created_deal_id'):
            pytest.skip("No deal created")
        
        deal_id = TestCRMDeals.created_deal_id
        update_data = {
            "stage": "proposal",
            "probability": 70,
            "notes": "Moved to proposal stage"
        }
        response = api_client.put(f"{BASE_URL}/api/crm/deals/{deal_id}", json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        deal = response.json()
        assert deal["stage"] == "proposal"
        assert deal["probability"] == 70
        print(f"PASS: Deal {deal_id} moved to proposal stage")
    
    def test_filter_deals_by_stage(self, api_client):
        """Test filtering deals by stage"""
        response = api_client.get(f"{BASE_URL}/api/crm/deals?stage=proposal")
        assert response.status_code == 200
        deals = response.json()
        for deal in deals:
            assert deal["stage"] == "proposal"
        print(f"PASS: Filtered deals by stage, found {len(deals)}")
    
    def test_delete_deal(self, api_client):
        """Test deleting a deal"""
        if not hasattr(TestCRMDeals, 'created_deal_id'):
            pytest.skip("No deal created")
        
        deal_id = TestCRMDeals.created_deal_id
        response = api_client.delete(f"{BASE_URL}/api/crm/deals/{deal_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/crm/deals/{deal_id}")
        assert get_response.status_code == 404
        print(f"PASS: Deal {deal_id} deleted successfully")


class TestCRMContacts:
    """CRM Contacts CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kryptobox.io",
            "password": "senha123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_create_contact(self, api_client):
        """Test creating a new contact"""
        contact_data = {
            "first_name": "TEST_John",
            "last_name": "Smith",
            "email": "test.john@example.com",
            "phone": "+351 210 000 001",
            "mobile": "+351 910 000 001",
            "company_name": "Test Company",
            "job_title": "CEO",
            "department": "Executive",
            "city": "Lisbon",
            "country": "Portugal",
            "preferred_contact_method": "email",
            "whatsapp": "+351 910 000 001",
            "is_primary": True,
            "notes": "Integration test contact"
        }
        response = api_client.post(f"{BASE_URL}/api/crm/contacts", json=contact_data)
        assert response.status_code == 200, f"Create contact failed: {response.text}"
        
        contact = response.json()
        assert contact.get("id"), "Contact ID not returned"
        assert contact["first_name"] == "TEST_John"
        assert contact["email"] == contact_data["email"]
        assert "full_name" in contact
        print(f"PASS: Contact created with ID: {contact['id']}, Full name: {contact['full_name']}")
        
        TestCRMContacts.created_contact_id = contact["id"]
        return contact
    
    def test_get_contacts_list(self, api_client):
        """Test fetching contacts list"""
        response = api_client.get(f"{BASE_URL}/api/crm/contacts")
        assert response.status_code == 200
        contacts = response.json()
        assert isinstance(contacts, list)
        # Check that full_name is computed
        for contact in contacts:
            assert "full_name" in contact
        print(f"PASS: Fetched {len(contacts)} contacts")
    
    def test_get_contact_by_id(self, api_client):
        """Test fetching contact by ID"""
        if not hasattr(TestCRMContacts, 'created_contact_id'):
            pytest.skip("No contact created")
        
        contact_id = TestCRMContacts.created_contact_id
        response = api_client.get(f"{BASE_URL}/api/crm/contacts/{contact_id}")
        assert response.status_code == 200
        contact = response.json()
        assert contact["id"] == contact_id
        print(f"PASS: Contact {contact_id} fetched successfully")
    
    def test_update_contact(self, api_client):
        """Test updating a contact"""
        if not hasattr(TestCRMContacts, 'created_contact_id'):
            pytest.skip("No contact created")
        
        contact_id = TestCRMContacts.created_contact_id
        update_data = {
            "job_title": "CFO",
            "department": "Finance",
            "notes": "Updated - promoted to CFO"
        }
        response = api_client.put(f"{BASE_URL}/api/crm/contacts/{contact_id}", json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        contact = response.json()
        assert contact["job_title"] == "CFO"
        assert contact["department"] == "Finance"
        print(f"PASS: Contact {contact_id} updated successfully")
    
    def test_search_contacts(self, api_client):
        """Test searching contacts"""
        response = api_client.get(f"{BASE_URL}/api/crm/contacts?search=TEST_John")
        assert response.status_code == 200
        contacts = response.json()
        assert len(contacts) > 0
        print(f"PASS: Search found {len(contacts)} contacts")
    
    def test_delete_contact(self, api_client):
        """Test deleting a contact"""
        if not hasattr(TestCRMContacts, 'created_contact_id'):
            pytest.skip("No contact created")
        
        contact_id = TestCRMContacts.created_contact_id
        response = api_client.delete(f"{BASE_URL}/api/crm/contacts/{contact_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/crm/contacts/{contact_id}")
        assert get_response.status_code == 404
        print(f"PASS: Contact {contact_id} deleted successfully")


class TestCRMTasks:
    """CRM Tasks CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kryptobox.io",
            "password": "senha123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_task_priorities(self, api_client):
        """Test fetching task priority enums"""
        response = api_client.get(f"{BASE_URL}/api/crm/enums/task-priorities")
        assert response.status_code == 200
        priorities = response.json()
        assert len(priorities) > 0
        priority_values = [p['value'] for p in priorities]
        assert 'low' in priority_values
        assert 'urgent' in priority_values
        print(f"PASS: Task priorities returned: {priority_values}")
    
    def test_get_task_statuses(self, api_client):
        """Test fetching task status enums"""
        response = api_client.get(f"{BASE_URL}/api/crm/enums/task-statuses")
        assert response.status_code == 200
        statuses = response.json()
        assert len(statuses) > 0
        status_values = [s['value'] for s in statuses]
        assert 'pending' in status_values
        assert 'completed' in status_values
        print(f"PASS: Task statuses returned: {status_values}")
    
    def test_create_task(self, api_client):
        """Test creating a new task"""
        task_data = {
            "title": "TEST_Task_Follow_Up",
            "description": "Follow up with test lead",
            "priority": "high",
            "status": "pending",
            "task_type": "follow_up",
            "due_date": (datetime.now() + timedelta(days=3)).isoformat(),
            "notes": "Integration test task"
        }
        response = api_client.post(f"{BASE_URL}/api/crm/tasks", json=task_data)
        assert response.status_code == 200, f"Create task failed: {response.text}"
        
        task = response.json()
        assert task.get("id"), "Task ID not returned"
        assert task["title"] == task_data["title"]
        assert task["priority"] == "high"
        assert task["status"] == "pending"
        print(f"PASS: Task created with ID: {task['id']}")
        
        TestCRMTasks.created_task_id = task["id"]
        return task
    
    def test_get_tasks_list(self, api_client):
        """Test fetching tasks list"""
        response = api_client.get(f"{BASE_URL}/api/crm/tasks")
        assert response.status_code == 200
        tasks = response.json()
        assert isinstance(tasks, list)
        # Check that is_overdue field is present
        for task in tasks:
            assert "is_overdue" in task
        print(f"PASS: Fetched {len(tasks)} tasks")
    
    def test_get_task_by_id(self, api_client):
        """Test fetching task by ID"""
        if not hasattr(TestCRMTasks, 'created_task_id'):
            pytest.skip("No task created")
        
        task_id = TestCRMTasks.created_task_id
        response = api_client.get(f"{BASE_URL}/api/crm/tasks/{task_id}")
        assert response.status_code == 200
        task = response.json()
        assert task["id"] == task_id
        print(f"PASS: Task {task_id} fetched successfully")
    
    def test_update_task_status_to_in_progress(self, api_client):
        """Test updating task to in_progress"""
        if not hasattr(TestCRMTasks, 'created_task_id'):
            pytest.skip("No task created")
        
        task_id = TestCRMTasks.created_task_id
        update_data = {
            "status": "in_progress",
            "notes": "Started working on this task"
        }
        response = api_client.put(f"{BASE_URL}/api/crm/tasks/{task_id}", json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        task = response.json()
        assert task["status"] == "in_progress"
        print(f"PASS: Task {task_id} moved to in_progress")
    
    def test_complete_task(self, api_client):
        """Test completing a task"""
        if not hasattr(TestCRMTasks, 'created_task_id'):
            pytest.skip("No task created")
        
        task_id = TestCRMTasks.created_task_id
        update_data = {
            "status": "completed"
        }
        response = api_client.put(f"{BASE_URL}/api/crm/tasks/{task_id}", json=update_data)
        assert response.status_code == 200, f"Complete failed: {response.text}"
        
        task = response.json()
        assert task["status"] == "completed"
        # completed_at should be set
        assert task.get("completed_at") is not None
        print(f"PASS: Task {task_id} completed successfully")
    
    def test_filter_tasks_by_status(self, api_client):
        """Test filtering tasks by status"""
        response = api_client.get(f"{BASE_URL}/api/crm/tasks?status=completed")
        assert response.status_code == 200
        tasks = response.json()
        for task in tasks:
            assert task["status"] == "completed"
        print(f"PASS: Filtered tasks by status, found {len(tasks)}")
    
    def test_filter_tasks_by_priority(self, api_client):
        """Test filtering tasks by priority"""
        response = api_client.get(f"{BASE_URL}/api/crm/tasks?priority=high")
        assert response.status_code == 200
        tasks = response.json()
        for task in tasks:
            assert task["priority"] == "high"
        print(f"PASS: Filtered tasks by priority, found {len(tasks)}")
    
    def test_delete_task(self, api_client):
        """Test deleting a task"""
        if not hasattr(TestCRMTasks, 'created_task_id'):
            pytest.skip("No task created")
        
        task_id = TestCRMTasks.created_task_id
        response = api_client.delete(f"{BASE_URL}/api/crm/tasks/{task_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/crm/tasks/{task_id}")
        assert get_response.status_code == 404
        print(f"PASS: Task {task_id} deleted successfully")


class TestCRMDashboard:
    """CRM Dashboard statistics tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kryptobox.io",
            "password": "senha123"
        })
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_dashboard_stats(self, api_client):
        """Test fetching CRM dashboard statistics"""
        response = api_client.get(f"{BASE_URL}/api/crm/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        stats = response.json()
        
        # Check all expected fields are present
        expected_fields = [
            "total_suppliers", "active_suppliers", "verified_suppliers",
            "total_leads", "new_leads", "qualified_leads",
            "total_deals", "open_deals", "won_deals", "lost_deals",
            "total_contacts", "pending_tasks", "overdue_tasks",
            "total_deal_value", "won_deal_value", "pipeline_value"
        ]
        
        for field in expected_fields:
            assert field in stats, f"Missing field: {field}"
        
        print(f"PASS: Dashboard stats retrieved:")
        print(f"  - Suppliers: {stats['total_suppliers']} total, {stats['active_suppliers']} active")
        print(f"  - Leads: {stats['total_leads']} total, {stats['new_leads']} new")
        print(f"  - Deals: {stats['total_deals']} total, {stats['open_deals']} open")
        print(f"  - Contacts: {stats['total_contacts']}")
        print(f"  - Tasks: {stats['pending_tasks']} pending, {stats['overdue_tasks']} overdue")
        print(f"  - Pipeline value: {stats['pipeline_value']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
