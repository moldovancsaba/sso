/**
 * pages/api/public/request-magic-link.js - Request passwordless magic link for public users
 * WHAT: Generates and emails a magic link for one-click public user login
 * WHY: Provides convenient, secure authentication without passwords for public users
 */

import { findPublicUserByEmail } from '../../../lib/publicUsers.mjs'
import { sendEmail } from '../../../lib/email.mjs'
import { buildMagicLinkEmail } from '../../../lib/emailTemplates.mjs'
import logger from '../../../lib/logger.mjs'
import crypto from 'crypto'
import { getDb } from '../../../lib/db.mjs'

/**
 * Create a magic link token for public users
 * WHAT: Generates HMAC-signed token with TTL
 * WHY: Reuses proven security pattern from admin magic links
 */
async function createPublicMagicToken(email, ttlSeconds = 900) {
  const SECRET = process.env.PUBLIC_MAGIC_SECRET || process.env.JWT_SECRET
  if (!SECRET) {
    throw new Error('PUBLIC_MAGIC_SECRET or JWT_SECRET must be set')
  }

  const now = Math.floor(Date.now() / 1000)
  const exp = now + ttlSeconds
  const jti = crypto.randomBytes(16).toString('hex')

  const payload = {
    typ: 'public-magic',
    email,
    iat: now,
    exp,
    jti,
  }

  const payloadJson = JSON.stringify(payload)
  const payloadB64 = Buffer.from(payloadJson, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const token = `${payloadB64}.${signature}`

  // Store token in MongoDB
  const db = await getDb()
  await db.collection('publicMagicTokens').insertOne({
    jti,
    email,
    createdAt: new Date(),
    exp: new Date(exp * 1000),
    usedAt: null,
  })

  // Create TTL index if not exists
  await db.collection('publicMagicTokens').createIndex(
    { exp: 1 },
    { expireAfterSeconds: 0 }
  )

  return {
    token,
    expiresAt: new Date(exp * 1000),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    const emailLower = email.trim().toLowerCase()

    // Find public user
    const user = await findPublicUserByEmail(emailLower)

    // SECURITY: Always return success even if user not found
    // WHY: Prevents email enumeration attacks
    if (!user) {
      logger.warn('Magic link requested for non-existent public user', {
        event: 'public_magic_link_not_found',
        email: emailLower,
      })
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a magic link shortly'
      })
    }

    // Check if email is verified
    if (!user.emailVerified) {
      logger.warn('Magic link requested for unverified email', {
        event: 'public_magic_link_unverified',
        email: emailLower,
      })
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a magic link shortly'
      })
    }

    // Generate magic link token (15 minutes TTL)
    const { token, expiresAt } = await createPublicMagicToken(user.email, 900)

    // Build magic link URL
    const SSO_BASE_URL = process.env.SSO_BASE_URL || 'http://localhost:3000'
    const magicLink = `${SSO_BASE_URL}/api/public/magic-login?token=${encodeURIComponent(token)}`

    // Send email with magic link
    const emailContent = buildMagicLinkEmail({
      userType: 'public',
      email: user.email,
      magicLink,
    })

    try {
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
      })

      logger.info('Public magic link sent', {
        event: 'public_magic_link_sent',
        userId: user._id.toString(),
        email: user.email,
        expiresAt,
      })
    } catch (emailError) {
      logger.error('Failed to send magic link email', {
        event: 'public_magic_link_email_failed',
        userId: user._id.toString(),
        email: user.email,
        error: emailError.message,
        stack: emailError.stack,
      })
      // Continue anyway - token is in database, user can retry
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a magic link shortly'
    })

  } catch (error) {
    logger.error('Public magic link request error', {
      event: 'public_magic_link_error',
      error: error.message,
      stack: error.stack,
    })

    // Generic error to avoid information leakage
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a magic link shortly'
    })
  }
}
