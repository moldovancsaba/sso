#!/usr/bin/env node

/**
 * WHAT: Register messmass as a confidential OAuth2/OIDC client in SSO
 * WHY: messmass previously only used SSO's token-validate endpoint (a shortcut
 *      that required a pre-existing local account); it now runs the same real
 *      Authorization Code flow camera/launchmass already use. See
 *      SSO_EMAIL_UNIFICATION_PLAN.md and messmass's
 *      lib/auth/{ssoOAuth,ssoPermissions}.ts.
 * HOW: registerClient() from lib/oauth/clients.mjs -- same helper the admin API
 *      (pages/api/admin/oauth-clients) uses, not a raw collection insert.
 *
 * Usage: node scripts/register-messmass-client.mjs
 * Requires .env.local with MONGODB_URI (this project's own DB).
 * Idempotent: exits early if a client named "messmass" already exists.
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'sso';

if (!uri) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const oauthClients = db.collection('oauthClients');
  const users = db.collection('users');

  const existing = await oauthClients.findOne({ name: 'messmass' });
  if (existing) {
    console.log('messmass client already exists:');
    console.log(`  client_id: ${existing.client_id}`);
    console.log(`  redirect_uris: ${(existing.redirect_uris || []).join(', ')}`);
    console.log('  (client_secret is hashed and not shown; regenerate via the admin UI if it was lost)');
    process.exit(0);
  }

  const owner = await users.findOne({ role: { $in: ['admin', 'super-admin', 'superadmin'] } });
  if (!owner) {
    console.error('No admin user found in SSO to own this client. Create one first.');
    process.exit(1);
  }

  // Local import to reuse the exact same registration path the admin UI uses.
  const { registerClient } = await import('../lib/oauth/clients.mjs');

  const { client: newClient, client_secret } = await registerClient({
    name: 'messmass',
    description: 'messmass event analytics platform',
    redirect_uris: [
      'http://localhost:3001/api/auth/sso/callback',
      'https://messmass.com/api/auth/sso/callback',
      'https://www.messmass.com/api/auth/sso/callback',
      'https://messmass.doneisbetter.com/api/auth/sso/callback',
    ],
    allowed_scopes: ['openid', 'profile', 'email'],
    grant_types: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'client_secret_post',
    require_pkce: false, // confidential client: server-side token exchange only
    owner_user_id: owner.id,
    homepage_uri: 'https://messmass.com',
  });

  console.log('messmass OAuth client registered.');
  console.log('');
  console.log('  SSO_CLIENT_ID=' + newClient.client_id);
  console.log('  SSO_CLIENT_SECRET=' + client_secret);
  console.log('');
  console.log('This secret is shown ONCE -- copy it into messmass\'s env now');
  console.log('(Vercel project + local .env.local), it cannot be retrieved again.');
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  await client.close();
}
