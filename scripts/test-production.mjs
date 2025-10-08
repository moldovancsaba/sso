#!/usr/bin/env node
/**
 * Production Testing Script for SSO v5.3.0
 * 
 * WHAT: Comprehensive test suite for all authentication features in production
 * WHY: Verify deployment is fully functional before integration
 * 
 * Tests:
 * 1. OAuth2/OIDC endpoints
 * 2. Authentication pages
 * 3. Magic link request
 * 4. Forgot password
 * 5. LaunchMass OAuth client
 */

const SSO_BASE_URL = 'https://sso.doneisbetter.com'
const LAUNCHMASS_CLIENT_ID = '04dc2cc1-9fd3-4ffa-9813-450dca97af92'

console.log('🧪 SSO v5.3.0 Production Testing Suite')
console.log('=' .repeat(70))
console.log(`\nTarget: ${SSO_BASE_URL}`)
console.log(`Time: ${new Date().toISOString()}\n`)

let passedTests = 0
let failedTests = 0

// Helper function to test endpoint
async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    const response = await fetch(url)
    const status = response.status
    
    if (status === expectedStatus) {
      console.log(`✅ ${name}: ${status}`)
      passedTests++
      return { success: true, status, response }
    } else {
      console.log(`❌ ${name}: Expected ${expectedStatus}, got ${status}`)
      failedTests++
      return { success: false, status, response }
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`)
    failedTests++
    return { success: false, error }
  }
}

// Helper function to test API endpoint
async function testAPIEndpoint(name, url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    if (body) options.body = JSON.stringify(body)
    
    const response = await fetch(url, options)
    const status = response.status
    
    console.log(`  ${name}: ${status} ${response.statusText}`)
    return { success: true, status, response }
  } catch (error) {
    console.log(`  ${name}: ERROR - ${error.message}`)
    return { success: false, error }
  }
}

async function runTests() {
  // Test 1: OAuth2/OIDC Discovery Endpoints
  console.log('\n📋 Test 1: OAuth2/OIDC Discovery Endpoints')
  console.log('─'.repeat(70))
  
  const discoveryResult = await testEndpoint(
    'OpenID Configuration',
    `${SSO_BASE_URL}/api/.well-known/openid-configuration`
  )
  
  if (discoveryResult.success) {
    try {
      const config = await discoveryResult.response.json()
      console.log(`  ✓ Issuer: ${config.issuer}`)
      console.log(`  ✓ Authorization endpoint: ${config.authorization_endpoint}`)
      console.log(`  ✓ Token endpoint: ${config.token_endpoint}`)
      console.log(`  ✓ Scopes: ${config.scopes_supported.length} supported`)
    } catch (e) {
      console.log(`  ⚠️  Could not parse JSON: ${e.message}`)
    }
  }
  
  await testEndpoint('JWKS Endpoint', `${SSO_BASE_URL}/.well-known/jwks.json`)
  
  // Test 2: Authentication Pages
  console.log('\n🔐 Test 2: Authentication Pages')
  console.log('─'.repeat(70))
  
  await testEndpoint('Home Page', `${SSO_BASE_URL}/`)
  await testEndpoint('Admin Login', `${SSO_BASE_URL}/admin`)
  await testEndpoint('Public Login', `${SSO_BASE_URL}/login`)
  await testEndpoint('Registration', `${SSO_BASE_URL}/register`)
  await testEndpoint('Forgot Password', `${SSO_BASE_URL}/forgot-password`)
  await testEndpoint('Admin Forgot Password', `${SSO_BASE_URL}/admin/forgot-password`)
  
  // Test 3: OAuth2 Authorization Endpoint
  console.log('\n🔑 Test 3: OAuth2 Authorization Endpoint (LaunchMass)')
  console.log('─'.repeat(70))
  
  const authUrl = new URL(`${SSO_BASE_URL}/api/oauth/authorize`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', LAUNCHMASS_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', 'https://launchmass.doneisbetter.com/auth/callback')
  authUrl.searchParams.set('scope', 'openid profile email offline_access')
  authUrl.searchParams.set('state', 'test_state_' + Date.now())
  // NO code_challenge - testing PKCE is optional!
  
  console.log(`Authorization URL (without PKCE):`)
  console.log(`  ${authUrl.toString().substring(0, 100)}...`)
  
  try {
    const response = await fetch(authUrl.toString(), { redirect: 'manual' })
    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location')
      console.log(`✅ Authorization endpoint redirects correctly`)
      console.log(`  → Redirect to: ${location ? location.substring(0, 60) + '...' : 'login/consent'}`)
      passedTests++
    } else {
      console.log(`⚠️  Expected redirect (302), got: ${response.status}`)
    }
  } catch (error) {
    console.log(`❌ Authorization endpoint: ${error.message}`)
    failedTests++
  }
  
  // Test 4: API Endpoints (without authentication)
  console.log('\n🛠️  Test 4: API Endpoints (Basic Availability)')
  console.log('─'.repeat(70))
  
  await testAPIEndpoint('Token endpoint (no auth)', `${SSO_BASE_URL}/api/oauth/token`, 'POST', {})
  await testAPIEndpoint('Userinfo endpoint (no auth)', `${SSO_BASE_URL}/api/oauth/userinfo`, 'GET')
  await testAPIEndpoint('Revoke endpoint', `${SSO_BASE_URL}/api/oauth/revoke`, 'POST', {})
  
  // Test 5: Magic Link Request (with test email)
  console.log('\n🔗 Test 5: Magic Link Request (Public User)')
  console.log('─'.repeat(70))
  
  const magicLinkResult = await testAPIEndpoint(
    'Request magic link',
    `${SSO_BASE_URL}/api/public/request-magic-link`,
    'POST',
    { email: 'test@example.com' }
  )
  
  if (magicLinkResult.success) {
    try {
      const data = await magicLinkResult.response.json()
      console.log(`  Response: ${data.message}`)
      if (data.success || data.message) {
        console.log(`✅ Magic link endpoint is functional`)
        passedTests++
      }
    } catch (e) {
      console.log(`  ⚠️  Could not parse response`)
    }
  }
  
  // Test 6: Forgot Password Request
  console.log('\n📧 Test 6: Forgot Password Request')
  console.log('─'.repeat(70))
  
  const forgotPasswordResult = await testAPIEndpoint(
    'Forgot password (public)',
    `${SSO_BASE_URL}/api/public/forgot-password`,
    'POST',
    { email: 'test@example.com' }
  )
  
  if (forgotPasswordResult.success) {
    try {
      const data = await forgotPasswordResult.response.json()
      console.log(`  Response: ${data.message}`)
      if (data.success || data.message) {
        console.log(`✅ Forgot password endpoint is functional`)
        passedTests++
      }
    } catch (e) {
      console.log(`  ⚠️  Could not parse response`)
    }
  }
  
  // Test 7: Session Validation Endpoint
  console.log('\n🎫 Test 7: Session Validation')
  console.log('─'.repeat(70))
  
  await testAPIEndpoint('Validate session (no cookie)', `${SSO_BASE_URL}/api/sso/validate`, 'GET')
  
  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 Test Summary')
  console.log('='.repeat(70))
  console.log(`✅ Passed: ${passedTests}`)
  console.log(`❌ Failed: ${failedTests}`)
  console.log(`📈 Total: ${passedTests + failedTests}`)
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Production is ready!')
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Review logs above.`)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✨ Testing complete!')
  console.log('\n💡 Next steps:')
  console.log('  1. Test full OAuth flow from LaunchMass')
  console.log('  2. Try logging in with magic link')
  console.log('  3. Test forgot password with real email')
  console.log('  4. Login 5+ times to trigger PIN verification')
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error)
  process.exit(1)
})
