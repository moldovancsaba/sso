/**
 * pages/api/users/[userId]/apps/[clientId]/permissions.js
 * 
 * WHAT: Manage user permissions for specific apps (bidirectional API)
 * WHY: Apps need to read AND write permission data (Phase 4C)
 * HOW: OAuth token-authenticated endpoints for GET/PUT/DELETE
 * 
 * GET: Read permission (OAuth callback check or admin UI)
 * PUT: Create/update permission (app-to-app sync from Launchmass)
 * DELETE: Revoke permission (app-to-app sync from Launchmass)
 * 
 * Phase 4C: Bidirectional permission sync between SSO and apps
 */

import { 
  getAppPermission, 
  updateAppPermission,
  upsertPermissionForAdmin, 
  revokePermissionForAdmin 
} from '../../../../../../lib/appPermissions.mjs'
import { logAccessAttempt, logPermissionChange } from '../../../../../../lib/appAccessLogs.mjs'
import { getAdminUser } from '../../../../../../lib/auth.mjs'
import { 
  requireOAuthToken, 
  canManagePermissionsFor 
} from '../../../../../../lib/oauth/middleware.mjs'
import logger from '../../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  const { method } = req

  if (method === 'GET') {
    return handleGet(req, res)
  }

  if (method === 'PUT') {
    return handlePut(req, res)
  }

  if (method === 'DELETE') {
    return handleDelete(req, res)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

/**
 * GET /api/users/{userId}/apps/{clientId}/permissions
 * 
 * WHAT: Get user's permission for a specific app
 * WHY: OAuth callbacks and admin UI need to check access status
 * HOW: Validate OAuth token or admin session, return permission record
 */
async function handleGet(req, res) {

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

    // WHAT: Validate admin session OR OAuth token
    // WHY: This endpoint can be called by OAuth callback (with token) or admin UI (with session)
    const authHeader = req.headers.authorization
    let isAuthorized = false

    // Option 1: OAuth token authentication (Phase 4C implementation)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const { validateAccessToken } = await import('../../../../../../lib/oauth/middleware.mjs')
      const tokenData = await validateAccessToken(req)
      if (tokenData) {
        isAuthorized = true
        logger.debug('Permission GET authorized via OAuth token', {
          clientId: tokenData.clientId,
          userId: req.query.userId,
        })
      }
    }

    // Option 2: Admin session authentication (for admin UI)
    if (!isAuthorized) {
      const adminUser = await getAdminUser(req)
      if (adminUser) {
        isAuthorized = true
        logger.debug('Permission GET authorized via admin session', {
          adminId: adminUser.id,
          userId: req.query.userId,
        })
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid admin session or access token required',
      })
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

/**
 * PUT /api/users/{userId}/apps/{clientId}/permissions
 * 
 * WHAT: Create or update user permission for an app
 * WHY: Apps (like Launchmass) need to sync permissions TO SSO
 * HOW: Validate OAuth token with manage_permissions scope, upsert permission
 * 
 * Phase 4C: Bidirectional sync - apps can push permission changes to SSO
 * 
 * Security: Client can only manage permissions for itself (clientId must match token)
 */
async function handlePut(req, res) {
  try {
    const { userId, clientId } = req.query
    const { role, status, grantedBy } = req.body

    // WHAT: Validate input parameters
    if (!userId || !clientId) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'userId and clientId are required',
      })
    }

    if (!role || !status) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'role and status are required in request body',
      })
    }

    // WHAT: Validate role and status values (aligned with SSO v5.28.0+ role system)
    // WHY: guest/user/admin/owner hierarchy replaces old user/admin/superadmin
    const validRoles = ['guest', 'user', 'admin', 'owner']
    const validStatuses = ['pending', 'approved', 'revoked']

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `role must be one of: ${validRoles.join(', ')}`,
      })
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `status must be one of: ${validStatuses.join(', ')}`,
      })
    }

    // WHAT: Require OAuth token with manage_permissions scope
    // WHY: Only authenticated apps can modify permissions
    const tokenData = await requireOAuthToken(req, res, 'manage_permissions')
    if (!tokenData) return // Response already sent

    // WHAT: Verify client can only manage its own permissions
    // WHY: Prevent apps from modifying other apps' permission data
    if (!canManagePermissionsFor(tokenData, clientId)) {
      logger.warn('Unauthorized permission modification attempt', {
        tokenClientId: tokenData.clientId,
        targetClientId: clientId,
      })
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Client can only manage permissions for itself',
      })
    }

    // WHAT: Upsert permission record
    // WHY: Create new or update existing permission
    const hasAccess = status === 'approved'
    const permission = await updateAppPermission({
      userId,
      clientId,
      hasAccess,
      status,
      role,
      grantedBy: grantedBy || `app:${tokenData.clientId}`,
    })

    // WHAT: Log permission change for audit trail
    await logPermissionChange({
      userId,
      clientId,
      appName: permission.appName || clientId,
      eventType: 'role_changed',
      previousRole: permission.role || 'none',
      newRole: role,
      changedBy: `app:${tokenData.clientId}`,
      message: `Permission updated via app API: ${status}`,
    })

    logger.info('Permission updated via app API', {
      userId,
      clientId,
      role,
      status,
      updatedBy: tokenData.clientId,
    })

    return res.status(200).json({
      success: true,
      permission: {
        userId: permission.userId,
        clientId: permission.clientId,
        appName: permission.appName,
        hasAccess: permission.hasAccess,
        status: permission.status,
        role: permission.role,
        grantedAt: permission.grantedAt,
        grantedBy: permission.grantedBy,
      },
    })
  } catch (error) {
    logger.error('Error updating app permission', {
      error: error.message,
      stack: error.stack,
      userId: req.query.userId,
      clientId: req.query.clientId,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update permission',
    })
  }
}

/**
 * DELETE /api/users/{userId}/apps/{clientId}/permissions
 * 
 * WHAT: Revoke user permission for an app
 * WHY: Apps need to sync revocations TO SSO
 * HOW: Validate OAuth token, update permission status to 'revoked'
 * 
 * Phase 4C: Bidirectional sync - apps can revoke permissions in SSO
 * 
 * Security: Client can only manage permissions for itself (clientId must match token)
 */
async function handleDelete(req, res) {
  try {
    const { userId, clientId } = req.query

    // WHAT: Validate input parameters
    if (!userId || !clientId) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'userId and clientId are required',
      })
    }

    // WHAT: Require OAuth token with manage_permissions scope
    const tokenData = await requireOAuthToken(req, res, 'manage_permissions')
    if (!tokenData) return // Response already sent

    // WHAT: Verify client can only manage its own permissions
    if (!canManagePermissionsFor(tokenData, clientId)) {
      logger.warn('Unauthorized permission revocation attempt', {
        tokenClientId: tokenData.clientId,
        targetClientId: clientId,
      })
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Client can only manage permissions for itself',
      })
    }

    // WHAT: Revoke permission (set status to 'revoked')
    const permission = await revokePermissionForAdmin({
      userId,
      clientId,
      adminUserId: `app:${tokenData.clientId}`,
    })

    if (!permission) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Permission record not found',
      })
    }

    // WHAT: Log permission revocation for audit trail
    await logPermissionChange({
      userId,
      clientId,
      appName: permission.appName || clientId,
      eventType: 'access_revoked',
      previousRole: permission.role || 'none',
      newRole: 'none',
      changedBy: `app:${tokenData.clientId}`,
      message: 'Permission revoked via app API',
    })

    logger.info('Permission revoked via app API', {
      userId,
      clientId,
      revokedBy: tokenData.clientId,
    })

    return res.status(200).json({
      success: true,
      message: 'Permission revoked',
    })
  } catch (error) {
    logger.error('Error revoking app permission', {
      error: error.message,
      stack: error.stack,
      userId: req.query.userId,
      clientId: req.query.clientId,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revoke permission',
    })
  }
}
