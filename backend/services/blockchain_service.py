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


# ============================================================
# Cold Wallet Transaction Support (UTXOs, ETH params, Broadcast)
# ============================================================

TIMEOUT = httpx.Timeout(15.0)


async def get_btc_utxos(address: str) -> list:
    """Fetch UTXOs for a BTC address from Blockstream API."""
    url = f"{BLOCKSTREAM_API}/address/{address}/utxo"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        utxos = resp.json()
        return [{
            "txid": u["txid"],
            "vout": u["vout"],
            "value": u["value"],
            "confirmed": u.get("status", {}).get("confirmed", False),
        } for u in utxos]


async def get_btc_raw_tx(txid: str) -> str:
    """Get raw hex of a BTC transaction (needed for Trezor sign inputs)."""
    url = f"{BLOCKSTREAM_API}/tx/{txid}/hex"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


async def get_btc_fee_estimate() -> dict:
    """Get BTC fee estimates (sat/vB) from Blockstream."""
    url = f"{BLOCKSTREAM_API}/fee-estimates"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        return {
            "fast": int(float(data.get("1", data.get("2", 20)))),
            "medium": int(float(data.get("6", 10))),
            "slow": int(float(data.get("144", 1))),
        }


async def broadcast_btc_tx(hex_tx: str) -> str:
    """Broadcast a signed BTC transaction via Blockstream."""
    url = f"{BLOCKSTREAM_API}/tx"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, content=hex_tx, headers={"Content-Type": "text/plain"})
        resp.raise_for_status()
        return resp.text


# --- LTC (Blockcypher API) ---

async def get_ltc_utxos(address: str) -> list:
    """Fetch UTXOs for a LTC address from Blockcypher."""
    url = f"https://api.blockcypher.com/v1/ltc/main/addrs/{address}?unspentOnly=true"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        txrefs = data.get("txrefs", []) + data.get("unconfirmed_txrefs", [])
        return [{
            "txid": u["tx_hash"],
            "vout": u["tx_output_n"],
            "value": u["value"],
            "confirmed": u.get("confirmations", 0) > 0,
        } for u in txrefs]


async def get_ltc_fee_estimate() -> dict:
    return {"fast": 10, "medium": 5, "slow": 1}


async def broadcast_ltc_tx(hex_tx: str) -> str:
    """Broadcast a signed LTC transaction via Blockcypher."""
    url = "https://api.blockcypher.com/v1/ltc/main/txs/push"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, json={"tx": hex_tx})
        resp.raise_for_status()
        data = resp.json()
        return data.get("tx", {}).get("hash", "unknown")


# --- ETH (Public RPC with fallback) ---

ETH_RPC_URLS = [
    "https://ethereum-rpc.publicnode.com",
    "https://rpc.ankr.com/eth",
    "https://eth.llamarpc.com",
]


async def _eth_rpc(method: str, params: list):
    last_error = None
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for rpc_url in ETH_RPC_URLS:
            try:
                resp = await client.post(rpc_url, json={
                    "jsonrpc": "2.0", "id": 1, "method": method, "params": params,
                })
                resp.raise_for_status()
                data = resp.json()
                if "error" in data:
                    last_error = Exception(data["error"].get("message", "RPC error"))
                    continue
                return data.get("result")
            except Exception as e:
                last_error = e
                continue
    raise last_error or Exception("All ETH RPC endpoints failed")


async def get_eth_params(address: str) -> dict:
    """Get ETH nonce, gas price, and balance."""
    nonce_hex = await _eth_rpc("eth_getTransactionCount", [address, "latest"])
    gas_price_hex = await _eth_rpc("eth_gasPrice", [])
    balance_hex = await _eth_rpc("eth_getBalance", [address, "latest"])

    nonce = int(nonce_hex, 16)
    gas_price = int(gas_price_hex, 16)
    balance = int(balance_hex, 16)

    return {
        "nonce": nonce,
        "gas_price": gas_price,
        "gas_price_gwei": round(gas_price / 1e9, 2),
        "balance_wei": str(balance),
        "balance_eth": round(balance / 1e18, 8),
    }


async def broadcast_eth_tx(hex_tx: str) -> str:
    """Broadcast a signed ETH transaction via public RPC."""
    if not hex_tx.startswith("0x"):
        hex_tx = "0x" + hex_tx
    return await _eth_rpc("eth_sendRawTransaction", [hex_tx])


# --- Dispatcher ---

async def get_utxos(coin: str, address: str) -> list:
    if coin == "BTC":
        return await get_btc_utxos(address)
    elif coin == "LTC":
        return await get_ltc_utxos(address)
    raise ValueError(f"UTXO not applicable for {coin}")


async def get_fee_estimates(coin: str) -> dict:
    if coin == "BTC":
        return await get_btc_fee_estimate()
    elif coin == "LTC":
        return await get_ltc_fee_estimate()
    elif coin == "ETH":
        params = await get_eth_params("0x0000000000000000000000000000000000000000")
        return {"gas_price_gwei": params["gas_price_gwei"]}
    raise ValueError(f"Unsupported coin: {coin}")


async def broadcast_transaction(coin: str, hex_tx: str) -> str:
    if coin == "BTC":
        return await broadcast_btc_tx(hex_tx)
    elif coin == "LTC":
        return await broadcast_ltc_tx(hex_tx)
    elif coin == "ETH":
        return await broadcast_eth_tx(hex_tx)
    raise ValueError(f"Unsupported coin: {coin}")
