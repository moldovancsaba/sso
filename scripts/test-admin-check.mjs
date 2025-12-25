import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config()

async function testAdminCheck() {
  console.log('🔍 Testing admin access check for moldovancsaba@gmail.com...\n')
  
  const db = await getDb()
  
  // Find user
  const user = await db.collection('publicUsers').findOne({ 
    email: 'moldovancsaba@gmail.com' 
  })
  
  if (!user) {
    console.log('❌ User not found!')
    process.exit(1)
  }
  
  console.log('✅ User found:')
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Name: ${user.name}\n`)
  
  // Check permission
  const permission = await db.collection('appPermissions').findOne({
    userId: user.id,
    clientId: 'sso-admin-dashboard',
    status: 'approved',
    hasAccess: true
  })
  
  if (!permission) {
    console.log('❌ No admin permission found!')
    console.log('\n🔍 All permissions for this user:')
    const allPerms = await db.collection('appPermissions').find({ userId: user.id }).toArray()
    allPerms.forEach(p => {
      console.log(`   Client: ${p.clientId}`)
      console.log(`   Role: ${p.role}`)
      console.log(`   Status: ${p.status}`)
      console.log(`   HasAccess: ${p.hasAccess}`)
      console.log('')
    })
  } else {
    console.log('✅ Admin permission found:')
    console.log(`   Role: ${permission.role}`)
    console.log(`   Status: ${permission.status}`)
    console.log(`   HasAccess: ${permission.hasAccess}`)
    console.log(`   GrantedAt: ${permission.grantedAt}`)
  }
  
  process.exit(0)
}

testAdminCheck()
