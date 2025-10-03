// WHAT: Public user session validation API endpoint
// WHY: Check if user is logged in (used by applications to verify authentication)
// Strategic: Main validation endpoint for public user sessions

import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  // WHAT: Enable CORS for cross-domain requests
  if (runCors(req, res)) return
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // WHAT: Get user from session cookie
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      return res.status(401).json({
        isValid: false,
        message: 'No active session found',
      })
    }
    
    // WHAT: Return user info (without sensitive data)
    return res.status(200).json({
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    })
  } catch (err) {
    console.error('[public/validate] Error:', err)
    
    return res.status(500).json({
      isValid: false,
      message: 'Session validation error',
    })
  }
}
