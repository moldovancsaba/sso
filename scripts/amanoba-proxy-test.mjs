#!/usr/bin/env node
/**
 * scripts/amanoba-proxy-test.mjs
 * WHAT: Simulates how Amanoba should validate SSO tokens
 * WHY: Test the complete flow that Amanoba should implement
 */

const SSO_BASE_URL = 'https://sso.doneisbetter.com'
const ADMIN_TOKEN = process.env.QUIZ_ITEM_ADMIN_TOKEN

async function validateTokenWithSSO(token) {
  console.log('🔍 Validating token with SSO...')
  
  try {
    // Step 1: Validate token with SSO userinfo endpoint
    const userResponse = await fetch(`${SSO_BASE_URL}/api/oauth/userinfo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!userResponse.ok) {
      console.log('   ❌ Token invalid with SSO')
      return null
    }
    
    const user = await userResponse.json()
    console.log('   ✅ Token valid, user:', user.email)
    
    // Step 2: Check user permissions for Amanoba
    const permissionResponse = await fetch(`${SSO_BASE_URL}/api/users/${user.sub}/apps/03e2626d-7639-45d7-88a6-ebf5697c58f7/permissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!permissionResponse.ok) {
      console.log('   ❌ Cannot check permissions')
      return { user, hasAccess: false, role: 'none' }
    }
    
    const permission = await permissionResponse.json()
    console.log('   ✅ Permissions:', {
      hasAccess: permission.hasAccess,
      role: permission.role,
      status: permission.status
    })
    
    return {
      user,
      hasAccess: permission.hasAccess,
      role: permission.role,
      status: permission.status
    }
    
  } catch (error) {
    console.log('   ❌ Validation error:', error.message)
    return null
  }
}

async function main() {
  console.log('🧪 Testing complete SSO validation flow...\n')
  
  if (!ADMIN_TOKEN) {
    console.error('❌ QUIZ_ITEM_ADMIN_TOKEN not set')
    process.exit(1)
  }
  
  const validation = await validateTokenWithSSO(ADMIN_TOKEN)
  
  if (!validation) {
    console.log('\n❌ Token validation failed')
    process.exit(1)
  }
  
  console.log('\n📋 Validation Results:')
  console.log('='.repeat(40))
  console.log(`User: ${validation.user.email}`)
  console.log(`ID: ${validation.user.sub}`)
  console.log(`Has Access: ${validation.hasAccess}`)
  console.log(`Role: ${validation.role}`)
  console.log(`Status: ${validation.status}`)
  
  if (validation.hasAccess && validation.role === 'admin' && validation.status === 'approved') {
    console.log('\n🎉 SUCCESS! Token should work for admin endpoints')
    console.log()
    console.log('This proves:')
    console.log('✅ Token is valid')
    console.log('✅ User exists in SSO')
    console.log('✅ User has admin access to Amanoba')
    console.log('✅ Permission status is approved')
    console.log()
    console.log('❌ The problem is: Amanoba is not implementing this validation')
    console.log()
    console.log('🔧 Solution: Amanoba needs to add this middleware:')
    console.log()
    console.log('```javascript')
    console.log('// In Amanoba API routes')
    console.log('async function validateSSOToken(req, res, next) {')
    console.log('  const authHeader = req.headers.authorization;')
    console.log('  if (!authHeader?.startsWith("Bearer ")) {')
    console.log('    return res.status(401).json({ error: "Authentication required" });')
    console.log('  }')
    console.log('  ')
    console.log('  const token = authHeader.substring(7);')
    console.log('  ')
    console.log('  // Validate with SSO')
    console.log('  const userResponse = await fetch("https://sso.doneisbetter.com/api/oauth/userinfo", {')
    console.log('    headers: { "Authorization": `Bearer ${token}` }')
    console.log('  });')
    console.log('  ')
    console.log('  if (!userResponse.ok) {')
    console.log('    return res.status(401).json({ error: "Invalid token" });')
    console.log('  }')
    console.log('  ')
    console.log('  const user = await userResponse.json();')
    console.log('  ')
    console.log('  // Check permissions (for admin endpoints)')
    console.log('  const permResponse = await fetch(`https://sso.doneisbetter.com/api/users/${user.sub}/apps/AMANOBA_CLIENT_ID/permissions`, {')
    console.log('    headers: { "Authorization": `Bearer ${token}` }')
    console.log('  });')
    console.log('  ')
    console.log('  if (permResponse.ok) {')
    console.log('    const perm = await permResponse.json();')
    console.log('    if (perm.hasAccess && perm.role === "admin") {')
    console.log('      req.user = user;')
    console.log('      req.userRole = perm.role;')
    console.log('      return next();')
    console.log('    }')
    console.log('  }')
    console.log('  ')
    console.log('  return res.status(403).json({ error: "Insufficient permissions" });')
    console.log('}')
    console.log('```')
    
  } else {
    console.log('\n❌ Token validation succeeded but permissions are insufficient')
    console.log('Check the permission settings in SSO admin panel')
  }
  
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})