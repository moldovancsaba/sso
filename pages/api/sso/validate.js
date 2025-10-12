// Session validation endpoint for both admin and public users
// WHAT: Validates HttpOnly cookie session (admin OR public) and returns sanitized user info
// WHY: OAuth flow needs to work for both admin and public users
import { getAdminUser } from '../../../lib/auth.mjs'
import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Check for admin session first, then public session
    // WHY: OAuth should work for both user types
    const admin = await getAdminUser(req)
    if (admin) {
      return res.status(200).json({
        isValid: true,
        userType: 'admin',
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          permissions: admin.permissions,
        }
      })
    }

    // Check for public user session
    const publicUser = await getPublicUserFromRequest(req)
    if (publicUser) {
      return res.status(200).json({
        isValid: true,
        userType: 'public',
        user: {
          id: publicUser.id,
          email: publicUser.email,
          name: publicUser.name,
        }
      })
    }

    // No session found
    return res.status(401).json({
      isValid: false,
      message: 'No active session found'
    })
  } catch (error) {
    const msg = (error && (error.message || error.toString())) || ''
    if (msg.includes('MONGODB_URI is required')) {
      return res.status(503).json({ isValid: false, message: 'Service unavailable: database not configured' })
    }
    if (msg.includes('MongoServerSelectionError') || msg.toLowerCase().includes('server selection')) {
      return res.status(503).json({ isValid: false, message: 'Service unavailable: database unreachable' })
    }
    console.error('SSO validation error:', error)
    return res.status(500).json({
      isValid: false,
      message: 'Internal server error'
    })
  }
}
