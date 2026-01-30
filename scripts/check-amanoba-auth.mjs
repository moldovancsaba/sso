#!/usr/bin/env node
/**
 * scripts/check-amanoba-auth.mjs
 * WHAT: Investigates Amanoba's authentication system
 * WHY: Need to understand how Amanoba actually authenticates API requests
 */

const AMANOBA_BASE_URL = process.env.AMANOBA_BASE_URL || 'https://amanoba.com'

async function main() {
  console.log('🔍 Investigating Amanoba authentication system...\n')
  
  // Test 1: Check what authentication methods are supported
  console.log('1. Testing different authentication methods...\n')
  
  const testMethods = [
    {
      name: 'No Authentication',
      headers: {}
    },
    {
      name: 'Bearer Token (Current)',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    },
    {
      name: 'API Key Header',
      headers: {
        'X-API-Key': 'test-key',
        'API-Key': 'test-key'
      }
    },
    {
      name: 'Basic Auth',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
      }
    }
  ]
  
  for (const method of testMethods) {
    console.log(`   Testing: ${method.name}`)
    try {
      const response = await fetch(`${AMANOBA_BASE_URL}/api/admin/questions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...method.headers
        }
      })
      
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      if (response.status !== 401) {
        const text = await response.text()
        console.log(`   Response: ${text.substring(0, 200)}...`)
        
        if (response.ok) {
          console.log('   🎉 This method might work!')
        }
      }
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`)
    }
    console.log()
  }
  
  // Test 2: Check for authentication endpoints
  console.log('2. Looking for authentication endpoints...\n')
  
  const authEndpoints = [
    '/api/auth/login',
    '/api/admin/login', 
    '/api/login',
    '/login',
    '/api/auth/token',
    '/api/token'
  ]
  
  for (const endpoint of authEndpoints) {
    console.log(`   Checking: ${endpoint}`)
    try {
      const response = await fetch(`${AMANOBA_BASE_URL}${endpoint}`, {
        method: 'GET'
      })
      
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      if (response.status !== 404) {
        console.log('   ✅ Endpoint exists!')
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }
  
  console.log()
  console.log('3. Recommendations:')
  console.log()
  console.log('Based on the 401 "Authentication required" error, Amanoba likely uses:')
  console.log('- Custom API keys stored in its own database')
  console.log('- Session-based authentication with cookies')
  console.log('- A different JWT system than SSO')
  console.log()
  console.log('Next steps:')
  console.log('1. Check Amanoba\'s codebase for authentication middleware')
  console.log('2. Look for API key generation in Amanoba admin panel')
  console.log('3. Check if Amanoba has its own user/admin system')
  console.log('4. Contact Amanoba developers for API authentication docs')
  console.log()
  
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})