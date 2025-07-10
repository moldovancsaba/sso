import { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  // Create collections with validators
  await db.createCollection('oauth_tokens', {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["userId", "clientId", "accessToken", "tokenType", "expiresAt", "createdAt"],
        properties: {
          userId: { bsonType: "string" },
          clientId: { bsonType: "string" },
          accessToken: { bsonType: "string" },
          refreshToken: { bsonType: "string" },
          tokenType: { bsonType: "string" },
          scope: { bsonType: "string" },
          expiresAt: { bsonType: "string" },
          createdAt: { bsonType: "string" },
        }
      }
    }
  });

  await db.createCollection('oauth_codes', {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["code", "userId", "clientId", "expiresAt", "createdAt"],
        properties: {
          code: { bsonType: "string" },
          userId: { bsonType: "string" },
          clientId: { bsonType: "string" },
          scope: { bsonType: "string" },
          expiresAt: { bsonType: "string" },
          createdAt: { bsonType: "string" },
          usedAt: { bsonType: "string" }
        }
      }
    }
  });

  await db.createCollection('oauth_consents', {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["userId", "clientId", "scope", "createdAt"],
        properties: {
          userId: { bsonType: "string" },
          clientId: { bsonType: "string" },
          scope: { bsonType: "string" },
          createdAt: { bsonType: "string" },
          expiresAt: { bsonType: "string" }
        }
      }
    }
  });

  await db.createCollection('audit_logs', {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["eventType", "timestamp", "actorType", "actorId"],
        properties: {
          eventType: { bsonType: "string" },
          timestamp: { bsonType: "string" },
          actorType: { bsonType: "string" },
          actorId: { bsonType: "string" },
          targetType: { bsonType: "string" },
          targetId: { bsonType: "string" },
          details: { bsonType: "object" },
          ip: { bsonType: "string" },
          userAgent: { bsonType: "string" }
        }
      }
    }
  });

  // Create indices
  
  // oauth_tokens indices
  await db.collection('oauth_tokens').createIndex(
    { accessToken: 1 },
    { unique: true }
  );
  await db.collection('oauth_tokens').createIndex(
    { refreshToken: 1 },
    { unique: true, sparse: true }
  );
  await db.collection('oauth_tokens').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 } // TTL index
  );
  await db.collection('oauth_tokens').createIndex(
    { userId: 1, clientId: 1 }
  );

  // oauth_codes indices
  await db.collection('oauth_codes').createIndex(
    { code: 1 },
    { unique: true }
  );
  await db.collection('oauth_codes').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 } // TTL index
  );
  await db.collection('oauth_codes').createIndex(
    { userId: 1, clientId: 1 }
  );

  // oauth_consents indices
  await db.collection('oauth_consents').createIndex(
    { userId: 1, clientId: 1 },
    { unique: true }
  );
  await db.collection('oauth_consents').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, sparse: true } // Optional TTL index
  );

  // audit_logs indices
  await db.collection('audit_logs').createIndex(
    { timestamp: 1 }
  );
  await db.collection('audit_logs').createIndex(
    { eventType: 1, timestamp: 1 }
  );
  await db.collection('audit_logs').createIndex(
    { actorId: 1, timestamp: 1 }
  );
  await db.collection('audit_logs').createIndex(
    { targetId: 1, timestamp: 1 }
  );

  // Update existing collections

  // Add new indices to users collection
  await db.collection('users').createIndex(
    { email: 1 },
    { sparse: true }
  );
  await db.collection('users').createIndex(
    { "profile.name": 1 },
    { sparse: true }
  );
  await db.collection('users').createIndex(
    { lastLoginAt: 1 }
  );

  // Add new indices to user_auth_data collection
  await db.collection('user_auth_data').createIndex(
    { userId: 1, provider: 1 },
    { unique: true }
  );
  await db.collection('user_auth_data').createIndex(
    { provider: 1, providerId: 1 },
    { unique: true }
  );

  // Add new indices to oauth_clients collection
  await db.collection('oauth_clients').createIndex(
    { clientId: 1 },
    { unique: true }
  );
}

export async function down(db: Db): Promise<void> {
  // Drop new collections
  await db.collection('oauth_tokens').drop();
  await db.collection('oauth_codes').drop();
  await db.collection('oauth_consents').drop();
  await db.collection('audit_logs').drop();

  // Drop new indices from existing collections
  await db.collection('users').dropIndex('email_1');
  await db.collection('users').dropIndex('profile.name_1');
  await db.collection('users').dropIndex('lastLoginAt_1');
  
  await db.collection('user_auth_data').dropIndex('userId_1_provider_1');
  await db.collection('user_auth_data').dropIndex('provider_1_providerId_1');
  
  await db.collection('oauth_clients').dropIndex('clientId_1');
}
