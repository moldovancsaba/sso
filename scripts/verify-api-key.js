const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const API_KEY = 'sso_default_tenant_prod_24680';

async function verifyApiKey() {
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

    // Try to find tenant with this API key
    const tenant = await tenantsCollection.findOne({
      'apiKeys.key': API_KEY
    });

    if (tenant) {
      console.log('API key is valid!');
      console.log('Tenant details:', {
        name: tenant.name,
        domain: tenant.domain,
        apiKeys: tenant.apiKeys
      });
    } else {
      console.log('API key not found in database');
      
      // List all tenants and their API keys
      console.log('\nListing all tenants:');
      const allTenants = await tenantsCollection.find({}).toArray();
      allTenants.forEach(t => {
        console.log(`\nTenant: ${t.name}`);
        console.log('API Keys:', t.apiKeys);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

verifyApiKey();
