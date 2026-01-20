/**
 * Admin API: OAuth Client Management
 * 
 * GET  /api/admin/oauth-clients - List all OAuth clients
 * POST /api/admin/oauth-clients - Register new OAuth client
 * 
 * Authentication: Requires valid admin session
 * Authorization: super-admin for POST, admin for GET
 */

import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { registerClient, listClients } from '../../../../lib/oauth/clients.mjs'
import logger from '../../../../lib/logger.mjs'
import { runCors } from '../../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  // Authenticate admin user via unified system
  const adminUser = await requireUnifiedAdmin(req, res)
  if (!adminUser) return // requireUnifiedAdmin already sent 401/403

  try {
    if (req.method === 'GET') {
      // List all OAuth clients
      const { status } = req.query
      const filters = status ? { status } : {}

      const clients = await listClients(filters)

      logger.info('OAuth clients listed', {
        adminId: adminUser.id,
        count: clients.length,
        filters,
      })

      return res.status(200).json({
        success: true,
        clients,
        count: clients.length,
      })
    }

    if (req.method === 'POST') {
      // Create new OAuth client (admin only)
      if (adminUser.role !== 'admin') {
        logger.warn('OAuth client creation denied: insufficient permissions', {
          adminId: adminUser.id,
          role: adminUser.role,
        })
        return res.status(403).json({ error: 'Forbidden: admin role required' })
      }

      const {
        name,
        description,
        redirect_uris,
        allowed_scopes,
        grant_types,
        token_endpoint_auth_method,
        logo_uri,
        homepage_uri,
      } = req.body

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Client name is required' })
      }
      if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        return res.status(400).json({ error: 'At least one redirect URI is required' })
      }

      // Register client
      const result = await registerClient({
        name,
        description,
        redirect_uris,
        allowed_scopes: allowed_scopes || ['openid', 'profile', 'email'],
        grant_types: grant_types || ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: token_endpoint_auth_method || 'client_secret_post',
        owner_user_id: adminUser.id,
        logo_uri,
        homepage_uri,
      })

      logger.info('OAuth client created', {
        adminId: adminUser.id,
        clientId: result.client.client_id,
        name: result.client.name,
      })

      return res.status(201).json({
        success: true,
        client: result.client,
        client_secret: result.client_secret, // Only shown once!
        warning: 'Save the client_secret now - it will not be shown again!',
      })
    }

    // Method not allowed
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (error) {
    logger.error('OAuth client management error', {
      error: error.message,
      method: req.method,
      adminId: adminUser?.id,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
}
