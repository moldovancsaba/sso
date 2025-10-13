#!/usr/bin/env node
/**
 * Test local token generation with environment variable keys
 */

import { generateAccessToken, generateIdToken } from '../lib/oauth/tokens.mjs'
import { getDb } from '../lib/db.mjs'

async function main() {
  try {
    console.log('🔍 Testing local token generation with environment variable keys\n')
    
    // Get a real user
    const db = await getDb()
    const user = await db.collection('users').findOne({ role: { $exists: true } })
    
    if (!user) {
      console.error('❌ No users found')
      process.exit(1)
    }
    
    console.log('Testing with user:', user.email)
    console.log('User ID:', user.id)
    
    // Test access token generation
    console.log('\n📋 Step 1: Generating Access Token')
    console.log('-'.repeat(60))
    
    const accessToken = await generateAccessToken({
      userId: user.id,
      clientId: 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f',
      scope: 'openid profile email offline_access',
    })
    
    console.log('✅ Access token generated successfully')
    console.log('   Token prefix:', accessToken.token.substring(0, 20) + '...')
    console.log('   JTI:', accessToken.jti)
    console.log('   Expires at:', accessToken.expiresAt)
    
    // Test ID token generation
    console.log('\n📋 Step 2: Generating ID Token')
    console.log('-'.repeat(60))
    
    const idToken = await generateIdToken({
      userId: user.id,
      clientId: 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f',
      scope: 'openid profile email',
    })
    
    console.log('✅ ID token generated successfully')
    console.log('   Token prefix:', idToken.token.substring(0, 20) + '...')
    console.log('   JTI:', idToken.jti)
    console.log('   Expires at:', idToken.expiresAt)
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL TESTS PASSED!')
    console.log('='.repeat(60))
    console.log('\nLocal token generation is working correctly.')
    console.log('RSA keys loaded from environment variables.')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
}

main()
