#!/usr/bin/env node
/**
 * Quick Client Check - Non-hanging version
 * Simplified check without any dependencies that might cause hanging
 */

import { getDb } from '../lib/db.mjs'

async function quickCheck() {
  try {
    console.log('🔍 Connecting to database...')
    const db = await getDb()
    
    const clientId = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f'
    console.log(`\n🔍 Looking for client: ${clientId}`)
    
    const client = await db.collection('oauthClients').findOne({ 
      client_id: clientId 
    })
    
    if (!client) {
      console.log('❌ Client not found')
      process.exit(1)
    }
    
    console.log('\n✅ Client found:')
    console.log('   Name:', client.name)
    console.log('   Status:', client.status)
    console.log('   Redirect URIs:', client.redirect_uris)
    console.log('   Require PKCE:', client.require_pkce)
    console.log('   Has client_secret:', !!client.client_secret)
    console.log('   Created:', client.created_at)
    
    // Check if the client has all required fields
    const requiredFields = ['client_id', 'name', 'redirect_uris', 'allowed_scopes', 'status']
    const missingFields = requiredFields.filter(f => !client[f])
    
    if (missingFields.length > 0) {
      console.log('\n⚠️  Missing fields:', missingFields.join(', '))
    } else {
      console.log('\n✅ All required fields present')
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

quickCheck()
