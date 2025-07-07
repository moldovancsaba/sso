require('dotenv').config({ path: '.env.local' });
const { Database } = require('../lib/db/database');

async function updateDevOAuthClient() {
  try {
    const db = await Database.getInstance();

    // First check if the client exists
    const existingClient = await db.db.collection('oauth_clients').findOne(
      { clientId: 'local_development_client' }
    );

    if (existingClient) {
      // Update existing client
      const updateResult = await db.db.collection('oauth_clients').updateOne(
        { clientId: 'local_development_client' },
        {
          $set: {
            redirectUris: ['http://localhost:3000/api/auth/callback/sso'],
            name: 'Local Development',
            updatedAt: new Date().toISOString()
          }
        }
      );
      console.log('Updated existing OAuth client configuration');
    } else {
      // Create new client
      await db.db.collection('oauth_clients').insertOne({
        name: 'Local Development',
        clientId: 'local_development_client',
        clientSecret: 'local_development_secret',
        redirectUris: ['http://localhost:3000/api/auth/callback/sso'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('Created new development OAuth client');
    }

    // Verify the configuration
    const updatedClient = await db.db.collection('oauth_clients').findOne(
      { clientId: 'local_development_client' }
    );
    console.log('Current OAuth client configuration:', updatedClient);
  } catch (error) {
    console.error('Error updating development OAuth client:', error);
    process.exit(1);
  }
}

updateDevOAuthClient();
