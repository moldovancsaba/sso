#!/usr/bin/env node
/**
 * Get OAuth client secret
 * 
 * Usage: node scripts/get-client-secret.mjs <client_id>
 */

import { getDb } from '../lib/db.mjs'

const clientId = process.argv[2]

if (!clientId) {
  console.error('Usage: node scripts/get-client-secret.mjs <client_id>')
  process.exit(1)
}

async function main() {
  try {
    const db = await getDb()
    
    const client = await db.collection('oauthClients').findOne({ client_id: clientId })

    if (!client) {
      console.error('❌ Client not found:', clientId)
      process.exit(1)
    }

    console.log('Client ID:', client.client_id)
    console.log('Client Name:', client.name)
    // client_secret is stored bcrypt-hashed (see lib/oauth/clients.mjs registerClient) — the
    // plaintext secret is only ever shown once, at creation or regeneration time.
    console.log('Client Secret (bcrypt hash, not usable as a credential):', client.client_secret || '(not set)')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
