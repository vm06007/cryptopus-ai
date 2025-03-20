require('dotenv').config()
const { ethers } = require('ethers')
const Safe = require('@safe-global/protocol-kit').default
// taken from documentation
const { arbitrum } = require('viem/chains')
const { Wallet } = require('ethers')

const FIRST_OWNER_PK = process.env.PRIVATE_KEY
if (!FIRST_OWNER_PK) {
  throw new Error('First owner private key not set in .env (PRIVATE_KEY)')
}

// Create New Private key.. later can be replaced by nillion?
const owner2Wallet = Wallet.createRandom();
console.log('owner2Wallet private key', owner2Wallet.privateKey)
console.log('owner2Wallet address', owner2Wallet.address)
