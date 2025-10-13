#!/usr/bin/env node

/**
 * WHAT: Sync client_id field to match id field for launchmass OAuth client
 * WHY: launchmass is configured with id field but SSO looks up by client_id field
 * HOW: Update the client_id to match the id field
 */

import { getDb } from '../lib/db.mjs'

const targetId = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f'

async function main() {
  console.log('🔄 Syncing OAuth client IDs...\n')
  
  try {
    const db = await getDb()
    const oauthClients = db.collection('oauthClients')
    
    // Find the client by id field
    const client = await oauthClients.findOne({ id: targetId })
    
    if (!client) {
      console.error('❌ Client not found with id:', targetId)
      process.exit(1)
    }
    
    console.log('📋 Current state:')
    console.log('   id field:', client.id)
    console.log('   client_id field:', client.client_id)
    console.log('   name:', client.name)
    
    if (client.client_id === client.id) {
      console.log('\n✅ Already in sync, no update needed')
      return
    }
    
    // Update client_id to match id
    const result = await oauthClients.updateOne(
      { id: targetId },
      {
        $set: {
          client_id: targetId,
          updatedAt: new Date().toISOString(),
        }
      }
    )
    
    console.log('\n✅ Updated client')
    console.log('   Modified count:', result.modifiedCount)
    
    // Verify
    const updated = await oauthClients.findOne({ id: targetId })
    console.log('\n📋 New state:')
    console.log('   id field:', updated.id)
    console.log('   client_id field:', updated.client_id)
    console.log('   ✅ Fields are now synchronized')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
