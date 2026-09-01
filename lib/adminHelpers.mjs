/**
 * lib/adminHelpers.mjs - Audit logging helper for admin endpoints
 */

import { logAdminAction } from './auditLog.mjs'

// Removed: withAdminMutation(), withAdminQuery(), and withAdmin(). Each authenticated with
// getAdminUser alone, which the current OAuth admin login does not satisfy, and nothing
// imported them — every live admin route uses requireUnifiedAdmin from lib/auth.mjs. Only
// auditLog() below was ever used from this module.

/**
 * auditLog
 * 
 * WHAT: Convenience helper to log audit events from admin endpoints
 * WHY: Simplified audit logging without importing logAdminAction everywhere
 * HOW: Extracts metadata from request, calls logAdminAction
 * 
 * @param {Object} req - Request object (with admin attached)
 * @param {string} action - Action type (use AuditAction constants)
 * @param {string} resource - Resource type
 * @param {string} resourceId - Resource ID
 * @param {Object} beforeState - State before change
 * @param {Object} afterState - State after change
 * @returns {Promise<string>} - Audit log entry ID
 * 
 * @example
 * // Inside an admin endpoint handler:
 * await auditLog(req, 'user.updated', 'user', userId, oldUser, newUser)
 */
export async function auditLog(req, action, resource, resourceId, beforeState, afterState) {
  const metadata = {
    ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || req.ip,
    userAgent: req.headers['user-agent'],
  }
  
  return logAdminAction(
    req.admin,
    action,
    resource,
    resourceId,
    beforeState,
    afterState,
    metadata
  )
}
