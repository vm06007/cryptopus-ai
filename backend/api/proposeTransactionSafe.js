require('dotenv').config();
const minimist = require('minimist');
const { ethers } = require('ethers');
const axios = require('axios');

const rawArgs = minimist(process.argv.slice(2), {
    string: [
      'safeAddress',
      'destination',
      'data',
      'nonce',
      'value'
    ]
  });

const privateKey = process.env.PRIVATE_KEY;

const PrivateKeyWallet = new ethers.Wallet(privateKey, process.env.RPC_URL);

const gasToken        = '0x';
const gasPrice        = '0';
const safeTxGasStr    = '0';
const baseGasStr      = '0';
const refundReceiver  = PrivateKeyWallet.address;

const {
  safeAddress,
  destination,
  value,
  data,
  nonce
} = rawArgs;

if (!safeAddress || !privateKey || !destination || value === undefined) {
  console.error(
    'Missing required arguments.\n\nUsage:\n' +
    '  --safeAddress <address>\n' +
    '  --destination <address>\n' +
    '  --value <wei>\n' +
    '  [--data <hex string> (optional)]\n' +
    '  [--nonce <uint> (optional)]\n\n' +
    'Also ensure PRIVATE_KEY is set in your .env file.'
  );
  process.exit(1);
}

const valueStr    = value.toString();
const gasPriceStr = gasPrice.toString();
let txNonce       = nonce;

console.log('Final resolved args:', {
  safeAddress,
  destination,
  value: valueStr,
  data,
  safeTxGas: safeTxGasStr,
  baseGas: baseGasStr,
  gasPrice: gasPriceStr,
  gasToken,
  refundReceiver,
  nonce: txNonce
});

async function fetchNonce(safeAddr) {
  const url = `https://safe-transaction-arbitrum.safe.global/api/v1/safes/${safeAddr}/`;
  console.log('Fetching Safe nonce from:', url);
  const res = await axios.get(url);
  return res.data.nonce;
}


async () => {
  // If nonce not supplied, fetch from Safe service
  if (txNonce === undefined) {
    try {
      txNonce = await fetchNonce(safeAddress);
      console.log(`Fetched current Safe nonce: ${txNonce}`);
    } catch (err) {
      console.error('Failed to fetch Safe nonce:', err.response?.data || err.message);
      process.exit(1);
    }
  }

  const safeAbiFragment = [
    {
      inputs: [
        { internalType: 'address', name: 'to',             type: 'address' },
        { internalType: 'uint256', name: 'value',          type: 'uint256' },
        { internalType: 'bytes',   name: 'data',           type: 'bytes' },
        { internalType: 'uint8',   name: 'operation',      type: 'uint8' },
        { internalType: 'uint256', name: 'safeTxGas',      type: 'uint256' },
        { internalType: 'uint256', name: 'baseGas',        type: 'uint256' },
        { internalType: 'uint256', name: 'gasPrice',       type: 'uint256' },
        { internalType: 'address', name: 'gasToken',       type: 'address' },
        { internalType: 'address', name: 'refundReceiver', type: 'address' },
        { internalType: 'uint256', name: '_nonce',         type: 'uint256' }
      ],
      name: 'getTransactionHash',
      outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
      stateMutability: 'view',
      type: 'function'
    }
  ];

  // Compute transaction hash
  let safeTxHash;
  try {
    safeTxHash = await safeContract.getTransactionHash(
      destination,
      valueStr,
      data || '0x',
      0,             // operation
      safeTxGasStr,
      baseGasStr,
      gasPriceStr,
      gasToken,
      refundReceiver,
      txNonce
    );
  } catch (err) {
    console.error('Error computing safeTxHash:', err.message);
    process.exit(1);
  }

  // Sign the transaction hash
  let signature;
  try {
    const sig = await wallet.signingKey.sign(safeTxHash);
    signature = ethers.Signature.from(sig).serialized;
  } catch (err) {
    console.error('Signing failed:', err.message);
    process.exit(1);
  }
