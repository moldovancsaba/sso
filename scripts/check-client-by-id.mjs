#!/usr/bin/env node
/**
 * Check if a specific OAuth client ID exists
 * 
 * Usage: node scripts/check-client-by-id.mjs <client_id>
 */

import { getDb } from '../lib/db.mjs'

const clientId = process.argv[2]

if (!clientId) {
  console.error('Usage: node scripts/check-client-by-id.mjs <client_id>')
  process.exit(1)
}

async function main() {
  console.log(`🔍 Checking for client ID: ${clientId}\n`)
  
  try {
    const db = await getDb()
    
    // Search by id field
    const clientById = await db.collection('oauthClients').findOne({ id: clientId })
    
    if (clientById) {
      console.log('✅ Found client by id field:')
      console.log('   ID:', clientById.id)
      console.log('   Name:', clientById.name)
      console.log('   Status:', clientById.status)
      console.log('   Redirect URIs:', clientById.redirect_uris)
      console.log('   Require PKCE:', clientById.require_pkce)
      console.log('   Client Secret:', clientById.client_secret ? '(present)' : '(missing)')
      return
    }
    
    // Search by _id (MongoDB ObjectId)
    console.log('❌ No client found with id =', clientId)
    console.log('\nSearching by _id (MongoDB ObjectId)...')
    
    try {
      const { ObjectId } = await import('mongodb')
      const clientByObjectId = await db.collection('oauthClients').findOne({ 
        _id: new ObjectId(clientId) 
      })
      
      if (clientByObjectId) {
        console.log('✅ Found client by _id (ObjectId):')
        console.log('   MongoDB _id:', clientByObjectId._id.toString())
        console.log('   UUID id:', clientByObjectId.id || '(missing)')
        console.log('   Name:', clientByObjectId.name)
        console.log('   Status:', clientByObjectId.status)
        return
      }
    } catch (err) {
      // Not a valid ObjectId, skip
    }
    
    console.log('\n❌ No client found with this ID')
    console.log('\nAll OAuth clients:')
    const allClients = await db.collection('oauthClients').find({}).toArray()
    for (const client of allClients) {
      console.log(`   - ${client.name}: id=${client.id || 'undefined'}, _id=${client._id}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
