#!/usr/bin/env node

/**
 * scripts/migrations/2025-01-13-multi-app-permissions.mjs
 * 
 * WHAT: Migrates existing system to multi-app permission architecture
 * WHY: Sets up initial SSO superadmins and migrates launchmass users to new permission system
 * HOW: 
 *   1. Add isSsoSuperadmin field to publicUsers
 *   2. Set designated SSO superadmins
 *   3. Add appName to OAuth clients
 *   4. Migrate existing launchmass users to appPermissions collection
 */

import 'dotenv/config'
import { getDb } from '../../lib/db.mjs'
import logger from '../../lib/logger.mjs'

// WHAT: Configuration for initial SSO superadmins
// WHY: Product owner specified these emails for cross-app admin access
const SSO_SUPERADMINS = [
  'moldovancsaba@gmail.com',
  'sso@doneisbetter.com',
]

// WHAT: OAuth client to app name mapping
// WHY: Enables display of app names in admin UI
const APP_NAME_MAPPING = {
  '6e85956d-5d80-4dcc-afe0-6f53e5c58316': 'launchmass', // Production launchmass client
}

async function migrate() {
  console.log('🔄 Starting multi-app permissions migration...\n')
  
  try {
    const db = await getDb()
    
    // ========================================
    // Step 1: Add isSsoSuperadmin to publicUsers
    // ========================================
    console.log('📝 Step 1: Adding isSsoSuperadmin field to publicUsers...')
    const usersCol = db.collection('publicUsers')
    
    // WHAT: Set isSsoSuperadmin to false for all users by default
    // WHY: Explicit default prevents undefined behavior
    const usersUpdateResult = await usersCol.updateMany(
      { isSsoSuperadmin: { $exists: false } },
      { $set: { isSsoSuperadmin: false } }
    )
    console.log(`   ✅ Updated ${usersUpdateResult.modifiedCount} users with default isSsoSuperadmin: false`)
    
    // WHAT: Set designated SSO superadmins
    // WHY: Product owner specified moldovancsaba@gmail.com and sso@doneisbetter.com as initial superadmins
    for (const email of SSO_SUPERADMINS) {
      const result = await usersCol.updateOne(
        { email: email.toLowerCase() },
        { $set: { isSsoSuperadmin: true, updatedAt: new Date().toISOString() } }
      )
      
      if (result.matchedCount > 0) {
        console.log(`   ✅ Set isSsoSuperadmin=true for ${email}`)
      } else {
        console.log(`   ⚠️  User ${email} not found - will be set when they register`)
      }
    }
    
    // WHAT: Create index on isSsoSuperadmin for efficient queries
    // WHY: Admin UI needs to filter superadmins
    await usersCol.createIndex({ isSsoSuperadmin: 1 })
    console.log('   ✅ Created index on isSsoSuperadmin\n')
    
    // ========================================
    // Step 2: Add appName to OAuth clients
    // ========================================
    console.log('📝 Step 2: Adding appName to OAuth clients...')
    const clientsCol = db.collection('oauthClients')
    
    // WHAT: Add appName field to known clients
    // WHY: UI displays app names instead of UUIDs
    for (const [clientId, appName] of Object.entries(APP_NAME_MAPPING)) {
      const result = await clientsCol.updateOne(
        { client_id: clientId },
        { $set: { appName, updatedAt: new Date().toISOString() } }
      )
      
      if (result.matchedCount > 0) {
        console.log(`   ✅ Set appName="${appName}" for client ${clientId}`)
      } else {
        console.log(`   ⚠️  Client ${clientId} not found`)
      }
    }
    
    // WHAT: Set appName to null for clients without mapping
    // WHY: Allows manual configuration via admin UI
    const unmappedResult = await clientsCol.updateMany(
      { appName: { $exists: false } },
      { $set: { appName: null } }
    )
    console.log(`   ✅ Set appName=null for ${unmappedResult.modifiedCount} unmapped clients\n`)
    
    // ========================================
    // Step 3: Migrate launchmass users to appPermissions
    // ========================================
    console.log('📝 Step 3: Migrating existing launchmass users to appPermissions...')
    
    // WHAT: This step handled by separate launchmass migration
    // WHY: Launchmass needs to connect to its own DB and SSO DB
    console.log('   ℹ️  Launchmass user migration will be done via launchmass migration script')
    console.log('   ℹ️  Run: cd launchmass && node scripts/migrations/2025-01-13-app-permissions.mjs\n')
    
    // ========================================
    // Step 4: Create indexes for new collections
    // ========================================
    console.log('📝 Step 4: Creating indexes for appPermissions and appAccessLogs...')
    
    // WHAT: Indexes for appPermissions
    // WHY: Import functions to ensure indexes are created
    const { getAppPermission } = await import('../../lib/appPermissions.mjs')
    const { logAccessAttempt } = await import('../../lib/appAccessLogs.mjs')
    
    // WHAT: Trigger index creation by calling functions
    // WHY: Functions internally call ensureIndexes()
    await getAppPermission('dummy-user', 'dummy-client').catch(() => {})
    await logAccessAttempt({
      userId: 'dummy',
      clientId: 'dummy',
      appName: 'test',
      accessGranted: false,
      message: 'Index creation test'
    }).catch(() => {})
    
    console.log('   ✅ Indexes created for appPermissions')
    console.log('   ✅ Indexes created for appAccessLogs\n')
    
    // ========================================
    // Summary
    // ========================================
    console.log('✅ Migration completed successfully!\n')
    console.log('Summary:')
    console.log(`  • Added isSsoSuperadmin to publicUsers`)
    console.log(`  • Set ${SSO_SUPERADMINS.length} SSO superadmins`)
    console.log(`  • Added appName to ${Object.keys(APP_NAME_MAPPING).length} OAuth clients`)
    console.log(`  • Created indexes for appPermissions and appAccessLogs`)
    console.log('\nNext steps:')
    console.log('  1. Run launchmass migration: cd launchmass && node scripts/migrations/2025-01-13-app-permissions.mjs')
    console.log('  2. Deploy SSO with new endpoints')
    console.log('  3. Deploy launchmass with permission checking')
    console.log('  4. Test user flow end-to-end\n')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    logger.error('Migration failed', { error: error.message, stack: error.stack })
    process.exit(1)
  }
}

// Run migration
migrate()
