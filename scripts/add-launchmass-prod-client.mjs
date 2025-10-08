#!/usr/bin/env node

/**
 * WHAT: Add the correct OAuth client for production launchmass
 * WHY: Production launchmass is using client ID 04dc2cc1-9fd3-4ffa-9813-450dca97af92
 * HOW: Insert into oauthClients collection
 */

import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://moldovancsaba:togwa1-xyhcEp-mozceb@mongodb-thanperfect.zf2o0ix.mongodb.net/sso_database?retryWrites=true&w=majority';

const client = new MongoClient(uri);

try {
  await client.connect();
  console.log('✅ Connected to MongoDB');
  
  const db = client.db('sso_database');
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
    
    const newClient = {
      client_id: clientId,
      client_secret: 'bc43d236-e6a8-4402-a1b8-39153e8a5cca', // Keep same secret
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
