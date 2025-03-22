"""Data Create and Read example using the SecretVault wrapper"""

import asyncio
# import json
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
    Main function to demonstrate writing to nodes using the SecretVaultWrapper.
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

        data = []
        entry = {
            "user": "0xaAE0dB14a36784682668241b6bF9C0B3b795EA97",
            "interactions": [
                {
                    "question": "What is your name?",
                    "response": "My name is Octopus AI.",
                }
            ],
        }
        data.append(entry)

        # Write data to nodes
        data_written = await collection.write_to_nodes(data)

        # Extract unique created IDs from the results
        new_ids = list(
            {
                created_id
                for item in data_written
                if item.get("result")
                for created_id in item["result"]["data"]["created"]
            }
        )
        print("🔏 Created IDs:")
        print("\n".join(new_ids))

        # 🔏 Created IDs:
        # 582dd4b5-36eb-4ed8-b1de-ef5c43bbe846

    except RuntimeError as error:
        print(f"❌ Failed to use SecretVaultWrapper: {str(error)}")
        sys.exit(1)


# Run the async main function
if __name__ == "__main__":
    asyncio.run(main())