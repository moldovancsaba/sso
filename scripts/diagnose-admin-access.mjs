#!/usr/bin/env node
/**
 * Diagnose Admin Access
 * 
 * WHAT: Debug why admin OAuth is failing
 * WHY: User can't access admin despite having permission in database
 * HOW: Check user, session, permission, and OAuth client
 */

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

async function diagnose() {
  const email = (process.env.SSO_EMAIL ?? process.env.EMAIL) || 'moldovancsaba@gmail.com'
  const uri = (process.env.SSO_MONGODB_URI ?? process.env.MONGODB_URI)
  const dbName = (process.env.SSO_MONGODB_DB ?? process.env.MONGODB_DB) || 'sso'

  if (!uri) {
    console.error('❌ MONGODB_URI not configured')
    process.exit(1)
  }

  console.log(`🔍 Diagnosing admin access for: ${email}\n`)
  
  const client = new MongoClient(uri)
  
  try {
    await client.connect()
    const db = client.db(dbName)
    
    // 1. Check user exists
    console.log('1️⃣ Checking publicUsers...')
    const user = await db.collection('publicUsers').findOne({ 
      email: email.toLowerCase().trim() 
    })
    
    if (!user) {
      console.error(`❌ User not found: ${email}`)
      process.exit(1)
    }
    
    console.log(`✅ User found:`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Status: ${user.status}`)
    
    // 2. Check OAuth client exists
    console.log(`\n2️⃣ Checking sso-admin-dashboard OAuth client...`)
    const adminClient = await db.collection('oauthClients').findOne({
      client_id: 'sso-admin-dashboard'
    })
    
    if (!adminClient) {
      console.error(`❌ Admin OAuth client not found!`)
      console.log(`Run: node scripts/bootstrap-admin-client.mjs`)
      process.exit(1)
    }
    
    console.log(`✅ OAuth client found:`)
    console.log(`   Client ID: ${adminClient.client_id}`)
    console.log(`   Name: ${adminClient.name}`)
    console.log(`   Status: ${adminClient.status}`)
    console.log(`   Internal: ${adminClient.internal}`)
    console.log(`   Redirect URIs: ${adminClient.redirect_uris?.join(', ')}`)
    
    // 3. Check app permission
    console.log(`\n3️⃣ Checking appPermissions...`)
    const permission = await db.collection('appPermissions').findOne({
      userId: user.id,
      clientId: 'sso-admin-dashboard'
    })
    
    if (!permission) {
      console.error(`❌ No permission record found!`)
      console.log(`Run: EMAIL=${email} node scripts/grant-admin-permission.mjs`)
      process.exit(1)
    }
    
    console.log(`✅ Permission found:`)
    console.log(`   User ID: ${permission.userId}`)
    console.log(`   Client ID: ${permission.clientId}`)
    console.log(`   Has Access: ${permission.hasAccess}`)
    console.log(`   Role: ${permission.role}`)
    console.log(`   Status: ${permission.status}`)
    console.log(`   Granted At: ${permission.grantedAt}`)
    console.log(`   Granted By: ${permission.grantedBy}`)
    
    // 4. Check sessions
    console.log(`\n4️⃣ Checking publicSessions...`)
    const sessions = await db.collection('publicSessions').find({
      userId: user.id,
      expiresAt: { $gt: new Date() } // Not expired
    }).toArray()
    
    console.log(`Found ${sessions.length} active session(s)`)
    if (sessions.length > 0) {
      sessions.forEach((session, i) => {
        console.log(`   Session ${i + 1}:`)
        console.log(`     Token: ${session.token.substring(0, 16)}...`)
        console.log(`     Expires: ${session.expiresAt}`)
        console.log(`     User Agent: ${session.userAgent?.substring(0, 50)}...`)
      })
    } else {
      console.log(`⚠️  No active sessions found`)
    }
    
    // 5. Final verdict
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`DIAGNOSIS SUMMARY`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    
    const hasValidPermission = permission?.hasAccess === true && permission?.status === 'approved'
    const hasActiveSession = sessions.length > 0
    const clientIsInternal = adminClient?.internal === true
    
    console.log(`✅ User exists: ${!!user}`)
    console.log(`✅ OAuth client exists: ${!!adminClient}`)
    console.log(`${clientIsInternal ? '✅' : '❌'} Client is marked as internal: ${clientIsInternal}`)
    console.log(`${hasValidPermission ? '✅' : '❌'} Valid permission: ${hasValidPermission}`)
    console.log(`${hasActiveSession ? '✅' : '⚠️ '} Active session: ${hasActiveSession}`)
    
    if (user && adminClient && hasValidPermission && clientIsInternal) {
      console.log(`\n✅ Everything looks correct! User should be able to access admin.`)
      console.log(`\nIf OAuth authorize is still failing, check Vercel production logs:`)
      console.log(`https://vercel.com/moldovancsaba/sso/logs`)
    } else {
      console.log(`\n❌ Issue found! Fix the problems above.`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await client.close()
  }
}

diagnose()
