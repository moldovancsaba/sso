/**
 * pages/api/users/[userId]/apps/[clientId]/permissions.js
 * 
 * WHAT: Get user's permission for a specific app
 * WHY: OAuth callback needs to check if user has access to requesting app
 * HOW: Returns permission record from appPermissions collection
 */

import { getAppPermission } from '../../../../../../lib/appPermissions.mjs'
import { getAdminUser } from '../../../../../../lib/auth.mjs'
import logger from '../../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  // WHAT: Only GET method allowed
  // WHY: This is a read-only endpoint for permission checking
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, clientId } = req.query

    // WHAT: Validate input parameters
    // WHY: Prevent invalid queries and potential injection
    if (!userId || !clientId) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'userId and clientId are required',
      })
    }

    // WHAT: Validate admin session OR bearer token
    // WHY: This endpoint can be called by OAuth callback (with token) or admin UI (with session)
    const authHeader = req.headers.authorization
    let isAuthorized = false

    // Option 1: Bearer token authentication (for OAuth callbacks)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // WHAT: In production, validate OAuth access token
      // WHY: OAuth callbacks use access tokens for API authentication
      // TODO: Implement proper access token validation
      // For now, accept any bearer token (will be implemented in Phase 2)
      isAuthorized = true
    }

    // Option 2: Admin session authentication (for admin UI)
    if (!isAuthorized) {
      const adminUser = await getAdminUser(req)
      if (!adminUser) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid admin session or access token required',
        })
      }
      isAuthorized = true
    }

    // WHAT: Get permission record from database
    // WHY: Returns user's access status and role for this app
    const permission = await getAppPermission(userId, clientId)

    // WHAT: If no permission record found, return default "no access" response
    // WHY: User hasn't attempted to access this app yet
    if (!permission) {
      logger.info('No permission record found', { userId, clientId })
      return res.status(404).json({
        error: 'No permission record found',
        hasAccess: false,
        status: 'none',
        userId,
        clientId,
      })
    }

    // WHAT: Return permission record
    // WHY: Caller can determine if user has access and what their role is
    logger.info('Permission record retrieved', {
      userId,
      clientId,
      hasAccess: permission.hasAccess,
      status: permission.status,
      role: permission.role,
    })

    return res.status(200).json({
      userId: permission.userId,
      clientId: permission.clientId,
      appName: permission.appName,
      hasAccess: permission.hasAccess,
      status: permission.status,
      role: permission.role,
      requestedAt: permission.requestedAt,
      grantedAt: permission.grantedAt,
      grantedBy: permission.grantedBy,
      lastAccessedAt: permission.lastAccessedAt,
    })
  } catch (error) {
    logger.error('Error getting app permission', {
      error: error.message,
      stack: error.stack,
      userId: req.query.userId,
      clientId: req.query.clientId,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve permission',
    })
  }
}
