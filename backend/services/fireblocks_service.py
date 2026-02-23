"""
Fireblocks Service - Cryptocurrency Wallet Management
Handles wallet creation, balance queries, and transactions via Fireblocks API
"""
import os
import logging
from typing import Optional, Dict, List, Any
from fireblocks_sdk import FireblocksSDK, TransferPeerPath, PagedVaultAccountsRequestFilters, VAULT_ACCOUNT, TRANSACTION_STATUS_COMPLETED
from datetime import datetime

logger = logging.getLogger(__name__)

class FireblocksService:
    """Service for interacting with Fireblocks API"""
    
    _instance: Optional[FireblocksSDK] = None
    
    @classmethod
    def get_client(cls) -> FireblocksSDK:
        """Get or create Fireblocks SDK client"""
        if cls._instance is not None:
            return cls._instance
        
        api_key = os.environ.get("FIREBLOCKS_API_KEY")
        secret_key_path = os.environ.get("FIREBLOCKS_SECRET_KEY_PATH")
        base_url = os.environ.get("FIREBLOCKS_BASE_PATH", "https://sandbox-api.fireblocks.io")
        
        if not api_key:
            raise ValueError("FIREBLOCKS_API_KEY not configured")
        
        if not secret_key_path or not os.path.exists(secret_key_path):
            raise ValueError(f"Fireblocks secret key file not found: {secret_key_path}")
        
        try:
            with open(secret_key_path, 'r') as f:
                secret_key = f.read()
            
            cls._instance = FireblocksSDK(
                private_key=secret_key,
                api_key=api_key,
                api_base_url=base_url
            )
            logger.info("Fireblocks client initialized successfully")
            return cls._instance
            
        except Exception as e:
            logger.error(f"Failed to initialize Fireblocks client: {e}")
            raise
    
    @classmethod
    async def get_vault_accounts(cls) -> List[Dict[str, Any]]:
        """Get all vault accounts"""
        try:
            client = cls.get_client()
            # Use the paginated method with empty filter
            filters = PagedVaultAccountsRequestFilters()
            result = client.get_vault_accounts_with_page_info(filters)
            accounts = result.get('accounts', []) if isinstance(result, dict) else result
            return accounts
        except Exception as e:
            logger.error(f"Failed to get vault accounts: {e}")
            raise
    
    @classmethod
    async def create_vault_account(cls, name: str, hidden: bool = False) -> Dict[str, Any]:
        """Create a new vault account"""
        try:
            client = cls.get_client()
            account = client.create_vault_account(name=name, hiddenOnUI=hidden)
            logger.info(f"Created vault account: {account.get('id')}")
            return account
        except Exception as e:
            logger.error(f"Failed to create vault account: {e}")
            raise
    
    @classmethod
    async def get_vault_account(cls, vault_id: str) -> Dict[str, Any]:
        """Get a specific vault account"""
        try:
            client = cls.get_client()
            account = client.get_vault_account_by_id(vault_id)
            return account
        except Exception as e:
            logger.error(f"Failed to get vault account {vault_id}: {e}")
            raise
    
    @classmethod
    async def create_vault_asset(cls, vault_id: str, asset_id: str) -> Dict[str, Any]:
        """Create an asset wallet within a vault account"""
        try:
            client = cls.get_client()
            asset = client.create_vault_asset(vault_account_id=vault_id, asset_id=asset_id)
            logger.info(f"Created asset {asset_id} in vault {vault_id}")
            return asset
        except Exception as e:
            logger.error(f"Failed to create asset {asset_id} in vault {vault_id}: {e}")
            raise
    
    @classmethod
    async def get_vault_asset(cls, vault_id: str, asset_id: str) -> Dict[str, Any]:
        """Get asset balance in a vault"""
        try:
            client = cls.get_client()
            asset = client.get_vault_account_asset(vault_account_id=vault_id, asset_id=asset_id)
            return asset
        except Exception as e:
            logger.error(f"Failed to get asset {asset_id} from vault {vault_id}: {e}")
            raise
    
    @classmethod
    async def get_supported_assets(cls) -> List[Dict[str, Any]]:
        """Get list of supported assets"""
        try:
            client = cls.get_client()
            assets = client.get_supported_assets()
            return assets
        except Exception as e:
            logger.error(f"Failed to get supported assets: {e}")
            raise
    
    @classmethod
    async def create_transaction(
        cls,
        source_vault_id: str,
        destination_address: str,
        asset_id: str,
        amount: str,
        note: str = ""
    ) -> Dict[str, Any]:
        """Create a withdrawal transaction"""
        try:
            client = cls.get_client()
            
            tx = client.create_transaction(
                asset_id=asset_id,
                amount=amount,
                source=TransferPeerPath(VAULT_ACCOUNT, source_vault_id),
                destination=TransferPeerPath("ONE_TIME_ADDRESS", one_time_address={
                    "address": destination_address
                }),
                note=note
            )
            
            logger.info(f"Created transaction: {tx.get('id')}")
            return tx
        except Exception as e:
            logger.error(f"Failed to create transaction: {e}")
            raise
    
    @classmethod
    async def get_transaction(cls, tx_id: str) -> Dict[str, Any]:
        """Get transaction status"""
        try:
            client = cls.get_client()
            tx = client.get_transaction_by_id(tx_id)
            return tx
        except Exception as e:
            logger.error(f"Failed to get transaction {tx_id}: {e}")
            raise
    
    @classmethod
    async def get_deposit_addresses(cls, vault_id: str, asset_id: str) -> List[Dict[str, Any]]:
        """Get deposit addresses for an asset"""
        try:
            client = cls.get_client()
            addresses = client.get_deposit_addresses(vault_account_id=vault_id, asset_id=asset_id)
            return addresses
        except Exception as e:
            logger.error(f"Failed to get deposit addresses: {e}")
            raise
