#!/usr/bin/env node
/**
 * Regenerate OAuth client secret
 * 
 * WHAT: Generates a new client secret (UUID) and updates the client in database
 * WHY: Client secrets are hashed, so we can't retrieve the original. Need to generate new one.
 * HOW: Generate UUID, hash with bcrypt, update database, display plain secret
 * 
 * Usage: node scripts/regenerate-client-secret.mjs <client_id>
 */

import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { getDb } from '../lib/db.mjs'

const clientId = process.argv[2]

if (!clientId) {
  console.error('Usage: node scripts/regenerate-client-secret.mjs <client_id>')
  process.exit(1)
}

async function main() {
  console.log('🔄 Regenerating client secret...\n')
  
  try {
    const db = await getDb()
    
    // Find the client
    const client = await db.collection('oauthClients').findOne({ id: clientId })
    
    if (!client) {
      console.error('❌ Client not found:', clientId)
      process.exit(1)
    }
    
    console.log('Found client:', client.name)
    console.log('Client ID:', client.id)
    console.log('')
    
    // Generate new secret (UUID format)
    const newSecret = randomUUID()
    
    // Hash the secret for storage
    const hashedSecret = await bcrypt.hash(newSecret, 12)
    
    // Update the database
    await db.collection('oauthClients').updateOne(
      { id: clientId },
      { $set: { client_secret: hashedSecret } }
    )
    
    console.log('✅ Client secret regenerated successfully!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  IMPORTANT: Save these credentials securely!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('Client ID:')
    console.log(client.id)
    console.log('')
    console.log('Client Secret (PLAIN TEXT - save this now):')
    console.log(newSecret)
    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('Update these environment variables in LaunchMass:')
    console.log('')
    console.log(`SSO_CLIENT_ID=${client.id}`)
    console.log(`SSO_CLIENT_SECRET=${newSecret}`)
    console.log(`NEXT_PUBLIC_SSO_CLIENT_ID=${client.id}`)
    console.log('')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
