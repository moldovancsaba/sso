/**
 * Set Owner for All Clients Script
 * 
 * WHAT: Sets moldovancsaba@gmail.com as owner for all existing OAuth clients
 * WHY: Ensure owner has full access to all applications before role system migration
 * HOW: Update appPermissions for all clients to role='owner'
 */

import { getDb } from '../lib/db.mjs'

async function setOwnerForAllClients() {
  try {
    console.log('Connecting to database...')
    const db = await getDb()
    
    // WHAT: Find user by email
    const ownerEmail = 'moldovancsaba@gmail.com'
    console.log(`Looking for user: ${ownerEmail}`)
    
    const user = await db.collection('publicUsers').findOne({ 
      email: ownerEmail.toLowerCase() 
    })
    
    if (!user) {
      console.error('❌ User not found!')
      console.log('Please check the email address is correct.')
      process.exit(1)
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`)
    console.log(`   User ID: ${user.id}`)
    console.log()
    
    // WHAT: Get all OAuth clients (regardless of status)
    console.log('Fetching all OAuth clients...')
    const clients = await db.collection('oauthClients')
      .find({})
      .toArray()
    
    if (clients.length === 0) {
      console.log('⚠️  No active OAuth clients found.')
      process.exit(0)
    }
    
    console.log(`Found ${clients.length} active OAuth clients:`)
    clients.forEach((client, i) => {
      console.log(`  ${i + 1}. ${client.name} (${client.client_id})`)
    })
    console.log()
    
    // WHAT: Update permissions for each client
    console.log('Setting owner role for all clients...')
    console.log('─'.repeat(60))
    
    const results = []
    const now = new Date().toISOString()
    
    for (const client of clients) {
      try {
        // WHAT: Upsert permission with owner role
        // WHY: Ensure owner has access even if no previous permission existed
        const result = await db.collection('appPermissions').findOneAndUpdate(
          { 
            userId: user.id,
            clientId: client.client_id
          },
          { 
            $set: { 
              role: 'owner',
              status: 'approved',
              hasAccess: true,
              grantedAt: now,
              grantedBy: 'system-migration',
              updatedAt: now
            },
            $setOnInsert: {
              userId: user.id,
              clientId: client.client_id,
              appName: client.name,
              requestedAt: now,
              createdAt: now,
              revokedAt: null,
              revokedBy: null,
              lastAccessedAt: null
            }
          },
          { 
            returnDocument: 'after',
            upsert: true
          }
        )
        
        console.log(`✅ ${client.name}`)
        console.log(`   Client ID: ${client.client_id}`)
        console.log(`   Role: owner`)
        console.log(`   Status: approved`)
        console.log()
        
        results.push({ client: client.name, success: true })
      } catch (error) {
        console.error(`❌ ${client.name}`)
        console.error(`   Error: ${error.message}`)
        console.log()
        
        results.push({ client: client.name, success: false, error: error.message })
      }
    }
    
    console.log('─'.repeat(60))
    console.log()
    
    // WHAT: Print summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log('📊 Summary:')
    console.log(`   Total clients: ${clients.length}`)
    console.log(`   Successful: ${successful}`)
    console.log(`   Failed: ${failed}`)
    console.log()
    
    if (failed > 0) {
      console.log('❌ Failed clients:')
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.client}: ${r.error}`)
      })
      console.log()
    }
    
    console.log('✅ Operation complete!')
    console.log()
    console.log('Next steps:')
    console.log('1. Verify owner access at https://sso.doneisbetter.com/admin/dashboard')
    console.log('2. Check user permissions in each OAuth client app')
    console.log('3. Proceed with role system migration')
    
    process.exit(failed > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('💥 Error setting owner for clients:', error)
    console.error(error.stack)
    process.exit(1)
  }
}

setOwnerForAllClients()
