import { MongoClient, ObjectId } from 'mongodb';
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
let client;
let clientPromise;
// Handle connection based on environment
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // Use global variable in development/test to prevent multiple connections
    let globalWithMongo = global;
    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(config.uri, options);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
}
else {
    // In production, create a new connection
    client = new MongoClient(config.uri, options);
    clientPromise = client.connect();
}
export class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }
    static async getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
            Database.instance.client = await clientPromise;
            const dbName = process.env.NODE_ENV === 'test' ? 'sso_test' : 'sso';
            Database.instance.db = Database.instance.client.db(dbName);
        }
        return Database.instance;
    }
    // Tenant operations
    async validateApiKey(apiKey) {
        if (!this.db)
            throw new Error('Database not initialized');
        const tenant = await this.db.collection('tenants').findOne({
            'apiKeys.key': apiKey
        });
        if (tenant) {
            // Update last used timestamp
            const now = new Date().toISOString();
            await this.db.collection('tenants').updateOne({ 'apiKeys.key': apiKey }, {
                $set: {
                    'apiKeys.$.lastUsed': now,
                    updatedAt: now
                }
            });
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
    async createOAuthClient(name, redirectUris) {
        if (!this.db)
            throw new Error('Database not initialized');
        const clientId = crypto.randomBytes(16).toString('hex');
        const clientSecret = crypto.randomBytes(32).toString('hex');
        const now = new Date().toISOString();
        const client = {
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
    async validateOAuthClient(clientId, clientSecret) {
        if (!this.db)
            throw new Error('Database not initialized');
        const query = { clientId };
        if (clientSecret) {
            query.clientSecret = clientSecret;
        }
        const client = await this.db.collection('oauth_clients').findOne(query);
        return client ? Object.assign(Object.assign({}, client), { id: client._id.toString() }) : null;
    }
    async listOAuthClients() {
        if (!this.db)
            throw new Error('Database not initialized');
        const clients = await this.db.collection('oauth_clients').find({}).toArray();
        return clients.map(client => (Object.assign(Object.assign({}, client), { id: client._id.toString() })));
    }
    // User operations
    async findUser(identifierOrEmail) {
        if (!this.db)
            throw new Error('Database not initialized');
        const user = await this.db.collection('users').findOne({
            $or: [
                { identifier: identifierOrEmail },
                { email: identifierOrEmail }
            ]
        });
        if (!user)
            return null;
        return {
            id: user._id.toString(),
            identifier: user.identifier,
            email: user.email,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            updatedAt: user.updatedAt || user.createdAt
        };
    }
    async createOrUpdateUser(identifier, options) {
        var _a;
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const collection = this.db.collection('users');
        const query = (options === null || options === void 0 ? void 0 : options.email) ? { $or: [{ identifier }, { email: options.email }] } : { identifier };
        const existingUser = await collection.findOne(query);
        if (existingUser) {
            // Update user data and last login
            const updateData = {
                lastLoginAt: now,
                updatedAt: now
            };
            if (options) {
                if (options.email)
                    updateData.email = options.email;
                if (options.emailVerified !== undefined)
                    updateData.emailVerified = options.emailVerified;
                if (options.profile)
                    updateData.profile = options.profile;
                if (options.metadata)
                    updateData.metadata = options.metadata;
            }
            await collection.updateOne({ _id: existingUser._id }, { $set: updateData });
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
        const identityProfile = (options === null || options === void 0 ? void 0 : options.emoji) && (options === null || options === void 0 ? void 0 : options.color)
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
        const userData = {
            identifier,
            email: options === null || options === void 0 ? void 0 : options.email,
            emailVerified: (_a = options === null || options === void 0 ? void 0 : options.emailVerified) !== null && _a !== void 0 ? _a : false,
            identityId: identity._id,
            profile: (options === null || options === void 0 ? void 0 : options.profile) || {},
            metadata: (options === null || options === void 0 ? void 0 : options.metadata) || {},
            createdAt: now,
            lastLoginAt: now,
            updatedAt: now
        };
        const result = await collection.insertOne(userData);
        return {
            id: result.insertedId.toString(),
            identifier,
            email: options === null || options === void 0 ? void 0 : options.email,
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
    async createURLConfig(input) {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const urlConfig = Object.assign(Object.assign({ _id: new ObjectId() }, input), { isDefault: input.isDefault || false, createdAt: now, updatedAt: now });
        // If this config is set as default, unset any existing default for the same environment
        if (urlConfig.isDefault) {
            await this.db.collection('url_configs').updateMany({ environment: input.environment, isDefault: true }, { $set: { isDefault: false, updatedAt: now } });
        }
        await this.db.collection('url_configs').insertOne(urlConfig);
        return urlConfig;
    }
    async updateURLConfig(id, input) {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const update = Object.assign(Object.assign({}, input), { updatedAt: now });
        // If setting as default, unset any existing default for the same environment
        if (input.isDefault) {
            const config = await this.db.collection('url_configs').findOne({ _id: new ObjectId(id) });
            if (config) {
                await this.db.collection('url_configs').updateMany({ environment: config.environment, isDefault: true }, { $set: { isDefault: false, updatedAt: now } });
            }
        }
        const result = await this.db.collection('url_configs').findOneAndUpdate({ _id: new ObjectId(id) }, { $set: update }, { returnDocument: 'after' });
        return result.value || null;
    }
    async deleteURLConfig(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        const result = await this.db.collection('url_configs').deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount === 1;
    }
    async getURLConfig(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        return this.db.collection('url_configs').findOne({ _id: new ObjectId(id) });
    }
    async getDefaultURLConfig(environment) {
        if (!this.db)
            throw new Error('Database not initialized');
        return this.db.collection('url_configs').findOne({
            environment,
            isDefault: true
        });
    }
    async listURLConfigs(tenantId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const query = tenantId ? { tenantId } : {};
        return this.db.collection('url_configs')
            .find(query)
            .sort({ isDefault: -1, createdAt: -1 })
            .toArray();
    }
    async validateCallbackUrl(url, environment) {
        if (!this.db)
            throw new Error('Database not initialized');
        const config = await this.db.collection('url_configs').findOne({
            environment,
            callbackUrls: url
        });
        return !!config;
    }
    // Identity Management
    async createIdentity(identity) {
        if (!this.db)
            throw new Error('Database not initialized');
        const doc = Object.assign(Object.assign({ _id: new ObjectId().toString() }, identity), { tenantId: 'default' });
        await this.db.collection('identities').insertOne(doc);
        return doc;
    }
    async getIdentity(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        return this.db.collection('identities').findOne({ _id: id });
    }
    async updateIdentity(id, update) {
        if (!this.db)
            throw new Error('Database not initialized');
        const result = await this.db.collection('identities').findOneAndUpdate({ _id: id }, { $set: Object.assign(Object.assign({}, update), { updatedAt: new Date().toISOString() }) }, { returnDocument: 'after' });
        return result.value || null;
    }
    async deleteIdentity(id) {
        if (!this.db)
            throw new Error('Database not initialized');
        const result = await this.db.collection('identities').deleteOne({ _id: id });
        return result.deletedCount === 1;
    }
    // Authentication Data Management
    async linkAuthData(userId, authData) {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        await this.db.collection('user_auth_data').updateOne({ userId, provider: authData.provider }, {
            $set: Object.assign(Object.assign({}, authData), { updatedAt: now }),
            $setOnInsert: {
                createdAt: now
            }
        }, { upsert: true });
    }
    async unlinkAuthData(userId, provider) {
        if (!this.db)
            throw new Error('Database not initialized');
        const result = await this.db.collection('user_auth_data').deleteOne({ userId, provider });
        return result.deletedCount === 1;
    }
    async getAuthDataForUser(userId) {
        if (!this.db)
            throw new Error('Database not initialized');
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
    async findUserByAuthData(provider, providerId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const authData = await this.db.collection('user_auth_data').findOne({ provider, providerId });
        if (!authData)
            return null;
        const user = await this.db.collection('users').findOne({ _id: new ObjectId(authData.userId) });
        if (!user)
            return null;
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
    async updateAuthTokens(userId, provider, tokens) {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const result = await this.db.collection('user_auth_data').updateOne({ userId, provider }, {
            $set: Object.assign(Object.assign({}, tokens), { updatedAt: now })
        });
        return result.modifiedCount === 1;
    }
    // OAuth Token Management
    async createOAuthToken(token) {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const oauthToken = Object.assign(Object.assign({}, token), { createdAt: now });
        await this.db.collection('oauth_tokens').insertOne(oauthToken);
        return oauthToken;
    }
    async getOAuthToken(accessToken) {
        if (!this.db)
            throw new Error('Database not initialized');
        return this.db.collection('oauth_tokens').findOne({ accessToken });
    }
    async getOAuthTokenByRefresh(refreshToken) {
        if (!this.db)
            throw new Error('Database not initialized');
        return this.db.collection('oauth_tokens').findOne({ refreshToken });
    }
    async deleteOAuthToken(accessToken) {
        if (!this.db)
            throw new Error('Database not initialized');
        const result = await this.db.collection('oauth_tokens').deleteOne({ accessToken });
        return result.deletedCount === 1;
    }
    // OAuth Code Management
    async createOAuthCode(code) {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const oauthCode = Object.assign(Object.assign({}, code), { createdAt: now });
        await this.db.collection('oauth_codes').insertOne(oauthCode);
        return oauthCode;
    }
    async getOAuthCode(code) {
        if (!this.db)
            throw new Error('Database not initialized');
        return this.db.collection('oauth_codes').findOne({ code });
    }
    async markOAuthCodeAsUsed(code) {
        if (!this.db)
            throw new Error('Database not initialized');
        const result = await this.db.collection('oauth_codes').updateOne({ code }, { $set: { usedAt: new Date().toISOString() } });
        return result.modifiedCount === 1;
    }
    // OAuth Consent Management
    async createOrUpdateConsent(consent) {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const oauthConsent = Object.assign(Object.assign({}, consent), { createdAt: now });
        await this.db.collection('oauth_consents').updateOne({ userId: consent.userId, clientId: consent.clientId }, { $set: oauthConsent }, { upsert: true });
        return oauthConsent;
    }
    async getConsent(userId, clientId) {
        if (!this.db)
            throw new Error('Database not initialized');
        return this.db.collection('oauth_consents').findOne({ userId, clientId });
    }
    async revokeConsent(userId, clientId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const result = await this.db.collection('oauth_consents').deleteOne({ userId, clientId });
        return result.deletedCount === 1;
    }
    // Audit Log Management
    async createAuditLog(log) {
        if (!this.db)
            throw new Error('Database not initialized');
        const auditLog = Object.assign(Object.assign({}, log), { timestamp: new Date().toISOString() });
        await this.db.collection('audit_logs').insertOne(auditLog);
        return auditLog;
    }
    async getAuditLogs(query) {
        if (!this.db)
            throw new Error('Database not initialized');
        const filter = {};
        if (query.eventType)
            filter.eventType = query.eventType;
        if (query.actorId)
            filter.actorId = query.actorId;
        if (query.targetId)
            filter.targetId = query.targetId;
        if (query.fromTimestamp || query.toTimestamp) {
            filter.timestamp = {};
            if (query.fromTimestamp)
                filter.timestamp.$gte = query.fromTimestamp;
            if (query.toTimestamp)
                filter.timestamp.$lte = query.toTimestamp;
        }
        return this.db.collection('audit_logs')
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(query.limit || 100)
            .toArray();
    }
    // User validation
    async validateUserCredentials(username, password) {
        if (!this.db)
            throw new Error('Database not initialized');
        // Find user by identifier or email
        const user = await this.findUser(username);
        if (!user)
            return null;
        // In a real implementation, you would validate the password here
        // This is a placeholder implementation for development
        return user;
    }
    // Enhanced user operations
    async createOrUpdateUserWithAuth(identifier, authData, options) {
        if (!this.db)
            throw new Error('Database not initialized');
        const user = await this.createOrUpdateUser(identifier, options);
        await this.linkAuthData(user.id, authData);
        return user;
    }
    async listUsers() {
        if (!this.db)
            throw new Error('Database not initialized');
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
//# sourceMappingURL=database.js.map