"""
Fireblocks Service - Cryptocurrency Wallet Management
Handles wallet creation, balance queries, and transactions via Fireblocks API
"""
import os
import logging
from typing import Optional, Dict, List, Any
from fireblocks_sdk import (
    FireblocksSDK, TransferPeerPath, DestinationTransferPeerPath,
    PagedVaultAccountsRequestFilters, VAULT_ACCOUNT, ONE_TIME_ADDRESS,
    EXTERNAL_WALLET, TRANSACTION_STATUS_COMPLETED
)
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
    
    # ==================== VAULT OPERATIONS ====================
    
    @classmethod
    async def get_vault_accounts(cls) -> List[Dict[str, Any]]:
        """Get all vault accounts"""
        try:
            client = cls.get_client()
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
    
    # ==================== EXTERNAL WALLET (WHITELIST) ====================
    
    @classmethod
    async def create_external_wallet(cls, name: str, customer_ref_id: str = None) -> Dict[str, Any]:
        """Create an External Wallet container in Fireblocks (whitelist group)"""
        try:
            client = cls.get_client()
            wallet = client.create_external_wallet(name=name, customer_ref_id=customer_ref_id)
            logger.info(f"Created external wallet: {wallet.get('id')} - {name}")
            return wallet
        except Exception as e:
            logger.error(f"Failed to create external wallet '{name}': {e}")
            raise
    
    @classmethod
    async def add_asset_to_external_wallet(
        cls, wallet_id: str, asset_id: str, address: str, tag: str = None
    ) -> Dict[str, Any]:
        """Add an asset address to an External Wallet (whitelist the address)"""
        try:
            client = cls.get_client()
            result = client.create_external_wallet_asset(
                wallet_id=wallet_id,
                asset_id=asset_id,
                address=address,
                tag=tag
            )
            logger.info(f"Whitelisted {asset_id} address {address[:12]}... in external wallet {wallet_id}")
            return result
        except Exception as e:
            logger.error(f"Failed to add asset to external wallet {wallet_id}: {e}")
            raise
    
    @classmethod
    async def get_external_wallets(cls) -> List[Dict[str, Any]]:
        """Get all External Wallets"""
        try:
            client = cls.get_client()
            wallets = client.get_external_wallets()
            return wallets if isinstance(wallets, list) else []
        except Exception as e:
            logger.error(f"Failed to get external wallets: {e}")
            raise
    
    @classmethod
    async def get_external_wallet(cls, wallet_id: str) -> Dict[str, Any]:
        """Get a specific External Wallet"""
        try:
            client = cls.get_client()
            wallet = client.get_external_wallet(wallet_id)
            return wallet
        except Exception as e:
            logger.error(f"Failed to get external wallet {wallet_id}: {e}")
            raise
    
    @classmethod
    async def delete_external_wallet(cls, wallet_id: str) -> Dict[str, Any]:
        """Delete an External Wallet"""
        try:
            client = cls.get_client()
            result = client.delete_external_wallet(wallet_id)
            logger.info(f"Deleted external wallet: {wallet_id}")
            return result
        except Exception as e:
            logger.error(f"Failed to delete external wallet {wallet_id}: {e}")
            raise
    
    # ==================== TRANSACTIONS ====================
    
    @classmethod
    async def create_transaction(
        cls,
        source_vault_id: str,
        destination_address: str,
        asset_id: str,
        amount: str,
        note: str = "",
        fee_level: str = "MEDIUM"
    ) -> Dict[str, Any]:
        """Create a withdrawal transaction to a one-time address"""
        try:
            client = cls.get_client()
            
            tx = client.create_transaction(
                asset_id=asset_id,
                amount=amount,
                source=TransferPeerPath(VAULT_ACCOUNT, source_vault_id),
                destination=DestinationTransferPeerPath(ONE_TIME_ADDRESS, None, {"address": destination_address}),
                fee_level=fee_level,
                note=note
            )
            
            logger.info(f"Created transaction (one-time): {tx.get('id')}")
            return tx
        except Exception as e:
            logger.error(f"Failed to create transaction: {e}")
            raise
    
    @classmethod
    async def create_transaction_to_external_wallet(
        cls,
        source_vault_id: str,
        external_wallet_id: str,
        asset_id: str,
        amount: str,
        note: str = "",
        fee_level: str = "MEDIUM"
    ) -> Dict[str, Any]:
        """Create a withdrawal transaction to a whitelisted External Wallet"""
        try:
            client = cls.get_client()
            
            tx = client.create_transaction(
                asset_id=asset_id,
                amount=amount,
                source=TransferPeerPath(VAULT_ACCOUNT, source_vault_id),
                destination=DestinationTransferPeerPath(EXTERNAL_WALLET, external_wallet_id),
                fee_level=fee_level,
                note=note
            )
            
            logger.info(f"Created transaction to external wallet {external_wallet_id}: {tx.get('id')}")
            return tx
        except Exception as e:
            logger.error(f"Failed to create transaction to external wallet: {e}")
            raise
    
    @classmethod
    async def create_internal_transfer(
        cls,
        source_vault_id: str,
        destination_vault_id: str,
        asset_id: str,
        amount: str,
        note: str = ""
    ) -> Dict[str, Any]:
        """Create an internal transfer between KBEX vaults (no whitelist needed)"""
        try:
            client = cls.get_client()
            
            tx = client.create_transaction(
                asset_id=asset_id,
                amount=amount,
                source=TransferPeerPath(VAULT_ACCOUNT, source_vault_id),
                destination=DestinationTransferPeerPath(VAULT_ACCOUNT, destination_vault_id),
                note=note
            )
            
            logger.info(f"Created internal transfer {source_vault_id} -> {destination_vault_id}: {tx.get('id')}")
            return tx
        except Exception as e:
            logger.error(f"Failed to create internal transfer: {e}")
            raise
    
    # ==================== FEE ESTIMATION ====================
    
    @classmethod
    async def estimate_transaction_fee(
        cls,
        asset_id: str,
        amount: str,
        source_vault_id: str,
        destination_address: str = None
    ) -> Dict[str, Any]:
        """Estimate network fees for a transaction at LOW/MEDIUM/HIGH levels"""
        try:
            client = cls.get_client()
            
            source = TransferPeerPath(VAULT_ACCOUNT, source_vault_id)
            
            # Fireblocks requires a destination for estimation
            # Use a placeholder address if none provided
            if destination_address:
                destination = DestinationTransferPeerPath(
                    ONE_TIME_ADDRESS, None, {"address": destination_address}
                )
            else:
                destination = None
            
            estimation = client.estimate_fee_for_transaction(
                asset_id=asset_id,
                amount=amount,
                source=source,
                destination=destination,
            )
            
            logger.info(f"Fee estimation for {amount} {asset_id}: {estimation}")
            return estimation
        except Exception as e:
            logger.error(f"Failed to estimate fee for {asset_id}: {e}")
            raise
    
    @classmethod
    async def get_fee_for_asset(cls, asset_id: str) -> Dict[str, Any]:
        """Get current network fee for an asset"""
        try:
            client = cls.get_client()
            fee = client.get_fee_for_asset(asset_id)
            return fee
        except Exception as e:
            logger.error(f"Failed to get fee for {asset_id}: {e}")
            raise
    
    # ==================== GAS STATION ====================
    
    @classmethod
    async def get_gas_station_info(cls, asset_id: str = None) -> Dict[str, Any]:
        """Get Gas Station configuration and balances"""
        try:
            client = cls.get_client()
            info = client.get_gas_station_info(asset_id=asset_id)
            return info
        except Exception as e:
            logger.error(f"Failed to get gas station info: {e}")
            raise
    
    # ==================== EXISTING METHODS ====================
    
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

    @classmethod
    async def get_transactions(cls, vault_id: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get transactions for a vault account"""
        try:
            client = cls.get_client()
            
            transactions = client.get_transactions(
                limit=limit,
                order_by="createdAt",
                sort="DESC"
            )
            
            if vault_id and isinstance(transactions, list):
                filtered = []
                for tx in transactions:
                    source = tx.get("source", {})
                    dest = tx.get("destination", {})
                    if (source.get("id") == vault_id or dest.get("id") == vault_id):
                        filtered.append(tx)
                return filtered[:limit]
            
            return transactions if isinstance(transactions, list) else []
        except Exception as e:
            logger.error(f"Failed to get transactions: {e}")
            return []
    
    @classmethod
    async def get_transaction_by_id(cls, tx_id: str) -> Dict[str, Any]:
        """Get detailed transaction by ID"""
        try:
            client = cls.get_client()
            tx = client.get_transaction_by_id(tx_id)
            return tx
        except Exception as e:
            logger.error(f"Failed to get transaction {tx_id}: {e}")
            raise

    @classmethod
    async def create_vault_with_assets(
        cls, 
        name: str, 
        asset_ids: List[str] = None,
        hidden: bool = False
    ) -> Dict[str, Any]:
        """Create a vault account and initialize it with multiple asset wallets."""
        if asset_ids is None:
            asset_ids = ["BTC", "ETH", "USDT_ERC20", "USDC"]
        
        try:
            vault = await cls.create_vault_account(name=name, hidden=hidden)
            vault_id = vault.get('id')
            
            if not vault_id:
                raise ValueError("Failed to get vault ID after creation")
            
            logger.info(f"Created vault '{name}' with ID: {vault_id}")
            
            created_assets = []
            for asset_id in asset_ids:
                try:
                    asset = await cls.create_vault_asset(vault_id=vault_id, asset_id=asset_id)  # noqa: F841
                    address_info = await cls.get_deposit_address(vault_id=vault_id, asset_id=asset_id)
                    
                    created_assets.append({
                        "asset_id": asset_id,
                        "address": address_info.get('address', ''),
                        "tag": address_info.get('tag', ''),
                        "legacy_address": address_info.get('legacyAddress', '')
                    })
                    
                    logger.info(f"Created {asset_id} wallet in vault {vault_id}")
                except Exception as e:
                    logger.error(f"Failed to create {asset_id} in vault {vault_id}: {e}")
                    created_assets.append({
                        "asset_id": asset_id,
                        "error": str(e)
                    })
            
            return {
                "vault_id": vault_id,
                "vault_name": name,
                "assets": created_assets
            }
            
        except Exception as e:
            logger.error(f"Failed to create vault with assets: {e}")
            raise

    @classmethod
    async def get_deposit_address(cls, vault_id: str, asset_id: str) -> Dict[str, Any]:
        """Get deposit address for an asset in a vault"""
        try:
            client = cls.get_client()
            addresses = client.get_deposit_addresses(vault_account_id=vault_id, asset_id=asset_id)
            if addresses and len(addresses) > 0:
                return addresses[0]
            return {"address": "", "tag": ""}
        except Exception as e:
            logger.error(f"Failed to get deposit address for {asset_id} in vault {vault_id}: {e}")
            return {"address": "", "tag": ""}
