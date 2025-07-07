import { MongoClient, ObjectId } from 'mongodb';
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
            tenant.apiKeys.find(k => k.key === apiKey).lastUsed = now;
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
            lastLoginAt: user.lastLoginAt
        };
    }
    async createOrUpdateUser(identifier, email) {
        if (!this.db)
            throw new Error('Database not initialized');
        const now = new Date().toISOString();
        const collection = this.db.collection('users');
        const query = email ? { $or: [{ identifier }, { email }] } : { identifier };
        const existingUser = await collection.findOne(query);
        if (existingUser) {
            await collection.updateOne({ _id: existingUser._id }, { $set: { lastLoginAt: now } });
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
            lastLoginAt: user.lastLoginAt
        }));
    }
}
//# sourceMappingURL=database.js.map