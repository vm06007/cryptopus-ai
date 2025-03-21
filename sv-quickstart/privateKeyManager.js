// secretVaultScript.js (ESM with "type": "module" in package.json)
import { SecretVaultWrapper } from 'secretvaults';
import { Wallet, getAddress } from 'ethers';
import { orgConfig } from './orgConfig.js'; // Adjust path if needed

// Your actual schema/collection ID on Nillion
const SCHEMA_ID = 'd8f4a287-c3b0-43d4-9cdd-27c0b3e563f7';

// Initialize the SecretVault wrapper (we'll call init() later in main)
const secretVault = new SecretVaultWrapper(
  orgConfig.nodes,
  orgConfig.orgCredentials,
  SCHEMA_ID
);

/**
 * Store a new private key for a user address in Nillion SecretVault.
 * - Generates a random private key (if none is stored yet).
 * - Uses %allot to encrypt the private key on Nillion.
 * - Finally prints JSON with either "success": true and the newly generated private key,
 *   or "success": false and an error message.
 */
export async function storePrivateKeyForUser(address) {
  try {
    await secretVault.init();
    console.log(`\n[STORE] Checking if a key already exists for address ${address}...`);
    const normalizedAddress = getAddress(address);

    // Query existing records with that address
    const existing = await secretVault.readFromNodes({ address: normalizedAddress });
    if (existing && existing.length > 0) {
      console.log(`❗ A key is already stored for ${normalizedAddress}; skipping new generation.\n`);
      // Print final JSON result
      const alreadyExistsResult = {
        success: false,
        error: 'Key already exists',
        address: normalizedAddress
      };
      console.log(JSON.stringify(alreadyExistsResult));
      return null;
    }

    // No record found, generate a new random wallet
    console.log(`No key found for ${normalizedAddress}. Generating a new private key...`);
    const wallet = Wallet.createRandom();

    const newRecord = {
      address: normalizedAddress,
      privateKey: { '%allot': wallet.privateKey }, // mark field as encrypted
    };

    // Write record to Nillion
    const result = await secretVault.writeToNodes([newRecord]);
    console.log('✅ Successfully stored private key for:', normalizedAddress);
    console.log('Write result:', result, '\n');

    // Print final JSON result with newly generated private key
    const storeResult = {
      success: true,
      address: normalizedAddress,
      privateKey: wallet.privateKey
    };
    console.log(JSON.stringify(storeResult));

    return wallet.privateKey;
  } catch (error) {
    console.error(`❌ Error storing private key for ${address}:`, error);
    const errResult = {
      success: false,
      error: error.message || String(error),
      address
    };
    console.log(JSON.stringify(errResult));
    return null;
  }
}

/**
 * Retrieve the stored private key for a user address from Nillion SecretVault.
 * - If getAssociatedAddress is false, returns/prints the decrypted private key.
 * - If getAssociatedAddress is true, derives the address from that private key and returns/prints it.
 * - Also prints JSON for Python to parse, e.g. {"success":true,"privateKey":...} or {"address":...}
 */
export async function getPrivateKeyForUser(address, getAssociatedAddress) {
  try {
    await secretVault.init();
  //  console.log(`\n[RETRIEVE] Fetching private key for ${address}...`);
    const normalizedAddress = getAddress(address);

    const records = await secretVault.readFromNodes({ address: normalizedAddress });
    if (!records || records.length === 0) {
      console.log(`❌ No stored key found for ${normalizedAddress}.\n`);
      const notFoundResult = {
        success: false,
        error: 'No stored key found',
        address: normalizedAddress
      };
      console.log(JSON.stringify(notFoundResult));
      return null;
    }

    // We assume only one record per address
    const record = records[0];
    // The privateKey field is automatically decrypted by secretVaults
    const privateKey = record.privateKey;
   // console.log(`✅ Decrypted private key for ${normalizedAddress}:`, privateKey, '\n');

    if (getAssociatedAddress) {
      const associatedWallet = new Wallet(privateKey);
      const associatedAddress = associatedWallet.address;
      //console.log(`✅ Derived address from private key:`, associatedAddress, '\n');
      const addressResult = {
        success: true,
        address: associatedAddress
      };
      console.log(JSON.stringify(addressResult));
      return associatedAddress;
    } else {
      // Return the private key
      const pkResult = {
        success: true,
        privateKey
      };
      console.log(JSON.stringify(pkResult));
      return privateKey;
    }
  } catch (error) {
    console.error(`❌ Error retrieving private key for ${address}:`, error);
    const errResult = {
      success: false,
      error: error.message || String(error),
      address
    };
    console.log(JSON.stringify(errResult));
    return null;
  }
}

/**
 * A convenience method that retrieves the private key for the given address,
 * then returns/logs the derived address from that key.
 * This is basically the same as calling getPrivateKeyForUser(address,true).
 */
export async function getAddressFromPrivateKey(address) {
  // This function just calls getPrivateKeyForUser with the "getAssociatedAddress" flag set
  return await getPrivateKeyForUser(address, true);
}

/**
 * Main function: parse CLI for "save" or "retrieve", plus an Ethereum address.
 * e.g.
 *   node secretVaultScript.js save 0xAbc123...
 *   node secretVaultScript.js retrieve 0xAbc123...
 */
async function main() {
  const command = process.argv[2];  // 'save' or 'retrieve'
  const address = process.argv[3];
  if (!command || !address) {
    console.error('Usage: node secretVaultScript.js <save|retrieve> <EthereumAddress>');
    process.exit(1);
  }

  // Initialize Nillion SecretVault connection
 // await secretVault.init();
 // console.log('✅ SecretVault initialized.\n');

  if (command === 'save') {
    await storePrivateKeyForUser(address);
  } else if (command === 'retrieve') {
    // By default, we'll get only the private key if you do "retrieve"
    await getPrivateKeyForUser(address, false);
  } else {
    console.error("❌ Invalid command. Must be 'save' or 'retrieve'.");
  }
}

// If running directly from CLI, invoke main()
if (import.meta.url === process.argv[1]) {
  main().catch(err => {
    console.error('❌ Unexpected error in main():', err);
    // Print JSON error so Python can parse it
    console.log(JSON.stringify({ success: false, error: err.message || String(err) }));
    process.exit(1);
  });
}
