"""Data Create and Read example using the SecretVault wrapper"""

import asyncio
import json
# import random
import sys
import certifi
import os

os.environ["SSL_CERT_FILE"] = certifi.where()

from secretvaults import SecretVaultWrapper, OperationType
from org_config import org_config

# Update schema ID with your own value
SCHEMA_ID = "60f48495-8f4d-4d30-86de-b3ff792d6325"

async def main():
    """
    Main function to demonstrate reading from nodes using the SecretVaultWrapper.
    """
    try:
        # Initialize the SecretVaultWrapper instance with the org configuration and schema ID
        collection = SecretVaultWrapper(
            org_config["nodes"],
            org_config["org_credentials"],
            SCHEMA_ID,
            operation=OperationType.STORE,
        )
        await collection.init()

        # Read data from nodes
        data_read = await collection.read_from_nodes()
        print("📚 Read new records:", (json.dumps(data_read[: 2], indent=2)))

    # 📚 Read new records: [
    # {
    # "_id": "582dd4b5-36eb-4ed8-b1de-ef5c43bbe846",
    # "user": "0xaAE0dB14a36784682668241b6bF9C0B3b795EA97",
    # "interactions": [
        # {
            # "question": "What is your name?",
            # "response": "My name is Octopus AI."
        # }
        # ]
    # }
    # ]

    except RuntimeError as error:
        print(f"❌ Failed to use SecretVaultWrapper: {str(error)}")
        sys.exit(1)


# Run the async main function
if __name__ == "__main__":
    asyncio.run(main())