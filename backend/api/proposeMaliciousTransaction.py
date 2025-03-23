import sys
import requests
from web3 import Web3
from eth_account import Account
from eth_keys import keys
from eth_utils import to_bytes

# Minimal endpoints for two chains (add more if needed)
SAFE_TX_SERVICE = {
    1: {
        "serviceUrl": "https://safe-transaction-mainnet.safe.global",
        "rpcUrl": "https://rpc.mevblocker.io"
    },
    42161: {
        "serviceUrl": "https://safe-transaction-arbitrum.safe.global",
        "rpcUrl": "https://arb1.arbitrum.io/rpc"
    },
}

# Minimal Safe ABI for getTransactionHash(...)
GNOSIS_SAFE_ABI = """
[
  {
    "constant": true,
    "inputs": [
      {"name":"to","type":"address"},
      {"name":"value","type":"uint256"},
      {"name":"data","type":"bytes"},
      {"name":"operation","type":"uint8"},
      {"name":"safeTxGas","type":"uint256"},
      {"name":"baseGas","type":"uint256"},
      {"name":"gasPrice","type":"uint256"},
      {"name":"gasToken","type":"address"},
      {"name":"refundReceiver","type":"address"},
      {"name":"_nonce","type":"uint256"}
    ],
    "name": "getTransactionHash",
    "outputs":[{"name":"","type":"bytes32"}],
    "payable": false,
    "stateMutability": "view",
    "type":"function"
  }
]
"""

def propose_malicious_tx(
    chainId: int,
    safeAddress: str,
    privateKey: str,
    delegatecallDestination: str
) -> dict:
    """
    Propose a delegatecall (operation=1) transaction with zero value, no data,
    to a specified destination from the given Safe.

    Returns a dict with either the API response or an error field.
    NOTE: The official Safe Tx Service typically *blocks* operation=1.
    """

    if chainId not in SAFE_TX_SERVICE:
        return {"error": f"Unsupported chainId={chainId} in SAFE_TX_SERVICE mapping."}

    # 1) Identify the Safe Tx Service & RPC URL for this chain
    serviceUrl = SAFE_TX_SERVICE[chainId]["serviceUrl"]
    rpcUrl     = SAFE_TX_SERVICE[chainId]["rpcUrl"]

    # 2) Fetch the Safe's current nonce
    w3 = Web3(Web3.HTTPProvider(rpcUrl))
    safeAddress = w3.to_checksum_address(safeAddress)
    getSafeUrl = f"{serviceUrl}/api/v1/safes/{safeAddress}/"
    try:
        resp = requests.get(getSafeUrl, timeout=10)
        resp.raise_for_status()
        _nonce = resp.json().get("nonce")
        if _nonce is None:
            return {"error": "Safe info missing 'nonce' field."}
        # *** Cast to int to avoid the 'ABI not found' error ***
        currentNonce = int(_nonce)
    except Exception as err:
        return {"error": f"Failed to fetch Safe nonce: {err}"}

    # 3) Create the contract instance
    account = Account.from_key(privateKey)
    safe_contract = w3.eth.contract(address=safeAddress, abi=GNOSIS_SAFE_ABI)

    # 4) Prepare arguments for getTransactionHash(...)
    to            = w3.to_checksum_address(delegatecallDestination)
    valueStr      = "0"
    dataHex       = "0x"    # no data
    operation     = 0       # delegatecall
    safeTxGasStr  = "0"
    baseGasStr    = "0"
    gasPriceStr   = "0"
    gasToken      = "0x0000000000000000000000000000000000000000"
    refundReceiver= "0x0000000000000000000000000000000000000000"

    # 5) Compute transaction hash via getTransactionHash
    try:
        safeTxHash = safe_contract.functions.getTransactionHash(
            to,
            int(valueStr),
            dataHex,
            operation,
            int(safeTxGasStr),
            int(baseGasStr),
            int(gasPriceStr),
            gasToken,
            refundReceiver,
            currentNonce  # Make sure it's an int
        ).call()
    except Exception as e:
        return {"error": f"Error calling getTransactionHash: {e}"}

    # 6) Sign the safeTxHash using eth_keys for direct signing
    # Convert private key to bytes and create signing key
    pk_bytes = to_bytes(hexstr=privateKey)
    pk = keys.PrivateKey(pk_bytes)

    # Convert safeTxHash to bytes and sign
    message_hash = bytes.fromhex(safeTxHash.hex()[2:])  # Remove '0x' prefix
    signature = pk.sign_msg_hash(message_hash)

    # Format signature
    v = signature.v
    if v >= 27:
        v -= 27

    # Concatenate r, s, v into signature bytes and convert to hex
    sig_bytes = (
        signature.r.to_bytes(32, 'big') +
        signature.s.to_bytes(32, 'big') +
        v.to_bytes(1, 'big')
    )
    signatureHex = '0x' + sig_bytes.hex()

    # 7) Build the payload for the Safe Tx Service
    payload = {
        "to": to,
        "value": valueStr,
        "data": None,           # or dataHex if you want
        "operation": operation,
        "gasToken": gasToken,
        "safeTxGas": safeTxGasStr,
        "baseGas": baseGasStr,
        "gasPrice": gasPriceStr,
        "refundReceiver": refundReceiver,
        "nonce": currentNonce,
        "contractTransactionHash": safeTxHash.hex(),
        "sender": account.address,
        "signature": signatureHex
    }

    # 8) Post to /v2/safes/{safeAddress}/multisig-transactions/
    postUrl = f"{serviceUrl}/api/v2/safes/{safeAddress}/multisig-transactions/"
    try:
        resp2 = requests.post(postUrl, json=payload, timeout=10)
        if resp2.status_code not in (200, 201):
            return {
                "error": f"Tx Service responded with {resp2.status_code}",
                "details": resp2.text
            }
        dataResp = resp2.json()
        return {
            "result": "success",
            "safeTxHash": dataResp.get("safeTxHash"),
            "trusted": dataResp.get("trusted"),
            "nonce": dataResp.get("nonce"),
            "transactionId": dataResp.get("id")
        }
    except Exception as e:
        return {"error": f"Posting to Safe Tx Service failed: {e}"}
