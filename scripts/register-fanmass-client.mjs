#!/usr/bin/env node

/**
 * WHAT: Register fanmass as a public OAuth2/OIDC (PKCE) client in SSO
 * WHY: fanmass had no login system at all -- a single shared FANMASS_API_KEY
 *      anyone holding it could use. This registers it on the same identity
 *      provider messmass/camera/launchmass already use, so an operator gets
 *      one login instead of a pasted shared key. See
 *      SSO_EMAIL_UNIFICATION_PLAN.md Phase 3 and fanmass's
 *      services/sso_oauth.py + services/operator_sessions.py.
 * HOW: registerClient() from lib/oauth/clients.mjs.
 *
 * Public client (require_pkce: true, token_endpoint_auth_method: 'none'):
 * fanmass is a local-first Python/FastAPI tool run by an operator, not a
 * server with the same "never touches the browser" guarantee as messmass's
 * Next.js deployment -- PKCE is the simpler, equally secure choice, matching
 * camera's registration (also public+PKCE).
 *
 * Usage: node scripts/register-fanmass-client.mjs
 * Requires .env.local with MONGODB_URI (this project's own DB).
 * Idempotent: exits early if a client named "fanmass" already exists.
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

  const existing = await oauthClients.findOne({ name: 'fanmass' });
  if (existing) {
    console.log('fanmass client already exists:');
    console.log(`  client_id: ${existing.client_id}`);
    console.log(`  redirect_uris: ${(existing.redirect_uris || []).join(', ')}`);
    process.exit(0);
  }

  const owner = await users.findOne({ role: { $in: ['admin', 'super-admin', 'superadmin'] } });
  if (!owner) {
    console.error('No admin user found in SSO to own this client. Create one first.');
    process.exit(1);
  }

  const { registerClient } = await import('../lib/oauth/clients.mjs');

  const { client: newClient } = await registerClient({
    name: 'fanmass',
    description: 'fanmass image analytics dashboard',
    redirect_uris: [
      'http://127.0.0.1:8787/auth/callback',
      'http://localhost:8787/auth/callback',
      // Add the operator's real fanmass URL(s) here once known -- fanmass is
      // local-first (run per-operator machine or a fixed ops host), unlike
      // messmass/camera which have one fixed Vercel domain.
    ],
    allowed_scopes: ['openid', 'profile', 'email'],
    grant_types: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'none',
    require_pkce: true,
    owner_user_id: owner.id,
  });

  console.log('fanmass OAuth client registered.');
  console.log('');
  console.log('  SSO_CLIENT_ID=' + newClient.client_id);
  console.log('');
  console.log('Public client -- no secret. Set SSO_BASE_URL + SSO_CLIENT_ID in fanmass');
  console.log('(.config/settings.json ssoBaseUrl/ssoClientId, or env vars).');
  console.log('Add any additional real redirect URIs via the admin UI before relying on them.');
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
} finally {
  await client.close();
}
