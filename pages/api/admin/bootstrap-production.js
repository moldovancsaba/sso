/**
 * Bootstrap Production - ONE TIME USE
 * 
 * GET /api/admin/bootstrap-production?secret=YOUR_SECRET
 * 
 * WHAT: Creates sso-admin-dashboard OAuth client in production
 * WHY: Can't run scripts directly in Vercel
 * HOW: Visit this URL once to create the client
 * 
 * SECURITY: Requires secret parameter, delete after use
 */

import { getDb } from '../../../lib/db.mjs'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // WHAT: Simple secret protection
  // WHY: Prevent random people from running this
  const { secret } = req.query
  if (secret !== process.env.BOOTSTRAP_SECRET && secret !== 'bootstrap-sso-admin-2025') {
    return res.status(403).json({ error: 'Invalid secret' })
  }

  try {
    const db = await getDb()
    const clientsCollection = db.collection('oauthClients')
    
    // Check if already exists
    const existing = await clientsCollection.findOne({ client_id: 'sso-admin-dashboard' })
    
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'sso-admin-dashboard already exists',
        client: {
          client_id: existing.client_id,
          name: existing.name,
          status: existing.status,
        }
      })
    }
    
    // Generate client secret
    const clientSecret = Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    
    const hashedSecret = await bcrypt.hash(clientSecret, 12)
    const now = new Date().toISOString()
    
    // Create client
    const adminClient = {
      client_id: 'sso-admin-dashboard',
      client_secret: hashedSecret,
      name: 'SSO Admin Dashboard',
      description: 'Internal client for SSO administrative interface',
      internal: true,
      redirect_uris: [
        'https://sso.doneisbetter.com/admin/callback',
        'http://localhost:3000/admin/callback',
      ],
      allowed_scopes: [
        'openid',
        'profile', 
        'email',
        'admin:users',
        'admin:clients',
        'admin:settings',
        'admin:activity',
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      require_pkce: false,
      status: 'active',
      created_at: now,
      updated_at: now,
    }
    
    await clientsCollection.insertOne(adminClient)
    
    return res.status(200).json({
      success: true,
      message: 'sso-admin-dashboard created successfully!',
      client: {
        client_id: adminClient.client_id,
        name: adminClient.name,
        redirect_uris: adminClient.redirect_uris,
        allowed_scopes: adminClient.allowed_scopes,
      },
      note: 'DELETE THIS ENDPOINT AFTER USE: pages/api/admin/bootstrap-production.js'
    })
    
  } catch (error) {
    console.error('Bootstrap error:', error)
    return res.status(500).json({
      error: 'Bootstrap failed',
      message: error.message
    })
  }
}
