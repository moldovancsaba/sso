/**
 * Admin API: Individual OAuth Client Operations
 * 
 * GET    /api/admin/oauth-clients/[clientId] - Get client details
 * PATCH  /api/admin/oauth-clients/[clientId] - Update client
 * DELETE /api/admin/oauth-clients/[clientId] - Delete client
 * 
 * Authentication: Requires valid admin session
 * Authorization: super-admin required for PATCH/DELETE
 */

import { getAdminUser } from '../../../../lib/auth.mjs'
import { getClient, updateClient, deleteClient } from '../../../../lib/oauth/clients.mjs'
import logger from '../../../../lib/logger.mjs'
import { runCors } from '../../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  // Authenticate admin user
  const adminUser = await getAdminUser(req)
  if (!adminUser) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { clientId } = req.query

  if (!clientId) {
    return res.status(400).json({ error: 'Client ID is required' })
  }

  try {
    if (req.method === 'GET') {
      // Get client details
      const client = await getClient(clientId)

      if (!client) {
        return res.status(404).json({ error: 'Client not found' })
      }

      logger.info('OAuth client retrieved', {
        adminId: adminUser.id,
        clientId,
      })

      return res.status(200).json({
        success: true,
        client,
      })
    }

    if (req.method === 'PATCH') {
      // Update client (super-admin only)
      if (adminUser.role !== 'super-admin') {
        logger.warn('OAuth client update denied: insufficient permissions', {
          adminId: adminUser.id,
          role: adminUser.role,
          clientId,
        })
        return res.status(403).json({ error: 'Forbidden: super-admin role required' })
      }

      const updates = req.body

      // Don't allow updating client_id or owner_user_id
      delete updates.client_id
      delete updates.owner_user_id
      delete updates.client_secret

      const updatedClient = await updateClient(clientId, updates)

      logger.info('OAuth client updated', {
        adminId: adminUser.id,
        clientId,
        updates: Object.keys(updates),
      })

      return res.status(200).json({
        success: true,
        client: updatedClient,
      })
    }

    if (req.method === 'DELETE') {
      // Delete client (super-admin only)
      if (adminUser.role !== 'super-admin') {
        logger.warn('OAuth client deletion denied: insufficient permissions', {
          adminId: adminUser.id,
          role: adminUser.role,
          clientId,
        })
        return res.status(403).json({ error: 'Forbidden: super-admin role required' })
      }

      const deleted = await deleteClient(clientId)

      if (!deleted) {
        return res.status(404).json({ error: 'Client not found' })
      }

      logger.warn('OAuth client deleted', {
        adminId: adminUser.id,
        clientId,
      })

      return res.status(200).json({
        success: true,
        message: 'Client deleted successfully',
      })
    }

    // Method not allowed
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (error) {
    logger.error('OAuth client operation error', {
      error: error.message,
      method: req.method,
      adminId: adminUser?.id,
      clientId,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
}
