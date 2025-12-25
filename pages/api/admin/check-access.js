/**
 * Check Admin Access Endpoint
 * 
 * GET /api/admin/check-access
 * 
 * WHAT: Validates if user has admin access via unified permission system
 * WHY: Allow admin login page to check permissions without separate auth
 * HOW: Validate public session → check appPermissions for SSO Admin client
 */

import { getPublicUserWithAdminCheck } from '../../../lib/auth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Check if user has admin access via unified system
    // WHY: Validates public session + checks appPermissions
    const result = await getPublicUserWithAdminCheck(req)

    if (!result) {
      // WHAT: Return 401 if not logged in or no admin access
      // WHY: Frontend needs to know user needs to login
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No admin access. Please login at https://sso.doneisbetter.com'
        }
      })
    }

    // WHAT: Return user info with admin role
    // WHY: Frontend displays user info and redirects to dashboard
    return res.status(200).json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.adminPermission.role,
      }
    })

  } catch (error) {
    console.error('Admin access check error:', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check admin access'
      }
    })
  }
}
