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
    console.log('[check-access] Starting admin access check')
    console.log('[check-access] Cookie header:', req.headers.cookie ? 'present' : 'missing')
    
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map(c => c.trim())
      const publicSession = cookies.find(c => c.startsWith('public-session='))
      console.log('[check-access] public-session cookie:', publicSession ? 'found' : 'NOT FOUND')
    }
    
    // WHAT: Check if user has admin access via unified system
    // WHY: Validates public session + checks appPermissions
    const result = await getPublicUserWithAdminCheck(req)
    
    console.log('[check-access] getPublicUserWithAdminCheck result:', result ? 'user found' : 'NO USER')
    if (result) {
      console.log('[check-access] User ID:', result.user?.id)
      console.log('[check-access] User email:', result.user?.email)
      console.log('[check-access] Admin permission:', result.adminPermission?.role)
    }

    if (!result) {
      console.log('[check-access] Returning 401 - no admin access')
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
