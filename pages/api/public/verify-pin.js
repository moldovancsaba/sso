/**
 * pages/api/public/verify-pin.js - Verify public user login PIN
 * WHAT: Validates the PIN sent to public user's email during login
 * WHY: Confirms user identity and email ownership
 */

import { verifyPin } from '../../../lib/loginPin.mjs'
import { createPublicSession } from '../../../lib/publicSessions.mjs'
import { findPublicUserByEmail } from '../../../lib/publicUsers.mjs'
import logger from '../../../lib/logger.mjs'
import cookie from 'cookie'

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
    const sessionToken = await createPublicSession(user._id.toString(), user.email)

    // Set session cookie
    const cookieName = process.env.PUBLIC_SESSION_COOKIE || 'public-session'
    const isProduction = process.env.NODE_ENV === 'production'
    const domain = process.env.SSO_COOKIE_DOMAIN

    res.setHeader(
      'Set-Cookie',
      cookie.serialize(cookieName, sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        ...(domain && { domain }),
      })
    )

    logger.info('Public user PIN login successful', {
      event: 'public_pin_login_success',
      userId: user._id.toString(),
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
