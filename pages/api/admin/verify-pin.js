/**
 * pages/api/admin/verify-pin.js - Verify admin login PIN
 * WHAT: Validates the PIN sent to user's email during login
 * WHY: Confirms user identity and email ownership
 */

import { verifyPin } from '../../../lib/loginPin.mjs'
import { createSession } from '../../../lib/sessions.mjs'
import { findUserByEmail } from '../../../lib/users.mjs'
import { setAdminSessionCookie } from '../../../lib/auth.mjs'
import logger from '../../../lib/logger.mjs'
import { strictRateLimiter } from '../../../lib/middleware/rateLimit.mjs'
import { applyRateLimiter } from '../../../lib/apiHelpers.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  await applyRateLimiter(strictRateLimiter, req, res)
  if (res.writableEnded) return

  try {
    const { email, pin } = req.body

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'PIN is required' })
    }

    // Find user
    const emailLower = email.trim().toLowerCase()
    const aliasEmail = process.env.SSO_ADMIN_ALIAS_EMAIL || 'sso@doneisbetter.com'
    const searchEmail = emailLower === 'admin' ? aliasEmail : emailLower
    
    const user = await findUserByEmail(searchEmail)

    if (!user) {
      logger.warn('PIN verification: user not found', {
        event: 'pin_verify_user_not_found',
        email: searchEmail,
      })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify PIN
    const result = await verifyPin({
      userId: user.id,
      pin: pin.trim(),
      userType: 'admin',
    })

    if (!result.valid) {
      logger.warn('PIN verification failed', {
        event: 'pin_verify_failed',
        userId: user.id,
        email: user.email,
        error: result.error,
      })
      return res.status(401).json({ 
        error: result.error || 'Invalid PIN',
      })
    }

    // PIN verified successfully - create session
    const { token: sessionToken, expiresAt } = await createSession(
      user.id,
      user.email,
      user.role,
      7 * 24 * 60 * 60, // 7 days
      {
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      }
    )

    // WHAT: Set the session cookie via the shared helper, using the base64-JSON envelope
    //       format decodeSessionToken()/getAdminUser() expect.
    // WHY: This previously set the raw session token via cookie.serialize() — decodeSessionToken
    //      base64-decodes the cookie and JSON.parses it, which fails on a raw hex token, so
    //      sessions created via this PIN flow silently never authenticated afterward.
    const tokenData = {
      token: sessionToken,
      expiresAt,
      userId: user.id,
      role: user.role,
    }
    const signedToken = Buffer.from(JSON.stringify(tokenData)).toString('base64')
    setAdminSessionCookie(res, signedToken, 7 * 24 * 60 * 60)

    logger.info('Admin PIN login successful', {
      event: 'admin_pin_login_success',
      userId: user.id,
      email: user.email,
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful',
    })

  } catch (error) {
    logger.error('PIN verification error', {
      event: 'pin_verify_error',
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      error: 'An unexpected error occurred',
    })
  }
}
