import subprocess
import json
import os

# Update with the path to your Node.js script
# e.g. "./secretVaultScript.js" if it's in the same directory
NODE_JS_SCRIPT_PATH = "./privateKeyManager.js"

def py_store_private_key(address: str) -> None:
    """
    Calls the `storePrivateKeyForUser` JavaScript function to store a private key
    for the given address in the Nillion SecretVault.
    """
    # We'll call Node with:
    #   node -e "import('./secretVaultScript.js').then(m => m.storePrivateKeyForUser('0xABCD'));"
    # Or similarly. We'll do so with the subprocess.run approach:
    cmd = [
        "node",
        "-e",
        f"import('{os.path.abspath(NODE_JS_SCRIPT_PATH)}')"
        f".then(mod => mod.storePrivateKeyForUser('{address}'))"
        f".catch(err => console.error(err))"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("Error storing private key. Stderr:", result.stderr)
    else:
        # Print or parse stdout if needed
        print("Output:", result.stdout)

def py_retrieve_private_key(address: str) -> str:
    """
    Calls the `getPrivateKeyForUser` JavaScript function and returns the decrypted private key
    for the given address (if stored).
    """
    cmd = [
        "node",
        "-e",
        f"import('{os.path.abspath(NODE_JS_SCRIPT_PATH)}')"
        f".then(async mod => {{ "
        f"  const pk = await mod.getPrivateKeyForUser('{address}', false); "
        f"  console.log(JSON.stringify({{'result': pk}})); "
        f"}})"
        f".catch(err => console.error(err))"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("Error retrieving private key. Stderr:", result.stderr)
        return ""
    else:
        # The JS code logs JSON like {"result":"0x123abc..."} or {"result":null}
        # We parse that to get the privateKey string
        try:
            data = json.loads(result.stdout.strip())
            return data.get("result", "")
        except json.JSONDecodeError:
            print("Failed to parse JSON from stdout:", result.stdout)
            return ""

def py_retrieve_address_from_private_key(address: str) -> str:
    """
    Calls the `getAddressFromPrivateKey` JavaScript function (which internally retrieves
    the private key for the user, then returns the associated address).
    """
    cmd = [
        "node",
        "-e",
        f"import('{os.path.abspath(NODE_JS_SCRIPT_PATH)}')"
        f".then(async mod => {{ "
        f"  const derived = await mod.getAddressFromPrivateKey('{address}'); "
        f"  console.log(JSON.stringify({{'result': derived}})); "
        f"}})"
        f".catch(err => console.error(err))"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("Error retrieving address from private key. Stderr:", result.stderr)
        return ""
    else:
        try:
            data = json.loads(result.stdout.strip())
            return data.get("result", "")
        except json.JSONDecodeError:
            print("Failed to parse JSON from stdout:", result.stdout)
            return ""

# Example usage:
if __name__ == "__main__":
    # 1) Store private key
    print("Storing private key for 0x1234... (replace with valid address).")
    py_store_private_key("0xaA4Aef3De98A0336928e949A8Be405C1175Ac1Be")

    # 2) Retrieve private key
    print("Retrieving private key for 0x1234... (replace with valid address).")
    private_key = py_retrieve_private_key("0xaA4Aef3De98A0336928e949A8Be405C1175Ac1Be")
    print("Python got private key:", private_key)

    # 3) Retrieve derived address from the private key in vault
    #    Actually your JS 'getAddressFromPrivateKey' expects an address, so if you want
    #    to retrieve the private key and then derive the address from it, you'd do:
    if private_key:
        # We can call the method that takes private key
        derived_address = py_retrieve_address_from_private_key("0xaA4Aef3De98A0336928e949A8Be405C1175Ac1Be")
        print("Python got derived address:", derived_address)

    # Or if 'getAddressFromPrivateKey' actually expects the private key hex, you must
    # pass 'private_key' instead of "0x12341234..." above.
