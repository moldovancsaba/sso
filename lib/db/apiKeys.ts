import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sso';
const client = new MongoClient(uri);

interface ApiKeyData {
  id: string;
  key: string;
  tenantId: string;
  tenantName: string;
  createdAt: Date;
  lastUsedAt: Date;
}

export async function getApiKeyFromDb(key: string): Promise<ApiKeyData | null> {
  try {
    await client.connect();
    const database = client.db();
    const apiKeys = database.collection('apiKeys');

    const keyData = await apiKeys.findOne({ key });

    if (!keyData) {
      return null;
    }

    // Update last used timestamp
    await apiKeys.updateOne(
      { _id: keyData._id },
      { $set: { lastUsedAt: new Date() } }
    );

    // Get tenant information
    const tenants = database.collection('tenants');
    const tenant = await tenants.findOne({ _id: new ObjectId(keyData.tenantId) });

    return {
      id: keyData._id.toString(),
      key: keyData.key,
      tenantId: keyData.tenantId,
      tenantName: tenant?.name || 'Unknown Tenant',
      createdAt: keyData.createdAt,
      lastUsedAt: new Date()
    };
  } catch (error) {
    console.error('Database error:', error);
    return null;
  } finally {
    await client.close();
  }
}

export async function createApiKey(tenantId: string): Promise<string> {
  try {
    await client.connect();
    const database = client.db();
    const apiKeys = database.collection('apiKeys');

    const key = generateApiKey();
    
    await apiKeys.insertOne({
      key,
      tenantId,
      createdAt: new Date(),
      lastUsedAt: new Date()
    });

    return key;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [
    randomString(8, chars),
    randomString(8, chars),
    randomString(8, chars),
    randomString(8, chars)
  ];
  return segments.join('-');
}

function randomString(length: number, chars: string): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
