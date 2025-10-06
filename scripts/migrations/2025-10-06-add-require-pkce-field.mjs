#!/usr/bin/env node
/**
 * Migration: Add require_pkce field to OAuth clients
 * 
 * Date: 2025-10-06
 * 
 * WHAT: Adds require_pkce field to all existing OAuth clients
 * WHY: PKCE should be optional for confidential clients (server-side with client_secret)
 * 
 * This migration sets require_pkce to false by default for all existing clients.
 * This maintains backward compatibility and allows confidential clients to work
 * without implementing PKCE.
 * 
 * Usage:
 *   node scripts/migrations/2025-10-06-add-require-pkce-field.mjs
 */

import { getDb } from '../../lib/db.mjs'

async function migrate() {
  console.log('🔄 Starting migration: Add require_pkce field to OAuth clients')
  console.log('=' .repeat(70))

  try {
    const db = await getDb()
    const collection = db.collection('oauthClients')

    // Get all clients that don't have the require_pkce field
    const clientsToUpdate = await collection.find({
      require_pkce: { $exists: false }
    }).toArray()

    console.log(`\n📊 Found ${clientsToUpdate.length} clients to update\n`)

    if (clientsToUpdate.length === 0) {
      console.log('✅ All clients already have the require_pkce field. Nothing to do.')
      process.exit(0)
    }

    // Update all clients to have require_pkce: false (default for confidential clients)
    const result = await collection.updateMany(
      { require_pkce: { $exists: false } },
      { 
        $set: { 
          require_pkce: false,
          updated_at: new Date().toISOString()
        } 
      }
    )

    console.log('✅ Migration completed successfully!')
    console.log(`   - Modified: ${result.modifiedCount} clients`)
    console.log(`   - Matched: ${result.matchedCount} clients`)
    
    // List updated clients
    console.log('\n📋 Updated clients:')
    for (const client of clientsToUpdate) {
      console.log(`   - ${client.name} (${client.client_id})`)
    }

    console.log('\n' + '='.repeat(70))
    console.log('✨ Migration complete!')
    console.log('\nNote: All existing OAuth clients now have require_pkce: false')
    console.log('This allows confidential clients to authenticate without PKCE.')
    console.log('Public clients (mobile/SPA) should set require_pkce: true for security.')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run migration
migrate()
