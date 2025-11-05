/**
 * pages/api/public/login.js - Public user authentication
 * WHAT: Authenticates public users with email + password and optional PIN verification
 * WHY: Secure login for public users with random PIN verification for additional security
 */

import { findPublicUserByEmail } from '../../../lib/publicUsers.mjs'
import { createPublicSession } from '../../../lib/publicSessions.mjs'
import { shouldTriggerPin, issuePin, ensurePinIndexes } from '../../../lib/loginPin.mjs'
import { sendEmail } from '../../../lib/email.mjs'
import { buildLoginPinEmail } from '../../../lib/emailTemplates.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'
import bcrypt from 'bcryptjs'
import cookie from 'cookie'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    // Validate input
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' })
    }

    const emailLower = email.trim().toLowerCase()

    // Find user WITH password hash for verification
    const db = await getDb()
    const user = await db.collection('publicUsers').findOne({ email: emailLower })

    if (!user) {
      logger.warn('Public login: user not found', {
        event: 'public_login_failed',
        email: emailLower,
      })
      // Generic error to prevent email enumeration
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Verify password (bcrypt)
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)

    if (!isValidPassword) {
      logger.warn('Public login: invalid password', {
        event: 'public_login_failed',
        userId: user._id.toString(),
        email: user.email,
      })
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Check if email is verified (treat undefined as verified for backward compatibility)
    if (user.emailVerified === false) {
      logger.warn('Public login: email not verified', {
        event: 'public_login_unverified',
        userId: user._id.toString(),
        email: user.email,
      })
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in'
      })
    }

    // WHAT: Increment login count and check if PIN should be triggered
    // WHY: Random PIN verification (5th-10th login) for additional security
    const loginCount = (user.loginCount || 0) + 1
    
    // Update login count
    await db.collection('publicUsers').updateOne(
      { _id: user._id },
      { 
        $set: { loginCount, lastLoginAt: new Date().toISOString() }
      }
    )

    // WHAT: Ensure user has UUID identifier before PIN flow
    // WHY: PIN system uses UUID as userId
    if (!user.id) {
      const { randomUUID } = await import('crypto')
      const uuid = randomUUID()
      await db.collection('publicUsers').updateOne(
        { _id: user._id },
        { $set: { id: uuid } }
      )
      user.id = uuid
      logger.info('Added UUID to legacy public user', {
        userId: uuid,
        email: user.email
      })
    }
    
    // Check if PIN should be triggered (now async - checks database settings)
    if (await shouldTriggerPin(loginCount)) {
      // Issue PIN and send email
      await ensurePinIndexes() // Ensure indexes exist
      const { pin } = await issuePin({
        userId: user.id,
        email: user.email,
        userType: 'public',
      })

      // Send PIN email
      const emailContent = buildLoginPinEmail({
        userType: 'public',
        email: user.email,
        pin,
      })

      try {
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          text: emailContent.text,
        })
      } catch (emailError) {
      logger.error('Failed to send PIN email', {
        event: 'pin_email_failed',
        userId: user.id,
        email: user.email,
        error: emailError.message,
      })
        // Continue anyway - PIN is in database, user can retry
      }

      logger.info('Public login PIN required', {
        event: 'public_login_pin_required',
        userId: user.id,
        email: user.email,
        loginCount,
      })

      // Return special response indicating PIN is required
      return res.status(200).json({
        success: false, // Login not complete yet
        requiresPin: true,
        message: 'Please check your email for a verification PIN',
        email: user.email, // Send back for PIN verification
      })
    }

    // No PIN required - proceed with normal login
    // WHAT: Ensure user has UUID identifier (for backward compatibility with old users)
    // WHY: Sessions need stable UUID, not MongoDB ObjectId
    if (!user.id) {
      // Legacy user without UUID - add one
      const { randomUUID } = await import('crypto')
      const uuid = randomUUID()
      await db.collection('publicUsers').updateOne(
        { _id: user._id },
        { $set: { id: uuid } }
      )
      user.id = uuid
      logger.info('Added UUID to legacy public user', {
        userId: uuid,
        email: user.email
      })
    }
    
    // Create session with UUID
    const sessionToken = await createPublicSession(user.id, user.email)

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

    logger.info('Public login successful', {
      event: 'public_login_success',
      userId: user.id,
      email: user.email,
      loginCount,
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful',
    })

  } catch (error) {
    logger.error('Public login error', {
      event: 'public_login_error',
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      error: 'An unexpected error occurred',
    })
  }
}
