const { ethers } = require('ethers')
const SafeApiKit = require('@safe-global/api-kit')
const Safe = require('@safe-global/protocol-kit')
const { OperationType } = require('@safe-global/types-kit')
const dotenv = require('dotenv')

dotenv.config()

const PRIVATE_KEY = process.env.PRIVATE_KEY

(async () => {
    const safeAddress = process.argv[2]
    if (!safeAddress) {
      throw new Error(
        'Missing Safe address argument.\nUsage: node safeOwnerProposer.js <SAFE_ADDRESS>'
      )
    }
     // 2. Load the proposer key from environment variable
     const proposerPrivateKey = process.env.PRIVATE_KEY
     console.log(proposerPrivateKey, "proposerPrivateKey")
     if (!proposerPrivateKey) {
       throw new Error("Environment variable PRIVATE_KEY must be set to an existing Safe owner's private key")

     }
})


