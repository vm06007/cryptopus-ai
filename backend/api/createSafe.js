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

const provider = new ethers.providers.JsonRpcProvider('https://arbitrum.drpc.org')
const owner1Wallet = new Wallet(owner1PrivateKey, provider);

async function deploySafeOnArbitrum() {
    try {
        const fundTx = await owner1Wallet.sendTransaction({
            to: owner2Wallet.address,
            value: ethers.utils.parseEther('0.001')
          })
          await fundTx.wait()
          console.log(`Transaction hash (fund second owner): ${fundTx.hash}`)

    } catch (error) {
        console.error('Error deploying Safe on Arbitrum:', error)
        process.exit(1)
    }
}

deploySafeOnArbitrum()