require('dotenv').config({ path: '.env.local' });
import { Database } from '../lib/db/database';

async function setupDevOAuthClient() {
  try {
    const db = await Database.getInstance();

    // Check if client already exists
    const existingClient = await db.validateOAuthClient('local_development_client');
    if (existingClient) {
      console.log('Development OAuth client already exists:', existingClient);
      return;
    }

    // Create new client with predefined ID and secret
    const client = await db.createOAuthClient(
      'Local Development Client',
      ['http://localhost:3000/api/auth/callback/sso']
    );

    console.log('Created development OAuth client:', client);
  } catch (error) {
    console.error('Error setting up development OAuth client:', error);
    process.exit(1);
  }
}

setupDevOAuthClient();
