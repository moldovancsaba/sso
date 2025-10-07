#!/usr/bin/env node
/**
 * Verify OAuth Client Configuration
 * 
 * WHAT: Checks the current state of an OAuth client in production
 * WHY: Ensure require_pkce is set correctly after v5.3.0 deployment
 * 
 * Usage:
 *   node scripts/verify-oauth-client.mjs <client_id>
 */

import { getDb } from '../lib/db.mjs'

const clientId = process.argv[2] || '04dc2cc1-9fd3-4ffa-9813-450dca97af92'

async function verifyClient() {
  console.log('🔍 Verifying OAuth Client Configuration')
  console.log('=' .repeat(70))
  console.log(`\nClient ID: ${clientId}\n`)

  try {
    const db = await getDb()
    const client = await db.collection('oauthClients').findOne({ client_id: clientId })

    if (!client) {
      console.log('❌ Client not found!')
      process.exit(1)
    }

    console.log('✅ Client found!')
    console.log('\n📋 Client Configuration:')
    console.log('─'.repeat(70))
    console.log(`Name:              ${client.name}`)
    console.log(`Status:            ${client.status}`)
    console.log(`Require PKCE:      ${client.require_pkce ?? 'NOT SET (using default)'}`)
    console.log(`Redirect URIs:     ${client.redirect_uris.length} configured`)
    client.redirect_uris.forEach((uri, i) => {
      console.log(`  ${i + 1}. ${uri}`)
    })
    console.log(`Allowed Scopes:    ${client.allowed_scopes.join(', ')}`)
    console.log(`Grant Types:       ${client.grant_types.join(', ')}`)
    console.log(`Created:           ${client.created_at}`)
    console.log(`Updated:           ${client.updated_at}`)
    
    console.log('\n' + '─'.repeat(70))
    
    // Check if require_pkce needs to be updated
    if (client.require_pkce === undefined) {
      console.log('\n⚠️  WARNING: require_pkce field is missing!')
      console.log('   This field should be set to false for server-side clients.')
      console.log('   Run the migration script to add this field.')
      console.log('\n   Command: node scripts/migrations/2025-10-06-add-require-pkce-field.mjs')
    } else if (client.require_pkce === false) {
      console.log('\n✅ Configuration is correct!')
      console.log('   PKCE is optional for this confidential client.')
      console.log('   This is the recommended setting for server-side applications.')
    } else if (client.require_pkce === true) {
      console.log('\n⚠️  PKCE is REQUIRED for this client.')
      console.log('   This is recommended for public clients (mobile/SPA).')
      console.log('   For server-side clients, consider setting require_pkce: false')
    }

    console.log('\n' + '='.repeat(70))
    console.log('✨ Verification complete!')
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

verifyClient()
