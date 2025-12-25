#!/usr/bin/env node
/**
 * Migrate Admin Users to Unified System
 * 
 * WHAT: Converts existing admin users from 'users' collection to unified system
 * WHY: Unify admin and public user systems using appPermissions for access control
 * HOW: For each admin user, create/link publicUser entry and add appPermissions
 * 
 * Usage: node scripts/migrate-admins-to-unified-system.mjs
 */

import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'
import { randomUUID } from 'crypto'

// Load environment variables
dotenv.config()

const ADMIN_CLIENT_ID = 'sso-admin-dashboard'

async function migrateAdmins() {
  console.log('🔄 Migrating admin users to unified system...\n')
  
  try {
    const db = await getDb()
    const usersCollection = db.collection('users')
    const publicUsersCollection = db.collection('publicUsers')
    const appPermissionsCollection = db.collection('appPermissions')
    const oauthClientsCollection = db.collection('oauthClients')
    
    // WHAT: Verify SSO Admin OAuth client exists
    // WHY: Cannot create permissions without the client
    const adminClient = await oauthClientsCollection.findOne({ client_id: ADMIN_CLIENT_ID })
    if (!adminClient) {
      console.error('❌ SSO Admin OAuth client not found!')
      console.error('Run: node scripts/bootstrap-admin-client.mjs first')
      process.exit(1)
    }
    
    console.log('✅ SSO Admin OAuth client found\n')
    
    // WHAT: Fetch all admin users from old system
    const adminUsers = await usersCollection.find({}).toArray()
    
    if (adminUsers.length === 0) {
      console.log('ℹ️  No admin users found in users collection')
      process.exit(0)
    }
    
    console.log(`📊 Found ${adminUsers.length} admin users to migrate\n`)
    
    const results = {
      created: 0,
      linked: 0,
      permissions_added: 0,
      skipped: 0,
      errors: [],
    }
    
    const now = new Date().toISOString()
    
    // WHAT: Process each admin user
    for (const adminUser of adminUsers) {
      console.log(`\n👤 Processing: ${adminUser.email} (${adminUser.role})`)
      
      try {
        // WHAT: Check if user already exists in publicUsers
        let publicUser = await publicUsersCollection.findOne({ 
          email: adminUser.email.toLowerCase() 
        })
        
        if (publicUser) {
          console.log('   ✓ User exists in publicUsers collection')
          results.linked++
        } else {
          // WHAT: Create new publicUser entry
          // WHY: Admin user doesn't exist in public system yet
          // HOW: Create without password (will use magic link/social login)
          
          publicUser = {
            id: adminUser.id || randomUUID(), // Preserve UUID if exists
            email: adminUser.email.toLowerCase(),
            name: adminUser.name || adminUser.email.split('@')[0],
            passwordHash: null, // No password - must use magic link or social login
            status: 'active',
            emailVerified: true, // Assume admin emails are verified
            socialProviders: {},
            createdAt: adminUser.createdAt || now,
            updatedAt: now,
            lastLoginAt: adminUser.updatedAt || null,
            loginCount: 0,
          }
          
          await publicUsersCollection.insertOne(publicUser)
          console.log('   ✓ Created new publicUser entry')
          results.created++
        }
        
        // WHAT: Check if permission already exists
        const existingPermission = await appPermissionsCollection.findOne({
          userId: publicUser.id,
          clientId: ADMIN_CLIENT_ID,
        })
        
        if (existingPermission) {
          console.log('   ✓ Permission already exists')
          results.skipped++
          continue
        }
        
        // WHAT: Create appPermissions entry for SSO Admin
        // WHY: Grant admin access through permission system
        const permission = {
          userId: publicUser.id,
          clientId: ADMIN_CLIENT_ID,
          hasAccess: true,
          role: adminUser.role, // 'admin' or 'super-admin'
          status: 'approved',
          grantedAt: now,
          grantedBy: 'migration-script',
          revokedAt: null,
          revokedBy: null,
        }
        
        await appPermissionsCollection.insertOne(permission)
        console.log(`   ✓ Granted ${adminUser.role} permission for SSO Admin`)
        results.permissions_added++
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`)
        results.errors.push({
          email: adminUser.email,
          error: error.message,
        })
      }
    }
    
    // WHAT: Print migration summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 Migration Summary')
    console.log('='.repeat(60))
    console.log(`✅ New publicUsers created:     ${results.created}`)
    console.log(`🔗 Existing publicUsers linked: ${results.linked}`)
    console.log(`🔑 Permissions added:           ${results.permissions_added}`)
    console.log(`⏭️  Skipped (already migrated): ${results.skipped}`)
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Errors (${results.errors.length}):`)
      results.errors.forEach(err => {
        console.log(`   - ${err.email}: ${err.error}`)
      })
    }
    
    console.log('\n✅ Migration completed!')
    console.log('\nℹ️  Note: Old users collection is preserved for backward compatibility')
    console.log('ℹ️  Admin sessions will be handled by publicSessions after code deployment')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
  
  process.exit(0)
}

migrateAdmins()
