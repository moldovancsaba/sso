/**
 * pages/api/admin/users/[userId]/apps/[clientId]/permissions.js
 * 
 * WHAT: Admin endpoint to grant/update/revoke user app permissions
 * WHY: App admins and SSO admins need to manage user access
 * HOW: PUT to grant/update, DELETE to revoke
 */

import {
  getAppPermission,
  updateAppPermission,
  isValidPermissionRole,
  isValidPermissionStatus,
  mapPermissionToDTO,
  normalizePermissionRole,
  normalizePermissionStatus,
  permissionHasAccess,
} from '../../../../../../../lib/appPermissions.mjs'
import { logPermissionChange } from '../../../../../../../lib/appAccessLogs.mjs'
import { requireUnifiedAdmin } from '../../../../../../../lib/auth.mjs'
import { getDb } from '../../../../../../../lib/db.mjs'
import logger from '../../../../../../../lib/logger.mjs'

/**
 * checkAdminAuthorization
 * WHAT: Checks if admin has permission to modify this app's permissions
 * WHY: Only SSO admins or app-specific admins can grant access
 * 
 * @param {Object} adminUser - Admin user from session
 * @param {string} clientId - OAuth client ID
 * @returns {Promise<boolean>} True if authorized
 */
async function checkAdminAuthorization(adminUser, clientId) {
  // WHAT: All SSO admins can manage all apps
  // WHY: Simplified role system - admin role has full access
  if (adminUser.role === 'admin') {
    return true
  }

  // WHAT: Check if user is admin of this specific app
  // WHY: App admins can manage their own app's users
  const permission = await getAppPermission(adminUser.id, clientId)
  if (permission && permission.role === 'admin' && permission.hasAccess) {
    return true
  }

  return false
}

export default async function handler(req, res) {
  // WHAT: Only PUT and DELETE methods allowed
  // WHY: PUT for grant/update, DELETE for revoke
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, clientId } = req.query

    // WHAT: Validate input parameters
    // WHY: Prevent invalid operations
    if (!userId || !clientId) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'userId and clientId are required',
      })
    }

    // WHAT: Validate admin session
    // WHY: Only authenticated admins can modify permissions
    const adminUser = await requireUnifiedAdmin(req, res, {
      requireFreshAuth: req.method !== 'GET',
    })


    // WHAT: Get full admin user details from database
    // WHY: Need to check isSsoSuperadmin flag
    const db = await getDb()
    const fullAdminUser = await db.collection('users').findOne({ id: adminUser.id })
    
    if (!fullAdminUser) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin user not found in database',
      })
    }

    // WHAT: Check if admin is authorized to manage this app's permissions
    // WHY: Prevent unauthorized permission changes
    const isAuthorized = await checkAdminAuthorization(fullAdminUser, clientId)
    if (!isAuthorized) {
      logger.warn('Unauthorized permission change attempt', {
        adminId: fullAdminUser.id,
        adminEmail: fullAdminUser.email,
        userId,
        clientId,
      })

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to manage this app\'s users',
      })
    }

    // WHAT: Get OAuth client details for app name
    // WHY: Need app name for logging and response
    const client = await db.collection('oauthClients').findOne({ client_id: clientId })
    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'OAuth client does not exist',
      })
    }

    const appName = client.appName || client.name || 'Unknown App'

    // ========================================
    // PUT: Grant or update permission
    // ========================================
    if (req.method === 'PUT') {
      const { hasAccess, role, status } = req.body

      // WHAT: Validate request body
      // WHY: Ensure valid permission data
      if (typeof hasAccess !== 'boolean') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'hasAccess must be a boolean',
        })
      }

      if (!isValidPermissionRole(role)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'role must be one of: none, user, admin',
        })
      }

      if (!isValidPermissionStatus(status)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'status must be one of: pending, approved, revoked',
        })
      }

      const normalizedRole = normalizePermissionRole(role)
      const normalizedStatus = normalizePermissionStatus(status)
      const normalizedHasAccess = permissionHasAccess(normalizedStatus, normalizedRole, hasAccess)

      // WHAT: Get existing permission to determine if this is grant or update
      // WHY: Need previous state for audit logging
      const existingPermission = await getAppPermission(userId, clientId)
      const previousRole = existingPermission?.role || 'none'

      // WHAT: Update permission in database
      // WHY: Grant or modify user's access to app
      const updatedPermission = await updateAppPermission({
        userId,
        clientId,
        hasAccess: normalizedHasAccess,
        status: normalizedStatus,
        role: normalizedRole,
        grantedBy: fullAdminUser.id,
        appName,
      })

      // WHAT: Log permission change for audit trail
      // WHY: Compliance and security monitoring
      const eventType = !existingPermission
        ? 'access_granted'
        : hasAccess
          ? 'role_changed'
          : 'access_revoked'

      await logPermissionChange({
        userId,
        clientId,
        appName,
        eventType,
        previousRole,
        newRole: normalizedRole,
        changedBy: fullAdminUser.id,
        message: `Permission ${eventType} by ${fullAdminUser.email}`,
      })

      logger.info('Permission updated', {
        userId,
        clientId,
        appName,
        hasAccess: normalizedHasAccess,
        role: normalizedRole,
        status: normalizedStatus,
        adminId: fullAdminUser.id,
        adminEmail: fullAdminUser.email,
      })

      return res.status(200).json({
        success: true,
        message: 'Permission updated successfully',
        permission: {
          ...mapPermissionToDTO(updatedPermission),
        },
      })
    }

    // ========================================
    // DELETE: Revoke permission
    // ========================================
    if (req.method === 'DELETE') {
      // WHAT: Get existing permission for audit log
      // WHY: Need to log what was revoked
      const existingPermission = await getAppPermission(userId, clientId)

      if (!existingPermission) {
        return res.status(404).json({
          error: 'Not found',
          message: 'No permission record exists',
        })
      }

      // WHAT: Update permission to revoked state
      // WHY: Soft delete preserves audit trail
      const updatedPermission = await updateAppPermission({
        userId,
        clientId,
        hasAccess: false,
        status: 'revoked',
        role: 'none',
        grantedBy: fullAdminUser.id,
      })

      // WHAT: Log revocation for audit trail
      // WHY: Track who revoked access and when
      await logPermissionChange({
        userId,
        clientId,
        appName,
        eventType: 'access_revoked',
        previousRole: existingPermission.role,
        newRole: 'none',
        changedBy: fullAdminUser.id,
        message: `Access revoked by ${fullAdminUser.email}`,
      })

      logger.info('Permission revoked', {
        userId,
        clientId,
        appName,
        adminId: fullAdminUser.id,
        adminEmail: fullAdminUser.email,
      })

      return res.status(200).json({
        success: true,
        message: 'Permission revoked successfully',
        permission: {
          userId: updatedPermission.userId,
          clientId: updatedPermission.clientId,
          appName: updatedPermission.appName,
          hasAccess: false,
          status: 'revoked',
          role: 'none',
          revokedAt: updatedPermission.revokedAt,
          revokedBy: updatedPermission.revokedBy,
        },
      })
    }
  } catch (error) {
    logger.error('Error managing app permission', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      userId: req.query.userId,
      clientId: req.query.clientId,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to manage permission',
    })
  }
}
