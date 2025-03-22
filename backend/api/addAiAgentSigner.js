#!/usr/bin/env node

import { ethers } from 'ethers'
import SafeApiKit from '@safe-global/api-kit'
import Safe from '@safe-global/protocol-kit'
import { OperationType } from '@safe-global/types-kit'
import * as dotenv from 'dotenv'

dotenv.config()

	const PRIVATE_KEY = process.env.PRIVATE_KEY

	(async () => {
		const safeAddress = process.argv[2]
		if (!safeAddress) {
			throw new Error(
				"Missing Safe address argument.\nUsage: node safeOwnerProposer.js <SAFE_ADDRESS>"
			)
		}
		// 2. Load the proposer key from environment variable
		const proposerPrivateKey = PRIVATE_KEY
		console.log(proposerPrivateKey, "proposerPrivateKey")
		if (!proposerPrivateKey) {
			throw new Error("Environment variable PRIVATE_KEY must be set to an existing Safe owner's private key")

		}
	})


