/**
 * Create admin user directly in PRODUCTION database (sso, not sso_database)
 */

import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
import { randomUUID } from 'crypto'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI
const ADMIN_EMAIL = 'moldovancsaba@gmail.com'
const ADMIN_NAME = 'Csaba Moldovan'
const ADMIN_ROLE = 'super-admin'

async function createGoogleAdmin() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    
    // CRITICAL: Use production database name 'sso', not local 'sso_database'
    const db = client.db('sso')
    const usersCollection = db.collection('users')
    
    console.log(`Connected to database: ${db.databaseName}`)
    
    // Check if user already exists
    const existing = await usersCollection.findOne({ email: ADMIN_EMAIL })
    
    if (existing) {
      console.log('✅ Admin user already exists in production:')
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
    
    console.log('✅ Admin user created in PRODUCTION database!')
    console.log({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    })
    console.log('\n🔐 You can now login to https://sso.doneisbetter.com/admin with your Google account')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
    process.exit(1)
  } finally {
    await client.close()
    process.exit(0)
  }
}

createGoogleAdmin()
