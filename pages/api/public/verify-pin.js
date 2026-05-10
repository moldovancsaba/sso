/**
 * pages/api/public/verify-pin.js - Verify public user login PIN
 * WHAT: Validates the PIN sent to public user's email during login
 * WHY: Confirms user identity and email ownership
 */

import { verifyPin } from '../../../lib/loginPin.mjs'
import { createPublicSession, setPublicSessionCookie } from '../../../lib/publicSessions.mjs'
import { ensurePublicUserId, findPublicUserByEmail } from '../../../lib/publicUsers.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
    const user = await findPublicUserByEmail(emailLower)

    if (!user) {
      logger.warn('PIN verification: public user not found', {
        event: 'pin_verify_user_not_found',
        email: emailLower,
      })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Verify PIN
    const result = await verifyPin({
      userId: user._id.toString(),
      pin: pin.trim(),
      userType: 'public',
    })

    if (!result.valid) {
      logger.warn('PIN verification failed', {
        event: 'pin_verify_failed',
        userId: user._id.toString(),
        email: user.email,
        error: result.error,
      })
      return res.status(401).json({ 
        error: result.error || 'Invalid PIN',
      })
    }

    // PIN verified successfully - create session
    const normalizedUser = await ensurePublicUserId(user)
    const sessionToken = await createPublicSession(normalizedUser.id, {
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    })
    setPublicSessionCookie(res, sessionToken)

    logger.info('Public user PIN login successful', {
      event: 'public_pin_login_success',
      userId: normalizedUser.id,
      email: user.email,
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful',
    })

  } catch (error) {
    logger.error('Public PIN verification error', {
      event: 'pin_verify_error',
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      error: 'An unexpected error occurred',
    })
  }
}
