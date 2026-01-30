#!/usr/bin/env node
/**
 * scripts/create-amanoba-admin-token.mjs
 * WHAT: Creates admin API token for Amanoba quiz automation
 * WHY: Quiz-item QA automation needs admin access to GET /api/admin/questions
 */
import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'
import { generateAccessToken } from '../lib/oauth/tokens.mjs'

dotenv.config({ path: '.env.local' })

// Configuration
const AUTOMATION_USER = {
  email: 'quiz-automation@amanoba.com',
  name: 'Quiz Item QA Automation',
  role: 'admin'
}

const AMANOBA_CLIENT_ID = 'amanoba-quiz-automation' // You'll need the actual client ID

async function main() {
  console.log('🤖 Creating admin API token for Amanoba quiz automation...\n')
  
  const db = await getDb()
  
  // Step 1: Find or create automation user
  console.log('1. Setting up automation user...')
  let user = await db.collection('publicUsers').findOne({ 
    email: AUTOMATION_USER.email 
  })
  
  if (!user) {
    console.log('   Creating new automation user...')
    const now = new Date().toISOString()
    user = {
      id: crypto.randomUUID(),
      email: AUTOMATION_USER.email,
      name: AUTOMATION_USER.name,
      role: AUTOMATION_USER.role,
      status: 'active',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    }
    await db.collection('publicUsers').insertOne(user)
    console.log('   ✅ Created automation user:', user.id)
  } else {
    console.log('   ✅ Found existing user:', user.id)
  }
  
  // Step 2: Find Amanoba OAuth client
  console.log('\n2. Finding Amanoba OAuth client...')
  const client = await db.collection('oauthClients').findOne({ 
    name: 'amanoba' 
  })
  
  if (!client) {
    console.error('   ❌ Amanoba OAuth client not found!')
    console.log('   You need to create an OAuth client for Amanoba first.')
    console.log('   Run: node scripts/register-amanoba-client.mjs')
    process.exit(1)
  }
  
  console.log('   ✅ Found Amanoba client:', client.client_id)
  
  // Step 3: Grant admin permissions to Amanoba
  console.log('\n3. Granting admin permissions...')
  const now = new Date().toISOString()
  
  await db.collection('appPermissions').updateOne(
    { userId: user.id, clientId: client.client_id },
    {
      $set: {
        userId: user.id,
        clientId: client.client_id,
        appName: 'amanoba',
        hasAccess: true,
        role: 'admin',
        status: 'approved',
        grantedAt: now,
        grantedBy: 'automation-script',
        updatedAt: now,
      }
    },
    { upsert: true }
  )
  
  console.log('   ✅ Granted admin access to Amanoba')
  
  // Step 4: Generate long-lived access token
  console.log('\n4. Generating access token...')
  
  const tokenResult = await generateAccessToken({
    userId: user.id,
    clientId: client.client_id,
    scope: 'openid profile email admin manage_permissions',
    expiresIn: 365 * 24 * 60 * 60, // 1 year
  })
  
  const accessToken = tokenResult.token
  
  console.log('   ✅ Generated access token')
  
  // Step 5: Display results
  console.log('\n' + '='.repeat(60))
  console.log('🎉 ADMIN API TOKEN CREATED SUCCESSFULLY')
  console.log('='.repeat(60))
  console.log()
  console.log('User Details:')
  console.log(`  Email: ${user.email}`)
  console.log(`  ID: ${user.id}`)
  console.log(`  Role: ${user.role}`)
  console.log()
  console.log('Access Token:')
  console.log(`  ${accessToken}`)
  console.log()
  console.log('Token Details:')
  console.log(`  JTI: ${tokenResult.jti}`)
  console.log(`  Expires: ${tokenResult.expiresAt}`)
  console.log()
  console.log('Environment Variable:')
  console.log(`  export QUIZ_ITEM_ADMIN_TOKEN="${accessToken}"`)
  console.log()
  console.log('Vercel Environment Variable:')
  console.log(`  QUIZ_ITEM_ADMIN_TOKEN = ${accessToken}`)
  console.log()
  console.log('Usage in API calls:')
  console.log(`  curl -H "Authorization: Bearer ${accessToken}" \\`)
  console.log(`    https://amanoba.com/api/admin/questions`)
  console.log()
  console.log('Next Steps:')
  console.log('1. Add the token to your local environment')
  console.log('2. Add the token to Vercel environment variables')
  console.log('3. Test the token against https://amanoba.com/api/admin/questions')
  console.log('4. Run your quiz automation: cli.ts loop:run --items 1')
  console.log()
  
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})