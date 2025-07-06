const { MongoClient } = require('mongodb');

// Get MongoDB URI from command line argument
const MONGODB_URI = process.argv[2];
const DEFAULT_API_KEY = 'sso_default_tenant_prod_24680';

if (!MONGODB_URI) {
  console.error('Please provide the production MONGODB_URI as an argument');
  console.error('Usage: node scripts/setup-prod-tenant.js "mongodb+srv://..."');
  process.exit(1);
}

async function setupDefaultTenant() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to Production MongoDB');

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

    console.log('Default tenant setup complete in production!');
    
    // Verify the tenant was created/updated
    const tenant = await tenantsCollection.findOne({ name: 'Default Tenant' });
    console.log('\nVerification - Tenant details:', {
      name: tenant.name,
      domain: tenant.domain,
      apiKeys: tenant.apiKeys
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

setupDefaultTenant();
