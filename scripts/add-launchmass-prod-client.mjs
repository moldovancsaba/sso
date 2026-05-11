#!/usr/bin/env node

/**
 * WHAT: Add the correct OAuth client for production launchmass
 * WHY: Production launchmass is using client ID 04dc2cc1-9fd3-4ffa-9813-450dca97af92
 * HOW: Insert into oauthClients collection
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'sso_database';
const launchmassClientSecret = process.env.LAUNCHMASS_CLIENT_SECRET;

if (!uri) {
  throw new Error('MONGODB_URI must be set');
}

const client = new MongoClient(uri);

try {
  await client.connect();
  console.log('✅ Connected to MongoDB');
  
  const db = client.db(dbName);
  const oauthClients = db.collection('oauthClients');
  
  const clientId = '04dc2cc1-9fd3-4ffa-9813-450dca97af92';
  
  // Check if already exists
  const existing = await oauthClients.findOne({ client_id: clientId });
  
  if (existing) {
    console.log('✅ Client already exists - updating...');
    await oauthClients.updateOne(
      { client_id: clientId },
      {
        $set: {
          name: 'launchmass',
          appName: 'launchmass',
          status: 'active',
          redirect_uris: [
            'https://launchmass.doneisbetter.com/api/oauth/callback',
            'https://launchmass.doneisbetter.com/auth/callback',
          ],
          allowed_scopes: ['openid', 'profile', 'email', 'offline_access'],
          require_pkce: false,
          updatedAt: new Date().toISOString(),
        }
      }
    );
    console.log('✅ Client updated');
  } else {
    console.log('Creating new OAuth client...');
    
    if (!launchmassClientSecret) {
      throw new Error('LAUNCHMASS_CLIENT_SECRET must be set before creating the client')
    }

    const newClient = {
      client_id: clientId,
      client_secret: launchmassClientSecret,
      name: 'launchmass',
      appName: 'launchmass',
      status: 'active',
      redirect_uris: [
        'https://launchmass.doneisbetter.com/api/oauth/callback',
        'https://launchmass.doneisbetter.com/auth/callback',
      ],
      allowed_scopes: ['openid', 'profile', 'email', 'offline_access'],
      require_pkce: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await oauthClients.insertOne(newClient);
    console.log('✅ OAuth client created');
  }
  
  // Verify
  const result = await oauthClients.findOne({ client_id: clientId });
  console.log('\n📱 OAuth Client:');
  console.log('   ID:', result.client_id);
  console.log('   Name:', result.name);
  console.log('   appName:', result.appName);
  console.log('   Status:', result.status);
  console.log('   Redirects:', result.redirect_uris.join(', '));
  
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  await client.close();
  console.log('\n✅ Done');
}
