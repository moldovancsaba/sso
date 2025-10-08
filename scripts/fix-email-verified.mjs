#!/usr/bin/env node
/**
 * Fix emailVerified field for existing users
 */
import { getDb } from '../lib/db.mjs'

async function fixEmailVerified() {
  try {
    const db = await getDb()
    
    // Set emailVerified: true for all users who don't have it set
    const result = await db.collection('publicUsers').updateMany(
      { emailVerified: { $exists: false } },
      { $set: { emailVerified: true } }
    )
    
    console.log('✅ Fixed', result.modifiedCount, 'users')
    
    // List all users
    const users = await db.collection('publicUsers').find({}).toArray()
    console.log('\n📋 All users:')
    users.forEach(user => {
      console.log(`  - ${user.email}: emailVerified=${user.emailVerified}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    process.exit(0)
  }
}

fixEmailVerified()
