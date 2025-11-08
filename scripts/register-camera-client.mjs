#!/usr/bin/env node

/**
 * WHAT: Register Camera OAuth client in SSO
 * WHY: Camera app (fancamera.vercel.app) needs to authenticate users via SSO
 * HOW: Create OAuth client with specific client_id and redirect URIs
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Use SSO MongoDB URI (from .env.local in SSO project)
const uri = 'mongodb+srv://thanperfect:CuW54NNNFKnGQtt6@doneisbetter.49s2z.mongodb.net/?retryWrites=true&w=majority&appName=doneisbetter';

console.log('🔧 Using SSO MongoDB cluster');

if (!uri) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

const client = new MongoClient(uri);
const BCRYPT_ROUNDS = 12;

try {
  await client.connect();
  console.log('✅ Connected to MongoDB');
  
  const dbName = 'sso'; // Always use SSO database
  const db = client.db(dbName);
  console.log(`📊 Using database: ${dbName}`);
  const oauthClients = db.collection('oauthClients');
  
  // Use the specific client_id that's already in use
  const clientId = '1e59b6a1-3c18-4141-9139-7a3dd0da62bf';
  
  console.log(`🔍 Checking if client exists: ${clientId}`);
  
  // Check if client already exists
  const existing = await oauthClients.findOne({ client_id: clientId });
  
  if (existing) {
    console.log('✅ Client already exists');
    console.log('\n📋 Current configuration:');
    console.log(`   Name: ${existing.name}`);
    console.log(`   Client ID: ${existing.client_id}`);
    console.log('   Redirect URIs:');
    existing.redirect_uris?.forEach(uri => console.log(`     - ${uri}`));
    console.log(`   Status: ${existing.status}`);
    
    // Update redirect URIs to include Vercel
    const redirectUris = existing.redirect_uris || [];
    const vercelUri = 'https://fancamera.vercel.app/api/auth/callback';
    const localhostUri = 'http://localhost:3000/api/auth/callback';
    
    const updatedUris = [...new Set([
      ...redirectUris,
      localhostUri,
      vercelUri
    ])];
    
    if (JSON.stringify(redirectUris.sort()) !== JSON.stringify(updatedUris.sort())) {
      const result = await oauthClients.updateOne(
        { client_id: clientId },
        {
          $set: {
            redirect_uris: updatedUris,
            updated_at: new Date().toISOString(),
          }
        }
      );
      
      console.log('\n✅ Updated redirect URIs');
      console.log('   New redirect URIs:');
      updatedUris.forEach(uri => console.log(`     - ${uri}`));
    }
    
    process.exit(0);
  }
  
  // Generate a client secret
  const clientSecret = 'camera-client-secret-' + Math.random().toString(36).substring(2);
  const clientSecretHash = await bcrypt.hash(clientSecret, BCRYPT_ROUNDS);
  
  const now = new Date().toISOString();
  
  // Get a super-admin user to be the owner (or use a default)
  const users = db.collection('users');
  const allUsers = await users.find({}).limit(5).toArray();
  console.log('\n🔍 Sample users:', allUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
  
  const superAdmin = await users.findOne({ role: 'super-admin' });
  
  if (!superAdmin) {
    console.error('❌ No super-admin user found. Please create one first.');
    process.exit(1);
  }
  
  console.log('\n✅ Found super-admin:', { id: superAdmin.id, email: superAdmin.email });
  
  const newClient = {
    client_id: clientId,
    client_secret: clientSecretHash,
    name: 'Camera',
    description: 'Camera web application for photo management',
    redirect_uris: [
      'http://localhost:3000/api/auth/callback',
      'https://fancamera.vercel.app/api/auth/callback'
    ],
    allowed_scopes: ['openid', 'profile', 'email'],
    grant_types: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'none', // Public client (no secret required)
    require_pkce: true, // PKCE is required for public clients
    status: 'active',
    owner_user_id: superAdmin.id,
    logo_uri: null,
    homepage_uri: 'https://fancamera.vercel.app',
    created_at: now,
    updated_at: now,
  };
  
  await oauthClients.insertOne(newClient);
  
  console.log('✅ Camera OAuth client registered successfully');
  console.log('\n📋 Configuration:');
  console.log(`   Name: ${newClient.name}`);
  console.log(`   Client ID: ${newClient.client_id}`);
  console.log('   Redirect URIs:');
  newClient.redirect_uris.forEach(uri => console.log(`     - ${uri}`));
  console.log(`   PKCE Required: ${newClient.require_pkce}`);
  console.log(`   Auth Method: ${newClient.token_endpoint_auth_method}`);
  console.log('\n⚠️  This is a public client (no client secret required)');
  console.log('   PKCE is mandatory for security.');
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await client.close();
  console.log('\n✅ Done');
}
