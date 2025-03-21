import { SecretVaultWrapper } from 'secretvaults';
import { orgConfig } from './orgConfig.js';
import schema from './schema.json' assert { type: 'json' };

async function main() {
  try {
    // Initialize SecretVault client with org nodes and credentials
    const sv = new SecretVaultWrapper(orgConfig.nodes, orgConfig.orgCredentials);
    await sv.init();

    // Create the schema (collection) on SecretVault
    const newSchema = await sv.createSchema(schema, 'Private Key Store');
    console.log('Created Schema ID:', newSchema);
  } catch (error) {
    console.error('❌ Failed to create schema:', error.message);
    process.exit(1);
  }
}

main();
