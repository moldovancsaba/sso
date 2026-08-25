#!/usr/bin/env node
/**
 * Register the management-staff-agent OAuth client.
 *
 * WHAT: Creates a confidential machine-to-machine client for durable, headless staff access to
 *       the management app (console, admin actions) — an agent or scheduled job operating those
 *       surfaces without a person at a browser.
 * WHY:  no existing scope covered this. `management:ingest.write`/`management:catalog.read`
 *       authorize only the content pipeline's ingest API; the staff console had no machine path
 *       at all, only the interactive SSO login through a real staff member's browser.
 *
 * Machine-only by construction:
 *  - grant_types is client_credentials alone. There is no human login and no browser redirect
 *    in this flow.
 *  - redirect_uris is empty, for the same reason.
 *  - allowed_scopes is management:staff and nothing else.
 *
 * Deliberately its OWN client, not a scope bolted onto openclaw-worker: SSO's own guidance is
 * one client per automated caller (see register-openclaw-worker-client.mjs's own docs), so this
 * credential can be revoked or rotated without touching the content-pipeline credential, and a
 * leak of one cannot be mistaken for a leak of the other.
 *
 * The generated secret is stored bcrypt-hashed and cannot be recovered afterwards. This script
 * writes it to a file rather than printing it, so it does not land in terminal scrollback or CI
 * logs. If it is lost, rotate with scripts/regenerate-client-secret.mjs rather than re-registering.
 *
 *   node scripts/register-management-staff-agent-client.mjs
 */

import { writeFileSync, chmodSync } from 'fs'
import { config } from 'dotenv'
import { registerClient, getClient } from '../lib/oauth/clients.mjs'
import { SCOPE_DEFINITIONS } from '../lib/oauth/scopes.mjs'

config({ path: '.env.production.local' })
config({ path: '.env.local' })
config()

const CLIENT_NAME = 'management-staff-agent'
const SCOPES = ['management:staff']
const SECRET_OUT = process.env.SECRET_OUT || '.management-staff-agent-client-secret.local'

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.')
    process.exit(1)
  }

  // WHAT: Refuse to run against a build that predates this scope.
  // WHY: allowed_scopes is not validated against SCOPE_DEFINITIONS at registration time, so on
  //      an older checkout this would happily create a client whose scope the token endpoint
  //      then rejects as invalid_scope — a client that looks correct and cannot obtain a token.
  const unknown = SCOPES.filter((s) => !SCOPE_DEFINITIONS[s])
  if (unknown.length > 0) {
    console.error(`Scope(s) not registered in lib/oauth/scopes.mjs on this checkout: ${unknown.join(', ')}`)
    console.error('Add management:staff to lib/oauth/scopes.mjs and deploy it before running this.')
    process.exit(1)
  }

  // WHAT: Refuse to create a second registration for the same caller.
  // WHY: Duplicate clients mean two live secrets for one caller, and revoking one would leave
  //      the other working - a silent gap when withdrawing access.
  const { getDb } = await import('../lib/db.mjs')
  const db = await getDb()
  const existing = await db.collection('oauthClients').findOne({ name: CLIENT_NAME })

  if (existing) {
    console.log(`A client named '${CLIENT_NAME}' already exists (client_id ${existing.client_id}).`)
    console.log('Grants:', (existing.grant_types || []).join(', ') || 'none')
    console.log('Scopes:', (existing.allowed_scopes || []).join(', ') || 'none')
    console.log('\nNothing created. To rotate its secret use scripts/regenerate-client-secret.mjs.')
    process.exit(0)
  }

  // WHAT: Every client record needs an owning admin user.
  // WHY: registerClient rejects a client with no owner_user_id, and the field is what ties a
  //      machine credential back to a human accountable for it.
  const owner = await db.collection('users').findOne({
    role: { $in: ['admin', 'super-admin', 'superadmin'] },
  })
  if (!owner) {
    console.error('No admin user found in SSO to own this client. Create one first.')
    process.exit(1)
  }

  const { client, client_secret } = await registerClient({
    name: CLIENT_NAME,
    description: 'Headless staff access to the management app (console, admin actions). No user login.',
    redirect_uris: [],
    allowed_scopes: SCOPES,
    grant_types: ['client_credentials'],
    owner_user_id: owner.id,
  })

  // WHAT: Write the secret to an owner-only file instead of stdout.
  // WHY: Printing it puts a live credential into terminal history and any log capture.
  const body = [
    '# management-staff-agent machine client. Keep this file private; do not commit it.',
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
  console.log(`\nSecret written to ${SECRET_OUT} (mode 600). It cannot be recovered later.`)
  console.log('Move it wherever this agent keeps durable credentials, then delete the file here.')

  const check = await getClient(client.client_id)
  console.log('\nverified in database:', !!check && check.status === 'active')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error.message)
    process.exit(1)
  })
