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
    
    const client = await db.collection('oauthClients').findOne({ id: clientId })
    
    if (!client) {
      console.error('❌ Client not found:', clientId)
      process.exit(1)
    }
    
    console.log('Client ID:', client.id)
    console.log('Client Name:', client.name)
    console.log('Client Secret:', client.client_secret || '(not set)')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
