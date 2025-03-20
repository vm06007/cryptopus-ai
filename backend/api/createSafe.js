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