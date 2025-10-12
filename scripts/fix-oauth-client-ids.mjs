#!/usr/bin/env node
/**
 * Fix OAuth clients missing UUID identifiers
 * 
 * WHAT: Adds UUID 'id' field to OAuth clients that only have MongoDB _id
 * WHY: OAuth flow uses client.id for authorization codes, tokens, etc.
 * HOW: Generate UUID from existing _id or create new one
 */

import { randomUUID } from 'crypto'
import { getDb } from '../lib/db.mjs'

async function main() {
  console.log('🔧 Fixing OAuth client IDs...\n')
  
  try {
    const db = await getDb()
    
    // Find clients without 'id' field
    const clientsWithoutId = await db.collection('oauthClients')
      .find({ id: { $exists: false } })
      .toArray()
    
    if (clientsWithoutId.length === 0) {
      console.log('✅ All OAuth clients already have UUID IDs')
      process.exit(0)
    }
    
    console.log(`Found ${clientsWithoutId.length} clients without UUID IDs:\n`)
    
    for (const client of clientsWithoutId) {
      const newId = randomUUID()
      
      console.log(`📝 Updating client: ${client.name}`)
      console.log(`   MongoDB _id: ${client._id}`)
      console.log(`   New UUID: ${newId}`)
      
      await db.collection('oauthClients').updateOne(
        { _id: client._id },
        { $set: { id: newId } }
      )
      
      console.log(`   ✅ Updated\n`)
    }
    
    console.log('✅ All OAuth clients now have UUID IDs')
    console.log('\n⚠️  IMPORTANT: Update any external systems that reference client IDs!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
  
  process.exit(0)
}

main()
