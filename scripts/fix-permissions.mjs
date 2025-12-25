import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config()

async function fixPermissions() {
  console.log('🔧 Fixing permissions for moldovancsaba@gmail.com...\n')
  
  const db = await getDb()
  
  // Find the REAL user
  const user = await db.collection('publicUsers').findOne({ 
    email: 'moldovancsaba@gmail.com' 
  })
  
  if (!user) {
    console.log('❌ User not found!')
    process.exit(1)
  }
  
  console.log(`✅ Found user: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Name: ${user.name}`)
  console.log(`   Has Google: ${!!user.socialProviders?.google}\n`)
  
  // Find all permissions for SSO Admin
  const allPermissions = await db.collection('appPermissions').find({
    clientId: 'sso-admin-dashboard'
  }).toArray()
  
  console.log('🔑 Current SSO Admin permissions:')
  allPermissions.forEach(p => {
    console.log(`   ${p.userId} → ${p.role} (${p.status})`)
  })
  
  // Delete permissions for non-existent users
  const deleteResult = await db.collection('appPermissions').deleteMany({
    clientId: 'sso-admin-dashboard',
    userId: { $ne: user.id }
  })
  
  console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} orphaned permissions`)
  
  // Ensure correct user has permission
  const existingPermission = await db.collection('appPermissions').findOne({
    userId: user.id,
    clientId: 'sso-admin-dashboard'
  })
  
  if (!existingPermission) {
    await db.collection('appPermissions').insertOne({
      userId: user.id,
      clientId: 'sso-admin-dashboard',
      hasAccess: true,
      role: 'super-admin',
      status: 'approved',
      grantedAt: new Date().toISOString(),
      grantedBy: 'fix-script',
      revokedAt: null,
      revokedBy: null
    })
    console.log('✅ Created super-admin permission for current user')
  } else {
    console.log('✅ User already has correct permission')
  }
  
  console.log('\n✅ Fix completed!')
  process.exit(0)
}

fixPermissions()
