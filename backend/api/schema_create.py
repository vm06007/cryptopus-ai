"""Schema Create example with SSL certificate verification disabled."""

import asyncio
import json
import sys
import os
import ssl

# Disable SSL verification (WARNING: Insecure for production)
ssl._create_default_https_context = ssl._create_unverified_context

from secretvaults import SecretVaultWrapper
from org_config import org_config

# Load your schema from file
with open("schema_store.json", "r", encoding="utf8") as schema_file:
    schema = json.load(schema_file)

async def create_schema(schema_name: str = "Octopus AI Chats"):
    """
    Creates a new schema using the SecretVaultWrapper and returns the newly created schema.
    """
    try:
        org = SecretVaultWrapper(org_config["nodes"], org_config["org_credentials"])
        await org.init()
        new_schema = await org.create_schema(schema, schema_name)
        print("📚 New Schema:", new_schema)
        return new_schema
    except RuntimeError as error:
        print(f"❌ Failed to use SecretVaultWrapper: {str(error)}")
        sys.exit(1)

def main():
    """
    Synchronous entry point for create_schema.
    """
    result = asyncio.run(create_schema("Octopus AI Chats"))
    return result

if __name__ == "__main__":
    main()
