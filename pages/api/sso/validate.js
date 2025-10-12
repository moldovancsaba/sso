// Session validation endpoint for both admin and public users
// WHAT: Validates HttpOnly cookie session (admin OR public) and returns sanitized user info
// WHY: OAuth flow needs to work for both admin and public users
import { getAuthenticatedUser } from '../../../lib/unifiedAuth.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Check for admin or public session using unified auth
    // WHY: Simplifies code and ensures consistent behavior
    const auth = await getAuthenticatedUser(req)
    
    if (!auth) {
      // No session found
      return res.status(401).json({
        isValid: false,
        message: 'No active session found'
      })
    }
    
    // Return user info based on type
    const response = {
      isValid: true,
      userType: auth.userType,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
      }
    }
    
    // Add admin-specific fields if admin user
    if (auth.userType === 'admin') {
      response.user.role = auth.user.role
      response.user.permissions = auth.user.permissions
    }
    
    return res.status(200).json(response)
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
