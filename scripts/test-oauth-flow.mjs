#!/usr/bin/env node
/**
 * OAuth Flow End-to-End Test Script
 * 
 * This script tests the complete OAuth 2.0 authorization flow:
 * 1. Client configuration validation
 * 2. Authorization request simulation
 * 3. Token exchange simulation
 * 4. Token validation
 * 
 * Usage: node scripts/test-oauth-flow.mjs <client_id>
 */

import { getDb } from '../lib/db.mjs'
import { getClient, verifyClient, validateRedirectUri, validateClientScopes } from '../lib/oauth/clients.mjs'
import { createAuthorizationCode, validateAndConsumeCode } from '../lib/oauth/codes.mjs'
import { generateAccessToken, generateIdToken, verifyAccessToken } from '../lib/oauth/tokens.mjs'

const CLIENT_ID = process.argv[2] || 'df9bea3a-eb1e-49b4-a8d0-3a8e0b18842f'
const REDIRECT_URI = 'https://launchmass.doneisbetter.com/api/oauth/callback'

console.log('🧪 OAuth Flow End-to-End Test\n')
console.log('Target Client ID:', CLIENT_ID)
console.log('Redirect URI:', REDIRECT_URI)
console.log('\n' + '='.repeat(60) + '\n')

async function main() {
  try {
    // Step 1: Verify client configuration
    console.log('📋 Step 1: Verifying Client Configuration')
    console.log('-'.repeat(60))
    
    const client = await getClient(CLIENT_ID)
    
    if (!client) {
      console.error('❌ Client not found')
      process.exit(1)
    }
    
    console.log('✅ Client found:')
    console.log('   ID:', client.id || client.client_id)
    console.log('   Name:', client.name)
    console.log('   Status:', client.status)
    console.log('   Redirect URIs:', client.redirect_uris)
    console.log('   Allowed Scopes:', client.allowed_scopes)
    console.log('   Require PKCE:', client.require_pkce)
    console.log('   Grant Types:', client.grant_types)
    
    if (client.status !== 'active') {
      console.error('❌ Client is not active')
      process.exit(1)
    }
    
    // Step 2: Validate redirect URI
    console.log('\n📋 Step 2: Validating Redirect URI')
    console.log('-'.repeat(60))
    
    const isValidRedirect = await validateRedirectUri(CLIENT_ID, REDIRECT_URI)
    
    if (!isValidRedirect) {
      console.error('❌ Redirect URI not registered for this client')
      console.error('   Requested:', REDIRECT_URI)
      console.error('   Allowed:', client.redirect_uris)
      process.exit(1)
    }
    
    console.log('✅ Redirect URI is valid')
    
    // Step 3: Validate scopes
    console.log('\n📋 Step 3: Validating Scopes')
    console.log('-'.repeat(60))
    
    const requestedScope = 'openid profile email offline_access'
    const isValidScope = await validateClientScopes(CLIENT_ID, requestedScope)
    
    if (!isValidScope) {
      console.error('❌ One or more scopes not allowed for this client')
      console.error('   Requested:', requestedScope)
      console.error('   Allowed:', client.allowed_scopes)
      process.exit(1)
    }
    
    console.log('✅ All scopes are valid')
    console.log('   Requested:', requestedScope)
    
    // Step 4: Test client authentication (if we have secret)
    console.log('\n📋 Step 4: Testing Client Authentication')
    console.log('-'.repeat(60))
    
    // Get client with secret for testing
    const clientWithSecret = await getClient(CLIENT_ID, true)
    
    if (!clientWithSecret.client_secret) {
      console.warn('⚠️  Client has no secret (cannot test authentication)')
    } else {
      console.log('✅ Client has secret (hashed)')
      console.log('   Note: To test authentication, you need the plaintext secret')
    }
    
    // Step 5: Simulate authorization code generation
    console.log('\n📋 Step 5: Simulating Authorization Code Generation')
    console.log('-'.repeat(60))
    
    // Use a test user ID
    const testUserId = 'test-user-' + Date.now()
    
    const authCode = await createAuthorizationCode({
      client_id: CLIENT_ID,
      user_id: testUserId,
      redirect_uri: REDIRECT_URI,
      scope: requestedScope,
      code_challenge: null, // PKCE not required for this client
      code_challenge_method: null,
    })
    
    console.log('✅ Authorization code created')
    console.log('   Code prefix:', authCode.substring(0, 12) + '...')
    console.log('   User ID:', testUserId)
    console.log('   Expires in: 10 minutes')
    
    // Step 6: Validate and consume authorization code
    console.log('\n📋 Step 6: Validating Authorization Code')
    console.log('-'.repeat(60))
    
    const codeData = await validateAndConsumeCode({
      code: authCode,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: null, // PKCE not used
    })
    
    if (!codeData) {
      console.error('❌ Authorization code validation failed')
      process.exit(1)
    }
    
    console.log('✅ Authorization code validated and consumed')
    console.log('   User ID:', codeData.user_id)
    console.log('   Scope:', codeData.scope)
    
    // Step 7: Generate access token
    console.log('\n📋 Step 7: Generating Access Token')
    console.log('-'.repeat(60))
    
    const accessToken = await generateAccessToken({
      userId: codeData.user_id,
      clientId: CLIENT_ID,
      scope: codeData.scope,
    })
    
    console.log('✅ Access token generated')
    console.log('   Token prefix:', accessToken.token.substring(0, 20) + '...')
    console.log('   JTI:', accessToken.jti)
    console.log('   Expires in: 3600 seconds (1 hour)')
    
    // Step 8: Generate ID token
    console.log('\n📋 Step 8: Generating ID Token')
    console.log('-'.repeat(60))
    
    const idToken = await generateIdToken({
      userId: codeData.user_id,
      clientId: CLIENT_ID,
      scope: codeData.scope,
    })
    
    console.log('✅ ID token generated')
    console.log('   Token prefix:', idToken.token.substring(0, 20) + '...')
    
    // Step 9: Verify access token
    console.log('\n📋 Step 9: Verifying Access Token')
    console.log('-'.repeat(60))
    
    const tokenData = await verifyAccessToken(accessToken.token)
    
    if (!tokenData) {
      console.error('❌ Access token verification failed')
      process.exit(1)
    }
    
    console.log('✅ Access token verified')
    console.log('   User ID:', tokenData.sub)
    console.log('   Client ID:', tokenData.client_id)
    console.log('   Scope:', tokenData.scope)
    console.log('   Issued at:', new Date(tokenData.iat * 1000).toISOString())
    console.log('   Expires at:', new Date(tokenData.exp * 1000).toISOString())
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL TESTS PASSED')
    console.log('='.repeat(60))
    console.log('\nThe OAuth flow is working correctly for this client.')
    console.log('\n📝 Next steps:')
    console.log('   1. Ensure LaunchMass has the correct client_secret')
    console.log('   2. Test the actual OAuth flow in the browser')
    console.log('   3. Check server logs for any errors during token exchange')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('\nStack trace:', error.stack)
    process.exit(1)
  }
}

main()
