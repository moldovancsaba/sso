#!/usr/bin/env node
/**
 * Test password reset flow
 */
import { getDb } from '../lib/db.mjs'
import { updatePublicUserPassword, findPublicUserByEmail } from '../lib/publicUsers.mjs'
import bcrypt from 'bcryptjs'

async function testPasswordReset(email) {
  try {
    const db = await getDb()
    
    // Find user
    const user = await findPublicUserByEmail(email)
    if (!user) {
      console.log('❌ User not found:', email)
      return
    }
    
    console.log('✅ User found:', user.email)
    console.log('   User ID:', user.id)
    
    // Generate test password
    const testPassword = 'TestPass123!'
    console.log('\n🔑 Setting new password:', testPassword)
    
    // Update password
    await updatePublicUserPassword(user.id, testPassword)
    console.log('✅ Password updated in database')
    
    // Verify it was saved correctly
    const updatedUser = await db.collection('publicUsers').findOne({ id: user.id })
    console.log('   Password hash length:', updatedUser.passwordHash.length)
    
    // Test if password verifies
    const isValid = await bcrypt.compare(testPassword, updatedUser.passwordHash)
    console.log('   Password verification:', isValid ? '✅ PASS' : '❌ FAIL')
    
    if (isValid) {
      console.log('\n✅ SUCCESS! You can now login with:')
      console.log('   Email:', email)
      console.log('   Password:', testPassword)
    } else {
      console.log('\n❌ FAILED! Password was not saved correctly')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    process.exit(0)
  }
}

const email = process.argv[2] || 'moldovancsaba@gmail.com'
testPasswordReset(email)
