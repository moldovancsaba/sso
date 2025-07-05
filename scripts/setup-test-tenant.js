// setup-test-tenant.js
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function setupTestTenant() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db('sso');

  // Generate API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();

  // Create test tenant
  const tenant = {
    name: 'Test Tenant',
    domain: 'test.example.com',
    createdAt: now,
    updatedAt: now,
    settings: {
      allowedRedirectDomains: ['test.example.com'],
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

  await client.close();
}

setupTestTenant().catch(console.error);
