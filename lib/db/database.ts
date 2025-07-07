import { MongoClient, Db, ObjectId } from 'mongodb';
import { TenantDocument } from '../types/tenant';
import { User } from '../types/user';
import { OAuthClient } from '../types/oauth';
import crypto from 'crypto';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export class Database {
  private static instance: Database;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static async getInstance(): Promise<Database> {
    if (!Database.instance) {
      Database.instance = new Database();
      Database.instance.client = await clientPromise;
      Database.instance.db = Database.instance.client.db('sso');
    }
    return Database.instance;
  }

  // Tenant operations
  public async validateApiKey(apiKey: string): Promise<TenantDocument | null> {
    if (!this.db) throw new Error('Database not initialized');

    const tenant = await this.db.collection<TenantDocument>('tenants').findOne({
      'apiKeys.key': apiKey
    });

    if (tenant) {
      // Update last used timestamp
      const now = new Date().toISOString();
      await this.db.collection('tenants').updateOne(
        { 'apiKeys.key': apiKey },
        {
          $set: {
            'apiKeys.$.lastUsed': now,
            updatedAt: now
          }
        }
      );
      
      // Update the tenant object with new timestamps
      tenant.apiKeys.find(k => k.key === apiKey).lastUsed = now;
      tenant.updatedAt = now;
    }

    return tenant;
  }

// OAuth operations
  public async createOAuthClient(name: string, redirectUris: string[]): Promise<OAuthClient> {
    if (!this.db) throw new Error('Database not initialized');

    const clientId = crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();

    const client: OAuthClient = {
      id: new ObjectId().toString(),
      name,
      clientId,
      clientSecret,
      redirectUris,
      createdAt: now,
      updatedAt: now
    };

    await this.db.collection('oauth_clients').insertOne(client);
    return client;
  }

  public async validateOAuthClient(clientId: string, clientSecret?: string): Promise<OAuthClient | null> {
    if (!this.db) throw new Error('Database not initialized');

    const query: any = { clientId };
    if (clientSecret) {
      query.clientSecret = clientSecret;
    }

    const client = await this.db.collection<OAuthClient>('oauth_clients').findOne(query);
    return client ? { ...client, id: client._id.toString() } : null;
  }

  public async listOAuthClients(): Promise<OAuthClient[]> {
    if (!this.db) throw new Error('Database not initialized');

    const clients = await this.db.collection<OAuthClient>('oauth_clients').find({}).toArray();
    return clients.map(client => ({ ...client, id: client._id.toString() }));
  }

  // User operations
  public async findUser(identifierOrEmail: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const user = await this.db.collection('users').findOne({
      $or: [
        { identifier: identifierOrEmail },
        { email: identifierOrEmail }
      ]
    });
    if (!user) return null;

    return {
      id: user._id.toString(),
      identifier: user.identifier,
      email: user.email,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  public async createOrUpdateUser(identifier: string, email?: string): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const collection = this.db.collection('users');

    const query = email ? { $or: [{ identifier }, { email }] } : { identifier };
    const existingUser = await collection.findOne(query);

    if (existingUser) {
      await collection.updateOne(
        { _id: existingUser._id },
        { $set: { lastLoginAt: now } }
      );

      return {
        id: existingUser._id.toString(),
        identifier: existingUser.identifier,
        email: existingUser.email,
        createdAt: existingUser.createdAt,
        lastLoginAt: now
      };
    }

    const result = await collection.insertOne({
      identifier,
      email,
      createdAt: now,
      lastLoginAt: now
    });

    return {
      id: result.insertedId.toString(),
      identifier,
      email,
      createdAt: now,
      lastLoginAt: now
    };
  }

  public async listUsers(): Promise<User[]> {
    if (!this.db) throw new Error('Database not initialized');

    const users = await this.db
      .collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return users.map(user => ({
      id: user._id.toString(),
      identifier: user.identifier,
      email: user.email,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));
  }
}
