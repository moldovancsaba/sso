/**
 * Fix Admin Role Script
 * 
 * WHAT: Updates user role to superadmin for sso-admin-dashboard
 * WHY: User accidentally changed their own role to 'user'
 * HOW: Direct MongoDB update to appPermissions collection
 */

import { getDb } from '../lib/db.mjs'

async function fixAdminRole() {
  try {
    console.log('Connecting to database...')
    const db = await getDb()
    
    // Find the user by email (you can specify your email here)
    const email = process.env.ADMIN_EMAIL || 'sso@doneisbetter.com'
    
    console.log(`Looking for user: ${email}`)
    const user = await db.collection('publicUsers').findOne({ 
      email: email.toLowerCase() 
    })
    
    if (!user) {
      console.error('User not found!')
      process.exit(1)
    }
    
    console.log(`Found user: ${user.name} (${user.email})`)
    console.log(`User ID: ${user.id}`)
    
    // Update role in appPermissions for sso-admin-dashboard
    const result = await db.collection('appPermissions').findOneAndUpdate(
      { 
        userId: user.id,
        clientId: 'sso-admin-dashboard'
      },
      { 
        $set: { 
          role: 'superadmin',
          status: 'approved',
          hasAccess: true,
          updatedAt: new Date().toISOString()
        } 
      },
      { 
        returnDocument: 'after',
        upsert: true // Create if doesn't exist
      }
    )
    
    console.log('\n✅ Role updated successfully!')
    console.log('New permission:', {
      userId: result.userId,
      clientId: result.clientId,
      role: result.role,
      status: result.status,
      hasAccess: result.hasAccess
    })
    
    console.log('\nYou can now access the admin dashboard with superadmin role.')
    process.exit(0)
    
  } catch (error) {
    console.error('Error fixing admin role:', error)
    process.exit(1)
  }
}

fixAdminRole()
