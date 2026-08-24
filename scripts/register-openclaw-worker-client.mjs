#!/usr/bin/env node
/**
 * Register the openclaw-worker OAuth client.
 *
 * WHAT: Creates a confidential machine-to-machine client for the OpenClaw content pipeline,
 *       the process that discovers and enriches provider records and writes them into
 *       ClassScout's ingest API.
 * WHY:  it authenticates today with `INGEST_API_KEY` — one static string shared by every
 *       caller of that API. It never expires, it names nobody (so a leak cannot be traced
 *       back to a holder), and it cannot be withdrawn from the pipeline without breaking
 *       every other holder of the same string.
 *
 * Machine-only by construction:
 *  - grant_types is client_credentials alone. There is no human login and no browser
 *    redirect in this flow.
 *  - redirect_uris is empty, for the same reason.
 *  - allowed_scopes are the ClassScout and management RESOURCE scopes and nothing else.
 *
 * NOT manage_permissions. That scope rewrites per-user app-permission records at SSO
 * itself and has nothing to do with writing provider records; before 5.34.0 it was the
 * only machine scope in existence, so every machine caller was obliged to hold it. A
 * pipeline holding it could rewrite any user's access, which is standing attack surface
 * for a capability it never uses.
 *
 * Both scopes share the `classscout` prefix, so the issued token is stamped
 * `aud: classscout` and ClassScout's `verifyMachineToken` accepts it. A token that also
 * named a management scope would be refused — one token per resource, deliberately, so
 * leaking the ClassScout credential cannot also open management.
 *
 * The generated secret is stored bcrypt-hashed and cannot be recovered afterwards. This
 * script writes it to a file rather than printing it, so it does not land in terminal
 * scrollback or CI logs. Move it to OpenClaw's `.openclaw/workspace/.env.sso` and delete
 * the file. If it is lost, rotate with scripts/regenerate-client-secret.mjs rather than
 * re-registering.
 *
 *   node scripts/register-openclaw-worker-client.mjs
 */

import { writeFileSync, chmodSync } from 'fs'
import { config } from 'dotenv'
import { registerClient, getClient } from '../lib/oauth/clients.mjs'
import { SCOPE_DEFINITIONS } from '../lib/oauth/scopes.mjs'

config({ path: '.env.production.local' })
config({ path: '.env.local' })
config()

const CLIENT_NAME = 'openclaw-worker'
// Both applications OpenClaw writes to. A client may HOLD scopes for several resources;
// what SSO refuses is a single TOKEN whose scopes span two of them, so ssoauth.py asks per
// application and gets one token per resource, each stamped with that resource's audience.
// management is here because padel-africa runs on it: one instance per client, and the
// audience is the service, so every management instance is covered by the same two scopes.
const SCOPES = [
  'classscout:ingest.write', 'classscout:catalog.read',
  'management:ingest.write', 'management:catalog.read',
]
const SECRET_OUT = process.env.SECRET_OUT || '.openclaw-worker-client-secret.local'

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.')
    process.exit(1)
  }

  // WHAT: Refuse to run against a build that predates these scopes.
  // WHY: allowed_scopes is not validated against SCOPE_DEFINITIONS at registration time, so
  //      on an older checkout this would happily create a client whose scopes the token
  //      endpoint then rejects as invalid_scope — a client that looks correct and cannot
  //      obtain a token.
  const unknown = SCOPES.filter((s) => !SCOPE_DEFINITIONS[s])
  if (unknown.length > 0) {
    console.error(`Scope(s) not registered in lib/oauth/scopes.mjs on this checkout: ${unknown.join(', ')}`)
    console.error('Update to 5.34.0 or later before running this script.')
    process.exit(1)
  }

  // WHAT: Refuse to create a second registration for the same caller.
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

  // WHAT: Every client record needs an owning admin user.
  // WHY: registerClient rejects a client with no owner_user_id, and the field is what
  //      ties a machine credential back to a human accountable for it.
  const owner = await db.collection('users').findOne({
    role: { $in: ['admin', 'super-admin', 'superadmin'] },
  })
  if (!owner) {
    console.error('No admin user found in SSO to own this client. Create one first.')
    process.exit(1)
  }

  const { client, client_secret } = await registerClient({
    name: CLIENT_NAME,
    description: 'OpenClaw content pipeline. Writes provider records to the ClassScout ingest API. No user login.',
    redirect_uris: [],
    allowed_scopes: SCOPES,
    grant_types: ['client_credentials'],
    owner_user_id: owner.id,
  })

  // WHAT: Write the secret to an owner-only file instead of stdout.
  // WHY: Printing it puts a live credential into terminal history and any log capture.
  const body = [
    '# OpenClaw machine client. Install as .openclaw/workspace/.env.sso, then delete this file.',
    'export SSO_ISSUER_URL=https://sso.doneisbetter.com',
    `export SSO_CLIENT_ID=${client.client_id}`,
    `export SSO_CLIENT_SECRET=${client_secret}`,
    '',
  ].join('\n')
  writeFileSync(SECRET_OUT, body, { mode: 0o600 })
  chmodSync(SECRET_OUT, 0o600)

  console.log('Registered:', client.name)
  console.log('client_id :', client.client_id)
  console.log('grants    :', client.grant_types.join(', '))
  console.log('scopes    :', client.allowed_scopes.join(', '))
  console.log(`\nSecret written to ${SECRET_OUT} (mode 600), already in .env.sso format.`)
  console.log('Move it to OpenClaw at .openclaw/workspace/.env.sso, then delete the file here.')
  console.log('It cannot be recovered later.')
  console.log('\nOpenClaw picks it up with no further change: ssoauth.bearer("classscout") switches')
  console.log('from the legacy static key to a token automatically once that file exists. Confirm')
  console.log('with ssoauth.which("classscout").')

  const check = await getClient(client.client_id)
  console.log('\nverified in database:', !!check && check.status === 'active')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error.message)
    process.exit(1)
  })
