#!/usr/bin/env node
/**
 * scripts/get-amanoba-admin-token.mjs
 * WHAT: Authenticates with Amanoba's own system to get admin token
 * WHY: Amanoba uses its own authentication, not SSO
 */

const AMANOBA_BASE_URL = process.env.AMANOBA_BASE_URL || 'https://amanoba.com'

// You'll need to provide these credentials
const ADMIN_EMAIL = process.env.AMANOBA_ADMIN_EMAIL || 'your-admin@email.com'
const ADMIN_PASSWORD = process.env.AMANOBA_ADMIN_PASSWORD || 'your-password'

async function main() {
  console.log('🔐 Getting Amanoba admin token...\n')
  
  if (ADMIN_EMAIL === 'your-admin@email.com') {
    console.error('❌ Please set AMANOBA_ADMIN_EMAIL and AMANOBA_ADMIN_PASSWORD environment variables')
    console.log('Example:')
    console.log('export AMANOBA_ADMIN_EMAIL="admin@amanoba.com"')
    console.log('export AMANOBA_ADMIN_PASSWORD="your-password"')
    process.exit(1)
  }
  
  console.log(`Email: ${ADMIN_EMAIL}`)
  console.log(`URL: ${AMANOBA_BASE_URL}`)
  console.log()
  
  // Try to login to Amanoba
  console.log('1. Attempting login...')
  
  try {
    const loginResponse = await fetch(`${AMANOBA_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    })
    
    console.log(`   Status: ${loginResponse.status} ${loginResponse.statusText}`)
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json()
      console.log('   ✅ Login successful!')
      
      // Check if we got a token directly
      if (loginData.token || loginData.access_token || loginData.accessToken) {
        const token = loginData.token || loginData.access_token || loginData.accessToken
        
        console.log('\n🎉 Admin token obtained!')
        console.log('='.repeat(50))
        console.log(`Token: ${token}`)
        console.log()
        console.log('Environment Variable:')
        console.log(`export QUIZ_ITEM_ADMIN_TOKEN="${token}"`)
        console.log()
        console.log('Vercel Environment Variable:')
        console.log(`QUIZ_ITEM_ADMIN_TOKEN = ${token}`)
        console.log()
        
        // Test the token
        console.log('2. Testing token...')
        const testResponse = await fetch(`${AMANOBA_BASE_URL}/api/admin/questions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        console.log(`   Status: ${testResponse.status} ${testResponse.statusText}`)
        if (testResponse.ok) {
          console.log('   ✅ Token works!')
        } else {
          console.log('   ❌ Token doesn\'t work for admin endpoints')
        }
        
      } else {
        console.log('   ⚠️  Login successful but no token in response')
        console.log('   Response:', JSON.stringify(loginData, null, 2))
        
        // Check if we got cookies instead
        const cookies = loginResponse.headers.get('set-cookie')
        if (cookies) {
          console.log('   📝 Got cookies instead of token:')
          console.log(`   ${cookies}`)
          console.log('   Amanoba might use session-based auth instead of tokens')
        }
      }
      
    } else {
      const errorText = await loginResponse.text()
      console.log('   ❌ Login failed!')
      console.log(`   Error: ${errorText}`)
      
      console.log('\n💡 Troubleshooting:')
      console.log('1. Check if email/password are correct')
      console.log('2. Check if admin account exists in Amanoba')
      console.log('3. Check if Amanoba login endpoint expects different fields')
      console.log('4. Try logging in through Amanoba web interface first')
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
  
  // Try alternative token endpoint
  console.log('\n3. Trying alternative token endpoint...')
  
  try {
    const tokenResponse = await fetch(`${AMANOBA_BASE_URL}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        grant_type: 'password'
      })
    })
    
    console.log(`   Status: ${tokenResponse.status} ${tokenResponse.statusText}`)
    
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json()
      console.log('   ✅ Token endpoint works!')
      console.log('   Response:', JSON.stringify(tokenData, null, 2))
    } else {
      const errorText = await tokenResponse.text()
      console.log('   ❌ Token endpoint failed')
      console.log(`   Error: ${errorText}`)
    }
    
  } catch (error) {
    console.log('   ❌ Token endpoint error:', error.message)
  }
  
  console.log('\n📋 Summary:')
  console.log('- Amanoba uses its own authentication system')
  console.log('- You need to get admin credentials for Amanoba specifically')
  console.log('- The SSO token won\'t work for Amanoba APIs')
  console.log()
  console.log('Next steps:')
  console.log('1. Get valid Amanoba admin credentials')
  console.log('2. Check Amanoba documentation for API authentication')
  console.log('3. Contact Amanoba developers for API access')
  
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})