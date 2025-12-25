#!/usr/bin/env node

/**
 * Grant Admin Access Script
 * 
 * WHAT: Grants admin access to a public user by creating appPermissions entry
 * WHY: Bootstrap first admin user for unified admin system
 * HOW: Find user by email → create appPermissions entry for 'sso-admin-dashboard'
 * 
 * Usage:
 *   node scripts/grant-admin-access.mjs EMAIL [ROLE]
 *   ADMIN_EMAIL="user@example.com" node scripts/grant-admin-access.mjs
 * 
 * Examples:
 *   node scripts/grant-admin-access.mjs sso@doneisbetter.com super-admin
 *   ADMIN_EMAIL="sso@doneisbetter.com" node scripts/grant-admin-access.mjs
 */

import { getDb } from '../lib/db.mjs'
import { findPublicUserByEmail } from '../lib/publicUsers.mjs'

const ADMIN_CLIENT_ID = 'sso-admin-dashboard'

async function grantAdminAccess() {
  try {
    // WHAT: Get email from env or command line
    const email = process.env.ADMIN_EMAIL || process.argv[2]
    const role = process.argv[3] || 'super-admin' // Default to super-admin

    if (!email) {
      console.error('❌ Error: Email is required')
      console.error('')
      console.error('Usage:')
      console.error('  node scripts/grant-admin-access.mjs EMAIL [ROLE]')
      console.error('  ADMIN_EMAIL="user@example.com" node scripts/grant-admin-access.mjs')
      console.error('')
      console.error('Role options: admin, super-admin (default: super-admin)')
      process.exit(1)
    }

    if (!['admin', 'super-admin'].includes(role)) {
      console.error(`❌ Error: Invalid role "${role}". Must be "admin" or "super-admin"`)
      process.exit(1)
    }

    console.log('🔍 Looking for user:', email)
    console.log('')

    // WHAT: Connect to database and find user
    const db = await getDb()
    const user = await findPublicUserByEmail(email)

    if (!user) {
      console.error(`❌ Error: User not found with email: ${email}`)
      console.error('')
      console.error('The user must first login at https://sso.doneisbetter.com')
      console.error('Available login methods:')
      console.error('  - Google Sign-In')
      console.error('  - Facebook Login')
      console.error('  - Email + Password')
      console.error('  - Magic Link')
      console.error('')
      console.error('After the user logs in, run this script again.')
      process.exit(1)
    }

    console.log('✅ User found:')
    console.log('   ID:', user.id)
    console.log('   Email:', user.email)
    console.log('   Name:', user.name)
    console.log('   Status:', user.status)
    console.log('')

    // WHAT: Check if admin permission already exists
    const appPermissionsCollection = db.collection('appPermissions')
    const existingPermission = await appPermissionsCollection.findOne({
      userId: user.id,
      clientId: ADMIN_CLIENT_ID,
    })

    if (existingPermission) {
      console.log('⚠️  Admin permission already exists:')
      console.log('   Role:', existingPermission.role)
      console.log('   Status:', existingPermission.status)
      console.log('   Has Access:', existingPermission.hasAccess)
      console.log('   Granted:', existingPermission.grantedAt)
      console.log('')

      if (existingPermission.status === 'approved' && existingPermission.hasAccess) {
        console.log('✅ User already has active admin access!')
        console.log('')
        console.log('You can now login at: https://sso.doneisbetter.com/admin')
        process.exit(0)
      }

      // WHAT: Update existing permission if it's not active
      console.log('📝 Updating existing permission to grant access...')
      await appPermissionsCollection.updateOne(
        { _id: existingPermission._id },
        {
          $set: {
            hasAccess: true,
            role,
            status: 'approved',
            grantedAt: new Date().toISOString(),
            grantedBy: null, // Bootstrap grant (no granter)
            revokedAt: null,
            revokedBy: null,
          }
        }
      )

      console.log('✅ Admin access updated successfully!')
      console.log('')
      console.log('Details:')
      console.log('   User:', user.email)
      console.log('   Role:', role)
      console.log('   Client:', ADMIN_CLIENT_ID)
      console.log('')
      console.log('🎉 You can now login at: https://sso.doneisbetter.com/admin')
      process.exit(0)
    }

    // WHAT: Create new admin permission entry
    console.log(`📝 Granting ${role} access...`)
    console.log('')

    const permission = {
      userId: user.id,
      clientId: ADMIN_CLIENT_ID,
      hasAccess: true,
      role,
      status: 'approved',
      grantedAt: new Date().toISOString(),
      grantedBy: null, // Bootstrap grant (no granter)
      revokedAt: null,
      revokedBy: null,
    }

    const result = await appPermissionsCollection.insertOne(permission)

    console.log('✅ Admin access granted successfully!')
    console.log('')
    console.log('Details:')
    console.log('   Permission ID:', result.insertedId)
    console.log('   User:', user.email)
    console.log('   Role:', role)
    console.log('   Client:', ADMIN_CLIENT_ID)
    console.log('')
    console.log('🎉 You can now login at: https://sso.doneisbetter.com/admin')
    console.log('')
    console.log('Next steps:')
    console.log('  1. Go to https://sso.doneisbetter.com/admin')
    console.log('  2. You should be automatically redirected to the dashboard')
    console.log('  3. If not, sign in with the same method you used to create your account')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('')
    console.error('Stack trace:')
    console.error(error.stack)
    process.exit(1)
  }
}

grantAdminAccess()
