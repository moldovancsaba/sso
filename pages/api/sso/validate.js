// Admin-session-based validation endpoint
// WHAT: Validates an admin HttpOnly cookie session and returns sanitized user info
import { getAdminUser } from '../../../lib/auth.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const admin = await getAdminUser(req)
    if (!admin) {
      return res.status(401).json({
        isValid: false,
        message: 'No active admin session found'
      })
    }

    return res.status(200).json({
      isValid: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      }
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
