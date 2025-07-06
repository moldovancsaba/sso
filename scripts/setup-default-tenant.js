const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_API_KEY = 'sso_default_tenant_prod_24680';

async function setupDefaultTenant() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('sso');
    const tenantsCollection = db.collection('tenants');

    // Check if default tenant exists
    const existingTenant = await tenantsCollection.findOne({ name: 'Default Tenant' });
    
    if (existingTenant) {
      console.log('Default tenant already exists. Updating API key...');
      await tenantsCollection.updateOne(
        { name: 'Default Tenant' },
        {
          $set: {
            'apiKeys.0': {
              key: DEFAULT_API_KEY,
              name: 'Default API Key',
              createdAt: new Date().toISOString(),
              lastUsed: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
          }
        }
      );
    } else {
      console.log('Creating default tenant...');
      await tenantsCollection.insertOne({
        name: 'Default Tenant',
        domain: 'sso.doneisbetter.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          allowedRedirectDomains: ['*'],
          tokenExpiryMinutes: 10,
          ipWhitelist: [],
          rateLimit: {
            requestsPerMinute: 100,
            burstSize: 10
          }
        },
        apiKeys: [{
          key: DEFAULT_API_KEY,
          name: 'Default API Key',
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString()
        }]
      });
    }

    console.log('Default tenant setup complete!');
    console.log('API Key:', DEFAULT_API_KEY);
    console.log('\nMake sure to set this API key in Vercel as NEXT_PUBLIC_DEFAULT_API_KEY');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

setupDefaultTenant();
