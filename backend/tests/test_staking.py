"""
KBEX Staking Module Tests
Tests for: GET /api/staking/assets, POST /api/staking/stake (ETH Compounding/Legacy, SOL/MATIC/ATOM/OSMO),
           GET /api/staking/positions, GET /api/staking/summary, GET /api/staking/history,
           POST /api/staking/unstake, POST /api/staking/claim-rewards
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carlos@kbex.io"
TEST_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestStakingAssets:
    """Test GET /api/staking/assets endpoint"""
    
    def test_get_staking_assets_returns_5_assets(self, headers):
        """Verify endpoint returns exactly 5 staking assets"""
        response = requests.get(f"{BASE_URL}/api/staking/assets", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "assets" in data
        assert len(data["assets"]) == 5, f"Expected 5 assets, got {len(data['assets'])}"
    
    def test_staking_assets_contains_correct_symbols(self, headers):
        """Verify all expected assets are present: ETH, SOL, MATIC, ATOM, OSMO"""
        response = requests.get(f"{BASE_URL}/api/staking/assets", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        asset_ids = [a["id"] for a in data["assets"]]
        expected = ["ETH", "SOL", "MATIC", "ATOM", "OSMO"]
        
        for symbol in expected:
            assert symbol in asset_ids, f"Missing asset: {symbol}"
    
    def test_eth_has_validator_types(self, headers):
        """Verify ETH has compounding and legacy validator types"""
        response = requests.get(f"{BASE_URL}/api/staking/assets", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        eth = next((a for a in data["assets"] if a["id"] == "ETH"), None)
        assert eth is not None, "ETH asset not found"
        assert "validator_types" in eth
        assert len(eth["validator_types"]) == 2
        
        vt_ids = [vt["id"] for vt in eth["validator_types"]]
        assert "compounding" in vt_ids
        assert "legacy" in vt_ids
    
    def test_non_eth_assets_have_no_validator_types(self, headers):
        """Verify SOL, MATIC, ATOM, OSMO have empty validator_types"""
        response = requests.get(f"{BASE_URL}/api/staking/assets", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        for asset in data["assets"]:
            if asset["id"] != "ETH":
                assert asset["validator_types"] == [], f"{asset['id']} should have empty validator_types"


class TestStakeETHCompounding:
    """Test ETH Compounding staking validation (32-2048 ETH range)"""
    
    def test_eth_compounding_valid_32_eth(self, headers):
        """Stake 32 ETH with compounding - should succeed"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "compounding",
            "provider_id": "TEST_provider_compounding",
            "provider_name": "Test Provider",
            "amount": 32
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert "position_id" in data
    
    def test_eth_compounding_valid_2048_eth(self, headers):
        """Stake 2048 ETH with compounding - should succeed"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "compounding",
            "provider_id": "TEST_provider_compounding_max",
            "amount": 2048
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_eth_compounding_valid_100_eth(self, headers):
        """Stake 100 ETH with compounding - should succeed (within 32-2048)"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "compounding",
            "provider_id": "TEST_provider_compounding_mid",
            "amount": 100
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_eth_compounding_rejects_below_32(self, headers):
        """Stake 31 ETH with compounding - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "compounding",
            "provider_id": "TEST_provider",
            "amount": 31
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_eth_compounding_rejects_above_2048(self, headers):
        """Stake 2049 ETH with compounding - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "compounding",
            "provider_id": "TEST_provider",
            "amount": 2049
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestStakeETHLegacy:
    """Test ETH Legacy staking validation (multiples of 32 ETH)"""
    
    def test_eth_legacy_valid_32_eth(self, headers):
        """Stake 32 ETH with legacy - should succeed"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "legacy",
            "provider_id": "TEST_provider_legacy_32",
            "amount": 32
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
    
    def test_eth_legacy_valid_64_eth(self, headers):
        """Stake 64 ETH with legacy - should succeed (multiple of 32)"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "legacy",
            "provider_id": "TEST_provider_legacy_64",
            "amount": 64
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_eth_legacy_valid_96_eth(self, headers):
        """Stake 96 ETH with legacy - should succeed (multiple of 32)"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "legacy",
            "provider_id": "TEST_provider_legacy_96",
            "amount": 96
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_eth_legacy_rejects_33_eth(self, headers):
        """Stake 33 ETH with legacy - should fail (not multiple of 32)"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "legacy",
            "provider_id": "TEST_provider",
            "amount": 33
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_eth_legacy_rejects_50_eth(self, headers):
        """Stake 50 ETH with legacy - should fail (not multiple of 32)"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "legacy",
            "provider_id": "TEST_provider",
            "amount": 50
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_eth_legacy_rejects_100_eth(self, headers):
        """Stake 100 ETH with legacy - should fail (not multiple of 32)"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "legacy",
            "provider_id": "TEST_provider",
            "amount": 100
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestStakeNonETH:
    """Test staking for SOL, MATIC, ATOM, OSMO (no validator_type required)"""
    
    def test_stake_sol_without_validator_type(self, headers):
        """Stake SOL without validator_type - should succeed"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "SOL",
            "provider_id": "TEST_provider_sol",
            "amount": 10
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
    
    def test_stake_matic_without_validator_type(self, headers):
        """Stake MATIC without validator_type - should succeed"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "MATIC",
            "provider_id": "TEST_provider_matic",
            "amount": 100
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_stake_atom_without_validator_type(self, headers):
        """Stake ATOM without validator_type - should succeed"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ATOM",
            "provider_id": "TEST_provider_atom",
            "amount": 5
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_stake_osmo_without_validator_type(self, headers):
        """Stake OSMO without validator_type - should succeed"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "OSMO",
            "provider_id": "TEST_provider_osmo",
            "amount": 50
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
    
    def test_stake_sol_respects_minimum(self, headers):
        """Stake SOL below minimum (1) - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "SOL",
            "provider_id": "TEST_provider",
            "amount": 0.5
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestStakeValidation:
    """Test general staking validation"""
    
    def test_stake_unsupported_asset_rejected(self, headers):
        """Stake unsupported asset - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "DOGE",
            "provider_id": "TEST_provider",
            "amount": 100
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_eth_requires_validator_type(self, headers):
        """Stake ETH without validator_type - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "provider_id": "TEST_provider",
            "amount": 32
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_eth_invalid_validator_type_rejected(self, headers):
        """Stake ETH with invalid validator_type - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ETH",
            "validator_type": "invalid_type",
            "provider_id": "TEST_provider",
            "amount": 32
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestStakingPositions:
    """Test GET /api/staking/positions endpoint"""
    
    def test_get_positions_returns_list(self, headers):
        """Verify positions endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/staking/positions", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "positions" in data
        assert isinstance(data["positions"], list)
    
    def test_positions_contain_test_stakes(self, headers):
        """Verify positions include stakes created in tests"""
        response = requests.get(f"{BASE_URL}/api/staking/positions", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Should have at least some positions from our tests
        assert len(data["positions"]) > 0, "Expected at least one position from tests"


class TestStakingSummary:
    """Test GET /api/staking/summary endpoint"""
    
    def test_get_summary_returns_aggregated_data(self, headers):
        """Verify summary endpoint returns aggregated data"""
        response = requests.get(f"{BASE_URL}/api/staking/summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "summary" in data
        
        summary = data["summary"]
        assert "active_positions" in summary
        assert "pending_positions" in summary
        assert "total_positions" in summary
        assert "by_asset" in summary


class TestStakingHistory:
    """Test GET /api/staking/history endpoint"""
    
    def test_get_history_returns_list(self, headers):
        """Verify history endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/staking/history", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "history" in data
        assert isinstance(data["history"], list)
    
    def test_history_contains_stake_actions(self, headers):
        """Verify history includes stake actions from tests"""
        response = requests.get(f"{BASE_URL}/api/staking/history", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Should have stake actions from our tests
        stake_actions = [h for h in data["history"] if h.get("action") == "stake"]
        assert len(stake_actions) > 0, "Expected at least one stake action in history"


class TestUnstake:
    """Test POST /api/staking/unstake endpoint"""
    
    @pytest.fixture
    def active_position(self, headers):
        """Create a position to unstake from"""
        # Create a new position
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "SOL",
            "provider_id": f"TEST_unstake_{uuid.uuid4().hex[:8]}",
            "amount": 10
        })
        assert response.status_code == 200
        return response.json()["position_id"]
    
    def test_unstake_valid_amount(self, headers, active_position):
        """Unstake valid amount from position"""
        response = requests.post(f"{BASE_URL}/api/staking/unstake", headers=headers, json={
            "position_id": active_position,
            "amount": 5
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("new_amount") == 5
    
    def test_unstake_invalid_position_rejected(self, headers):
        """Unstake from non-existent position - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/unstake", headers=headers, json={
            "position_id": "non-existent-position-id",
            "amount": 5
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_unstake_excess_amount_rejected(self, headers, active_position):
        """Unstake more than staked - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/unstake", headers=headers, json={
            "position_id": active_position,
            "amount": 1000  # More than the 10 SOL staked
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestClaimRewards:
    """Test POST /api/staking/claim-rewards endpoint"""
    
    @pytest.fixture
    def position_for_claim(self, headers):
        """Create a position to claim rewards from"""
        response = requests.post(f"{BASE_URL}/api/staking/stake", headers=headers, json={
            "asset_id": "ATOM",
            "provider_id": f"TEST_claim_{uuid.uuid4().hex[:8]}",
            "amount": 5
        })
        assert response.status_code == 200
        return response.json()["position_id"]
    
    def test_claim_rewards_valid_position(self, headers, position_for_claim):
        """Claim rewards from valid position"""
        response = requests.post(f"{BASE_URL}/api/staking/claim-rewards", headers=headers, json={
            "position_id": position_for_claim
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
    
    def test_claim_rewards_invalid_position_rejected(self, headers):
        """Claim rewards from non-existent position - should fail"""
        response = requests.post(f"{BASE_URL}/api/staking/claim-rewards", headers=headers, json={
            "position_id": "non-existent-position-id"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestStakingProviders:
    """Test GET /api/staking/providers endpoint"""
    
    def test_get_providers_returns_list(self, headers):
        """Verify providers endpoint returns a list (may be empty if Fireblocks not configured)"""
        response = requests.get(f"{BASE_URL}/api/staking/providers", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "providers" in data
        assert isinstance(data["providers"], list)
    
    def test_get_providers_with_chain_filter(self, headers):
        """Verify providers endpoint accepts chain filter"""
        response = requests.get(f"{BASE_URL}/api/staking/providers?chain=ETH", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") is True


# Cleanup fixture to remove test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_positions(headers):
    """Cleanup TEST_ prefixed positions after tests complete"""
    yield
    # Note: In production, you'd want to delete test positions
    # For now, they're marked with TEST_ prefix for identification
