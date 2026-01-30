#!/usr/bin/env node
/**
 * scripts/decode-jwt.mjs
 * WHAT: Decodes JWT token to see its contents
 * WHY: Need to check what scopes and claims are in the token
 */

const token = process.env.QUIZ_ITEM_ADMIN_TOKEN

if (!token) {
  console.error('❌ QUIZ_ITEM_ADMIN_TOKEN not set')
  process.exit(1)
}

function base64UrlDecode(str) {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4)
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(str, 'base64').toString('utf8')
}

const parts = token.split('.')
if (parts.length !== 3) {
  console.error('❌ Invalid JWT format')
  process.exit(1)
}

try {
  const header = JSON.parse(base64UrlDecode(parts[0]))
  const payload = JSON.parse(base64UrlDecode(parts[1]))
  
  console.log('🔍 JWT Token Analysis\n')
  
  console.log('Header:')
  console.log(JSON.stringify(header, null, 2))
  
  console.log('\nPayload:')
  console.log(JSON.stringify(payload, null, 2))
  
  console.log('\nKey Information:')
  console.log(`User ID: ${payload.sub}`)
  console.log(`Client ID: ${payload.client_id}`)
  console.log(`Scope: ${payload.scope}`)
  console.log(`Token Type: ${payload.token_type}`)
  console.log(`Expires: ${new Date(payload.exp * 1000).toISOString()}`)
  console.log(`Issued: ${new Date(payload.iat * 1000).toISOString()}`)
  
  // Check if token has manage_permissions scope
  const scopes = payload.scope ? payload.scope.split(' ') : []
  console.log('\nScopes:')
  scopes.forEach(scope => console.log(`  - ${scope}`))
  
  if (scopes.includes('manage_permissions')) {
    console.log('\n✅ Token has manage_permissions scope')
  } else {
    console.log('\n❌ Token missing manage_permissions scope')
    console.log('This is why permission checks are failing!')
  }
  
} catch (error) {
  console.error('❌ Failed to decode JWT:', error.message)
  process.exit(1)
}