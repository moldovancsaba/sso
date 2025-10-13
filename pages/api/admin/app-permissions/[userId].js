/**
 * /api/admin/app-permissions/[userId]
 * 
 * WHAT: SSO Admin API for managing user permissions across all OAuth applications
 * WHY: Centralized permission management - SSO is the source of truth for access control
 * HOW: Admin-only endpoint that allows viewing, granting, revoking, and updating user app permissions
 */

import { requireAdmin } from '../../../../lib/auth.mjs'
import { getAllClients } from '../../../../lib/oauth/clients.mjs'
import {
  getUserAppPermissions,
  upsertPermissionForAdmin,
  revokePermissionForAdmin,
  mapPermissionToDTO,
} from '../../../../lib/appPermissions.mjs'
import logger from '../../../../lib/logger.mjs'

/**
 * API Handler
 * Methods: GET, POST, PATCH, DELETE
 * All require admin authentication via HttpOnly cookie (Domain=.doneisbetter.com)
 */
export default async function handler(req, res) {
  // WHAT: Enforce admin authentication for all methods
  // WHY: Only SSO admins should manage cross-app permissions (security)
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return // requireAdmin already sent 401/403

  const { userId } = req.query

  // WHAT: Validate userId parameter
  // WHY: Prevent crashes from malformed requests
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return res.status(400).json({
      error: {
        code: 'INVALID_USER_ID',
        message: 'Valid userId parameter is required',
      },
    })
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, userId)
      case 'POST':
        return await handlePost(req, res, userId, adminUser)
      case 'PATCH':
        return await handlePatch(req, res, userId, adminUser)
      case 'DELETE':
        return await handleDelete(req, res, userId, adminUser)
      default:
        return res.status(405).json({
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed`,
          },
        })
    }
  } catch (error) {
    logger.error('App permissions API error', {
      method: req.method,
      userId,
      adminId: adminUser.id,
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    })
  }
}

/**
 * GET /api/admin/app-permissions/[userId]
 * WHAT: Fetch user's permissions merged with all available OAuth clients
 * WHY: Admin UI needs to show all apps and their permission status per user
 * 
 * Response shape:
 * {
 *   userId: string,
 *   apps: [
 *     {
 *       clientId: string,
 *       name: string,
 *       role: 'admin' | 'user' | 'none',
 *       status: 'approved' | 'pending' | 'revoked',
 *       createdAt?: string (ISO 8601 with milliseconds),
 *       updatedAt?: string (ISO 8601 with milliseconds),
 *     }
 *   ]
 * }
 */
async function handleGet(req, res, userId) {
  // WHAT: Fetch all active OAuth clients and user's permissions in parallel
  // WHY: Minimize latency by running independent queries concurrently
  const [allClients, userPermissions] = await Promise.all([
    getAllClients(),
    getUserAppPermissions(userId),
  ])

  // WHAT: Build a map of clientId -> permission for fast lookup
  // WHY: O(1) lookup instead of O(n) for each client
  const permissionMap = new Map()
  for (const perm of userPermissions) {
    permissionMap.set(perm.clientId, perm)
  }

  // WHAT: Merge all clients with user's permissions
  // WHY: Admin UI shows ALL apps, even those user doesn't have access to yet
  const apps = allClients.map(client => {
    const permission = permissionMap.get(client.clientId)

    if (permission) {
      // WHAT: User has a permission record (approved, pending, or revoked)
      return {
        clientId: client.clientId,
        name: client.name,
        description: client.description,
        role: permission.role || 'none',
        status: permission.status || 'revoked',
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
        grantedAt: permission.grantedAt || null,
        grantedBy: permission.grantedBy || null,
      }
    } else {
      // WHAT: User has no permission record - default to none/revoked
      // WHY: UI displays consistent state (role: none, status: revoked) for "no access"
      return {
        clientId: client.clientId,
        name: client.name,
        description: client.description,
        role: 'none',
        status: 'revoked',
        createdAt: null,
        updatedAt: null,
        grantedAt: null,
        grantedBy: null,
      }
    }
  })

  logger.info('Fetched user app permissions for admin UI', {
    userId,
    totalApps: allClients.length,
    permissionsFound: userPermissions.length,
  })

  return res.status(200).json({ userId, apps })
}

/**
 * POST /api/admin/app-permissions/[userId]
 * WHAT: Grant or update user permission for a specific app
 * WHY: Admin UI needs to grant initial access or change role
 * 
 * Request body:
 * {
 *   clientId: string,
 *   role: 'admin' | 'user',
 *   status?: 'approved' | 'pending' (default: 'approved')
 * }
 * 
 * Response: Updated permission DTO with ISO timestamps
 */
async function handlePost(req, res, userId, adminUser) {
  const { clientId, role, status = 'approved' } = req.body

  // WHAT: Validate request body
  // WHY: Prevent invalid data from being persisted
  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_CLIENT_ID',
        message: 'Valid clientId is required',
      },
    })
  }

  if (!role || !['admin', 'user'].includes(role)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_ROLE',
        message: 'Role must be "admin" or "user"',
      },
    })
  }

  if (status && !['approved', 'pending'].includes(status)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STATUS',
        message: 'Status must be "approved" or "pending"',
      },
    })
  }

  // WHAT: Create or update permission
  // WHY: Upsert handles both initial grant and role/status updates
  const permission = await upsertPermissionForAdmin({
    userId,
    clientId,
    role,
    status,
    adminUserId: adminUser.id,
  })

  logger.info('Admin granted/updated app permission', {
    userId,
    clientId,
    role,
    status,
    adminId: adminUser.id,
    adminEmail: adminUser.email,
  })

  // WHAT: Return clean DTO with ISO timestamps
  const dto = mapPermissionToDTO(permission)
  return res.status(200).json(dto)
}

/**
 * PATCH /api/admin/app-permissions/[userId]
 * WHAT: Update existing permission (change role or approve pending)
 * WHY: Admin UI needs granular control (approve without changing role, etc.)
 * 
 * Request body:
 * {
 *   clientId: string,
 *   role?: 'admin' | 'user' | 'none',
 *   status?: 'approved' | 'pending' | 'revoked'
 * }
 * 
 * Special handling:
 * - If role === 'none', treat as revoke (set status = 'revoked')
 * - If status === 'revoked', call revokePermissionForAdmin
 */
async function handlePatch(req, res, userId, adminUser) {
  const { clientId, role, status } = req.body

  // WHAT: Validate request body
  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_CLIENT_ID',
        message: 'Valid clientId is required',
      },
    })
  }

  if (!role && !status) {
    return res.status(400).json({
      error: {
        code: 'MISSING_FIELDS',
        message: 'At least one of role or status must be provided',
      },
    })
  }

  if (role && !['admin', 'user', 'none'].includes(role)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_ROLE',
        message: 'Role must be "admin", "user", or "none"',
      },
    })
  }

  if (status && !['approved', 'pending', 'revoked'].includes(status)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STATUS',
        message: 'Status must be "approved", "pending", or "revoked"',
      },
    })
  }

  // WHAT: Check if this is a revoke operation
  // WHY: Role 'none' or status 'revoked' both mean "remove access"
  if (role === 'none' || status === 'revoked') {
    const permission = await revokePermissionForAdmin({
      userId,
      clientId,
      adminUserId: adminUser.id,
    })

    logger.info('Admin revoked app permission via PATCH', {
      userId,
      clientId,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
    })

    const dto = mapPermissionToDTO(permission)
    return res.status(200).json(dto)
  }

  // WHAT: Otherwise, update role/status using upsert
  // WHY: Upsert handles both updates and creates if permission doesn't exist
  const permission = await upsertPermissionForAdmin({
    userId,
    clientId,
    role: role || 'user', // Default to 'user' if only status provided
    status: status || 'approved', // Default to 'approved' if only role provided
    adminUserId: adminUser.id,
  })

  logger.info('Admin updated app permission', {
    userId,
    clientId,
    role,
    status,
    adminId: adminUser.id,
    adminEmail: adminUser.email,
  })

  const dto = mapPermissionToDTO(permission)
  return res.status(200).json(dto)
}

/**
 * DELETE /api/admin/app-permissions/[userId]
 * WHAT: Revoke user's access to a specific app
 * WHY: Admin UI provides explicit "Revoke Access" action
 * 
 * Request body:
 * {
 *   clientId: string
 * }
 * 
 * Response: { ok: true, permission: DTO }
 */
async function handleDelete(req, res, userId, adminUser) {
  const { clientId } = req.body

  // WHAT: Validate request body
  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_CLIENT_ID',
        message: 'Valid clientId is required',
      },
    })
  }

  // WHAT: Revoke permission (sets status='revoked', role='none', tracks who/when)
  // WHY: Maintains audit trail instead of deleting record
  const permission = await revokePermissionForAdmin({
    userId,
    clientId,
    adminUserId: adminUser.id,
  })

  logger.info('Admin revoked app permission via DELETE', {
    userId,
    clientId,
    adminId: adminUser.id,
    adminEmail: adminUser.email,
  })

  const dto = mapPermissionToDTO(permission)
  return res.status(200).json({ ok: true, permission: dto })
}
