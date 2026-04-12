"""
Multi-Sign Transaction Approval System Tests
Tests for the multi-approval workflow for crypto transactions before execution
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


class TestApprovalSettings:
    """Tests for approval settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = data.get("user", {}).get("id")
    
    def test_get_settings_returns_default_or_saved(self):
        """GET /api/approvals/settings returns settings"""
        response = requests.get(f"{BASE_URL}/api/approvals/settings", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "required_approvals" in data
        assert "approval_timeout_hours" in data
        assert "approver_ids" in data
        assert "approvers" in data
        
        # Verify types
        assert isinstance(data["required_approvals"], int)
        assert isinstance(data["approval_timeout_hours"], int)
        assert isinstance(data["approver_ids"], list)
        assert isinstance(data["approvers"], list)
        print(f"Settings: required={data['required_approvals']}, timeout={data['approval_timeout_hours']}h, approvers={len(data['approvers'])}")
    
    def test_update_settings_saves_correctly(self):
        """PUT /api/approvals/settings saves required_approvals, timeout, approver_ids"""
        # First get current settings to restore later
        get_response = requests.get(f"{BASE_URL}/api/approvals/settings", headers=self.headers)
        original_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "required_approvals": 2,
            "approval_timeout_hours": 72,
            "approver_ids": [self.user_id]  # Add current admin as approver
        }
        
        response = requests.put(f"{BASE_URL}/api/approvals/settings", json=new_settings, headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        # Verify settings were saved
        verify_response = requests.get(f"{BASE_URL}/api/approvals/settings", headers=self.headers)
        assert verify_response.status_code == 200
        saved = verify_response.json()
        assert saved["required_approvals"] == 2
        assert saved["approval_timeout_hours"] == 72
        assert self.user_id in saved["approver_ids"]
        
        # Restore original settings
        restore_settings = {
            "required_approvals": original_settings.get("required_approvals", 1),
            "approval_timeout_hours": original_settings.get("approval_timeout_hours", 48),
            "approver_ids": original_settings.get("approver_ids", [self.user_id])
        }
        requests.put(f"{BASE_URL}/api/approvals/settings", json=restore_settings, headers=self.headers)
        print("Settings update and restore successful")


class TestTransactionCreation:
    """Tests for transaction creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and ensure settings allow transaction creation"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = data.get("user", {}).get("id")
        
        # Always set required_approvals=1 with current user as approver
        requests.put(f"{BASE_URL}/api/approvals/settings", json={
            "required_approvals": 1,
            "approval_timeout_hours": 48,
            "approver_ids": [self.user_id]
        }, headers=self.headers)
    
    def test_create_transaction_success(self):
        """POST /api/approvals/transactions creates a transaction with pending_approval status"""
        tx_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount": 100.50,
            "destination_name": "Test Wallet",
            "destination_address": "TTestAddress123456789",
            "source_wallet": "OTC Trade 1",
            "notes": "Test transaction for pytest"
        }
        
        response = requests.post(f"{BASE_URL}/api/approvals/transactions", json=tx_data, headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "transaction_id" in data
        assert "order_number" in data
        assert data["order_number"].startswith("TX-")
        
        # Verify transaction was created with pending_approval status
        tx_id = data["transaction_id"]
        detail_response = requests.get(f"{BASE_URL}/api/approvals/transactions/{tx_id}", headers=self.headers)
        assert detail_response.status_code == 200
        tx = detail_response.json()
        assert tx["status"] == "pending_approval"
        assert tx["asset"] == "USDT"
        assert tx["amount"] == 100.50
        print(f"Created transaction: {data['order_number']} with status pending_approval")
        
        # Cleanup - cancel the transaction
        requests.post(f"{BASE_URL}/api/approvals/transactions/{tx_id}/cancel", headers=self.headers)
    
    def test_create_transaction_validates_minimum_approvers(self):
        """POST /api/approvals/transactions validates minimum approvers configured"""
        # First set required_approvals higher than available approvers
        requests.put(f"{BASE_URL}/api/approvals/settings", json={
            "required_approvals": 5,
            "approval_timeout_hours": 48,
            "approver_ids": [self.user_id]  # Only 1 approver but requiring 5
        }, headers=self.headers)
        
        tx_data = {
            "asset": "BTC",
            "network": "Bitcoin",
            "amount": 0.5,
            "destination_name": "Test Wallet",
            "destination_address": "bc1qtest123",
            "source_wallet": "Main Wallet"
        }
        
        response = requests.post(f"{BASE_URL}/api/approvals/transactions", json=tx_data, headers=self.headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "aprovadores" in data.get("detail", "").lower() or "approvers" in data.get("detail", "").lower()
        print(f"Validation error: {data.get('detail')}")
        
        # Restore settings
        requests.put(f"{BASE_URL}/api/approvals/settings", json={
            "required_approvals": 1,
            "approval_timeout_hours": 48,
            "approver_ids": [self.user_id]
        }, headers=self.headers)


class TestTransactionListing:
    """Tests for transaction listing and detail"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_transactions_returns_pending_count(self):
        """GET /api/approvals/transactions lists all transactions with pending_count"""
        response = requests.get(f"{BASE_URL}/api/approvals/transactions", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "transactions" in data
        assert "pending_count" in data
        assert isinstance(data["transactions"], list)
        assert isinstance(data["pending_count"], int)
        print(f"Found {len(data['transactions'])} transactions, {data['pending_count']} pending")
    
    def test_list_transactions_with_status_filter(self):
        """GET /api/approvals/transactions?status=X filters by status"""
        # Test with completed filter
        response = requests.get(f"{BASE_URL}/api/approvals/transactions?status=completed", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned transactions should be completed
        for tx in data.get("transactions", []):
            assert tx["status"] == "completed", f"Expected completed, got {tx['status']}"
        print(f"Found {len(data['transactions'])} completed transactions")
    
    def test_get_transaction_detail_with_process_steps(self):
        """GET /api/approvals/transactions/{id} returns detail with process_steps timeline"""
        # First get list to find a transaction
        list_response = requests.get(f"{BASE_URL}/api/approvals/transactions", headers=self.headers)
        transactions = list_response.json().get("transactions", [])
        
        if not transactions:
            pytest.skip("No transactions available to test detail")
        
        tx_id = transactions[0]["id"]
        response = requests.get(f"{BASE_URL}/api/approvals/transactions/{tx_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        tx = response.json()
        
        # Verify process_steps timeline
        assert "process_steps" in tx
        steps = tx["process_steps"]
        assert isinstance(steps, list)
        assert len(steps) >= 5  # At least: request_submitted, approval, risk_compliance, kbex_signature, send
        
        # Verify step structure
        for step in steps:
            assert "key" in step
            assert "label" in step
            assert "status" in step
            assert "details" in step
            assert step["status"] in ["completed", "in_progress", "pending", "rejected", "cancelled"]
        
        # Verify expected step keys
        step_keys = [s["key"] for s in steps]
        assert "request_submitted" in step_keys
        assert "approval" in step_keys
        assert "risk_compliance" in step_keys
        assert "kbex_signature" in step_keys
        assert "send" in step_keys
        print(f"Transaction {tx['order_number']} has {len(steps)} process steps")
    
    def test_get_nonexistent_transaction_returns_404(self):
        """GET /api/approvals/transactions/{id} returns 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/approvals/transactions/{fake_id}", headers=self.headers)
        assert response.status_code == 404


class TestApprovalWorkflow:
    """Tests for approve/reject/cancel workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and setup for workflow tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = data.get("user", {}).get("id")
        
        # Ensure settings allow transaction creation with 1 approver
        requests.put(f"{BASE_URL}/api/approvals/settings", json={
            "required_approvals": 1,
            "approval_timeout_hours": 48,
            "approver_ids": [self.user_id]
        }, headers=self.headers)
    
    def test_approve_transaction_changes_status(self):
        """POST /api/approvals/transactions/{id}/approve changes approval status"""
        # Create a transaction
        tx_data = {
            "asset": "ETH",
            "network": "ERC20",
            "amount": 1.5,
            "destination_name": "Test Approve",
            "destination_address": "0xTestAddress123",
            "source_wallet": "Main Wallet"
        }
        create_response = requests.post(f"{BASE_URL}/api/approvals/transactions", json=tx_data, headers=self.headers)
        assert create_response.status_code == 200
        tx_id = create_response.json()["transaction_id"]
        
        # Approve the transaction
        approve_response = requests.post(
            f"{BASE_URL}/api/approvals/transactions/{tx_id}/approve",
            json={"comment": "Approved for testing"},
            headers=self.headers
        )
        assert approve_response.status_code == 200, f"Failed: {approve_response.text}"
        data = approve_response.json()
        
        assert data.get("success") == True
        assert "approved_count" in data
        assert "required" in data
        print(f"Approved: {data['approved_count']}/{data['required']}, fully_approved={data.get('fully_approved')}")
    
    def test_quorum_reached_auto_advances_to_completed(self):
        """When quorum reached, transaction auto-advances through Risk, Signature, Send, Completed"""
        # Create a transaction
        tx_data = {
            "asset": "USDC",
            "network": "ERC20",
            "amount": 500,
            "destination_name": "Test Auto-Advance",
            "destination_address": "0xAutoAdvance123",
            "source_wallet": "OTC Wallet"
        }
        create_response = requests.post(f"{BASE_URL}/api/approvals/transactions", json=tx_data, headers=self.headers)
        assert create_response.status_code == 200
        tx_id = create_response.json()["transaction_id"]
        
        # Approve (with required_approvals=1, this should complete the workflow)
        approve_response = requests.post(
            f"{BASE_URL}/api/approvals/transactions/{tx_id}/approve",
            json={"comment": "Final approval"},
            headers=self.headers
        )
        assert approve_response.status_code == 200
        data = approve_response.json()
        assert data.get("fully_approved") == True
        
        # Verify transaction is now completed with all steps done
        detail_response = requests.get(f"{BASE_URL}/api/approvals/transactions/{tx_id}", headers=self.headers)
        tx = detail_response.json()
        
        assert tx["status"] == "completed"
        assert tx.get("risk_compliance", {}).get("completed") == True
        assert tx.get("kbex_signature", {}).get("signed") == True
        assert tx.get("send_details", {}).get("completed") == True
        assert tx.get("send_details", {}).get("tx_hash") is not None  # Simulated TxID
        print(f"Transaction auto-advanced to completed with TxID: {tx['send_details']['tx_hash']}")
    
    def test_reject_transaction(self):
        """POST /api/approvals/transactions/{id}/reject rejects the transaction"""
        # Create a transaction
        tx_data = {
            "asset": "BTC",
            "network": "Bitcoin",
            "amount": 0.1,
            "destination_name": "Test Reject",
            "destination_address": "bc1qreject123",
            "source_wallet": "Cold Wallet"
        }
        create_response = requests.post(f"{BASE_URL}/api/approvals/transactions", json=tx_data, headers=self.headers)
        assert create_response.status_code == 200
        tx_id = create_response.json()["transaction_id"]
        
        # Reject the transaction
        reject_response = requests.post(
            f"{BASE_URL}/api/approvals/transactions/{tx_id}/reject",
            json={"comment": "Rejected for testing - suspicious address"},
            headers=self.headers
        )
        assert reject_response.status_code == 200, f"Failed: {reject_response.text}"
        data = reject_response.json()
        assert data.get("success") == True
        
        # Verify transaction is rejected
        detail_response = requests.get(f"{BASE_URL}/api/approvals/transactions/{tx_id}", headers=self.headers)
        tx = detail_response.json()
        assert tx["status"] == "rejected"
        print(f"Transaction rejected successfully")
    
    def test_cancel_transaction(self):
        """POST /api/approvals/transactions/{id}/cancel cancels the transaction"""
        # Create a transaction
        tx_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount": 200,
            "destination_name": "Test Cancel",
            "destination_address": "TCancel123",
            "source_wallet": "Trading Wallet"
        }
        create_response = requests.post(f"{BASE_URL}/api/approvals/transactions", json=tx_data, headers=self.headers)
        assert create_response.status_code == 200
        tx_id = create_response.json()["transaction_id"]
        
        # Cancel the transaction
        cancel_response = requests.post(
            f"{BASE_URL}/api/approvals/transactions/{tx_id}/cancel",
            headers=self.headers
        )
        assert cancel_response.status_code == 200, f"Failed: {cancel_response.text}"
        data = cancel_response.json()
        assert data.get("success") == True
        
        # Verify transaction is cancelled
        detail_response = requests.get(f"{BASE_URL}/api/approvals/transactions/{tx_id}", headers=self.headers)
        tx = detail_response.json()
        assert tx["status"] == "cancelled"
        print(f"Transaction cancelled successfully")
    
    def test_cannot_approve_already_voted(self):
        """Cannot approve a transaction you already voted on"""
        # Create and approve a transaction
        tx_data = {
            "asset": "ETH",
            "network": "ERC20",
            "amount": 0.5,
            "destination_name": "Test Double Vote",
            "destination_address": "0xDoubleVote123",
            "source_wallet": "Main Wallet"
        }
        
        # Set required_approvals to 2 so first approval doesn't complete it
        requests.put(f"{BASE_URL}/api/approvals/settings", json={
            "required_approvals": 2,
            "approval_timeout_hours": 48,
            "approver_ids": [self.user_id, "fake-user-id"]  # Need 2 approvers
        }, headers=self.headers)
        
        create_response = requests.post(f"{BASE_URL}/api/approvals/transactions", json=tx_data, headers=self.headers)
        assert create_response.status_code == 200
        tx_id = create_response.json()["transaction_id"]
        
        # First approval
        approve1 = requests.post(
            f"{BASE_URL}/api/approvals/transactions/{tx_id}/approve",
            json={"comment": "First approval"},
            headers=self.headers
        )
        assert approve1.status_code == 200
        
        # Try to approve again - should fail
        approve2 = requests.post(
            f"{BASE_URL}/api/approvals/transactions/{tx_id}/approve",
            json={"comment": "Second approval attempt"},
            headers=self.headers
        )
        assert approve2.status_code == 400
        assert "votou" in approve2.json().get("detail", "").lower() or "already" in approve2.json().get("detail", "").lower()
        print("Double vote correctly prevented")
        
        # Cleanup
        requests.post(f"{BASE_URL}/api/approvals/transactions/{tx_id}/cancel", headers=self.headers)
        
        # Restore settings
        requests.put(f"{BASE_URL}/api/approvals/settings", json={
            "required_approvals": 1,
            "approval_timeout_hours": 48,
            "approver_ids": [self.user_id]
        }, headers=self.headers)


class TestPendingApprovals:
    """Tests for pending approvals endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_my_pending_approvals(self):
        """GET /api/approvals/pending returns transactions pending current user's approval"""
        response = requests.get(f"{BASE_URL}/api/approvals/pending", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "transactions" in data
        assert "count" in data
        assert isinstance(data["transactions"], list)
        assert isinstance(data["count"], int)
        assert data["count"] == len(data["transactions"])
        print(f"Found {data['count']} transactions pending my approval")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
