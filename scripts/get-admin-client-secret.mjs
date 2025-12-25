#!/usr/bin/env node
/**
 * Get SSO Admin Client Secret
 * 
 * WHAT: Retrieves the client_secret hash for sso-admin-dashboard OAuth client
 * WHY: Need this to add to Vercel environment variables for admin callback
 * HOW: Query oauthClients collection for the internal admin client
 */

import { getDb } from '../lib/db.mjs'
import { MongoClient } from 'mongodb'

async function getAdminClientSecret() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB || 'sso'

  if (!uri) {
    console.error('❌ MONGODB_URI not configured')
    process.exit(1)
  }

  console.log('🔍 Connecting to MongoDB...')
  
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    const db = client.db(dbName)
    
    const adminClient = await db.collection('oauthClients').findOne({
      client_id: 'sso-admin-dashboard'
    })
    
    if (!adminClient) {
      console.error('❌ SSO Admin OAuth client not found')
      console.log('Run scripts/bootstrap-admin-client.mjs first')
      process.exit(1)
    }
    
    console.log('✅ Found SSO Admin OAuth client')
    console.log('\n📋 Client Details:')
    console.log(`  Name: ${adminClient.name}`)
    console.log(`  Client ID: ${adminClient.client_id}`)
    console.log(`  Status: ${adminClient.status}`)
    console.log(`  Created: ${adminClient.created_at}`)
    
    console.log('\n🔐 Client Secret (bcrypt hash):')
    console.log(adminClient.client_secret)
    
    console.log('\n⚠️  IMPORTANT: This is a bcrypt hash, NOT the plain-text secret!')
    console.log('The plain-text secret was generated during bootstrap and cannot be recovered.')
    console.log('If you lost it, you need to regenerate a new client_secret.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

getAdminClientSecret()
