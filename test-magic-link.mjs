#!/usr/bin/env node
/**
 * test-magic-link.mjs - Test magic link flow end-to-end
 * WHAT: Requests magic link, extracts token, tests login endpoint
 * WHY: Diagnose why magic link login doesn't create active session
 */

import 'dotenv/config'
// Using built-in fetch (Node 18+)

const BASE_URL = process.env.SSO_BASE_URL || 'https://sso.doneisbetter.com'
const TEST_EMAIL = process.env.TEST_EMAIL || 'csaba@moldovan.pro'

async function testMagicLinkFlow() {
  console.log('🧪 Testing Magic Link Flow')
  console.log('================================\n')
  
  // Step 1: Request magic link
  console.log('📧 Step 1: Requesting magic link...')
  console.log(`   Email: ${TEST_EMAIL}`)
  
  const requestRes = await fetch(`${BASE_URL}/api/public/request-magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL })
  })
  
  const requestData = await requestRes.json()
  console.log(`   Status: ${requestRes.status}`)
  console.log(`   Response:`, JSON.stringify(requestData, null, 2))
  
  if (!requestRes.ok) {
    console.error('❌ Failed to request magic link')
    process.exit(1)
  }
  
  // Step 2: Extract token from database (simulating email click)
  console.log('\n🔍 Step 2: Extracting token from database...')
  
  const { getDb } = await import('./lib/db.mjs')
  const db = await getDb()
  
  const tokenDoc = await db.collection('publicMagicTokens')
    .find({ email: TEST_EMAIL, usedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray()
    .then(docs => docs[0])
  
  if (!tokenDoc) {
    console.error('❌ No unused magic token found in database')
    process.exit(1)
  }
  
  console.log(`   Token ID: ${tokenDoc.jti}`)
  console.log(`   Created: ${tokenDoc.createdAt}`)
  console.log(`   Expires: ${tokenDoc.expiresAt}`)
  
  // Reconstruct the token
  const token = tokenDoc.token
  console.log(`   Token (first 50 chars): ${token.substring(0, 50)}...`)
  
  // Step 3: Test magic login endpoint
  console.log('\n🔗 Step 3: Testing magic login endpoint...')
  console.log(`   URL: ${BASE_URL}/api/public/magic-login?token=...`)
  
  const loginRes = await fetch(`${BASE_URL}/api/public/magic-login?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    redirect: 'manual' // Don't follow redirects
  })
  
  console.log(`   Status: ${loginRes.status} ${loginRes.statusText}`)
  console.log(`   Location: ${loginRes.headers.get('location')}`)
  
  const cookies = loginRes.headers.raw()['set-cookie']
  console.log(`   Cookies set: ${cookies ? cookies.length : 0}`)
  if (cookies) {
    cookies.forEach(cookie => {
      const cookieName = cookie.split('=')[0]
      const hasHttpOnly = cookie.includes('HttpOnly')
      const hasSecure = cookie.includes('Secure')
      const maxAge = cookie.match(/Max-Age=(\d+)/)
      console.log(`     - ${cookieName} (HttpOnly: ${hasHttpOnly}, Secure: ${hasSecure}, MaxAge: ${maxAge ? maxAge[1] : 'N/A'})`)
    })
  }
  
  if (loginRes.status !== 302) {
    const body = await loginRes.text()
    console.log(`   Body (first 500 chars): ${body.substring(0, 500)}`)
    console.error('❌ Expected 302 redirect, got', loginRes.status)
    process.exit(1)
  }
  
  // Step 4: Verify token was marked as used
  console.log('\n✅ Step 4: Verifying token was consumed...')
  
  const updatedTokenDoc = await db.collection('publicMagicTokens')
    .findOne({ jti: tokenDoc.jti })
  
  if (!updatedTokenDoc.usedAt) {
    console.error('❌ Token was NOT marked as used in database')
    process.exit(1)
  }
  
  console.log(`   Token marked as used at: ${updatedTokenDoc.usedAt}`)
  
  // Step 5: Test session validation with the cookie
  console.log('\n🔐 Step 5: Testing session validation...')
  
  const sessionCookie = cookies ? cookies.find(c => c.startsWith('public-session=')) : null
  if (!sessionCookie) {
    console.error('❌ No public-session cookie was set')
    process.exit(1)
  }
  
  const sessionToken = sessionCookie.split(';')[0].split('=')[1]
  console.log(`   Session token (first 50 chars): ${sessionToken.substring(0, 50)}...`)
  
  const sessionRes = await fetch(`${BASE_URL}/api/public/session`, {
    method: 'GET',
    headers: {
      'Cookie': `public-session=${sessionToken}`
    }
  })
  
  const sessionData = await sessionRes.json()
  console.log(`   Status: ${sessionRes.status}`)
  console.log(`   Response:`, JSON.stringify(sessionData, null, 2))
  
  if (!sessionRes.ok || !sessionData.isValid) {
    console.error('❌ Session validation failed')
    process.exit(1)
  }
  
  console.log('\n✅ SUCCESS! Magic link flow works end-to-end')
  console.log(`   User logged in: ${sessionData.user.email}`)
  console.log(`   Session is valid and persists`)
}

testMagicLinkFlow().catch(err => {
  console.error('\n❌ Test failed with error:', err)
  process.exit(1)
})
