import { Database } from '../lib/db/database';
import { ObjectId } from 'mongodb';
import { TenantDocument } from '../lib/types/tenant';

async function setupTestTenant() {
  const db = await Database.getInstance();
  const now = new Date().toISOString();
  
  // Create a test tenant
  const testTenant: TenantDocument = {
    _id: new ObjectId(),
    name: 'Test Tenant',
    domain: 'localhost',
    settings: {
      allowedRedirectDomains: ['localhost', 'sso.doneisbetter.com'],
      tokenExpiryMinutes: 10,
      ipWhitelist: [],
      rateLimit: {
        requestsPerMinute: 100,
        burstSize: 10
      }
    },
    apiKeys: [{
      key: 'test_api_key_' + new ObjectId().toString(),
      name: 'Test API Key',
      createdAt: now,
      lastUsed: now
    }],
    createdAt: now,
    updatedAt: now
  };

  // Get MongoDB instance
  const client = await db['client'];
  const mongodb = client.db(process.env.NODE_ENV === 'test' ? 'sso_test' : 'sso');
  
  // Insert the test tenant
  await mongodb.collection('tenants').insertOne(testTenant);
  
  console.log('Test tenant created with API key:', testTenant.apiKeys[0].key);
  
  // Create local development OAuth client
  const oauthClient = await db.createOAuthClient('Local Development', ['http://localhost:3000/api/auth/callback/sso']);
  console.log('OAuth client created:', {
    clientId: oauthClient.clientId,
    clientSecret: oauthClient.clientSecret
  });

  process.exit(0);
}

setupTestTenant().catch(error => {
  console.error('Error setting up test tenant:', error);
  process.exit(1);
});
