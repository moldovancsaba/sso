#!/usr/bin/env node
/**
 * scripts/register-amanoba-client.mjs
 * WHAT: Registers Amanoba as an OAuth client in the SSO system
 * WHY: Amanoba needs to be registered before we can create admin tokens for it
 */
import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'
import bcrypt from 'bcryptjs'

dotenv.config({ path: '.env.local' })

const AMANOBA_CLIENT = {
  client_id: crypto.randomUUID(),
  name: 'amanoba',
  description: 'Amanoba Quiz Platform',
  redirect_uris: [
    'https://amanoba.com/api/auth/callback',
    'https://www.amanoba.com/api/auth/callback',
    'http://localhost:3000/api/auth/callback'
  ],
  allowed_scopes: [
    'openid',
    'profile', 
    'email',
    'admin',
    'manage_permissions'
  ],
  grant_types: [
    'authorization_code',
    'refresh_token',
    'client_credentials'
  ],
  require_pkce: false,
  status: 'active'
}

async function main() {
  console.log('🔧 Registering Amanoba as OAuth client...\n')
  
  const db = await getDb()
  
  // Check if client already exists
  const existing = await db.collection('oauthClients').findOne({ 
    name: 'amanoba' 
  })
  
  if (existing) {
    console.log('✅ Amanoba client already exists:')
    console.log(`   Client ID: ${existing.client_id}`)
    console.log(`   Name: ${existing.name}`)
    console.log(`   Status: ${existing.status}`)
    console.log('\nYou can now run: node scripts/create-amanoba-admin-token.mjs')
    process.exit(0)
  }
  
  // Generate client secret
  const clientSecret = crypto.randomUUID()
  const hashedSecret = await bcrypt.hash(clientSecret, 12)
  
  // Create client record
  const now = new Date().toISOString()
  const client = {
    ...AMANOBA_CLIENT,
    client_secret: hashedSecret,
    created_at: now,
    updated_at: now,
  }
  
  await db.collection('oauthClients').insertOne(client)
  
  console.log('✅ Amanoba OAuth client registered successfully!')
  console.log()
  console.log('Client Details:')
  console.log(`  Client ID: ${client.client_id}`)
  console.log(`  Client Secret: ${clientSecret}`)
  console.log(`  Name: ${client.name}`)
  console.log(`  Status: ${client.status}`)
  console.log()
  console.log('Allowed Scopes:')
  client.allowed_scopes.forEach(scope => {
    console.log(`  - ${scope}`)
  })
  console.log()
  console.log('Grant Types:')
  client.grant_types.forEach(type => {
    console.log(`  - ${type}`)
  })
  console.log()
  console.log('⚠️  IMPORTANT: Save the client secret securely!')
  console.log('   It will not be shown again.')
  console.log()
  console.log('Next Steps:')
  console.log('1. Save client credentials in Amanoba environment:')
  console.log(`   OAUTH_CLIENT_ID="${client.client_id}"`)
  console.log(`   OAUTH_CLIENT_SECRET="${clientSecret}"`)
  console.log('2. Run: node scripts/create-amanoba-admin-token.mjs')
  console.log()
  
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})