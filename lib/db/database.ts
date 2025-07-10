import { MongoClient, Db, ObjectId } from 'mongodb';
import { TenantDocument } from '../types/tenant';
import { User } from '../types/user';
import { OAuthClient, OAuthToken, OAuthCode, OAuthConsent, AuditLog } from '../types/oauth';
import { URLConfigDocument, URLConfigCreateInput, URLConfigUpdateInput } from '../types/url-config';
import { Identity, IdentityDocument } from '../types/identity';
import { AuthData, AuthDataCreateInput, AuthTokensUpdateInput } from '../types/auth-data';
import { generateIdentityProfile } from '../utils/identity';
import crypto from 'crypto';

// Configure MongoDB connection based on environment
const getMongoConfig = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'test') {
      // For tests, use a default test configuration
      return {
        uri: 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/?retryWrites=true&w=majority&appName=mongodb-thanperfect',
        dbName: 'sso_test'
      };
    }
    throw new Error('MongoDB URI is not configured');
  }
  return { uri, dbName: process.env.NODE_ENV === 'test' ? 'sso_test' : 'sso' };
};

const config = getMongoConfig();
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Handle connection based on environment
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  // Use global variable in development/test to prevent multiple connections
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(config.uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, create a new connection
  client = new MongoClient(config.uri, options);
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
      const dbName = process.env.NODE_ENV === 'test' ? 'sso_test' : 'sso';
      Database.instance.db = Database.instance.client.db(dbName);
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
      const apiKeyEntry = tenant.apiKeys.find(k => k.key === apiKey);
      if (apiKeyEntry) {
        apiKeyEntry.lastUsed = now;
      }
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

  // Update user data
  public async updateUser(id: string, update: Partial<User>): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );

return result.value ? { 
      id: result.value._id.toString(),
      identifier: result.value.identifier,
      email: result.value.email,
      emailVerified: result.value.emailVerified,
      identityId: result.value.identityId,
      profile: result.value.profile,
      metadata: result.value.metadata,
      createdAt: result.value.createdAt,
      lastLoginAt: result.value.lastLoginAt,
      updatedAt: result.value.updatedAt || result.value.createdAt
    } : null;
  }

  // OAuth operations
  public async updateOAuthClient(id: string, update: Partial<OAuthClient>): Promise<OAuthClient | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.collection<OAuthClient>('oauth_clients').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...update,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    return result.value ? { ...result.value, id: result.value._id.toString() } : null;
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
      lastLoginAt: user.lastLoginAt,
      updatedAt: user.updatedAt || user.createdAt
    };
  }

public async createOrUpdateUser(
    identifier: string,
    options?: {
      email?: string;
      emailVerified?: boolean;
      profile?: {
        name?: string;
        givenName?: string;
        familyName?: string;
        middleName?: string;
        nickname?: string;
        preferredUsername?: string;
        picture?: string;
        website?: string;
        gender?: string;
        birthdate?: string;
        zoneinfo?: string;
        locale?: string;
        phoneNumber?: string;
        phoneNumberVerified?: boolean;
        address?: {
          formatted?: string;
          streetAddress?: string;
          locality?: string;
          region?: string;
          postalCode?: string;
          country?: string;
        };
      };
      metadata?: {
        [key: string]: any;
      };
      emoji?: string;
      color?: string;
    }
  ): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const collection = this.db.collection('users');

    const query = options?.email ? { $or: [{ identifier }, { email: options.email }] } : { identifier };
    const existingUser = await collection.findOne(query);

    if (existingUser) {
      // Update user data and last login
      const updateData: any = {
        lastLoginAt: now,
        updatedAt: now
      };

      if (options) {
        if (options.email) updateData.email = options.email;
        if (options.emailVerified !== undefined) updateData.emailVerified = options.emailVerified;
        if (options.profile) updateData.profile = options.profile;
        if (options.metadata) updateData.metadata = options.metadata;
      }

      await collection.updateOne(
        { _id: existingUser._id },
        { $set: updateData }
      );

      return {
        id: existingUser._id.toString(),
        identifier: existingUser.identifier,
        email: existingUser.email,
        emailVerified: existingUser.emailVerified,
        identityId: existingUser.identityId,
        profile: existingUser.profile,
        metadata: existingUser.metadata,
        createdAt: existingUser.createdAt,
        lastLoginAt: now,
        updatedAt: now
      };
    }

    // Create new identity for new user with provided emoji/color or generate default
    const identityProfile = options?.emoji && options?.color
      ? {
          gametag: identifier,
          emoji: options.emoji,
          color: options.color,
          createdAt: now,
          updatedAt: now
        }
      : await generateIdentityProfile(identifier);
    const identity = await this.createIdentity(identityProfile);

    // Create new user with identity reference and enhanced profile
    const userData: any = {
      identifier,
      email: options?.email,
      emailVerified: options?.emailVerified ?? false,
      identityId: identity._id,
      profile: options?.profile || {},
      metadata: options?.metadata || {},
      createdAt: now,
      lastLoginAt: now,
      updatedAt: now
    };

    const result = await collection.insertOne(userData);

    return {
      id: result.insertedId.toString(),
      identifier,
      email: options?.email,
      emailVerified: userData.emailVerified,
      identityId: identity._id,
      profile: userData.profile,
      metadata: userData.metadata,
      createdAt: now,
      lastLoginAt: now,
      updatedAt: now
    };
  }

  // URL Configuration Management
  public async createURLConfig(input: URLConfigCreateInput): Promise<URLConfigDocument> {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const urlConfig: URLConfigDocument = {
      _id: new ObjectId(),
      ...input,
      isDefault: input.isDefault || false,
      createdAt: now,
      updatedAt: now
    };

    // If this config is set as default, unset any existing default for the same environment
    if (urlConfig.isDefault) {
      await this.db.collection<URLConfigDocument>('url_configs').updateMany(
        { environment: input.environment, isDefault: true },
        { $set: { isDefault: false, updatedAt: now } }
      );
    }

    await this.db.collection<URLConfigDocument>('url_configs').insertOne(urlConfig);
    return urlConfig;
  }

  public async updateURLConfig(id: string, input: URLConfigUpdateInput): Promise<URLConfigDocument | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const update: any = {
      ...input,
      updatedAt: now
    };

    // If setting as default, unset any existing default for the same environment
    if (input.isDefault) {
      const config = await this.db.collection<URLConfigDocument>('url_configs').findOne(
        { _id: new ObjectId(id) }
      );
      if (config) {
        await this.db.collection<URLConfigDocument>('url_configs').updateMany(
          { environment: config.environment, isDefault: true },
          { $set: { isDefault: false, updatedAt: now } }
        );
      }
    }

const result = await this.db.collection<URLConfigDocument>('url_configs').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );

    return result.value || null;
  }

  public async deleteURLConfig(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.collection<URLConfigDocument>('url_configs').deleteOne(
      { _id: new ObjectId(id) }
    );

    return result.deletedCount === 1;
  }

  public async getURLConfig(id: string): Promise<URLConfigDocument | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return this.db.collection<URLConfigDocument>('url_configs').findOne(
      { _id: new ObjectId(id) }
    );
  }

  public async getDefaultURLConfig(environment: string): Promise<URLConfigDocument | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return this.db.collection<URLConfigDocument>('url_configs').findOne({
      environment,
      isDefault: true
    });
  }

  public async listURLConfigs(tenantId?: string): Promise<URLConfigDocument[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const query = tenantId ? { tenantId } : {};
    return this.db.collection<URLConfigDocument>('url_configs')
      .find(query)
      .sort({ isDefault: -1, createdAt: -1 })
      .toArray();
  }

  public async validateCallbackUrl(url: string, environment: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const config = await this.db.collection<URLConfigDocument>('url_configs').findOne({
      environment,
      callbackUrls: url
    });

    return !!config;
  }

  // Identity Management
  public async createIdentity(identity: Identity): Promise<IdentityDocument> {
    if (!this.db) throw new Error('Database not initialized');
    
    const doc: IdentityDocument = {
      _id: new ObjectId().toString(),
      ...identity,
      tenantId: 'default'
    };

    await this.db.collection<IdentityDocument>('identities').insertOne(doc as any);
    return doc;
  }

  public async getIdentity(id: string): Promise<IdentityDocument | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return this.db.collection<IdentityDocument>('identities').findOne(
{ _id: id }
    );
  }

  public async updateIdentity(id: string, update: Partial<Identity>): Promise<IdentityDocument | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.collection<IdentityDocument>('identities').findOneAndUpdate(
{ _id: id },
      { $set: { ...update, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );

    return result.value || null;
  }

  public async deleteIdentity(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.collection<IdentityDocument>('identities').deleteOne(
{ _id: id }
    );

    return result.deletedCount === 1;
  }

  // Authentication Data Management
  public async linkAuthData(userId: string, authData: AuthDataCreateInput): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    await this.db.collection('user_auth_data').updateOne(
      { userId, provider: authData.provider },
      {
        $set: {
          ...authData,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  public async unlinkAuthData(userId: string, provider: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.collection('user_auth_data').deleteOne({ userId, provider });
    return result.deletedCount === 1;
  }

  public async getAuthDataForUser(userId: string): Promise<Array<AuthData>> {
    if (!this.db) throw new Error('Database not initialized');

    const authData = await this.db.collection('user_auth_data')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return authData.map(doc => ({
      userId: doc.userId,
      provider: doc.provider,
      providerId: doc.providerId,
      accessToken: doc.accessToken,
      refreshToken: doc.refreshToken,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));
  }

  public async findUserByAuthData(provider: string, providerId: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const authData = await this.db.collection('user_auth_data').findOne({ provider, providerId });
    if (!authData) return null;

    const user = await this.db.collection('users').findOne({ _id: new ObjectId(authData.userId) });
    if (!user) return null;

    return {
      id: user._id.toString(),
      identifier: user.identifier,
      email: user.email,
      identityId: user.identityId,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      updatedAt: user.updatedAt || user.createdAt
    };
  }

  public async updateAuthTokens(userId: string, provider: string, tokens: AuthTokensUpdateInput): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const result = await this.db.collection('user_auth_data').updateOne(
      { userId, provider },
      {
        $set: {
          ...tokens,
          updatedAt: now
        }
      }
    );

    return result.modifiedCount === 1;
  }

  // OAuth Token Management
  public async createOAuthToken(token: Omit<OAuthToken, 'createdAt'>): Promise<OAuthToken> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const oauthToken: OAuthToken = {
      ...token,
      createdAt: now
    };

    await this.db.collection<OAuthToken>('oauth_tokens').insertOne(oauthToken as any);
    return oauthToken;
  }

  public async getOAuthToken(accessToken: string): Promise<OAuthToken | null> {
    if (!this.db) throw new Error('Database not initialized');

    return this.db.collection<OAuthToken>('oauth_tokens').findOne({ accessToken });
  }

  public async getOAuthTokenByRefresh(refreshToken: string): Promise<OAuthToken | null> {
    if (!this.db) throw new Error('Database not initialized');

    return this.db.collection<OAuthToken>('oauth_tokens').findOne({ refreshToken });
  }

  public async deleteOAuthToken(accessToken: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.collection('oauth_tokens').deleteOne({ accessToken });
    return result.deletedCount === 1;
  }

  // OAuth Code Management
  public async createOAuthCode(code: Omit<OAuthCode, 'createdAt'>): Promise<OAuthCode> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const oauthCode: OAuthCode = {
      ...code,
      createdAt: now
    };

    await this.db.collection<OAuthCode>('oauth_codes').insertOne(oauthCode as any);
    return oauthCode;
  }

  public async getOAuthCode(code: string): Promise<OAuthCode | null> {
    if (!this.db) throw new Error('Database not initialized');

    return this.db.collection<OAuthCode>('oauth_codes').findOne({ code });
  }

  public async markOAuthCodeAsUsed(code: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.collection('oauth_codes').updateOne(
      { code },
      { $set: { usedAt: new Date().toISOString() } }
    );
    return result.modifiedCount === 1;
  }

  // OAuth Consent Management
  public async createOrUpdateConsent(consent: Omit<OAuthConsent, 'createdAt'>): Promise<OAuthConsent> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const oauthConsent: OAuthConsent = {
      ...consent,
      createdAt: now
    };

    await this.db.collection<OAuthConsent>('oauth_consents').updateOne(
      { userId: consent.userId, clientId: consent.clientId },
      { $set: oauthConsent },
      { upsert: true }
    );

    return oauthConsent;
  }

  public async getConsent(userId: string, clientId: string): Promise<OAuthConsent | null> {
    if (!this.db) throw new Error('Database not initialized');

    return this.db.collection<OAuthConsent>('oauth_consents').findOne({ userId, clientId });
  }

  public async revokeConsent(userId: string, clientId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.collection('oauth_consents').deleteOne({ userId, clientId });
    return result.deletedCount === 1;
  }

  // Audit Log Management
  public async createAuditLog(log: Omit<AuditLog, 'timestamp'>): Promise<AuditLog> {
    if (!this.db) throw new Error('Database not initialized');

    const auditLog: AuditLog = {
      ...log,
      timestamp: new Date().toISOString()
    };

    await this.db.collection<AuditLog>('audit_logs').insertOne(auditLog as any);
    return auditLog;
  }

  public async getAuditLogs(query: {
    eventType?: string;
    actorId?: string;
    targetId?: string;
    fromTimestamp?: string;
    toTimestamp?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    if (!this.db) throw new Error('Database not initialized');

    const filter: any = {};
    if (query.eventType) filter.eventType = query.eventType;
    if (query.actorId) filter.actorId = query.actorId;
    if (query.targetId) filter.targetId = query.targetId;
    if (query.fromTimestamp || query.toTimestamp) {
      filter.timestamp = {};
      if (query.fromTimestamp) filter.timestamp.$gte = query.fromTimestamp;
      if (query.toTimestamp) filter.timestamp.$lte = query.toTimestamp;
    }

    return this.db.collection<AuditLog>('audit_logs')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(query.limit || 100)
      .toArray();
  }

  // User validation
  public async validateUserCredentials(username: string, password: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    // Find user by identifier or email
    const user = await this.findUser(username);
    if (!user) return null;

    // In a real implementation, you would validate the password here
    // This is a placeholder implementation for development
    return user;
  }

  // Enhanced user operations
  public async createOrUpdateUserWithAuth(
    identifier: string,
    authData: AuthDataCreateInput,
    options?: { email?: string; emoji?: string; color?: string }
  ): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const user = await this.createOrUpdateUser(identifier, options);
    await this.linkAuthData(user.id, authData);
    return user;
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
      lastLoginAt: user.lastLoginAt,
      updatedAt: user.updatedAt || user.createdAt
    }));
  }
}
