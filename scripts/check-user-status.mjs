#!/usr/bin/env node
/**
 * Check public user status in database
 */
import { getDb } from '../lib/db.mjs'

async function checkUser(email) {
  try {
    const db = await getDb()
    const user = await db.collection('publicUsers').findOne({ email: email.toLowerCase() })
    
    if (!user) {
      console.log('❌ User not found:', email)
      return
    }
    
    console.log('✅ User found:')
    console.log('  ID:', user.id)
    console.log('  Email:', user.email)
    console.log('  Name:', user.name)
    console.log('  Email Verified:', user.emailVerified)
    console.log('  Login Count:', user.loginCount || 0)
    console.log('  Has Password Hash:', !!user.passwordHash)
    console.log('  Password Hash Length:', user.passwordHash?.length || 0)
    console.log('  Created:', user.createdAt)
    console.log('  Last Login:', user.lastLoginAt || 'Never')
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    process.exit(0)
  }
}

const email = process.argv[2] || 'moldovancsaba@gmail.com'
checkUser(email)
