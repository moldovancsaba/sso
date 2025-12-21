/**
 * WHAT: Session status check endpoint for public users
 * WHY: Frontend (_app.js) checks session every 60 seconds to detect expiration
 * HOW: Validates public-session cookie using the same logic as other endpoints
 * 
 * FIXED: Was checking req.session (undefined) instead of cookie-based session
 * BUG: Caused premature "session expired" alerts (every 60 seconds)
 */
import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // WHAT: Validate public user session using cookie
    // WHY: This SSO uses cookie-based sessions (public-session cookie), not express-session
    const user = await getPublicUserFromRequest(req)

    if (!user) {
      // No valid session found
      return res.status(200).json({ status: 'expired' })
    }

    // Valid session exists and has been extended (sliding window)
    return res.status(200).json({ 
      status: 'active',
      userId: user.id,
      email: user.email,
    })
  } catch (error) {
    logger.error('Error checking session status', {
      event: 'session_status_error',
      error: error.message,
      stack: error.stack,
    })
    return res.status(500).json({ message: 'Internal server error' })
  }
}
