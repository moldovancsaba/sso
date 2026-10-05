/**
 * Script to create an admin user that can login with Google OAuth
 * 
 * Usage: node scripts/create-google-admin.mjs
 */

import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'
import { randomUUID } from 'crypto'

// Load environment variables
dotenv.config()

const ADMIN_EMAIL = 'moldovancsaba@gmail.com'
const ADMIN_NAME = 'Csaba Moldovan'
const ADMIN_ROLE = 'super-admin'

async function createGoogleAdmin() {
  try {
    // IMPORTANT: Production uses database name 'sso', not 'sso_database'
    // Override MONGODB_DB environment variable
    const originalDbName = (process.env.SSO_MONGODB_DB ?? process.env.MONGODB_DB)
    process.env.SSO_MONGODB_DB = 'sso'
    
    const db = await getDb()
    const usersCollection = db.collection('users')
    
    console.log(`✅ Connected to database: ${db.databaseName}`)
    
    // Check if user already exists
    const existing = await usersCollection.findOne({ email: ADMIN_EMAIL })
    
    if (existing) {
      console.log('✅ Admin user already exists:')
      console.log({
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        createdAt: existing.createdAt
      })
      return
    }
    
    // Create new admin user
    const now = new Date().toISOString()
    const adminUser = {
      id: randomUUID(),
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: ADMIN_ROLE,
      password: randomUUID().replace(/-/g, '').substring(0, 32), // 32-hex token (not used for Google login)
      createdAt: now,
      updatedAt: now,
    }
    
    await usersCollection.insertOne(adminUser)
    
    console.log('✅ Admin user created successfully!')
    console.log({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    })
    console.log('\n🔐 You can now login to /admin with your Google account')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

createGoogleAdmin()
