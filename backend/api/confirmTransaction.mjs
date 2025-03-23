#!/usr/bin/env node
import SafeApiKit from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';  // Ethers.js for address derivation

// Debug: top-level log to confirm script starts
console.log("[DEBUG] confirm-safe-tx.mjs: Starting script...");

// 1. Read input parameters from env or CLI
const args = process.argv.slice(2);
const env = process.env;
function getArg(name) {
  // find `--NAME=value` in CLI args OR use environment variables
  const flag = args.find(arg => arg.startsWith(`--${name}=`));
  return flag ? flag.split('=')[1] : env[name];
}

const SAFE_ADDRESS    = getArg('SAFE_ADDRESS');
const SAFE_TX_HASH    = getArg('SAFE_TX_HASH');
const OWNER_PRIV_KEY  = getArg('OWNER_PRIVATE_KEY');
const TX_SERVICE_URL  = getArg('TX_SERVICE_URL');
const CHAIN_ID        = getArg('CHAIN_ID') || '1';  // default: "1" (Ethereum mainnet)

let output = {};

(async () => {
  try {
    console.log(`[DEBUG] CLI Args:\n  SAFE_ADDRESS=${SAFE_ADDRESS}\n  SAFE_TX_HASH=${SAFE_TX_HASH}\n  OWNER_PRIV_KEY=${OWNER_PRIV_KEY?.slice(0,10)}... (truncated)\n  TX_SERVICE_URL=${TX_SERVICE_URL}\n  CHAIN_ID=${CHAIN_ID}`);

    // Validate required inputs
    if (!SAFE_ADDRESS || !SAFE_TX_HASH || !OWNER_PRIV_KEY) {
      throw new Error('Missing required SAFE_ADDRESS, SAFE_TX_HASH, or OWNER_PRIVATE_KEY');
    }

    // Parse chainId to number/BigInt
    const chainIdNum = Number(CHAIN_ID);
    if (isNaN(chainIdNum)) {
      throw new Error(`Invalid CHAIN_ID: ${CHAIN_ID}`);
    }
    const chainIdBigInt = BigInt(chainIdNum);

    // 2. Initialize Safe API Kit
    console.log("[DEBUG] Initializing SafeApiKit...");
    const apiKitConfig = { chainId: chainIdBigInt };
    if (TX_SERVICE_URL) {
      apiKitConfig.txServiceUrl = TX_SERVICE_URL;
    }
    const apiKit = new SafeApiKit(apiKitConfig);

    // 3. Determine a provider RPC URL for the given chain (for Protocol Kit)
    let rpcUrl = null;
    if (chainIdNum === 1) {
      // Ethereum mainnet
      rpcUrl = 'https://rpc.mevblocker.io';
    } else if (chainIdNum === 5) {
      // Goerli
      rpcUrl = 'https://rpc.ankr.com/eth_goerli';
    } else if (chainIdNum === 42161) {
      // Arbitrum One
      rpcUrl = 'https://arb1.arbitrum.io/rpc';
    } else {
      // Fallback - user must provide an RPC if needed
      console.warn(`[WARN] No built-in RPC for chainId=${chainIdNum}. ` +
        `If TX_SERVICE_URL was provided, we might still proceed, but signing may fail without a valid provider.`);
    }
    console.log(`[DEBUG] Using RPC URL: ${rpcUrl}`);

    // 4. Initialize Safe Protocol Kit with provider & signer
    const signer = OWNER_PRIV_KEY.startsWith('0x') ? OWNER_PRIV_KEY : '0x' + OWNER_PRIV_KEY;
    console.log("[DEBUG] Initializing Protocol Kit (Safe)...");
    const safeSdk = await Safe.init({
      provider: rpcUrl || undefined,  // if no RPC fallback, set undefined
      signer: signer,
      safeAddress: SAFE_ADDRESS
    });
    console.log("[DEBUG] Safe SDK init done.");

    // 5. Fetch the Safe transaction from the service
    console.log("[DEBUG] Fetching transaction details from the service...");
    const txDetails = await apiKit.getTransaction(SAFE_TX_HASH);
    console.log("[DEBUG] Transaction details fetched: ", txDetails);

    // Optional: verify the transaction belongs to the given Safe address
    if (txDetails.safe && SAFE_ADDRESS.toLowerCase() !== txDetails.safe.toLowerCase()) {
      throw new Error(`Transaction hash ${SAFE_TX_HASH} does not belong to Safe ${SAFE_ADDRESS}`);
    }

    // 6. Sign the Safe transaction hash with the owner's private key
    console.log("[DEBUG] Signing safeTxHash...");
    const signatureObj = await safeSdk.signHash(SAFE_TX_HASH);
    const signatureHex = signatureObj.data || signatureObj;  // .data is the hex string
    // Derive owner address (for output) from the private key
    const ownerAddress = (new ethers.Wallet(signer)).address;
    console.log("[DEBUG] Signature complete. signatureHex:", signatureHex);

    // 7. Submit the signature to confirm the transaction
    console.log("[DEBUG] Submitting confirmation to the service...");
    await apiKit.confirmTransaction(SAFE_TX_HASH, signatureHex);
    console.log("[DEBUG] confirmTransaction call done.");

    // 8. Fetch updated confirmations
    console.log("[DEBUG] Fetching updated transaction for confirmations count...");
    let confirmationsCount = 0;
    try {
      const updatedTx = await apiKit.getTransaction(SAFE_TX_HASH);
      if (updatedTx.confirmations) {
        confirmationsCount = updatedTx.confirmations.length;
      } else {
        // Fallback: getTransactionConfirmations
        const confList = await apiKit.getTransactionConfirmations(SAFE_TX_HASH);
        confirmationsCount = confList?.count || 0;
      }
    } catch (e) {
      console.warn("[WARN] Could not fetch updated confirmations:", e);
    }

    // Populate success output
    output = {
      safeTxHash: SAFE_TX_HASH,
      signature: signatureHex,
      owner: ownerAddress,
      confirmations: confirmationsCount,
      error: null
    };
  } catch (err) {
    // Handle errors
    console.error("[ERROR] confirm-safe-tx.mjs caught error:", err);
    output = {
      safeTxHash: SAFE_TX_HASH || null,
      signature: null,
      owner: null,
      confirmations: null,
      error: err.message || String(err)
    };
  } finally {
    // Print the JSON result to stdout
    console.log(JSON.stringify(output));
  }
})();
