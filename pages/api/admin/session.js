/**
 * pages/api/admin/session.js - Validate admin-only session
 * WHAT: Checks if admin user has active session (ADMIN ONLY, no public users)
 * WHY: Admin dashboard needs to validate admin session exclusively
 */

import { getAdminUser } from '../../../lib/auth.mjs'
import logger from '../../../lib/logger.mjs'
import { getPublicUserWithAdminCheck, isFreshAuthenticationTimestamp } from '../../../lib/auth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const unifiedAdmin = await getPublicUserWithAdminCheck(req)

    if (unifiedAdmin?.adminPermission?.role === 'admin') {
      const authenticatedAt = unifiedAdmin.session?.authenticatedAt || unifiedAdmin.session?.createdAt || null

      return res.status(200).json({
        isValid: true,
        user: {
          id: unifiedAdmin.user.id,
          email: unifiedAdmin.user.email,
          name: unifiedAdmin.user.name,
          role: unifiedAdmin.adminPermission.role,
          permissions: ['read', 'write', 'delete', 'manage-users', 'manage-orgs', 'manage-org-users'],
        },
        auth: {
          model: 'unified-public-session',
          authenticatedAt,
          requiresRecentAuth: !isFreshAuthenticationTimestamp(authenticatedAt),
        }
      })
    }

    // WHAT: Get ADMIN user only (not public user)
    // WHY: Admin dashboard should only accept admin sessions
    const adminUser = await getAdminUser(req)
    
    if (!adminUser) {
      return res.status(401).json({
        isValid: false,
        message: 'No active admin session found'
      })
    }

    // WHAT: Return sanitized admin info
    // WHY: Dashboard needs name, email, role for display
    return res.status(200).json({
      isValid: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        permissions: adminUser.permissions
      },
      auth: {
        model: 'legacy-admin-session',
      }
    })
  } catch (error) {
    logger.error('Admin session validation error', {
      event: 'admin_session_validation_error',
      error: error.message,
      stack: error.stack,
    })
    
    return res.status(500).json({
      isValid: false,
      message: 'Internal server error'
    })
  }
}
