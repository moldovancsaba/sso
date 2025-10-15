#!/usr/bin/env node
/**
 * Grant user access to an application
 * 
 * Usage: node scripts/grant-app-access.mjs <userEmail> <clientId> <role>
 * Example: node scripts/grant-app-access.mjs moldovancsaba@gmail.com df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f admin
 */

import { getDb } from '../lib/db.mjs'
import { randomUUID } from 'crypto'

const userEmail = process.argv[2]
const clientId = process.argv[3] || 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f' // LaunchMass
const role = process.argv[4] || 'admin'

if (!userEmail) {
  console.error('Usage: node scripts/grant-app-access.mjs <userEmail> [clientId] [role]')
  console.error('Example: node scripts/grant-app-access.mjs moldovancsaba@gmail.com df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f admin')
  process.exit(1)
}

async function main() {
  try {
    const db = await getDb()
    
    // Find the user by email
    console.log('🔍 Looking for user:', userEmail)
    const user = await db.collection('publicUsers').findOne({ 
      email: userEmail.toLowerCase() 
    })
    
    if (!user) {
      console.error('❌ User not found:', userEmail)
      process.exit(1)
    }
    
    console.log('✅ User found:')
    console.log('   ID:', user.id)
    console.log('   Name:', user.name)
    console.log('   Email:', user.email)
    
    // Find the OAuth client
    console.log('\n🔍 Looking for OAuth client:', clientId)
    const client = await db.collection('oauthClients').findOne({ 
      client_id: clientId 
    })
    
    if (!client) {
      console.error('❌ OAuth client not found:', clientId)
      process.exit(1)
    }
    
    console.log('✅ OAuth client found:')
    console.log('   Name:', client.name)
    console.log('   Client ID:', client.client_id)
    
    // Check if permission already exists
    const existing = await db.collection('appPermissions').findOne({
      userId: user.id,
      clientId: clientId
    })
    
    if (existing) {
      console.log('\n⚠️  Permission record already exists')
      console.log('   Current status:', existing.status)
      console.log('   Current role:', existing.role)
      console.log('   Has access:', existing.hasAccess)
      
      // Update to grant access
      const now = new Date().toISOString()
      await db.collection('appPermissions').updateOne(
        { _id: existing._id },
        {
          $set: {
            hasAccess: true,
            status: 'approved',
            role: role,
            grantedAt: now,
            grantedBy: 'admin-script',
            updatedAt: now
          }
        }
      )
      
      console.log('\n✅ Permission updated!')
      console.log('   Status: approved')
      console.log('   Role:', role)
      console.log('   Has access: true')
    } else {
      // Create new permission
      const now = new Date().toISOString()
      const permission = {
        id: randomUUID(),
        userId: user.id,
        clientId: clientId,
        appName: client.name,
        hasAccess: true,
        status: 'approved',
        role: role,
        requestedAt: now,
        grantedAt: now,
        grantedBy: 'admin-script',
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: null
      }
      
      await db.collection('appPermissions').insertOne(permission)
      
      console.log('\n✅ Permission created!')
      console.log('   Status: approved')
      console.log('   Role:', role)
      console.log('   Has access: true')
    }
    
    console.log('\n🎉 Success! User can now access', client.name)
    console.log('   User:', user.email)
    console.log('   App:', client.name)
    console.log('   Role:', role)
    console.log('\nThe user can now log in and access the application.')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
