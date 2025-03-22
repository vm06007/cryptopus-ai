#!/usr/bin/env node

import { ethers } from 'ethers'
import SafeApiKit from '@safe-global/api-kit'
import Safe from '@safe-global/protocol-kit'
import { OperationType } from '@safe-global/types-kit'
import * as dotenv from 'dotenv'

dotenv.config()

;(async () => {
  try {
    // 1. Read the Safe address from the CLI argument
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

    console.log(`\nSafe Address (from CLI): ${safeAddress}`)
    console.log(`Proposer Private Key (from env): ${proposerPrivateKey.slice(0, 10)}... [hidden]`)

    // 3. Set up the Arbitrum provider and signer
    const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc'
    const ARBITRUM_CHAIN_ID = 42161n // Arbitrum One chain ID as a BigInt
    const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC_URL)
    const proposerSigner = new ethers.Wallet(proposerPrivateKey, provider)

    console.log('\nConnected to Arbitrum network with provider and signer.')

    // 4. Initialize the Safe API Kit (for Safe Transaction Service) and the Protocol Kit (to create tx)
    const apiKit = new SafeApiKit({
      chainId: ARBITRUM_CHAIN_ID
    })

    const safeSdk = await Safe.init({
      provider: ARBITRUM_RPC_URL,
      signer: proposerPrivateKey,
      safeAddress: safeAddress
    })

    console.log('Safe API Kit and Protocol Kit initialized.\n')

    // 5. Fetch the current Safe info: owners, threshold
    const safeInfo = await apiKit.getSafeInfo(safeAddress)
    const currentOwners = safeInfo.owners
    const currentThreshold = safeInfo.threshold
    console.log(`Current owners (${currentOwners.length}):`, currentOwners)
    console.log(`Current threshold: ${currentThreshold}`)

    // 6. Generate a new private key for the new owner
    const newOwnerWallet = ethers.Wallet.createRandom()
    const newOwnerAddress = newOwnerWallet.address
    const newOwnerPrivateKey = newOwnerWallet.privateKey

    console.log(`\nGenerated new owner address: ${newOwnerAddress}`)
    console.log(`New owner private key (keep this safe!): ${newOwnerPrivateKey}`)

    // 7. Calculate the new threshold = currentThreshold + 1
    const newThreshold = currentThreshold + 1
    console.log(`\nNew proposed threshold (after adding owner): ${newThreshold}`)

    // 8. Encode the call to add the new owner on the Safe contract
    const safeInterface = new ethers.utils.Interface([
      'function addOwnerWithThreshold(address owner, uint256 _threshold)'
    ])
    const data = safeInterface.encodeFunctionData('addOwnerWithThreshold', [
      newOwnerAddress,
      newThreshold
    ])

    // Prepare the transaction object (no ETH value, standard call)
    const transactionData = {
      to: safeAddress,
      value: '0',
      data: data,
      operation: OperationType.Call // 0 = CALL, not DELEGATECALL
    }

    console.log('\nEncoded transaction to add new owner with updated threshold.')

    // 9. Create the transaction with the Safe Protocol Kit
    const safeTransaction = await safeSdk.createTransaction({
      transactions: [transactionData]
    })

    // 10. Calculate the Safe transaction hash, sign it, and propose it
    const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
    const senderSignature = await safeSdk.signHash(safeTxHash)
    console.log(`\nSafe transaction hash: ${safeTxHash}`)

    // Propose the transaction to the Safe Tx Service
    await apiKit.proposeTransaction({
      safeAddress,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: proposerSigner.address,
      senderSignature: senderSignature.data
    })

    console.log('\n✅ Successfully proposed the new owner addition transaction to the Safe service.')
    console.log('   The transaction is now pending confirmation from other owners (not executed yet).')

  } catch (error) {
    console.error('\n❌ Error while proposing new Safe owner:', error)
    process.exit(1)
  }
})()
