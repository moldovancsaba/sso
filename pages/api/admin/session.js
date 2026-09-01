/**
 * pages/api/admin/session.js - Validate admin-only session
 * WHAT: Checks if admin user has active session (ADMIN ONLY, no public users)
 * WHY: Admin dashboard needs to validate admin session exclusively
 */

import logger from '../../../lib/logger.mjs'
import { hasBoundAdminSession, isFreshAuthenticationTimestamp, resolveAdminIdentity } from '../../../lib/auth.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const identity = await resolveAdminIdentity(req)

    if (!identity) {
      return res.status(401).json({
        isValid: false,
        message: 'No active admin session found'
      })
    }

    if (identity.model === 'legacy-admin-session') {
      return res.status(200).json({
        isValid: true,
        user: identity.user,
        auth: { model: identity.model },
      })
    }

    const authenticatedAt = identity.session?.authenticatedAt || identity.session?.createdAt || null
    const hasBoundSession = hasBoundAdminSession(identity.session, req)

    return res.status(200).json({
      isValid: true,
      user: identity.user,
      auth: {
        model: identity.model,
        authenticatedAt,
        requiresRecentAuth: !isFreshAuthenticationTimestamp(authenticatedAt),
        hasBoundSession,
        requiresBoundSession: !hasBoundSession,
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
