/**
 * lib/appPermissions.mjs
 * 
 * WHAT: Manages app-specific user permissions across all SSO-integrated applications
 * WHY: Centralized permission management enables consistent access control across launchmass, messmass, cardmass, blockmass, etc.
 * HOW: Stores per-user, per-app permissions in appPermissions collection with role-based access
 */

import { getDb } from './db.mjs'
import logger from './logger.mjs'

// WHAT: Module-level flag to prevent duplicate index creation
// WHY: Ensures indexes created exactly once per server lifetime for performance
let indexesEnsured = false

/**
 * ensureIndexes
 * WHAT: Creates database indexes for appPermissions collection
 * WHY: Optimizes queries for user permission lookups and admin views
 */
async function ensureIndexes() {
  if (indexesEnsured) return
  
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  // WHAT: Create indexes for efficient queries
  // WHY: userId+clientId compound unique index prevents duplicate permissions
  //      clientId+status index for app admin "pending approval" views
  //      userId index for user profile views showing all app access
  await Promise.all([
    col.createIndex({ userId: 1, clientId: 1 }, { unique: true }),
    col.createIndex({ clientId: 1, status: 1 }),
    col.createIndex({ userId: 1 }),
    col.createIndex({ status: 1, requestedAt: -1 }),
  ])
  
  indexesEnsured = true
  logger.info('appPermissions indexes ensured')
}

/**
 * getAppPermission
 * WHAT: Retrieves user's permission record for a specific app
 * WHY: Used during OAuth callback to determine if user can access the requesting app
 * 
 * @param {string} userId - User's SSO UUID (publicUsers.id)
 * @param {string} clientId - OAuth client ID (oauthClients.client_id)
 * @returns {Promise<Object|null>} Permission record or null if not found
 */
export async function getAppPermission(userId, clientId) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  // WHAT: Query by compound key (userId + clientId)
  // WHY: Compound unique index ensures fast lookup
  const permission = await col.findOne({ userId, clientId })
  
  logger.info('App permission queried', {
    userId,
    clientId,
    found: !!permission,
    status: permission?.status || 'none',
    role: permission?.role || 'none',
  })
  
  return permission
}

/**
 * createAppPermission
 * WHAT: Creates initial permission record when user first attempts to access an app
 * WHY: Tracks all access attempts and enables admin approval workflow
 * 
 * @param {Object} params
 * @param {string} params.userId - User's SSO UUID
 * @param {string} params.clientId - OAuth client ID
 * @param {string} params.appName - App display name (e.g., "launchmass")
 * @param {boolean} params.autoApprove - Whether to auto-approve based on email domain
 * @returns {Promise<Object>} Created permission record
 */
export async function createAppPermission({ userId, clientId, appName, autoApprove = false }) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  const now = new Date().toISOString()
  
  // WHAT: Determine initial status based on auto-approve setting
  // WHY: Organization admins can configure auto-approval for trusted domains
  const permission = {
    userId,
    clientId,
    appName,
    hasAccess: autoApprove,
    status: autoApprove ? 'active' : 'pending',
    role: autoApprove ? 'user' : 'none',
    requestedAt: now,
    grantedAt: autoApprove ? now : null,
    grantedBy: autoApprove ? 'auto-approved' : null,
    revokedAt: null,
    revokedBy: null,
    lastAccessedAt: autoApprove ? now : null,
    createdAt: now,
    updatedAt: now,
  }
  
  // WHAT: Insert permission record with upsert to handle race conditions
  // WHY: Multiple OAuth attempts could happen simultaneously
  await col.updateOne(
    { userId, clientId },
    { $setOnInsert: permission },
    { upsert: true }
  )
  
  logger.info('App permission created', {
    userId,
    clientId,
    appName,
    autoApprove,
    status: permission.status,
  })
  
  // WHAT: Return the actual document (may differ if race condition occurred)
  return await col.findOne({ userId, clientId })
}

/**
 * updateAppPermission
 * WHAT: Updates user's permission for an app (grant/revoke access, change role)
 * WHY: Used by app superadmins and SSO admins to manage user access
 * 
 * @param {Object} params
 * @param {string} params.userId - User's SSO UUID
 * @param {string} params.clientId - OAuth client ID
 * @param {boolean} params.hasAccess - Whether user has access
 * @param {string} params.status - Permission status: 'active' | 'pending' | 'revoked'
 * @param {string} params.role - User role: 'none' | 'user' | 'admin' | 'superadmin'
 * @param {string} params.grantedBy - Admin who granted/revoked access
 * @returns {Promise<Object>} Updated permission record
 */
export async function updateAppPermission({ userId, clientId, hasAccess, status, role, grantedBy }) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  const now = new Date().toISOString()
  
  // WHAT: Build update object based on status change
  // WHY: Different fields need to be set depending on grant/revoke action
  const update = {
    hasAccess,
    status,
    role,
    updatedAt: now,
  }
  
  // WHAT: Set grantedAt/grantedBy when moving from pending to active
  // WHY: Audit trail of who approved access and when
  if (status === 'active' && hasAccess) {
    update.grantedAt = now
    update.grantedBy = grantedBy
  }
  
  // WHAT: Set revokedAt/revokedBy when access is revoked
  // WHY: Audit trail of who revoked access and when
  if (status === 'revoked' || !hasAccess) {
    update.revokedAt = now
    update.revokedBy = grantedBy
  }
  
  // WHAT: Update permission record
  const result = await col.findOneAndUpdate(
    { userId, clientId },
    { $set: update },
    { returnDocument: 'after' }
  )
  
  if (!result) {
    throw new Error('Permission record not found')
  }
  
  logger.info('App permission updated', {
    userId,
    clientId,
    hasAccess,
    status,
    role,
    grantedBy,
  })
  
  return result
}

/**
 * updateLastAccessed
 * WHAT: Updates lastAccessedAt timestamp when user successfully logs into app
 * WHY: Tracks active usage for admin dashboards and inactive user cleanup
 * 
 * @param {string} userId - User's SSO UUID
 * @param {string} clientId - OAuth client ID
 * @returns {Promise<void>}
 */
export async function updateLastAccessed(userId, clientId) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  const now = new Date().toISOString()
  
  // WHAT: Update lastAccessedAt only (non-blocking operation)
  // WHY: Don't wait for result; this is a background tracking operation
  await col.updateOne(
    { userId, clientId },
    { $set: { lastAccessedAt: now } }
  ).catch(err => {
    // WHAT: Log error but don't fail the login
    // WHY: User experience shouldn't break if tracking fails
    logger.error('Failed to update lastAccessedAt', {
      userId,
      clientId,
      error: err.message,
    })
  })
}

/**
 * getUserAppPermissions
 * WHAT: Gets all app permissions for a specific user
 * WHY: Used in SSO admin UI to show user's access across all apps
 * 
 * @param {string} userId - User's SSO UUID
 * @returns {Promise<Array>} Array of permission records
 */
export async function getUserAppPermissions(userId) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  // WHAT: Find all permissions for this user, sorted by app name
  // WHY: Admin UI displays user's access across all apps
  const permissions = await col
    .find({ userId })
    .sort({ appName: 1 })
    .toArray()
  
  return permissions
}

/**
 * getAppUsers
 * WHAT: Gets all users who have requested/been granted access to a specific app
 * WHY: Used in app admin UI to show pending approvals and manage users
 * 
 * @param {string} clientId - OAuth client ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status: 'pending' | 'active' | 'revoked'
 * @param {number} filters.page - Page number for pagination (default: 1)
 * @param {number} filters.limit - Items per page (default: 50)
 * @returns {Promise<Object>} { permissions: Array, total: number, page: number, pages: number }
 */
export async function getAppUsers(clientId, filters = {}) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  // WHAT: Build query filter based on provided filters
  // WHY: Admin UI needs to filter by status (e.g., show only pending requests)
  const query = { clientId }
  if (filters.status) {
    query.status = filters.status
  }
  
  // WHAT: Calculate pagination
  // WHY: Large apps may have thousands of users
  const page = filters.page || 1
  const limit = filters.limit || 50
  const skip = (page - 1) * limit
  
  // WHAT: Get total count for pagination
  const total = await col.countDocuments(query)
  
  // WHAT: Get paginated results sorted by request date (newest first)
  // WHY: Admin needs to see most recent access requests first
  const permissions = await col
    .find(query)
    .sort({ requestedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()
  
  logger.info('App users queried', {
    clientId,
    filters,
    total,
    returned: permissions.length,
  })
  
  return {
    permissions,
    total,
    page,
    pages: Math.ceil(total / limit),
  }
}

/**
 * deleteAppPermission
 * WHAT: Completely removes a user's permission record for an app
 * WHY: Used when permanently removing user from system (GDPR, etc.)
 * 
 * @param {string} userId - User's SSO UUID
 * @param {string} clientId - OAuth client ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteAppPermission(userId, clientId) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  // WHAT: Delete permission record
  // WHY: Permanent removal for user deletion or app decommissioning
  const result = await col.deleteOne({ userId, clientId })
  
  logger.info('App permission deleted', {
    userId,
    clientId,
    deleted: result.deletedCount > 0,
  })
  
  return result.deletedCount > 0
}

/**
 * upsertPermissionForAdmin
 * WHAT: Creates or updates a user permission for an app (admin action)
 * WHY: SSO admin UI needs to grant initial access or update existing permissions
 * 
 * @param {Object} params
 * @param {string} params.userId - User's SSO UUID
 * @param {string} params.clientId - OAuth client ID
 * @param {string} params.role - 'admin' | 'user'
 * @param {string} params.status - 'approved' | 'pending' (default: 'approved')
 * @param {string} params.adminUserId - SSO admin user ID performing the action
 * @returns {Promise<Object>} Created/updated permission record
 */
export async function upsertPermissionForAdmin({ userId, clientId, role, status = 'approved', adminUserId }) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  const now = new Date().toISOString()
  
  // WHAT: Check if permission already exists
  // WHY: Need to know whether to create or update for audit trail
  const existing = await col.findOne({ userId, clientId })
  
  if (existing) {
    // WHAT: Update existing permission
    // WHY: Admin is changing role or approving pending request
    const update = {
      role,
      status,
      hasAccess: status === 'approved',
      updatedAt: now,
    }
    
    // WHAT: Set grantedAt/grantedBy if moving to approved status
    // WHY: Track who approved and when for audit purposes
    if (status === 'approved' && existing.status !== 'approved') {
      update.grantedAt = now
      update.grantedBy = adminUserId
    }
    
    const result = await col.findOneAndUpdate(
      { userId, clientId },
      { $set: update },
      { returnDocument: 'after' }
    )
    
    logger.info('App permission updated by admin', {
      userId,
      clientId,
      role,
      status,
      adminUserId,
      wasApproved: existing.status === 'approved',
    })
    
    return result
  } else {
    // WHAT: Create new permission record
    // WHY: Admin is granting initial access to this app
    const permission = {
      userId,
      clientId,
      role,
      status,
      hasAccess: status === 'approved',
      requestedAt: now, // WHAT: Set to now since admin is granting (not user-requested)
      grantedAt: status === 'approved' ? now : null,
      grantedBy: status === 'approved' ? adminUserId : null,
      revokedAt: null,
      revokedBy: null,
      lastAccessedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    
    await col.insertOne(permission)
    
    logger.info('App permission created by admin', {
      userId,
      clientId,
      role,
      status,
      adminUserId,
    })
    
    return permission
  }
}

/**
 * revokePermissionForAdmin
 * WHAT: Revokes a user's access to an app (admin action)
 * WHY: SSO admin UI needs ability to remove user access
 * 
 * @param {Object} params
 * @param {string} params.userId - User's SSO UUID
 * @param {string} params.clientId - OAuth client ID
 * @param {string} params.adminUserId - SSO admin user ID performing the action
 * @returns {Promise<Object>} Updated permission record
 */
export async function revokePermissionForAdmin({ userId, clientId, adminUserId }) {
  await ensureIndexes()
  const db = await getDb()
  const col = db.collection('appPermissions')
  
  const now = new Date().toISOString()
  
  // WHAT: Update permission to revoked status
  // WHY: Maintain audit trail (don't delete, just mark as revoked)
  const result = await col.findOneAndUpdate(
    { userId, clientId },
    {
      $set: {
        status: 'revoked',
        hasAccess: false,
        role: 'none', // WHAT: Set role to 'none' when revoking
        revokedAt: now,
        revokedBy: adminUserId,
        updatedAt: now,
      }
    },
    { returnDocument: 'after' }
  )
  
  if (!result) {
    throw new Error('Permission record not found')
  }
  
  logger.info('App permission revoked by admin', {
    userId,
    clientId,
    adminUserId,
  })
  
  return result
}

/**
 * mapPermissionToDTO
 * WHAT: Converts MongoDB permission document to API-friendly DTO
 * WHY: Ensures consistent data shape and ISO timestamp format for client
 * 
 * @param {Object} permission - MongoDB permission document
 * @returns {Object} DTO with clean field names and ISO timestamps
 */
export function mapPermissionToDTO(permission) {
  if (!permission) return null
  
  // WHAT: Return clean DTO with ISO timestamps (already in ISO format from DB)
  // WHY: Client expects consistent format without MongoDB _id, with clear field names
  return {
    userId: permission.userId,
    clientId: permission.clientId,
    appName: permission.appName || '',
    role: permission.role || 'none',
    status: permission.status || 'revoked',
    hasAccess: permission.hasAccess || false,
    requestedAt: permission.requestedAt || null,
    grantedAt: permission.grantedAt || null,
    grantedBy: permission.grantedBy || null,
    revokedAt: permission.revokedAt || null,
    revokedBy: permission.revokedBy || null,
    lastAccessedAt: permission.lastAccessedAt || null,
    createdAt: permission.createdAt,
    updatedAt: permission.updatedAt,
  }
}
