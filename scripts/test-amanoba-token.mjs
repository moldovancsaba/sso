#!/usr/bin/env node
/**
 * scripts/test-amanoba-token.mjs
 * WHAT: Tests the admin API token against Amanoba endpoints
 * WHY: Verify the token works before using in automation
 */
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const ADMIN_TOKEN = process.env.QUIZ_ITEM_ADMIN_TOKEN
const AMANOBA_BASE_URL = process.env.AMANOBA_BASE_URL || 'https://amanoba.com'

async function main() {
  console.log('🧪 Testing Amanoba admin API token...\n')
  
  if (!ADMIN_TOKEN) {
    console.error('❌ QUIZ_ITEM_ADMIN_TOKEN environment variable not set')
    console.log('Run: node scripts/create-amanoba-admin-token.mjs')
    process.exit(1)
  }
  
  console.log('Token (first 20 chars):', ADMIN_TOKEN.substring(0, 20) + '...')
  console.log('Testing against:', AMANOBA_BASE_URL)
  console.log()
  
  // Test 1: Admin questions endpoint
  console.log('1. Testing GET /api/admin/questions...')
  try {
    const response = await fetch(`${AMANOBA_BASE_URL}/api/admin/questions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ Success! Questions endpoint accessible')
      console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`)
    } else {
      const error = await response.text()
      console.log('   ❌ Failed!')
      console.log(`   Error: ${error}`)
    }
  } catch (error) {
    console.log('   ❌ Network error:', error.message)
  }
  
  console.log()
  
  // Test 2: Token validation (if endpoint exists)
  console.log('2. Testing token validation...')
  try {
    const response = await fetch(`${AMANOBA_BASE_URL}/api/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ Token is valid')
      console.log(`   User: ${data.user?.email || 'Unknown'}`)
      console.log(`   Role: ${data.user?.role || 'Unknown'}`)
    } else {
      console.log('   ⚠️  Validation endpoint not available or token invalid')
    }
  } catch (error) {
    console.log('   ⚠️  Validation endpoint not available:', error.message)
  }
  
  console.log()
  console.log('Test Results Summary:')
  console.log('- If questions endpoint returned 200: ✅ Token works!')
  console.log('- If questions endpoint returned 401: ❌ Token invalid or expired')
  console.log('- If questions endpoint returned 403: ❌ Token lacks admin permissions')
  console.log('- If questions endpoint returned 404: ⚠️  Endpoint might not exist')
  console.log()
  console.log('Next Steps:')
  console.log('1. If token works: Run your quiz automation')
  console.log('2. If token fails: Regenerate with create-amanoba-admin-token.mjs')
  console.log('3. Add token to Vercel environment variables')
  console.log()
  
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})