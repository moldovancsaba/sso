#!/usr/bin/env node
/**
 * scripts/test-magic-link-production.mjs - Test magic link in production
 * WHAT: Comprehensive test of magic link request and consumption
 * WHY: Debug why magic links aren't working correctly
 * 
 * Usage: node scripts/test-magic-link-production.mjs
 */

import fetch from 'node-fetch'

const PRODUCTION_URL = 'https://sso.doneisbetter.com'
const TEST_EMAIL = 'moldovancsaba@gmail.com'

console.log('🧪 Testing Magic Link Flow in Production\n')
console.log('Target:', PRODUCTION_URL)
console.log('Email:', TEST_EMAIL)
console.log('')

async function testMagicLinkRequest() {
  console.log('📤 Step 1: Request magic link...')
  
  try {
    const res = await fetch(`${PRODUCTION_URL}/api/public/request-magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL })
    })
    
    const data = await res.json()
    
    console.log('  Status:', res.status)
    console.log('  Response:', JSON.stringify(data, null, 2))
    
    if (res.ok && data.success) {
      console.log('  ✅ Magic link request successful')
      console.log('  📧 Check inbox:', TEST_EMAIL)
      console.log('')
      console.log('  ⚠️  NEXT STEPS:')
      console.log('  1. Check your email inbox')
      console.log('  2. Find the magic link email')
      console.log('  3. Copy the full URL from the email')
      console.log('  4. Test it with: node scripts/test-magic-link-consumption.mjs <TOKEN>')
      console.log('')
      return true
    } else {
      console.log('  ❌ Magic link request failed')
      return false
    }
  } catch (error) {
    console.error('  ❌ Request error:', error.message)
    return false
  }
}

async function testUserLookup() {
  console.log('🔍 Step 2: Verify user exists in database...')
  console.log('  Note: This requires database access')
  console.log('  Skipping for now - check manually if needed')
  console.log('')
}

async function testEnvironmentVars() {
  console.log('🔐 Step 3: Check critical environment variables...')
  console.log('  Note: These are set in Vercel, cannot verify from here')
  console.log('  Required vars:')
  console.log('    - JWT_SECRET (for token signing)')
  console.log('    - SMTP_* (for email sending)')
  console.log('    - MONGODB_URI (for database)')
  console.log('')
}

async function main() {
  const success = await testMagicLinkRequest()
  await testUserLookup()
  await testEnvironmentVars()
  
  if (success) {
    console.log('✅ Test completed - check your email!')
  } else {
    console.log('❌ Test failed - check logs above')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
