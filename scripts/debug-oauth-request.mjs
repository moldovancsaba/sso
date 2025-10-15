#!/usr/bin/env node
/**
 * Debug OAuth request by simulating what LaunchMass does
 */

import { getDb } from '../lib/db.mjs'
import { createAuthorizationCode } from '../lib/oauth/codes.mjs'

const CLIENT_ID = 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f'
const CLIENT_SECRET = '2c5d4134-d014-438d-9273-950828ed1443'
const REDIRECT_URI = 'https://launchmass.doneisbetter.com/api/oauth/callback'

async function main() {
  try {
    console.log('🔍 Simulating LaunchMass OAuth flow\n')
    
    // Get a real user
    const db = await getDb()
    const user = await db.collection('users').findOne({ role: { $exists: true } })
    
    if (!user) {
      console.error('❌ No users found')
      process.exit(1)
    }
    
    console.log('Step 1: Creating authorization code (simulating SSO)')
    console.log('   User:', user.email)
    
    const authCode = await createAuthorizationCode({
      client_id: CLIENT_ID,
      user_id: user.id,
      redirect_uri: REDIRECT_URI,
      scope: 'openid profile email offline_access',
      code_challenge: null,
      code_challenge_method: null,
    })
    
    console.log('   ✅ Code:', authCode.substring(0, 12) + '...')
    
    console.log('\nStep 2: Exchange code for tokens (simulating LaunchMass)')
    console.log('   Sending request to: https://sso.doneisbetter.com/api/oauth/token')
    console.log('   Method: POST')
    console.log('   Body:')
    console.log('     grant_type:', 'authorization_code')
    console.log('     code:', authCode.substring(0, 12) + '...')
    console.log('     redirect_uri:', REDIRECT_URI)
    console.log('     client_id:', CLIENT_ID)
    console.log('     client_secret:', CLIENT_SECRET.substring(0, 8) + '...')
    
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
    
    console.log('\nStep 3: Response from SSO')
    console.log('   Status:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('\n❌ Token exchange failed!')
      console.error('   Error:', JSON.stringify(errorData, null, 2))
      
      console.log('\n🔍 Debugging info:')
      console.log('   - Is SSO deployed with new keys? Check Vercel deployment')
      console.log('   - Did deployment succeed? Check build logs')
      console.log('   - Are environment variables set? Check Vercel settings')
      
      process.exit(1)
    }
    
    const tokens = await response.json()
    console.log('   ✅ Success!')
    console.log('   Access token:', tokens.access_token.substring(0, 20) + '...')
    console.log('   ID token:', tokens.id_token.substring(0, 20) + '...')
    console.log('   Refresh token:', tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'none')
    
    console.log('\n✅ OAuth flow working correctly!')
    console.log('\nIf LaunchMass still shows error, the issue is in LaunchMass code, not SSO.')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
