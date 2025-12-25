/**
 * pages/api/public/session.js - Validate public user session
 * WHAT: Checks if public user has active session and returns user info
 * WHY: Allow client-side code to check authentication status
 */

import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { runCors } from '../../../lib/cors.mjs'
import { getUserLoginMethods } from '../../../lib/accountLinking.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Get public user from session cookie
    // WHY: Validates HttpOnly cookie and returns sanitized user info
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      return res.status(401).json({
        isValid: false,
        message: 'No active session found'
      })
    }

    // WHAT: Return sanitized user info (no sensitive data)
    // WHY: Client needs to know who is logged in but shouldn't see passwords, etc.
    // WHAT: Include loginMethods array for account management UI
    // WHY: Account page needs to show which login methods are linked
    const loginMethods = getUserLoginMethods(user)
    
    return res.status(200).json({
      isValid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        status: user.status,
        emailVerified: user.emailVerified !== false, // Treat undefined as verified
        loginMethods, // ['password', 'facebook', 'google']
      }
    })
  } catch (error) {
    logger.error('Public session validation error', {
      event: 'public_session_validation_error',
      error: error.message,
      stack: error.stack,
    })
    
    return res.status(500).json({
      isValid: false,
      message: 'Internal server error'
    })
  }
}
