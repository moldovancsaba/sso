#!/usr/bin/env node
/**
 * Test token endpoint with actual client credentials
 */

import { getDb } from '../lib/db.mjs'
import { createAuthorizationCode } from '../lib/oauth/codes.mjs'

const CLIENT_ID = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f'
const CLIENT_SECRET = '2c5d4134-d014-438d-9273-950828ed1443'
const REDIRECT_URI = 'https://launchmass.doneisbetter.com/api/oauth/callback'

async function main() {
  try {
    // Create a test authorization code with a real user
    const db = await getDb()
    
    // Get the first real user from the users collection
    const user = await db.collection('users').findOne({ role: { $exists: true } })
    
    if (!user) {
      console.error('❌ No users found in database')
      process.exit(1)
    }
    
    console.log('🔍 Creating test authorization code for user:', user.email)
    
    const authCode = await createAuthorizationCode({
      client_id: CLIENT_ID,
      user_id: user.id,
      redirect_uri: REDIRECT_URI,
      scope: 'openid profile email offline_access',
      code_challenge: null,
      code_challenge_method: null,
    })
    
    console.log('✅ Authorization code created:', authCode.substring(0, 12) + '...')
    
    // Now test the token endpoint
    console.log('\n🔍 Testing token endpoint...')
    
    const response = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    })
    
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Token exchange failed')
      console.error('Error:', JSON.stringify(errorData, null, 2))
      process.exit(1)
    }
    
    const tokens = await response.json()
    console.log('✅ Token exchange successful!')
    console.log('Access token:', tokens.access_token.substring(0, 20) + '...')
    console.log('ID token:', tokens.id_token.substring(0, 20) + '...')
    console.log('Has refresh token:', !!tokens.refresh_token)
    
    process.exit(0)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
