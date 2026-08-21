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
 *   REVOKE_M2M="name-a,name-b" DRY_RUN=false node scripts/enable-m2m-clients.mjs
 *                                                      # strip machine access instead
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

// WHAT: Clients to strip machine access from, by name or client_id.
// WHY: A machine credential on a client with no machine workflow is standing attack
//      surface for no benefit - its bearer can write permission records for every user
//      of that client. Revoking removes the client_credentials grant and the
//      manage_permissions scope; nothing else about the client is touched.
const REVOKE = (process.env.REVOKE_M2M || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const M2M_SCOPE = 'manage_permissions'

export function classify(client) {
  // WHAT: A previous revocation permanently excludes a client from the eligibility pass.
  // WHY: Revocation was a one-shot edit with nothing recorded, so the next ordinary
  //      `DRY_RUN=false` run silently re-granted a credential an operator had
  //      deliberately removed. This flag makes the decision durable. Lift it by naming
  //      the client explicitly in M2M_CLIENTS, which is a deliberate statement of intent.
  if (client.m2m_excluded) {
    return { eligible: false, reason: 'excluded from machine access by a previous revocation' }
  }
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

      // WHAT: Revocation wins over every other rule for a named client.
      // WHY: An operator naming a client in REVOKE_M2M is stating it must not hold
      //      machine access; that must not be re-granted by the eligibility pass in the
      //      same run.
      const revoking = REVOKE.includes(client.name) || REVOKE.includes(client.client_id)

      // WHAT: Naming a client explicitly in M2M_CLIENTS lifts a previous exclusion.
      // WHY: Spelling out a single client is a deliberate statement, the same way
      //      REVOKE_M2M is. A bare run across every client must never lift it silently.
      const explicit = ONLY.length > 0 && (ONLY.includes(client.name) || ONLY.includes(client.client_id))
      const clearingExclusion = Boolean(explicit && !revoking && client.m2m_excluded)

      const { eligible, reason } = classify(clearingExclusion ? { ...client, m2m_excluded: false } : client)
      const addGrant = !revoking && targeted && eligible && !grants.includes('client_credentials')
      const addScope = !revoking && targeted && eligible && !scopes.includes(M2M_SCOPE)
      const dropGrant = revoking && grants.includes('client_credentials')
      const dropScope = revoking && scopes.includes(M2M_SCOPE)
      const settingExclusion = Boolean(revoking && !client.m2m_excluded)

      if (!deadScopes.length && !addGrant && !addScope && !dropGrant && !dropScope && !settingExclusion && !clearingExclusion) {
        const why = revoking ? 'already revoked and excluded' : !targeted ? 'not targeted' : eligible ? 'already correct' : reason
        console.log(`  ${label.padEnd(22)} no change (${why})`)
        continue
      }

      let nextGrants = addGrant ? [...grants, 'client_credentials'] : grants
      if (dropGrant) nextGrants = nextGrants.filter((g) => g !== 'client_credentials')

      let nextScopes = scopes.filter((s) => !deadScopes.includes(s))
      if (addScope) nextScopes.push(M2M_SCOPE)
      if (dropScope) nextScopes = nextScopes.filter((s) => s !== M2M_SCOPE)

      const actions = []
      if (settingExclusion) actions.push('(excluding from future runs)')
      if (clearingExclusion) actions.push('(lifting previous exclusion)')
      if (addGrant) actions.push('+client_credentials')
      if (addScope) actions.push(`+${M2M_SCOPE}`)
      if (dropGrant) actions.push('-client_credentials')
      if (dropScope) actions.push(`-${M2M_SCOPE}`)
      if (deadScopes.length) actions.push(`-[${deadScopes.join(', ')}]`)
      if (targeted && !eligible) actions.push(`(M2M skipped: ${reason})`)

      console.log(`  ${label.padEnd(22)} ${actions.join('  ')}`)

      plan.push({
        client_id: client.client_id,
        label,
        nextGrants,
        nextScopes,
        m2mExcluded: revoking ? true : clearingExclusion ? false : undefined,
      })
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
      const set = {
        grant_types: item.nextGrants,
        allowed_scopes: item.nextScopes,
        updated_at: new Date(),
      }
      // WHAT: Persist the exclusion decision alongside the grant change.
      // WHY: Without it the revocation is invisible to the next run, which would
      //      re-grant the credential. Only set when revoking or explicitly lifting.
      if (item.m2mExcluded !== undefined) set.m2m_excluded = item.m2mExcluded

      await clients.updateOne({ client_id: item.client_id }, { $set: set })
      console.log(`  updated ${item.label}`)
    }

    console.log(`\n${plan.length} client(s) updated.`)
    console.log('Existing tokens are unaffected. Clients granted client_credentials need')
    console.log('their client_secret to request a token; use scripts/get-client-secret.mjs.')
  } finally {
    await mongo.close()
  }
}

// WHAT: Only run when invoked directly, not when imported.
// WHY: classify() is exported so its eligibility rules can be tested. Without this
//      guard, importing the module would connect to the database and start mutating
//      client records as a side effect of running the test suite.
const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`

if (invokedDirectly) {
  main().catch((error) => {
    console.error('Failed:', error.message)
    process.exit(1)
  })
}
