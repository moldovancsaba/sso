import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '../lib/db.mjs'

const db = await getDb()

// Check if moldovancsaba@gmail.com exists as PUBLIC user
const publicUser = await db.collection('publicUsers').findOne({ 
  email: 'moldovancsaba@gmail.com' 
})

console.log('Public user exists?', !!publicUser)

if (publicUser) {
  // Check admin dashboard permission
  const permission = await db.collection('appPermissions').findOne({
    userId: publicUser.id,
    clientId: 'sso-admin-dashboard'
  })
  
  console.log('Has admin dashboard permission?', !!permission)
  if (permission) {
    console.log('Permission details:', {
      hasAccess: permission.hasAccess,
      status: permission.status,
      role: permission.role
    })
  } else {
    console.log('\n❌ NO PERMISSION FOUND!')
    console.log('You need to grant yourself access to sso-admin-dashboard')
  }
} else {
  console.log('\n❌ PUBLIC USER DOES NOT EXIST!')
  console.log('The admin dashboard requires a PUBLIC user account, not an admin user.')
  console.log('Login at https://sso.doneisbetter.com/register first.')
}

process.exit(0)
