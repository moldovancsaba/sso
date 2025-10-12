#!/usr/bin/env node
/**
 * Diagnostic script to check LaunchMass OAuth configuration and recent activity
 * 
 * Usage: node scripts/check-launchmass-oauth.mjs
 */

import { getDb } from '../lib/db.mjs'

async function main() {
  console.log('🔍 Checking LaunchMass OAuth Configuration...\n')
  
  try {
    const db = await getDb()
    
    // Find LaunchMass client
    console.log('1️⃣ Looking for LaunchMass OAuth client...')
    const client = await db.collection('oauthClients').findOne({
      name: /launchmass/i
    })
    
    if (!client) {
      console.log('❌ No LaunchMass client found!')
      console.log('\nSearching all clients:')
      const allClients = await db.collection('oauthClients').find({}).toArray()
      console.log('All clients:', allClients.map(c => ({ id: c.id, name: c.name })))
      process.exit(1)
    }
    
    console.log('✅ Found LaunchMass client:')
    console.log('   ID:', client.id)
    console.log('   Name:', client.name)
    console.log('   Status:', client.status)
    console.log('   Redirect URIs:', client.redirect_uris)
    console.log('   Require PKCE:', client.require_pkce)
    console.log('   Allowed Scopes:', client.allowed_scopes)
    console.log('')
    
    // Check recent authorization codes
    console.log('2️⃣ Checking recent authorization codes (last 10)...')
    const codes = await db.collection('authorizationCodes')
      .find({ client_id: client.id })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray()
    
    if (codes.length === 0) {
      console.log('⚠️  No authorization codes found')
    } else {
      console.log(`Found ${codes.length} recent codes:`)
      for (const code of codes) {
        console.log(`   - Code: ${code.code.substring(0, 12)}...`)
        console.log(`     User ID: ${code.user_id}`)
        console.log(`     Created: ${code.created_at}`)
        console.log(`     Expires: ${code.expires_at}`)
        console.log(`     Used: ${code.used_at ? 'YES at ' + code.used_at : 'NO'}`)
        console.log(`     Has PKCE: ${code.code_challenge ? 'YES (' + code.code_challenge_method + ')' : 'NO'}`)
        console.log('')
      }
    }
    
    // Check for recent consents
    console.log('3️⃣ Checking user consents...')
    const consents = await db.collection('userConsents')
      .find({ client_id: client.id, revoked_at: null })
      .toArray()
    
    if (consents.length === 0) {
      console.log('⚠️  No active consents found')
    } else {
      console.log(`Found ${consents.length} active consents:`)
      for (const consent of consents) {
        console.log(`   - User ID: ${consent.user_id}`)
        console.log(`     Scope: ${consent.scope}`)
        console.log(`     Granted: ${consent.granted_at}`)
        console.log('')
      }
    }
    
    // Check for recent access tokens
    console.log('4️⃣ Checking recent access tokens (last 5)...')
    const tokens = await db.collection('accessTokens')
      .find({ client_id: client.id })
      .sort({ created_at: -1 })
      .limit(5)
      .toArray()
    
    if (tokens.length === 0) {
      console.log('⚠️  No access tokens found')
    } else {
      console.log(`Found ${tokens.length} recent tokens:`)
      for (const token of tokens) {
        console.log(`   - Token ID: ${token.jti}`)
        console.log(`     User ID: ${token.user_id}`)
        console.log(`     Created: ${token.created_at}`)
        console.log(`     Expires: ${token.expires_at}`)
        console.log(`     Revoked: ${token.revoked_at ? 'YES' : 'NO'}`)
        console.log('')
      }
    }
    
    console.log('✅ Diagnostic complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
  
  process.exit(0)
}

main()
