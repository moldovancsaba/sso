/**
 * Admin API: Individual OAuth Client Operations
 * 
 * GET    /api/admin/oauth-clients/[clientId] - Get client details
 * PATCH  /api/admin/oauth-clients/[clientId] - Update client
 * DELETE /api/admin/oauth-clients/[clientId] - Delete client
 * 
 * Authentication: Requires valid admin session
 * Authorization: admin required for PATCH/DELETE
 */

import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { getClient, updateClient, deleteClient } from '../../../../lib/oauth/clients.mjs'
import { BrandingValidationError, BrandingVersionConflictError, BrandingNotFoundError } from '../../../../lib/oauth/branding.mjs'
import logger from '../../../../lib/logger.mjs'
import { runCors } from '../../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  const requiresFreshAuth = req.method === 'PATCH' || req.method === 'DELETE'

  // Authenticate admin user
  const adminUser = await requireUnifiedAdmin(req, res, {
    requireFreshAuth: requiresFreshAuth,
  })
  if (!adminUser) return


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
      // Update client (admin only)
      if (adminUser.role !== 'admin') {
        logger.warn('OAuth client update denied: insufficient permissions', {
          adminId: adminUser.id,
          role: adminUser.role,
          clientId,
        })
        return res.status(403).json({ error: 'Forbidden: admin role required' })
      }

      const updates = req.body

      // Don't allow updating client_id or owner_user_id
      delete updates.client_id
      delete updates.owner_user_id
      delete updates.client_secret

      // WHAT: version/updated_at/updated_by on a branding patch are always server-computed.
      // WHY: Same reasoning as owner_user_id above - stripped here so a caller cannot
      //      forge them, the same way updateClientBranding() never trusts them from input.
      if (updates.branding && typeof updates.branding === 'object' && !Array.isArray(updates.branding)) {
        delete updates.branding.version
        delete updates.branding.updated_at
        delete updates.branding.updated_by
      }

      const updatedClient = await updateClient(clientId, updates, adminUser.id)

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
      // Delete client (admin only)
      if (adminUser.role !== 'admin') {
        logger.warn('OAuth client deletion denied: insufficient permissions', {
          adminId: adminUser.id,
          role: adminUser.role,
          clientId,
        })
        return res.status(403).json({ error: 'Forbidden: admin role required' })
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
    // WHAT: The three typed branding errors get their own status codes; every other
    //       error (including all pre-existing, non-branding failure modes) falls
    //       through to the generic 500 below, unchanged.
    if (error instanceof BrandingValidationError) {
      return res.status(400).json({ error: 'invalid_branding', message: error.message, diagnostics: error.diagnostics })
    }
    if (error instanceof BrandingVersionConflictError) {
      return res.status(409).json({
        error: 'branding_version_conflict',
        message: 'The branding record has changed since it was last read. Reload and reapply your changes.',
        current_version: error.currentVersion,
      })
    }
    if (error instanceof BrandingNotFoundError) {
      return res.status(404).json({ error: 'Client not found' })
    }

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
