#!/usr/bin/env node

/**
 * WHAT: Verify if launchmass client secret matches the database
 * WHY: Need to ensure the secret in launchmass .env.local is correct
 * HOW: Compare the plaintext secret with the hashed version in database
 */

import { getDb } from '../lib/db.mjs'
import bcrypt from 'bcryptjs'

const clientId = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f'
const secretToTest = '2c5d4134-d014-438d-9273-950828ed1443'

async function main() {
  try {
    const db = await getDb()
    const client = await db.collection('oauthClients').findOne({ client_id: clientId })
    
    if (!client) {
      console.log('❌ Client not found')
      process.exit(1)
    }
    
    console.log('🔐 Testing client secret for:', client.name)
    
    const isValid = await bcrypt.compare(secretToTest, client.client_secret)
    
    if (isValid) {
      console.log('✅ Client secret is VALID')
      console.log('   Launchmass can successfully authenticate with SSO')
    } else {
      console.log('❌ Client secret is INVALID')
      console.log('   The secret in launchmass .env.local does NOT match the database')
      console.log('   OAuth token exchange will fail')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
