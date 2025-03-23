import os
import logging
import time
import json
import requests
from eth_account import Account
from eth_keys import keys
from web3 import Web3

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ------------------------------------------------------------------------------
# 1) Provide chain info (RPC + Safe Tx Service) for each chain_id you support
# ------------------------------------------------------------------------------
CHAIN_INFO = {
    1: {
        "rpc_url": "https://rpc.ankr.com/eth",
        "safe_tx_service_url": "https://safe-transaction-mainnet.safe.global"
    },
    5: {
        "rpc_url": "https://rpc.ankr.com/eth_goerli",
        "safe_tx_service_url": "https://safe-transaction-goerli.safe.global"
    },
    137: {
        "rpc_url": "https://rpc.ankr.com/polygon",
        "safe_tx_service_url": "https://safe-transaction-polygon.safe.global"
    },
    42161: {
        "rpc_url": "https://arb1.arbitrum.io/rpc",
        "safe_tx_service_url": "https://safe-transaction-arbitrum.safe.global"
    },
    # Add other chains as needed...
}


# ------------------------------------------------------------------------------
# 2) Minimal Gnosis Safe ABI needed for calling `execTransaction`
#    (You can replace this with the full ABI if you prefer.)
# ------------------------------------------------------------------------------
GNOSIS_SAFE_ABI = """
[
  {
    "constant": false,
    "inputs": [
      { "name": "to",             "type": "address" },
      { "name": "value",          "type": "uint256" },
      { "name": "data",           "type": "bytes" },
      { "name": "operation",      "type": "uint8" },
      { "name": "safeTxGas",      "type": "uint256" },
      { "name": "baseGas",        "type": "uint256" },
      { "name": "gasPrice",       "type": "uint256" },
      { "name": "gasToken",       "type": "address" },
      { "name": "refundReceiver", "type": "address" },
      { "name": "signatures",     "type": "bytes" }
    ],
    "name": "execTransaction",
    "outputs": [
      { "name": "success", "type": "bool" }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
"""


def execute_single_pending_safe_transaction(
    safe_address: str,
    owner_private_key: str,
    chain_id: int
) -> bool:
    """
    Executes the lowest-nonce pending transaction for a given Gnosis Safe,
    if possible. Only requires the Safe address, an owner's private key,
    and the chain ID (to look up RPC/Safe Tx Service).
    """
    print("EXECUTING SINGLE PENDING SAFE TRANSACTION")

    # ------------------------------------------------------------------------
    # A) Look up RPC and Safe Tx Service from chain_id
    # ------------------------------------------------------------------------
    chain_info = CHAIN_INFO.get(chain_id)
    if not chain_info:
        logger.error("Unsupported or unknown chain_id: %s", chain_id)
        return False

    rpc_url = chain_info["rpc_url"]
    safe_tx_service_url = chain_info["safe_tx_service_url"]

    # ------------------------------------------------------------------------
    # B) Instantiate web3 & check connection
    # ------------------------------------------------------------------------
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    if not web3.is_connected():
        logger.error("Failed to connect to chain_id=%d at RPC=%s", chain_id, rpc_url)
        return False

    # ------------------------------------------------------------------------
    # C) Get the Safe contract instance
    # ------------------------------------------------------------------------
    safe_contract = web3.eth.contract(
        address=Web3.to_checksum_address(safe_address),
        abi=json.loads(GNOSIS_SAFE_ABI)
    )

    # ------------------------------------------------------------------------
    # 1) Get current Safe nonce + threshold
    # ------------------------------------------------------------------------
    try:
        safe_info_url = f"{safe_tx_service_url}/api/v1/safes/{safe_address}/"
        resp = requests.get(safe_info_url)
        resp.raise_for_status()
        safe_info = resp.json()

        # Convert the nonce & threshold to integers so we can log/compare them properly
        current_nonce = int(safe_info.get("nonce", 0))
        threshold = int(safe_info.get("threshold", 0))

        logger.info("Safe current nonce=%d, threshold=%d", current_nonce, threshold)
    except Exception as e:
        logger.error("Failed retrieving Safe status: %s", e, exc_info=True)
        return False

    # ------------------------------------------------------------------------
    # 2) Get all pending transactions and pick the lowest-nonce for this Safe
    # ------------------------------------------------------------------------
    try:
        pending_url = (
            f"{safe_tx_service_url}/api/v1/safes/{safe_address}"
            "/multisig-transactions/?executed=false&ordering=nonce"
        )
        resp = requests.get(pending_url)
        resp.raise_for_status()
        pending_results = resp.json().get("results", [])
    except Exception as e:
        logger.error("Failed fetching pending transactions: %s", e, exc_info=True)
        return False

    if not pending_results:
        logger.info("No pending transactions found for Safe %s", safe_address)
        return False

    # Filter for the transaction matching the Safe's current nonce
    valid_pending = []
    for tx in pending_results:
        # Convert the transaction's "nonce" to int as well
        tx_nonce = int(tx.get("nonce", -1))
        if tx_nonce == current_nonce and not tx.get("executedAt"):
            valid_pending.append(tx)

    if not valid_pending:
        logger.info(
            "No pending tx at current nonce=%d. Possibly none or waiting for other confirmations.",
            current_nonce
        )
        return False

    # Pick the earliest created transaction at this nonce
    valid_pending.sort(key=lambda x: x.get("submissionDate", ""))
    tx_to_execute = valid_pending[0]

    safe_tx_hash = tx_to_execute.get("safeTxHash")
    if not safe_tx_hash:
        logger.error("Transaction missing safeTxHash.")
        return False
    if not safe_tx_hash.startswith("0x"):
        safe_tx_hash = "0x" + safe_tx_hash

    logger.info(
        "Attempting to confirm & execute Safe tx=%s (nonce=%d)",
        safe_tx_hash, current_nonce
    )

    # ------------------------------------------------------------------------
    # 3) Re-fetch transaction details to ensure it's still valid/pending
    # ------------------------------------------------------------------------
    tx_details_url = f"{safe_tx_service_url}/api/v1/multisig-transactions/{safe_tx_hash}/"
    try:
        resp_check = requests.get(tx_details_url)
        resp_check.raise_for_status()
        tx_details = resp_check.json()

        if tx_details.get("isExecuted"):
            logger.warning("Transaction %s is already executed. Skipping...", safe_tx_hash)
            return False

        # Double-check the nonce from tx_details
        tx_details_nonce = int(tx_details.get("nonce", -1))
        if tx_details_nonce != current_nonce:
            logger.warning(
                "Tx nonce mismatch. Safe nonce=%d, tx nonce=%d",
                current_nonce, tx_details_nonce
            )
            return False
    except Exception as e:
        logger.error("Failed to fetch tx details for %s: %s", safe_tx_hash, e, exc_info=True)
        return False

    # ------------------------------------------------------------------------
    # 4) Check if current owner has already signed. If not, sign & POST
    # ------------------------------------------------------------------------
    confirmations = tx_details.get("confirmations", [])
    from_addr = Account.from_key(owner_private_key).address.lower()
    already_signed = any(c.get("owner", "").lower() == from_addr for c in confirmations)
    if already_signed:
        logger.info("This owner (%s) already signed safeTxHash %s", from_addr, safe_tx_hash)
    else:
        logger.info("No existing signature from %s. Posting confirmation...", from_addr)

        # Sign the safeTxHash in Python (raw ECDSA over 32-byte hash)
        safe_tx_hash_bytes = bytes.fromhex(safe_tx_hash[2:])
        pk_stripped = owner_private_key[2:] if owner_private_key.startswith("0x") else owner_private_key
        pk_bytes = bytes.fromhex(pk_stripped)

        try:
            eth_private_key = keys.PrivateKey(pk_bytes)
            signature_rs = eth_private_key.sign_msg_hash(safe_tx_hash_bytes)
        except Exception as e:
            logger.error("Failed to sign hash: %s", e, exc_info=True)
            return False

        r, s, v = signature_rs.r, signature_rs.s, signature_rs.v
        if v < 27:
            v += 27

        r_bytes = r.to_bytes(32, byteorder="big")
        s_bytes = s.to_bytes(32, byteorder="big")
        v_bytes = bytes([v])
        signature_hex = "0x" + (r_bytes + s_bytes + v_bytes).hex()

        # POST the signature to /confirmations/ endpoint
        safe_tx_hash_no0x = safe_tx_hash[2:]  # remove leading 0x
        confirm_url = f"{safe_tx_service_url}/api/v1/multisig-transactions/{safe_tx_hash_no0x}/confirmations/"
        payload = {"signature": signature_hex}
        try:
            resp_confirm = requests.post(
                confirm_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            if resp_confirm.status_code not in (200, 201):
                logger.error(
                    "Confirmation POST failed (status %d). Body=%s",
                    resp_confirm.status_code, resp_confirm.text
                )
                return False
            logger.info("Submitted signature. POST => %s : %s", resp_confirm.status_code, resp_confirm.text)
        except Exception as e:
            logger.error("Error POSTing confirmation to Safe Tx Service: %s", e, exc_info=True)
            return False

    # ------------------------------------------------------------------------
    # 5) Wait for threshold confirmations
    # ------------------------------------------------------------------------
    logger.info("Waiting for threshold=%d confirmations...", threshold)
    for attempt in range(10):
        time.sleep(1)
        try:
            refetch = requests.get(tx_details_url)
            refetch.raise_for_status()
            updated_details = refetch.json()
            confs_now = updated_details.get("confirmations", [])
            if len(confs_now) >= threshold:
                logger.info("We have enough confirmations now (%d).", len(confs_now))
                confirmations = confs_now
                break
            else:
                logger.info(
                    "Attempt %d => found %d/%d confirmations. Retrying...",
                    attempt + 1, len(confs_now), threshold
                )
        except Exception as e:
            logger.warning("Failed to refetch tx details (attempt %d): %s", attempt + 1, e)
    else:
        logger.warning(
            "Transaction %s never reached threshold after waiting. Aborting.",
            safe_tx_hash
        )
        return False

    # ------------------------------------------------------------------------
    # 6) Execute via web3 once threshold is reached
    # ------------------------------------------------------------------------
    logger.info("Threshold reached. Executing transaction on-chain.")
    try:
        to = tx_details.get("to")
        value = int(tx_details.get("value", 0))
        data_hex = tx_details.get("data") or "0x"
        operation = int(tx_details.get("operation", 0))
        safe_tx_gas = int(tx_details.get("safeTxGas", 0))
        base_gas = int(tx_details.get("baseGas", 0))
        gas_price = int(tx_details.get("gasPrice", 0))
        gas_token = tx_details.get("gasToken") or "0x0000000000000000000000000000000000000000"
        refund_receiver = tx_details.get("refundReceiver") or "0x0000000000000000000000000000000000000000"

        # Combine all EOA signatures from confirmations
        confirmations_sorted = sorted(confirmations, key=lambda c: int(c["owner"], 16))
        combined_signatures = b""
        for c in confirmations_sorted:
            sig_hex = c.get("signature")
            # skip invalid or non-EOA confirmations
            if not sig_hex or c.get("signatureType") not in (None, "EOA"):
                continue
            combined_signatures += bytes.fromhex(sig_hex[2:])

        if not combined_signatures:
            logger.error("No valid EOA signatures found to execute transaction.")
            return False

        from_addr = Account.from_key(owner_private_key).address

        tx = safe_contract.functions.execTransaction(
            to,
            value,
            data_hex,
            operation,
            safe_tx_gas,
            base_gas,
            gas_price,
            gas_token,
            refund_receiver,
            combined_signatures
        ).build_transaction({
            "from": from_addr,
            "nonce": web3.eth.get_transaction_count(from_addr),
        })

        # Estimate gas if possible
        try:
            gas_estimate = web3.eth.estimate_gas(tx)
        except Exception as ex:
            logger.warning("estimate_gas failed, fallback to safeTxGas + baseGas + buffer. Error=%s", ex)
            gas_estimate = safe_tx_gas + base_gas + 100000

        tx["gas"] = int(gas_estimate * 1.2)  # +20% buffer

        # If no EIP-1559 fields are set, just use legacy gasPrice
        if "gasPrice" not in tx and "maxFeePerGas" not in tx:
            tx["gasPrice"] = web3.eth.gas_price

        # Sign & broadcast
        signed_tx = web3.eth.account.sign_transaction(tx, owner_private_key)
        send_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        logger.info("execTransaction broadcast. TX hash: %s", send_hash.hex())
    except Exception as e:
        logger.error("Failed sending execTransaction on-chain: %s", e, exc_info=True)
        return False

    # ------------------------------------------------------------------------
    # 7) Wait for receipt
    # ------------------------------------------------------------------------
    try:
        receipt = web3.eth.wait_for_transaction_receipt(send_hash, timeout=120)
    except Exception as e:
        logger.error("No receipt within 120s for tx %s: %s", send_hash.hex(), e, exc_info=True)
        return False

    if receipt.status != 1:
        logger.error("Transaction %s reverted. Receipt=%s", send_hash.hex(), receipt)
        return False

    logger.info("Transaction %s succeeded. 🎉", send_hash.hex())
    return True
