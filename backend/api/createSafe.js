require('dotenv').config()
const { ethers } = require('ethers')
const Safe = require('@safe-global/protocol-kit').default
// taken from documentation
const { arbitrum } = require('viem/chains')
const { Wallet } = require('ethers')