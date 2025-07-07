require('dotenv').config();
const { MongoClient } = require('mongodb');

async function setupDefaultTenant() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment');
  }

  if (!process.env.NEXT_PUBLIC_DEFAULT_API_KEY) {
    throw new Error('NEXT_PUBLIC_DEFAULT_API_KEY is not set in environment');
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('sso');
    const collection = db.collection('tenants');
    
    // Check if default tenant exists
    const defaultApiKey = process.env.NEXT_PUBLIC_DEFAULT_API_KEY;
    const existingTenant = await collection.findOne({
      'apiKeys.key': defaultApiKey
    });

    if (existingTenant) {
      console.log('Default tenant already exists:', existingTenant);
      return;
    }

    // Create default tenant
    const now = new Date().toISOString();
    const defaultTenant = {
      name: 'Default Tenant',
      apiKeys: [{
        key: defaultApiKey,
        description: 'Default API Key',
        createdAt: now,
        lastUsed: now
      }],
      createdAt: now,
      updatedAt: now
    };

    const result = await collection.insertOne(defaultTenant);
    console.log('Created default tenant:', result.insertedId);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupDefaultTenant();
