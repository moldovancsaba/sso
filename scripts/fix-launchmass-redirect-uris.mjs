#!/usr/bin/env node

/**
 * WHAT: Fix launchmass OAuth client redirect URIs
 * WHY: /auth/callback doesn't exist, only /api/oauth/callback should be registered
 * HOW: Update oauthClients collection to remove the non-existent redirect URI
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  console.log('✅ Connected to MongoDB');
  
  const dbName = process.env.MONGODB_DB || 'sso';
  const db = client.db(dbName);
  console.log(`📊 Using database: ${dbName}`);
  const oauthClients = db.collection('oauthClients');
  
  const clientId = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f';
  
  console.log(`🔍 Looking for client: ${clientId}`);
  
  // Check current state
  const existing = await oauthClients.findOne({ id: clientId });
  
  if (!existing) {
    console.error('❌ Client not found');
    process.exit(1);
  }
  
  console.log('\n📋 Current redirect URIs:');
  existing.redirect_uris?.forEach(uri => console.log(`   - ${uri}`));
  
  // Update to only include the working redirect URI
  const result = await oauthClients.updateOne(
    { id: clientId },
    {
      $set: {
        redirect_uris: [
          'https://launchmass.doneisbetter.com/api/oauth/callback'
        ],
        updatedAt: new Date().toISOString(),
      }
    }
  );
  
  console.log('\n✅ Updated client');
  console.log(`   Modified count: ${result.modifiedCount}`);
  
  // Verify
  const updated = await oauthClients.findOne({ id: clientId });
  console.log('\n📋 New redirect URIs:');
  updated.redirect_uris?.forEach(uri => console.log(`   - ${uri}`));
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await client.close();
  console.log('\n✅ Done');
}
