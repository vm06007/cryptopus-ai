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

