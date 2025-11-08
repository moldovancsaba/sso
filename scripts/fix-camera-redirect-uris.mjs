#!/usr/bin/env node

/**
 * WHAT: Add fancamera.vercel.app redirect URI to camera OAuth client
 * WHY: Production deployment needs https://fancamera.vercel.app/api/auth/callback registered
 * HOW: Update oauthClients collection to add the Vercel redirect URI
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
  
  const clientId = '1e59b6a1-3c18-4141-9139-7a3dd0da62bf';
  
  console.log(`🔍 Looking for client: ${clientId}`);
  
  // Check current state
  const existing = await oauthClients.findOne({ id: clientId });
  
  if (!existing) {
    console.error('❌ Client not found');
    console.log('\nℹ️  You may need to create the OAuth client first.');
    console.log('   Run this in the SSO admin panel or use the API:');
    console.log('   POST /api/admin/oauth-clients');
    console.log('   {');
    console.log('     "name": "Camera",');
    console.log('     "description": "Camera web application",');
    console.log('     "redirect_uris": [');
    console.log('       "http://localhost:3000/api/auth/callback",');
    console.log('       "https://fancamera.vercel.app/api/auth/callback"');
    console.log('     ]');
    console.log('   }');
    process.exit(1);
  }
  
  console.log('\n📋 Current redirect URIs:');
  existing.redirect_uris?.forEach(uri => console.log(`   - ${uri}`));
  
  // Add the Vercel redirect URI if not already present
  const redirectUris = existing.redirect_uris || [];
  const vercelUri = 'https://fancamera.vercel.app/api/auth/callback';
  const localhostUri = 'http://localhost:3000/api/auth/callback';
  
  // Build the updated list, ensuring both localhost and Vercel are included
  const updatedUris = [...new Set([
    ...redirectUris,
    localhostUri,
    vercelUri
  ])];
  
  if (JSON.stringify(redirectUris.sort()) === JSON.stringify(updatedUris.sort())) {
    console.log('\n✅ Redirect URIs already up to date');
  } else {
    const result = await oauthClients.updateOne(
      { id: clientId },
      {
        $set: {
          redirect_uris: updatedUris,
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
  }
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await client.close();
  console.log('\n✅ Done');
}
