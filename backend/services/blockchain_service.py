"""
Blockchain Service - On-chain verification utilities
Supports BTC balance lookups via Blockstream API and message signature verification.
"""
import httpx
import hashlib
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

BLOCKSTREAM_API = "https://blockstream.info/api"


async def get_btc_address_balance(address: str) -> Dict[str, Any]:
    """
    Get BTC balance for an address via Blockstream API.
    Returns balance in BTC and satoshis.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{BLOCKSTREAM_API}/address/{address}/utxo")
            if resp.status_code != 200:
                logger.error(f"Blockstream API error {resp.status_code} for {address}")
                return {"error": f"API returned {resp.status_code}", "balance_sat": 0, "balance_btc": 0.0}

            utxos = resp.json()
            confirmed_sat = sum(u.get("value", 0) for u in utxos if u.get("status", {}).get("confirmed", False))
            unconfirmed_sat = sum(u.get("value", 0) for u in utxos if not u.get("status", {}).get("confirmed", False))
            total_sat = confirmed_sat + unconfirmed_sat

            return {
                "address": address,
                "balance_sat": total_sat,
                "balance_btc": total_sat / 100_000_000,
                "confirmed_sat": confirmed_sat,
                "confirmed_btc": confirmed_sat / 100_000_000,
                "unconfirmed_sat": unconfirmed_sat,
                "utxo_count": len(utxos),
            }
    except httpx.TimeoutException:
        logger.error(f"Blockstream API timeout for {address}")
        return {"error": "Timeout", "balance_sat": 0, "balance_btc": 0.0}
    except Exception as e:
        logger.error(f"Blockstream API error: {e}")
        return {"error": str(e), "balance_sat": 0, "balance_btc": 0.0}


async def check_btc_transaction_received(address: str, expected_amount_btc: float, tolerance: float = 0.000001) -> Dict[str, Any]:
    """
    Check if a specific BTC amount was received at an address.
    Used for Satoshi Test verification.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{BLOCKSTREAM_API}/address/{address}/txs")
            if resp.status_code != 200:
                return {"received": False, "error": f"API returned {resp.status_code}"}

            txs = resp.json()
            expected_sat = int(expected_amount_btc * 100_000_000)

            for tx in txs:
                for vout in tx.get("vout", []):
                    if vout.get("scriptpubkey_address") == address:
                        value = vout.get("value", 0)
                        if abs(value - expected_sat) <= int(tolerance * 100_000_000):
                            return {
                                "received": True,
                                "txid": tx.get("txid"),
                                "amount_sat": value,
                                "amount_btc": value / 100_000_000,
                                "confirmed": tx.get("status", {}).get("confirmed", False),
                                "block_height": tx.get("status", {}).get("block_height"),
                            }

            return {"received": False, "checked_txs": len(txs)}
    except Exception as e:
        logger.error(f"Error checking BTC transaction: {e}")
        return {"received": False, "error": str(e)}


def generate_ownership_message(deal_number: str, wallet_address: str, nonce: str) -> str:
    """
    Generate a deterministic challenge message for Proof of Ownership.
    The client must sign this exact message with their wallet.
    """
    return f"KBEX Proof of Ownership\nDeal: {deal_number}\nWallet: {wallet_address}\nNonce: {nonce}"
