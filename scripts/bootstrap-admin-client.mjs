#!/usr/bin/env node
/**
 * Bootstrap SSO Admin OAuth Client
 * 
 * WHAT: Creates the internal 'sso-admin-dashboard' OAuth client
 * WHY: Treat SSO Admin as a regular OAuth app with permission-based access
 * HOW: Insert into oauthClients collection with special internal flag
 * 
 * Usage: node scripts/bootstrap-admin-client.mjs
 */

import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'
import bcrypt from 'bcryptjs'

// Load environment variables
dotenv.config()

const ADMIN_CLIENT_ID = 'sso-admin-dashboard'

async function bootstrapAdminClient() {
  console.log('🔧 Bootstrapping SSO Admin OAuth Client...')
  
  try {
    const db = await getDb()
    const clientsCollection = db.collection('oauthClients')
    
    // WHAT: Check if admin client already exists
    // WHY: Prevent duplicate creation
    const existingClient = await clientsCollection.findOne({ client_id: ADMIN_CLIENT_ID })
    
    if (existingClient) {
      console.log('✅ SSO Admin client already exists')
      console.log(JSON.stringify({
        client_id: existingClient.client_id,
        name: existingClient.name,
        status: existingClient.status,
      }, null, 2))
      return
    }
    
    // WHAT: Generate secure client secret
    // WHY: Used for server-to-server authentication if needed
    const clientSecret = Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    
    const hashedSecret = await bcrypt.hash(clientSecret, 12)
    
    const now = new Date().toISOString()
    
    // WHAT: Create internal SSO Admin OAuth client
    // WHY: Manage admin access through appPermissions like any other OAuth client
    const adminClient = {
      client_id: ADMIN_CLIENT_ID,
      client_secret: hashedSecret,
      name: 'SSO Admin Dashboard',
      description: 'Internal client for SSO administrative interface',
      internal: true, // Special flag: cannot be deleted via UI
      redirect_uris: [
        'https://sso.doneisbetter.com/admin/callback',
        'http://localhost:3000/admin/callback', // For local development
      ],
      // WHAT: Only scopes that are actually defined in lib/oauth/scopes.mjs.
      // WHY: admin:users / admin:clients / admin:settings / admin:activity were
      //      registered here but never defined as scopes and never read by any
      //      authorization decision. validateScopes() rejects unknown scopes, so
      //      requesting one would have failed with invalid_scope. The admin UI
      //      requests exactly 'openid profile email' (pages/admin/index.js) and its
      //      real authorization comes from an approved sso-admin-dashboard record in
      //      appPermissions, not from a scope.
      allowed_scopes: [
        'openid',
        'profile',
        'email',
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      require_pkce: false,
      status: 'active',
      created_at: now,
      updated_at: now,
    }
    
    await clientsCollection.insertOne(adminClient)
    
    console.log('✅ SSO Admin OAuth client created successfully!')
    console.log('\nClient Details:')
    console.log(JSON.stringify({
      client_id: adminClient.client_id,
      name: adminClient.name,
      description: adminClient.description,
      internal: adminClient.internal,
      redirect_uris: adminClient.redirect_uris,
      allowed_scopes: adminClient.allowed_scopes,
      status: adminClient.status,
    }, null, 2))
    
    console.log('\n⚠️  Important: Client secret (save this, it will not be shown again):')
    console.log(clientSecret)
    
  } catch (error) {
    console.error('❌ Bootstrap failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
  
  process.exit(0)
}

bootstrapAdminClient()
