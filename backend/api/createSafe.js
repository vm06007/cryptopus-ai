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

const owner1PrivateKey = FIRST_OWNER_PK.startsWith('0x')
  ? FIRST_OWNER_PK
  : '0x' + FIRST_OWNER_PK

// Create New Private key.. later can be replaced by nillion?
const owner2Wallet = Wallet.createRandom();
console.log('owner2Wallet private key', owner2Wallet.privateKey)
console.log('owner2Wallet address', owner2Wallet.address)

const provider = new ethers.providers.JsonRpcProvider('https://arbitrum.drpc.org')
const owner1Wallet = new Wallet(owner1PrivateKey, provider);

const ARBITRUM_RPC_URL = 'https://arbitrum.drpc.org'

async function deploySafeOnArbitrum() {
    try {
        const fundTx = await owner1Wallet.sendTransaction({
            to: owner2Wallet.address,
            value: ethers.utils.parseEther('0.001')
          })
          await fundTx.wait()
          console.log(`Transaction hash (fund second owner): ${fundTx.hash}`)

          const safeAccountConfig = {
            owners: [
              owner1Wallet.address,      // first owner
              owner2Wallet.address       // second owner
            ],
            threshold: 2                // 2-of-2 signatures required
          }

          const predictedSafe = {
            safeAccountConfig
          }


            console.log(`\nInitializing Safe SDK with second owner's wallet...`)

        // Pass the second owner's private key to Safe.init
            const protocolKit = await Safe.init({
            provider: ARBITRUM_RPC_URL,
            signer: owner2Wallet.privateKey,
            predictedSafe
            })

            // Check the predicted safe address
            const safeAddress = await protocolKit.getAddress()
            console.log(`Predicted Safe address: ${safeAddress}`)

            // STEP 3: Create and send the Safe deployment transaction
            const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction()
            const client = await protocolKit.getSafeProvider().getExternalSigner()

            console.log(`\nSending Safe deployment transaction from second owner's wallet...`)
            const txHash = await client.sendTransaction({
                to: deploymentTransaction.to,
                value: BigInt(deploymentTransaction.value),
                data: deploymentTransaction.data,
                chain: arbitrum
              })
              console.log(`Deployment transaction hash: ${txHash}`)

              console.log(`Safe deployed at: ${safeAddress}`)

              // STEP 4: Verify the Safe is actually deployed
              const newProtocolKit = await protocolKit.connect({ safeAddress })
              const isSafeDeployed = await newProtocolKit.isSafeDeployed()
              console.log(`Is the new Safe actually deployed? ${isSafeDeployed}`)

              return safeAddress


    } catch (error) {
        console.error('Error deploying Safe on Arbitrum:', error)
        process.exit(1)
    }
}

deploySafeOnArbitrum()

module.exports = { deploySafeOnArbitrum }