require('dotenv').config()
const { ethers } = require('ethers')
const Safe = require('@safe-global/protocol-kit').default
const { arbitrum } = require('viem/chains')
const { Wallet } = require('ethers')