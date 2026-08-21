#!/usr/bin/env node
/**
 * Enable machine-to-machine (client_credentials) access on eligible OAuth clients.
 *
 * WHAT: Surveys every record in `oauthClients`, classifies each as eligible or
 *       ineligible for the client_credentials grant, adds the grant plus the
 *       `manage_permissions` scope to the eligible ones, and strips scopes that are
 *       not defined in lib/oauth/scopes.mjs.
 *
 * WHY:  The client_credentials grant is the only path that issues a token with no user
 *       context, so it is what an agent, daemon or scheduled job must use - the
 *       interactive authorization_code flow needs a browser and a human. Registration
 *       drifted from the scripts over time, so this reconciles the live records.
 *
 * SAFETY: Defaults to a dry run. Unlike the older scripts in this directory, which
 *         apply unless DRY_RUN=true is passed, this one previews unless you explicitly
 *         pass DRY_RUN=false. It writes to production authentication configuration, so
 *         the safe direction is the default.
 *
 *   node scripts/enable-m2m-clients.mjs                # preview (default)
 *   DRY_RUN=false node scripts/enable-m2m-clients.mjs  # apply
 *
 * A public client is never given client_credentials. Public clients declare
 * `token_endpoint_auth_method: 'none'` and ship in a browser or mobile bundle, so any
 * secret they hold is not secret. Granting them a secret-bearing grant would hand a
 * usable machine credential to anyone who opens devtools.
 */

import { config } from 'dotenv'
import { MongoClient } from 'mongodb'
import { ALL_SCOPE_IDS } from '../lib/oauth/scopes.mjs'

config({ path: '.env.production.local' })
config({ path: '.env.local' })
config()

// WHAT: Preview unless explicitly told otherwise. See the SAFETY note above.
const DRY_RUN = process.env.DRY_RUN !== 'false'

// WHAT: Clients that should be able to act on their own behalf.
// WHY: An empty list means "every eligible confidential client". Set M2M_CLIENTS to a
//      comma-separated list of names or client_ids to narrow the change.
const ONLY = (process.env.M2M_CLIENTS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const M2M_SCOPE = 'manage_permissions'

function classify(client) {
  if (client.status !== 'active') {
    return { eligible: false, reason: `status is ${client.status}, not active` }
  }
  if (client.token_endpoint_auth_method === 'none') {
    return { eligible: false, reason: 'public client (token_endpoint_auth_method: none) - cannot hold a secret' }
  }
  if (!client.client_secret) {
    return { eligible: false, reason: 'no client_secret on record - nothing to authenticate with' }
  }
  return { eligible: true, reason: null }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Populate it before running.')
    process.exit(1)
  }

  // WHAT: Refuse to run against a build where manage_permissions is not a registered scope.
  // WHY: This script strips scopes missing from ALL_SCOPE_IDS. On a checkout predating the
  //      change that registered manage_permissions, it would classify that scope as dead
  //      and remove it from clients that legitimately hold it - silently breaking the very
  //      machine-to-machine access this script exists to enable.
  if (!ALL_SCOPE_IDS.includes(M2M_SCOPE)) {
    console.error(
      `'${M2M_SCOPE}' is not registered in lib/oauth/scopes.mjs on this checkout.\n` +
      'Running now would strip it from clients that already have it. Update to a build\n' +
      'that registers the scope before running this script.'
    )
    process.exit(1)
  }

  const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  await mongo.connect()

  try {
    const clients = mongo.db(process.env.MONGODB_DB).collection('oauthClients')
    const records = await clients.find({}).toArray()

    console.log(DRY_RUN ? '=== DRY RUN - no writes ===\n' : '=== APPLYING CHANGES ===\n')
    console.log(`${records.length} client(s) found\n`)

    const plan = []

    for (const client of records) {
      const label = client.name || client.client_id
      const targeted = ONLY.length === 0 || ONLY.includes(client.name) || ONLY.includes(client.client_id)

      const grants = Array.isArray(client.grant_types) ? [...client.grant_types] : []
      const scopes = Array.isArray(client.allowed_scopes) ? [...client.allowed_scopes] : []

      // WHAT: Scopes the SSO does not define are unusable - /authorize rejects them with
      //       invalid_scope, and nothing reads them. Strip them regardless of eligibility.
      const deadScopes = scopes.filter((s) => !ALL_SCOPE_IDS.includes(s))

      const { eligible, reason } = classify(client)
      const addGrant = targeted && eligible && !grants.includes('client_credentials')
      const addScope = targeted && eligible && !scopes.includes(M2M_SCOPE)

      if (!deadScopes.length && !addGrant && !addScope) {
        const why = !targeted ? 'not targeted' : eligible ? 'already correct' : reason
        console.log(`  ${label.padEnd(22)} no change (${why})`)
        continue
      }

      const nextGrants = addGrant ? [...grants, 'client_credentials'] : grants
      const nextScopes = scopes.filter((s) => !deadScopes.includes(s))
      if (addScope) nextScopes.push(M2M_SCOPE)

      const actions = []
      if (addGrant) actions.push('+client_credentials')
      if (addScope) actions.push(`+${M2M_SCOPE}`)
      if (deadScopes.length) actions.push(`-[${deadScopes.join(', ')}]`)
      if (targeted && !eligible) actions.push(`(M2M skipped: ${reason})`)

      console.log(`  ${label.padEnd(22)} ${actions.join('  ')}`)

      plan.push({ client_id: client.client_id, label, nextGrants, nextScopes })
    }

    if (!plan.length) {
      console.log('\nNothing to change.')
      return
    }

    if (DRY_RUN) {
      console.log(`\n${plan.length} client(s) would be updated.`)
      console.log('Re-run with DRY_RUN=false to apply.')
      return
    }

    for (const item of plan) {
      await clients.updateOne(
        { client_id: item.client_id },
        { $set: { grant_types: item.nextGrants, allowed_scopes: item.nextScopes, updated_at: new Date() } }
      )
      console.log(`  updated ${item.label}`)
    }

    console.log(`\n${plan.length} client(s) updated.`)
    console.log('Existing tokens are unaffected. Clients granted client_credentials need')
    console.log('their client_secret to request a token; use scripts/get-client-secret.mjs.')
  } finally {
    await mongo.close()
  }
}

main().catch((error) => {
  console.error('Failed:', error.message)
  process.exit(1)
})
