#!/usr/bin/env node
/**
 * scripts/check-automation-user-permissions.mjs
 * WHAT: Checks if the automation user has proper permissions for Amanoba
 * WHY: The token might be valid but user might not have admin access to Amanoba
 */
import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'
import { getAppPermission } from '../lib/appPermissions.mjs'

dotenv.config({ path: '.env.local' })

async function main() {
  console.log('🔍 Checking automation user permissions...\n')
  
  const db = await getDb()
  
  // Find our automation user
  console.log('1. Finding automation user...')
  const user = await db.collection('publicUsers').findOne({ 
    email: 'quiz-automation@amanoba.com' 
  })
  
  if (!user) {
    console.log('   ❌ Automation user not found!')
    process.exit(1)
  }
  
  console.log('   ✅ Found user:', user.id)
  console.log(`   Email: ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   Status: ${user.status}`)
  
  // Find Amanoba client
  console.log('\n2. Finding Amanoba OAuth client...')
  const client = await db.collection('oauthClients').findOne({ 
    name: 'amanoba' 
  })
  
  if (!client) {
    console.log('   ❌ Amanoba client not found!')
    process.exit(1)
  }
  
  console.log('   ✅ Found Amanoba client:', client.client_id)
  console.log(`   Name: ${client.name}`)
  console.log(`   Status: ${client.status}`)
  
  // Check app permissions
  console.log('\n3. Checking app permissions...')
  const permission = await getAppPermission(user.id, client.client_id)
  
  if (!permission) {
    console.log('   ❌ NO PERMISSION RECORD FOUND!')
    console.log('   This is the problem - user has no access to Amanoba')
    console.log()
    console.log('   Creating permission record...')
    
    // Create the permission
    const now = new Date().toISOString()
    await db.collection('appPermissions').updateOne(
      { userId: user.id, clientId: client.client_id },
      {
        $set: {
          userId: user.id,
          clientId: client.client_id,
          appName: 'amanoba',
          hasAccess: true,
          role: 'admin',
          status: 'approved',
          grantedAt: now,
          grantedBy: 'automation-script',
          requestedAt: now,
          updatedAt: now,
          createdAt: now,
        }
      },
      { upsert: true }
    )
    
    console.log('   ✅ Created admin permission for Amanoba')
    
  } else {
    console.log('   ✅ Permission record found:')
    console.log(`   Has Access: ${permission.hasAccess}`)
    console.log(`   Role: ${permission.role}`)
    console.log(`   Status: ${permission.status}`)
    console.log(`   Granted At: ${permission.grantedAt}`)
    console.log(`   Granted By: ${permission.grantedBy}`)
    
    if (!permission.hasAccess || permission.role !== 'admin' || permission.status !== 'approved') {
      console.log('\n   ⚠️  Permission needs to be updated for admin access')
      
      const now = new Date().toISOString()
      await db.collection('appPermissions').updateOne(
        { userId: user.id, clientId: client.client_id },
        {
          $set: {
            hasAccess: true,
            role: 'admin',
            status: 'approved',
            grantedAt: now,
            grantedBy: 'automation-script-fix',
            updatedAt: now,
          }
        }
      )
      
      console.log('   ✅ Updated to admin access')
    }
  }
  
  // Verify final state
  console.log('\n4. Verifying final permissions...')
  const finalPermission = await getAppPermission(user.id, client.client_id)
  
  if (finalPermission && finalPermission.hasAccess && finalPermission.role === 'admin') {
    console.log('   ✅ User has admin access to Amanoba')
    
    console.log('\n🎉 PERMISSIONS ARE CORRECT!')
    console.log('='.repeat(50))
    console.log('The automation user now has admin access to Amanoba.')
    console.log()
    console.log('If the token still doesn\'t work, the issue is likely:')
    console.log('1. Amanoba authentication middleware not configured properly')
    console.log('2. Amanoba not validating tokens against SSO')
    console.log('3. Amanoba expecting different token format')
    console.log()
    console.log('Try testing the token again:')
    console.log('curl -H "Authorization: Bearer $QUIZ_ITEM_ADMIN_TOKEN" \\')
    console.log('  https://amanoba.com/api/admin/questions')
    
  } else {
    console.log('   ❌ Something went wrong with permissions')
  }
  
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})