#!/usr/bin/env node
/**
 * Verify OAuth client secret
 * 
 * Usage: node scripts/verify-client-secret.mjs <client_id> <plaintext_secret>
 */

import bcrypt from 'bcryptjs'
import { getDb } from '../lib/db.mjs'

const clientId = process.argv[2]
const plaintextSecret = process.argv[3]

if (!clientId || !plaintextSecret) {
  console.error('Usage: node scripts/verify-client-secret.mjs <client_id> <plaintext_secret>')
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
    
    console.log('🔍 Checking client:', client.name)
    console.log('   Client ID:', client.client_id)
    
    if (!client.client_secret) {
      console.error('❌ Client has no secret stored')
      process.exit(1)
    }
    
    // Compare plaintext secret with stored hash
    const isValid = await bcrypt.compare(plaintextSecret, client.client_secret)
    
    if (isValid) {
      console.log('✅ SECRET MATCHES! The plaintext secret is correct.')
    } else {
      console.log('❌ SECRET MISMATCH! The plaintext secret does not match the stored hash.')
      console.log('\n⚠️  This is why token_exchange_failed is happening!')
      console.log('\n📝 Next steps:')
      console.log('   1. Regenerate the client secret: node scripts/regenerate-client-secret.mjs ' + clientId)
      console.log('   2. Update LaunchMass .env.local with the new secret')
      console.log('   3. Restart LaunchMass dev server')
    }
    
    process.exit(isValid ? 0 : 1)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
