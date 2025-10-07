/**
 * lib/appAccessLogs.mjs
 * 
 * WHAT: Audit logging for app access attempts and permission changes
 * WHY: Security compliance, debugging, and admin visibility into user access patterns
 * HOW: Immutable log entries in appAccessLogs collection
 */

import { getDb } from './db.mjs'
import logger from './logger.mjs'

// WHAT: Module-level flag to prevent duplicate index creation
// WHY: Ensures indexes created exactly once per server lifetime
let indexesEnsured = false

/**
 * ensureIndexes
 * WHAT: Creates database indexes for appAccessLogs collection
 * WHY: Optimizes time-range and user-specific queries for admin dashboards
 */
async function ensureIndexes() {
  if (indexesEnsured) return
  
  const db = await getDb()
  const col = db.collection('appAccessLogs')
  
  // WHAT: Create indexes for efficient audit log queries
  // WHY: userId+timestamp for user activity history
  //      clientId+timestamp for app-specific logs
  //      eventType+timestamp for filtering by event type
  await Promise.all([
    col.createIndex({ userId: 1, timestamp: -1 }),
    col.createIndex({ clientId: 1, timestamp: -1 }),
    col.createIndex({ eventType: 1, timestamp: -1 }),
    col.createIndex({ timestamp: -1 }),
  ])
  
  indexesEnsured = true
  logger.info('appAccessLogs indexes ensured')
}

/**
 * logAccessAttempt
 * WHAT: Logs when a user attempts to access an app via OAuth
 * WHY: Tracks all access attempts for security monitoring and admin approval queues
 * 
 * @param {Object} params
 * @param {string} params.userId - User's SSO UUID
 * @param {string} params.clientId - OAuth client ID
 * @param {string} params.appName - App display name
 * @param {boolean} params.accessGranted - Whether access was granted
 * @param {string} params.currentRole - User's current role in app
 * @param {string} params.ip - Client IP address
 * @param {string} params.userAgent - Client User-Agent header
 * @param {string} params.message - Additional context message
 * @returns {Promise<void>}
 */
export async function logAccessAttempt({ userId, clientId, appName, accessGranted, currentRole, ip, userAgent, message }) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appAccessLogs')
  
  const logEntry = {
    userId,
    clientId,
    appName,
    eventType: 'access_attempt',
    accessGranted,
    currentRole: currentRole || null,
    previousRole: null,
    newRole: null,
    changedBy: null,
    ip: ip || null,
    userAgent: userAgent || null,
    message: message || null,
    timestamp: new Date().toISOString(),
  }
  
  // WHAT: Insert log entry (fire-and-forget, don't block on errors)
  // WHY: Audit logging failures shouldn't block user flows
  await col.insertOne(logEntry).catch(err => {
    logger.error('Failed to log access attempt', {
      userId,
      clientId,
      error: err.message,
    })
  })
}

/**
 * logPermissionChange
 * WHAT: Logs when an admin grants, revokes, or changes user permissions
 * WHY: Compliance and audit trail for all permission modifications
 * 
 * @param {Object} params
 * @param {string} params.userId - User whose permission changed
 * @param {string} params.clientId - OAuth client ID
 * @param {string} params.appName - App display name
 * @param {string} params.eventType - 'access_granted' | 'access_revoked' | 'role_changed'
 * @param {string} params.previousRole - User's previous role
 * @param {string} params.newRole - User's new role
 * @param {string} params.changedBy - Admin who made the change
 * @param {string} params.message - Additional context
 * @returns {Promise<void>}
 */
export async function logPermissionChange({ userId, clientId, appName, eventType, previousRole, newRole, changedBy, message }) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appAccessLogs')
  
  const logEntry = {
    userId,
    clientId,
    appName,
    eventType,
    accessGranted: eventType === 'access_granted',
    currentRole: newRole,
    previousRole: previousRole || null,
    newRole: newRole || null,
    changedBy: changedBy || null,
    ip: null,
    userAgent: null,
    message: message || null,
    timestamp: new Date().toISOString(),
  }
  
  // WHAT: Insert log entry (fire-and-forget)
  await col.insertOne(logEntry).catch(err => {
    logger.error('Failed to log permission change', {
      userId,
      clientId,
      eventType,
      error: err.message,
    })
  })
  
  logger.info('Permission change logged', {
    userId,
    clientId,
    eventType,
    previousRole,
    newRole,
    changedBy,
  })
}

/**
 * getUserAccessLogs
 * WHAT: Retrieves access logs for a specific user
 * WHY: Admin UI showing user activity history
 * 
 * @param {string} userId - User's SSO UUID
 * @param {number} limit - Maximum number of logs to return (default: 100)
 * @returns {Promise<Array>} Array of log entries, newest first
 */
export async function getUserAccessLogs(userId, limit = 100) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appAccessLogs')
  
  const logs = await col
    .find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray()
  
  return logs
}

/**
 * getAppAccessLogs
 * WHAT: Retrieves access logs for a specific app
 * WHY: App admin UI showing who accessed/attempted to access the app
 * 
 * @param {string} clientId - OAuth client ID
 * @param {number} limit - Maximum number of logs to return (default: 100)
 * @returns {Promise<Array>} Array of log entries, newest first
 */
export async function getAppAccessLogs(clientId, limit = 100) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appAccessLogs')
  
  const logs = await col
    .find({ clientId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray()
  
  return logs
}
