#!/usr/bin/env node
/**
 * Grant Admin Permission
 * 
 * WHAT: Grants sso-admin-dashboard access to a user
 * WHY: Users need permission in appPermissions to access admin panel
 * HOW: Query by email, upsert permission record
 * 
 * Usage: EMAIL=user@example.com node scripts/grant-admin-permission.mjs
 */

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

async function grantAdminPermission() {
  const email = process.env.EMAIL
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB || 'sso'

  if (!email) {
    console.error('❌ EMAIL environment variable required')
    console.log('Usage: EMAIL=user@example.com node scripts/grant-admin-permission.mjs')
    process.exit(1)
  }

  if (!uri) {
    console.error('❌ MONGODB_URI not configured')
    process.exit(1)
  }

  console.log(`🔍 Granting admin permission to: ${email}`)
  
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    const db = client.db(dbName)
    
    // Find user by email
    const user = await db.collection('publicUsers').findOne({ 
      email: email.toLowerCase().trim() 
    })
    
    if (!user) {
      console.error(`❌ User not found: ${email}`)
      process.exit(1)
    }
    
    console.log(`✅ Found user: ${user.email}`)
    console.log(`   User ID: ${user.id}`)
    console.log(`   Name: ${user.name}`)
    
    // Check if permission already exists
    const existing = await db.collection('appPermissions').findOne({
      userId: user.id,
      clientId: 'sso-admin-dashboard',
    })
    
    if (existing) {
      console.log(`\n⚠️  Permission already exists:`)
      console.log(`   hasAccess: ${existing.hasAccess}`)
      console.log(`   role: ${existing.role}`)
      console.log(`   status: ${existing.status}`)
      
      if (existing.hasAccess && existing.status === 'approved') {
        console.log(`\n✅ User already has active admin permission!`)
        return
      }
      
      console.log(`\n🔄 Updating permission to grant access...`)
    } else {
      console.log(`\n➕ Creating new admin permission...`)
    }
    
    // Upsert permission
    const now = new Date().toISOString()
    const result = await db.collection('appPermissions').updateOne(
      {
        userId: user.id,
        clientId: 'sso-admin-dashboard',
      },
      {
        $set: {
          hasAccess: true,
          role: 'super-admin',
          status: 'approved',
          grantedAt: now,
          grantedBy: 'system-script',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
          revokedAt: null,
          revokedBy: null,
        },
      },
      { upsert: true }
    )
    
    console.log(`\n✅ Admin permission granted!`)
    console.log(`   Operation: ${result.upsertedCount ? 'Created' : 'Updated'}`)
    console.log(`   Role: super-admin`)
    console.log(`   Status: approved`)
    console.log(`   Access: granted`)
    
    console.log(`\n✨ ${user.email} can now access the admin dashboard!`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await client.close()
  }
}

grantAdminPermission()
