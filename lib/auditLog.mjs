/**
 * lib/auditLog.mjs - Comprehensive audit logging for admin actions
 * 
 * WHAT: Tracks all admin mutations with before/after state, user context, and timestamps
 * WHY: Security compliance, forensics, accountability, debugging
 * HOW: MongoDB collection with structured audit events
 */

import { getDb } from './db.mjs'

/**
 * getAuditLogCollection
 * WHAT: Returns MongoDB collection for audit logs with indexes
 * WHY: Centralized collection access; ensures indexes for fast queries
 */
export async function getAuditLogCollection() {
  const db = await getDb()
  const col = db.collection('auditLogs')
  
  try {
    // Index on timestamp for time-based queries
    await col.createIndex({ timestamp: -1 })
  } catch {}
  
  try {
    // Index on userId for per-user audit trail
    await col.createIndex({ userId: 1, timestamp: -1 })
  } catch {}
  
  try {
    // Index on action for filtering by operation type
    await col.createIndex({ action: 1, timestamp: -1 })
  } catch {}
  
  try {
    // Index on resource for tracking changes to specific entities
    await col.createIndex({ resource: 1, resourceId: 1, timestamp: -1 })
  } catch {}
  
  return col
}

/**
 * Action types for audit logging
 * WHAT: Standardized action names for consistency
 * WHY: Enable filtering and reporting by action type
 */
export const AuditAction = {
  // User management
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_PASSWORD_CHANGED: 'user.password_changed',
  
  // Account linking
  ACCOUNT_LINK_MANUAL: 'account.link_manual',
  ACCOUNT_UNLINK: 'account.unlink',
  PASSWORD_REMOVED: 'account.password_removed',
  
  // Session management
  LOGIN_SUCCESS: 'auth.login_success',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  SESSION_REVOKED: 'auth.session_revoked',
  
  // OAuth client management
  OAUTH_CLIENT_CREATED: 'oauth.client_created',
  OAUTH_CLIENT_UPDATED: 'oauth.client_updated',
  OAUTH_CLIENT_DELETED: 'oauth.client_deleted',
  OAUTH_SECRET_REGENERATED: 'oauth.secret_regenerated',
  
  // Permission management
  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',
  PERMISSION_UPDATED: 'permission.updated',
  
  // Organization management
  ORG_CREATED: 'org.created',
  ORG_UPDATED: 'org.updated',
  ORG_DELETED: 'org.deleted',
  
  // System settings
  SETTINGS_UPDATED: 'settings.updated',
  
  // Security events
  SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
}

/**
 * logAuditEvent
 * 
 * WHAT: Logs a comprehensive audit event with full context
 * WHY: Complete audit trail for security, compliance, and debugging
 * HOW: Stores structured event in MongoDB with before/after state
 * 
 * @param {Object} event - Audit event details
 * @param {string} event.action - Action type (use AuditAction constants)
 * @param {string} event.userId - UUID of user performing action
 * @param {string} event.userEmail - Email of user performing action
 * @param {string} event.userRole - Role of user (admin, super-admin)
 * @param {string} event.resource - Type of resource affected (user, oauth_client, etc.)
 * @param {string} [event.resourceId] - ID of affected resource
 * @param {Object} [event.beforeState] - State before change (for updates/deletes)
 * @param {Object} [event.afterState] - State after change (for creates/updates)
 * @param {Object} [event.metadata] - Additional context (IP, user-agent, etc.)
 * @param {boolean} [event.success] - Whether action succeeded (default: true)
 * @param {string} [event.errorMessage] - Error message if action failed
 * @returns {Promise<string>} - Audit log entry ID
 */
export async function logAuditEvent(event) {
  const col = await getAuditLogCollection()
  
  // Sanitize state objects (remove sensitive fields)
  const sanitizeState = (state) => {
    if (!state || typeof state !== 'object') return state
    
    const sanitized = { ...state }
    
    // Remove sensitive fields
    delete sanitized.password
    delete sanitized.passwordHash
    delete sanitized.client_secret
    delete sanitized.token
    delete sanitized.tokenHash
    
    return sanitized
  }
  
  const auditEntry = {
    timestamp: new Date().toISOString(),
    action: event.action,
    userId: event.userId,
    userEmail: event.userEmail,
    userRole: event.userRole,
    resource: event.resource,
    resourceId: event.resourceId || null,
    beforeState: event.beforeState ? sanitizeState(event.beforeState) : null,
    afterState: event.afterState ? sanitizeState(event.afterState) : null,
    success: event.success !== false, // Default to true
    errorMessage: event.errorMessage || null,
    metadata: {
      ip: event.metadata?.ip || null,
      userAgent: event.metadata?.userAgent || null,
      deviceFingerprint: event.metadata?.deviceFingerprint || null,
      ...event.metadata,
    },
  }
  
  const result = await col.insertOne(auditEntry)
  return result.insertedId.toString()
}

/**
 * logAdminAction
 * 
 * WHAT: Convenience wrapper for logging admin actions
 * WHY: Most common use case - admin performing CRUD operations
 * HOW: Automatically extracts user info from admin object
 * 
 * @param {Object} admin - Admin user object from request
 * @param {string} action - Action type
 * @param {string} resource - Resource type
 * @param {string} resourceId - Resource ID
 * @param {Object} beforeState - State before change
 * @param {Object} afterState - State after change
 * @param {Object} metadata - Request metadata
 * @returns {Promise<string>} - Audit log entry ID
 */
export async function logAdminAction(admin, action, resource, resourceId, beforeState, afterState, metadata = {}) {
  return logAuditEvent({
    action,
    userId: admin.userId,
    userEmail: admin.email,
    userRole: admin.role,
    resource,
    resourceId,
    beforeState,
    afterState,
    metadata,
  })
}

/**
 * getAuditLogs
 * 
 * WHAT: Retrieves audit logs with filtering and pagination
 * WHY: Allow admins to review audit trail and investigate incidents
 * HOW: Query MongoDB with filters, sort by timestamp descending
 * 
 * @param {Object} filters - Query filters
 * @param {string} [filters.userId] - Filter by user ID
 * @param {string} [filters.action] - Filter by action type
 * @param {string} [filters.resource] - Filter by resource type
 * @param {string} [filters.resourceId] - Filter by specific resource
 * @param {Date} [filters.startDate] - Filter by start date
 * @param {Date} [filters.endDate] - Filter by end date
 * @param {number} [filters.limit] - Max results (default 100, max 1000)
 * @param {number} [filters.skip] - Skip N results (for pagination)
 * @returns {Promise<Array>} - List of audit log entries
 */
export async function getAuditLogs(filters = {}) {
  const col = await getAuditLogCollection()
  
  const query = {}
  
  if (filters.userId) {
    query.userId = filters.userId
  }
  
  if (filters.action) {
    query.action = filters.action
  }
  
  if (filters.resource) {
    query.resource = filters.resource
  }
  
  if (filters.resourceId) {
    query.resourceId = filters.resourceId
  }
  
  if (filters.startDate || filters.endDate) {
    query.timestamp = {}
    if (filters.startDate) {
      query.timestamp.$gte = filters.startDate.toISOString()
    }
    if (filters.endDate) {
      query.timestamp.$lte = filters.endDate.toISOString()
    }
  }
  
  const limit = Math.min(filters.limit || 100, 1000)
  const skip = filters.skip || 0
  
  const logs = await col
    .find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()
  
  return logs
}

/**
 * getResourceAuditTrail
 * 
 * WHAT: Gets complete audit trail for a specific resource
 * WHY: Track full history of changes to an entity (user, OAuth client, etc.)
 * HOW: Query all events for resource, sorted chronologically
 * 
 * @param {string} resource - Resource type (user, oauth_client, etc.)
 * @param {string} resourceId - Resource ID
 * @param {number} [limit] - Max results (default 50)
 * @returns {Promise<Array>} - Chronological list of changes
 */
export async function getResourceAuditTrail(resource, resourceId, limit = 50) {
  return getAuditLogs({
    resource,
    resourceId,
    limit,
  })
}

/**
 * getUserAuditTrail
 * 
 * WHAT: Gets all actions performed by a specific user
 * WHY: Track admin activity for accountability and investigation
 * HOW: Query all events by userId
 * 
 * @param {string} userId - User UUID
 * @param {number} [limit] - Max results (default 100)
 * @returns {Promise<Array>} - List of user's actions
 */
export async function getUserAuditTrail(userId, limit = 100) {
  return getAuditLogs({
    userId,
    limit,
  })
}

/**
 * getFailedActions
 * 
 * WHAT: Retrieves all failed actions within a time period
 * WHY: Detect potential attacks, misconfigurations, or bugs
 * HOW: Query events where success=false
 * 
 * @param {Date} [startDate] - Start of time range
 * @param {Date} [endDate] - End of time range
 * @param {number} [limit] - Max results (default 100)
 * @returns {Promise<Array>} - List of failed actions
 */
export async function getFailedActions(startDate, endDate, limit = 100) {
  const col = await getAuditLogCollection()
  
  const query = { success: false }
  
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) query.timestamp.$gte = startDate.toISOString()
    if (endDate) query.timestamp.$lte = endDate.toISOString()
  }
  
  return col
    .find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray()
}

/**
 * getAuditStats
 * 
 * WHAT: Generates statistics about audit log activity
 * WHY: Overview of admin activity, detect anomalies
 * HOW: Aggregation queries on audit log collection
 * 
 * @param {Date} [startDate] - Start of time range (default: last 30 days)
 * @param {Date} [endDate] - End of time range (default: now)
 * @returns {Promise<Object>} - Statistics object
 */
export async function getAuditStats(startDate, endDate) {
  const col = await getAuditLogCollection()
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const end = endDate || new Date()
  
  const query = {
    timestamp: {
      $gte: start.toISOString(),
      $lte: end.toISOString(),
    },
  }
  
  // Total events
  const totalEvents = await col.countDocuments(query)
  
  // Events by action type
  const byAction = await col.aggregate([
    { $match: query },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]).toArray()
  
  // Events by user
  const byUser = await col.aggregate([
    { $match: query },
    { $group: { _id: { userId: '$userId', userEmail: '$userEmail' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]).toArray()
  
  // Failed events count
  const failedEvents = await col.countDocuments({ ...query, success: false })
  
  return {
    totalEvents,
    failedEvents,
    successRate: totalEvents > 0 ? ((totalEvents - failedEvents) / totalEvents * 100).toFixed(2) : 100,
    byAction: byAction.map(item => ({ action: item._id, count: item.count })),
    byUser: byUser.map(item => ({
      userId: item._id.userId,
      userEmail: item._id.userEmail,
      count: item.count,
    })),
    timeRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  }
}

/**
 * cleanupOldAuditLogs
 * 
 * WHAT: Archives or deletes audit logs older than retention period
 * WHY: Prevent audit log collection from growing indefinitely
 * HOW: Delete logs older than N days (default: 365)
 * 
 * @param {number} retentionDays - Keep logs for N days (default 365)
 * @returns {Promise<number>} - Number of logs deleted
 */
export async function cleanupOldAuditLogs(retentionDays = 365) {
  const col = await getAuditLogCollection()
  
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  
  const result = await col.deleteMany({
    timestamp: { $lt: cutoff.toISOString() },
  })
  
  return result.deletedCount
}
