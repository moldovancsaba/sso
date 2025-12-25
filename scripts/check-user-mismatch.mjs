import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config()

async function checkUsers() {
  const db = await getDb()
  
  // Find all users with your email
  const publicUsers = await db.collection('publicUsers').find({ 
    email: 'moldovancsaba@gmail.com' 
  }).toArray()
  
  console.log('\n📧 Public Users with moldovancsaba@gmail.com:')
  publicUsers.forEach(u => {
    console.log(`  ID: ${u.id}`)
    console.log(`  Email: ${u.email}`)
    console.log(`  Name: ${u.name}`)
    console.log(`  Has Google: ${!!u.socialProviders?.google}`)
    console.log(`  Created: ${u.createdAt}`)
    console.log('')
  })
  
  // Check permissions
  const permissions = await db.collection('appPermissions').find({ 
    clientId: 'sso-admin-dashboard' 
  }).toArray()
  
  console.log('\n🔑 SSO Admin Permissions:')
  permissions.forEach(p => {
    console.log(`  User ID: ${p.userId}`)
    console.log(`  Role: ${p.role}`)
    console.log(`  Status: ${p.status}`)
    console.log('')
  })
  
  process.exit(0)
}

checkUsers()
