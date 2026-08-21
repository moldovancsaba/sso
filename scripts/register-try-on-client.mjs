#!/usr/bin/env node
/**
 * Register the try-on OAuth client.
 *
 * WHAT: Creates a confidential machine-to-machine client for `try-on`.
 * WHY:  try-on's own users do not authenticate through SSO. It needs to call other
 *       services that are SSO-protected, which is what the client_credentials grant
 *       exists for. It had no OAuth client registered at all, so it could not reach
 *       those services.
 *
 * Machine-only by construction:
 *  - grant_types is client_credentials alone. No authorization_code, because there is no
 *    human login and no browser redirect in this flow.
 *  - redirect_uris is empty, for the same reason.
 *  - allowed_scopes is manage_permissions only. That scope is machine-only in
 *    lib/oauth/scopes.mjs and is rejected on /authorize by design.
 *
 * The generated secret is stored bcrypt-hashed and cannot be recovered afterwards. This
 * script writes it to a file rather than printing it, so it does not land in terminal
 * scrollback or CI logs. Move it into try-on's environment and delete the file. If it is
 * lost, rotate with scripts/regenerate-client-secret.mjs rather than re-registering.
 *
 *   node scripts/register-try-on-client.mjs
 */

import { writeFileSync, chmodSync } from 'fs'
import { config } from 'dotenv'
import { registerClient, getClient } from '../lib/oauth/clients.mjs'

config({ path: '.env.production.local' })
config({ path: '.env.local' })
config()

const CLIENT_NAME = 'try-on'
const SECRET_OUT = process.env.SECRET_OUT || '.try-on-client-secret.local'

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.')
    process.exit(1)
  }

  // WHAT: Refuse to create a second registration for the same product.
  // WHY: Duplicate clients mean two live secrets for one service, and revoking one would
  //      leave the other working - a silent gap when withdrawing access.
  const { getDb } = await import('../lib/db.mjs')
  const db = await getDb()
  const existing = await db.collection('oauthClients').findOne({ name: CLIENT_NAME })

  if (existing) {
    console.log(`A client named '${CLIENT_NAME}' already exists (client_id ${existing.client_id}).`)
    console.log('Grants:', (existing.grant_types || []).join(', ') || 'none')
    console.log('Scopes:', (existing.allowed_scopes || []).join(', ') || 'none')
    console.log('\nNothing created. To rotate its secret use scripts/regenerate-client-secret.mjs;')
    console.log('to adjust its grants use scripts/enable-m2m-clients.mjs.')
    process.exit(0)
  }

  const { client, client_secret } = await registerClient({
    name: CLIENT_NAME,
    description: 'Machine client for try-on to call SSO-protected services. No user login.',
    redirect_uris: [],
    allowed_scopes: ['manage_permissions'],
    grant_types: ['client_credentials'],
  })

  // WHAT: Write the secret to an owner-only file instead of stdout.
  // WHY: Printing it puts a live credential into terminal history and any log capture.
  //      .gitignore already covers dotfiles of this shape via the .env* rule pattern;
  //      verify before committing anything from the repo root.
  writeFileSync(SECRET_OUT, `SSO_CLIENT_ID=${client.client_id}\nSSO_CLIENT_SECRET=${client_secret}\n`, { mode: 0o600 })
  chmodSync(SECRET_OUT, 0o600)

  console.log('Registered:', client.name)
  console.log('client_id :', client.client_id)
  console.log('grants    :', client.grant_types.join(', '))
  console.log('scopes    :', client.allowed_scopes.join(', '))
  console.log(`\nSecret written to ${SECRET_OUT} (mode 600). Move it into try-on's`)
  console.log('environment, then delete the file. It cannot be recovered later.')
  console.log('\nRequest a token with:')
  console.log('  POST https://sso.doneisbetter.com/api/oauth/token')
  console.log('  {"grant_type":"client_credentials","client_id":"...","client_secret":"...","scope":"manage_permissions"}')
  console.log('\nSend credentials in the body. The token endpoint does not read HTTP Basic.')

  const check = await getClient(client.client_id)
  console.log('\nverified in database:', !!check && check.status === 'active')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error.message)
    process.exit(1)
  })
