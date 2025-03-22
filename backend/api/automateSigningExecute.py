import requests
from web3 import Web3
from eth_account import Account

def execute_pending_safe_transactions(
    safe_address: str,
    private_key: str,
    chain_id: int,
) -> list:
    """
    Fetch, sign, and execute all *pending* Gnosis Safe transactions for the given Safe.

    :param safe_address: The Gnosis Safe (multisig) contract address.
    :param private_key:  A private key belonging to one of the Safe's owners.
    :param chain_id:     Chain ID (1=mainnet, 5=goerli, 137=polygon, etc.).
    :return: A list of transaction hashes (strings) for successful on-chain executions.
    """

    # Dictionary for chainId -> Safe Transaction Service base URL and RPC URL
    chain_config = {
        1: {
            "api": "https://safe-transaction-mainnet.safe.global",
            "rpc": "https://rpc.mevblocker.io"
        },
        5: {
            "api": "https://safe-transaction-goerli.safe.global",
            "rpc": "https://rpc.ankr.com/eth_goerli"
        },
        137: {
            "api": "https://safe-transaction-polygon.safe.global",
            "rpc": "https://rpc.ankr.com/polygon"
        },
        42161: {
            "api": "https://safe-transaction-arbitrum.safe.global",
            "rpc": "https://arbitrum.drpc.org"
        }
    }

    # Convert chain_id to int and add debug logging
    try:
        chain_id = int(chain_id)
        print(f"Chain ID (type: {type(chain_id)}): {chain_id}")
        print(f"Available chain IDs: {list(chain_config.keys())}")
    except ValueError:
        raise ValueError(f"Chain ID must be a valid integer, got: {chain_id}")

    if chain_id not in chain_config:
        raise ValueError(f"Chain ID {chain_id} not supported by this script. Supported chains: {list(chain_config.keys())}")

    base_url = chain_config[chain_id]["api"]
    rpc_url = chain_config[chain_id]["rpc"]

    # 1) Fetch pending transactions from the Safe Transaction Service
    safe_address = Web3.to_checksum_address(safe_address)
    pending_url = f"{base_url}/api/v1/safes/{safe_address}/multisig-transactions/?executed=false"
    print(f"[execute_pending_safe_transactions] Fetching pending txs: {pending_url}")

    resp = requests.get(pending_url)
    if resp.status_code != 200:
        raise RuntimeError(f"Error fetching pending txs: {resp.status_code} - {resp.text}")
    tx_data = resp.json()
    pending_txs = tx_data.get("results", [])
    if not pending_txs:
        print("No pending transactions found for this Safe.")
        return []

    # Sort by nonce ascending
    pending_txs.sort(key=lambda t: t["nonce"])
    print(f"Found {len(pending_txs)} pending tx(s). Nonces: {[t['nonce'] for t in pending_txs]}")

    # 2) Connect to network (web3) - simplified with default RPC
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    if not web3.is_connected():
        raise ConnectionError(f"Failed to connect to the Ethereum network")

    # 3) Verify privateKey is an owner of the Safe
    try:
        signer = Account.from_key(private_key)
    except Exception as e:
        raise ValueError(f"Invalid private_key provided: {e}")

    signer_address = signer.address.lower()
    print(f"Signer (Safe Owner) Address: {signer_address}")

    # Minimal ABI: getOwners() + nonce()
    safe_abi = [
        {
            "constant": True,
            "inputs": [],
            "name": "getOwners",
            "outputs": [{"name": "", "type": "address[]"}],
            "stateMutability": "view",
            "type": "function",
        },
        {
            "constant": True,
            "inputs": [],
            "name": "nonce",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function",
        },
    ]
    safe_contract = web3.eth.contract(address=safe_address, abi=safe_abi)
    owners = [o.lower() for o in safe_contract.functions.getOwners().call()]
    if signer_address not in owners:
        raise PermissionError(f"Provided private key is NOT an owner of the Safe {safe_address}.")

    safe_current_nonce = safe_contract.functions.nonce().call()
    print(f"Safe's current on-chain nonce: {safe_current_nonce}")

    # 4) We'll need the execTransaction() ABI to call it
    safe_exec_abi = [{
        "constant": False,
        "inputs": [
            {"name": "to",           "type": "address"},
            {"name": "value",        "type": "uint256"},
            {"name": "data",         "type": "bytes"},
            {"name": "operation",    "type": "uint8"},
            {"name": "safeTxGas",    "type": "uint256"},
            {"name": "baseGas",      "type": "uint256"},
            {"name": "gasPrice",     "type": "uint256"},
            {"name": "gasToken",     "type": "address"},
            {"name": "refundReceiver","type": "address"},
            {"name": "signatures",   "type": "bytes"}
        ],
        "name": "execTransaction",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "payable",
        "type": "function"
    }]
    safe_contract_exec = web3.eth.contract(address=safe_address, abi=safe_exec_abi)

    executed_tx_hashes = []  # store on-chain tx hashes we successfully execute

    # 5) Iterate over pending_txs in ascending nonce order
    for tx in pending_txs:
        nonce = tx["nonce"]

        # If safe_current_nonce is bigger, means the transaction is stale or already executed
        if nonce < safe_current_nonce:
            print(f"Skipping stale transaction nonce {nonce}; on-chain nonce is {safe_current_nonce}")
            continue

        # If there's a gap, we can't skip forward
        if nonce > safe_current_nonce:
            print(f"Nonce gap: safe is at {safe_current_nonce}, but next pending is {nonce}. Stopping here.")
            break

        print(f"\nPreparing to execute tx nonce {nonce} ...")
        to       = tx["to"]
        value    = int(tx["value"]) if tx["value"] else 0
        data     = tx["data"] if tx["data"] else "0x"
        operation= tx.get("operation", 0)
        safeTxGas= int(tx.get("safeTxGas", 0))
        baseGas  = int(tx.get("baseGas", 0))
        gasPrice = int(tx.get("gasPrice", 0))
        gasToken = tx.get("gasToken", "0x0000000000000000000000000000000000000000")
        refundReceiver = tx.get("refundReceiver", "0x0000000000000000000000000000000000000000")
        safe_tx_hash   = tx.get("safeTxHash")

        # Gather existing confirmations (if any)
        confirmations = tx.get("confirmations", [])
        sigs = []
        for conf in confirmations:
            owner_addr = conf.get("owner", "").lower()
            sig_hex    = conf.get("signature", None)
            if owner_addr and sig_hex:
                sigs.append((owner_addr, bytes.fromhex(sig_hex[2:])))

        # If our signer not in confirmations, sign
        if not any(s[0] == signer_address for s in sigs):
            if not safe_tx_hash or safe_tx_hash == "0x":
                print(f"  Missing safeTxHash; cannot sign. Skipping.")
                continue
            # Sign the safeTxHash
            signed_obj = signer.signHash(bytes.fromhex(safe_tx_hash[2:]))
            v = signed_obj.v
            # If v in {27,28}, convert to {0,1}
            if v >= 27:
                v -= 27
            sig_bytes = signed_obj.r.to_bytes(32, 'big') + signed_obj.s.to_bytes(32, 'big') + v.to_bytes(1, 'big')
            sigs.append((signer_address, sig_bytes))
            print(f"  Added signature for {signer_address}")

        # Gnosis Safe requires signatures sorted by signer address ascending
        sigs.sort(key=lambda x: x[0])
        signatures_concatenated = b"".join([sig for (_, sig) in sigs])

        # Build execTransaction call
        print(f"  -> to={to}, value={value}, dataLen={len(data)-2}, operation={operation}, safeTxGas={safeTxGas}")
        txn = safe_contract_exec.functions.execTransaction(
            to,
            value,
            data,
            operation,
            safeTxGas,
            baseGas,
            gasPrice,
            gasToken,
            refundReceiver,
            signatures_concatenated
        ).build_transaction({
            "from": signer.address,
            # For real usage, consider dynamic gas estimates:
            # 'gas': web3.eth.estimate_gas({...}) + some_buffer
            "gas": 300000,  # placeholder
            "nonce": web3.eth.get_transaction_count(signer.address),
        })

        # Optionally set gas price or EIP-1559. For simplicity, we'll just rely on the default or the block base fee.

        # Sign and send
        try:
            signed_txn = web3.eth.account.sign_transaction(txn, private_key=private_key)
            tx_hash = web3.eth.send_raw_transaction(signed_txn.raw_transaction)
            receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)  # wait until mined

            if receipt.status == 1:
                print(f"  SUCCESS! Safe tx nonce {nonce} executed on-chain.")
                print(f"  Hash: {tx_hash.hex()}")
                executed_tx_hashes.append(tx_hash.hex())
                safe_current_nonce += 1
            else:
                print(f"  On-chain execution reverted (receipt status=0). Skipping remaining txs.")
                break
        except Exception as e:
            print(f"  Execution failed for nonce {nonce}. Error: {e}")
            break

    # Done
    print(f"\nFinished. Executed on-chain txs: {executed_tx_hashes}")
    return executed_tx_hashes
