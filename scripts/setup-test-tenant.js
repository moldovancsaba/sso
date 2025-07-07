// setup-test-tenant.js
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect';

async function setupTestTenant() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db('sso');

  // Generate API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();

  // Create test tenant
  const tenant = {
    name: 'Test Tenant',
    domain: 'localhost',
    createdAt: now,
    updatedAt: now,
    settings: {
      allowedRedirectDomains: ['localhost', 'sso.doneisbetter.com'],
      tokenExpiryMinutes: 60,
      ipWhitelist: [],
      rateLimit: {
        requestsPerMinute: 100,
        burstSize: 10
      }
    },
    apiKeys: [{
      key: apiKey,
      description: 'Test API Key',
      createdAt: now,
      lastUsed: null
    }]
  };

  // Insert or update test tenant
  await db.collection('tenants').updateOne(
    { name: 'Test Tenant' },
    { $set: tenant },
    { upsert: true }
  );

  console.log('\nTest tenant created successfully!');
  console.log('\nAPI Key (save this, it won\'t be shown again):');
  console.log(apiKey);
  console.log('\nUse this key in the X-API-Key header for API requests.\n');

  // Create OAuth client for local development
  const clientId = crypto.randomBytes(16).toString('hex');
  const clientSecret = crypto.randomBytes(32).toString('hex');
  
  const oauthClient = {
    name: 'Local Development',
    clientId,
    clientSecret,
    redirectUris: ['http://localhost:3000/api/auth/callback/sso'],
    createdAt: now,
    updatedAt: now
  };
  
  await db.collection('oauth_clients').insertOne(oauthClient);
  
  console.log('\nOAuth client created:');
  console.log('Client ID:', clientId);
  console.log('Client Secret:', clientSecret);
  console.log('\nAdd these to your .env file:');
  console.log('NEXT_PUBLIC_DEFAULT_API_KEY=' + apiKey);
  console.log('OAUTH_CLIENT_ID=' + clientId);
  console.log('OAUTH_CLIENT_SECRET=' + clientSecret);
  
  await client.close();
}

setupTestTenant().catch(console.error);
