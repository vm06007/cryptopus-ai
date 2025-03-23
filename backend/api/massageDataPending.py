import requests

ARBITRUM_BASE_URL = "https://safe-transaction-arbitrum.safe.global"
ARBISCAN_API_URL = "https://api.arbiscan.io/api"
ARBISCAN_API_KEY = "94BKUPMJB6ZR2URMC7R3Y9C6RQZQE6GMK6"

ETHEREUM_BASE_URL = "https://safe-transaction-mainnet.safe.global"
ETHERSCAN_API_URL = "https://api.etherscan.io/api"
ETHERSCAN_API_KEY = "CDQ9VHPH144C62B5KQF9V6189EAX3GJ8YQ"

def get_lowest_pending_tx_info(safe_address: str, chainId: str) -> dict | None:
    """
    Fetch the current Safe nonce and pending transactions from either Arbitrum or Ethereum
    Safe Transaction Service for the given safe_address, and return the
    transaction with the lowest valid nonce (>= current nonce).

    Additionally, call the respective scanner (Arbiscan/Etherscan) to see if the
    destination contract is verified, adding 'codeVerified' = True/False
    to the returned transaction dictionary.
    """

    # 0. Decide which base URLs and API keys to use
    if chainId == "1":
        safe_base_url = ETHEREUM_BASE_URL
        explorer_api_url = ETHERSCAN_API_URL
        explorer_api_key = ETHERSCAN_API_KEY
    elif chainId == "42161":
        safe_base_url = ARBITRUM_BASE_URL
        explorer_api_url = ARBISCAN_API_URL
        explorer_api_key = ARBISCAN_API_KEY

    # 1. Fetch the Safe's current on-chain nonce
    safe_info_url = f"{safe_base_url}/api/v1/safes/{safe_address}/"
    try:
        resp_safe = requests.get(safe_info_url)
        resp_safe.raise_for_status()
        safe_info = resp_safe.json()
        current_nonce = safe_info.get("nonce")
        if current_nonce is None:
            raise ValueError("No 'nonce' field in safe info")
        if not isinstance(current_nonce, int):
            # The service might return a string, so ensure we cast if needed
            current_nonce = int(current_nonce)
    except (requests.RequestException, ValueError) as err:
        print(f"Error fetching safe info from {safe_info_url}: {err}")
        return None

    # 2. Fetch pending transactions
    pending_url = f"{safe_base_url}/api/v1/safes/{safe_address}/multisig-transactions/?executed=false"
    try:
        resp_pending = requests.get(pending_url)
        resp_pending.raise_for_status()
        pending_data = resp_pending.json()
    except requests.RequestException as err:
        print(f"Error fetching pending transactions from {pending_url}: {err}")
        return None

    # The safe transaction service typically returns a dict with "results"
    all_txs = pending_data.get("results", [])
    if not all_txs:
        print("No pending transactions found in the results array.")
        return None

    # 3. Filter out transactions with nonce < current_nonce or already executed
    valid_txs = []
    for tx in all_txs:
        tx_nonce = tx.get("nonce")
        if not isinstance(tx_nonce, int):
            try:
                tx_nonce = int(tx_nonce)
            except (TypeError, ValueError):
                continue
        if tx_nonce < current_nonce:
            continue
        # If it has an executionDate (not None), it's likely executed; skip
        if tx.get("executionDate") not in (None, ""):
            continue
        valid_txs.append(tx)

    if not valid_txs:
        print(f"No pending transactions have nonce >= {current_nonce}.")
        return None

    # 4. Sort by nonce ascending, pick the first (lowest nonce)
    valid_txs.sort(key=lambda t: t.get("nonce", 999999999))
    chosen_tx = valid_txs[0]

    # 5. Check the contract code on Etherscan/Arbiscan (if there's a 'to' address)
    to_address = chosen_tx.get("to")
    chosen_tx["codeVerified"] = False  # default
    if to_address:
        # Call the 'getsourcecode' endpoint
        params = {
            "module": "contract",
            "action": "getsourcecode",
            "address": to_address,
            "apikey": explorer_api_key
        }
        try:
            explorer_resp = requests.get(explorer_api_url, params=params, timeout=10)
            explorer_resp.raise_for_status()
            data = explorer_resp.json()
            # If 'status' == '1', code is verified (for addresses that are contracts)
            if data.get("status") == "1":
                # The result is typically a list with contract info
                result_list = data.get("result", [])
                # If result_list is non-empty, it might have "SourceCode": ...
                if isinstance(result_list, list) and len(result_list) > 0:
                    # Check if 'SourceCode' is empty or not
                    source_code = result_list[0].get("SourceCode", "")
                    if source_code.strip():
                        chosen_tx["codeVerified"] = True
                    else:
                        chosen_tx["codeVerified"] = False
                else:
                    chosen_tx["codeVerified"] = False
            else:
                # 'status' = '0' => unverified or no contract
                chosen_tx["codeVerified"] = False
        except requests.RequestException as err:
            print(f"Warning: Explorer API request failed: {err}")
            chosen_tx["codeVerified"] = False

    # Return the entire transaction dict, now with 'codeVerified'
    return chosen_tx

