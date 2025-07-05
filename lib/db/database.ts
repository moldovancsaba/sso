import { MongoClient, Db } from 'mongodb';
import { TenantDocument } from '../types/tenant';
import { User } from '../types/user';

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
      await this.db.collection('tenants').updateOne(
        { 'apiKeys.key': apiKey },
        {
          $set: {
            'apiKeys.$.lastUsed': new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      );
    }

    return tenant;
  }

  // User operations
  public async findUser(identifier: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const user = await this.db.collection('users').findOne({ identifier });
    if (!user) return null;

    return {
      id: user._id.toString(),
      identifier: user.identifier,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  public async createOrUpdateUser(identifier: string): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const collection = this.db.collection('users');

    const existingUser = await collection.findOne({ identifier });

    if (existingUser) {
      await collection.updateOne(
        { _id: existingUser._id },
        { $set: { lastLoginAt: now } }
      );

      return {
        id: existingUser._id.toString(),
        identifier: existingUser.identifier,
        createdAt: existingUser.createdAt,
        lastLoginAt: now
      };
    }

    const result = await collection.insertOne({
      identifier,
      createdAt: now,
      lastLoginAt: now
    });

    return {
      id: result.insertedId.toString(),
      identifier,
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
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }));
  }
}
