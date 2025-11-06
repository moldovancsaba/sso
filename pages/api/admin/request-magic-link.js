/**
 * pages/api/admin/request-magic-link.js - Request passwordless magic link for admin
 * WHAT: Generates and emails a magic link for one-click admin login
 * WHY: Provides convenient, secure authentication without passwords
 */

import { findUserByEmail } from '../../../lib/users.mjs'
import { createMagicToken } from '../../../lib/magic.mjs'
import { sendEmail } from '../../../lib/email.mjs'
import { buildMagicLinkEmail } from '../../../lib/emailTemplates.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, redirect_uri } = req.body

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }

    const emailLower = email.trim().toLowerCase()

    // Check for admin alias
    const aliasEmail = process.env.SSO_ADMIN_ALIAS_EMAIL || 'sso@doneisbetter.com'
    const searchEmail = emailLower === 'admin' ? aliasEmail : emailLower

    // Find user
    const user = await findUserByEmail(searchEmail)

    // SECURITY: Always return success even if user not found
    // WHY: Prevents email enumeration attacks
    if (!user) {
      logger.warn('Magic link requested for non-existent admin', {
        event: 'magic_link_not_found',
        email: searchEmail,
      })
      return res.status(200).json({
        success: true,
        message: 'If an admin account exists with this email, you will receive a magic link shortly'
      })
    }

    // Generate magic link token (15 minutes TTL)
    // Include redirect_uri in token so user returns to original site after login
    const { token, expiresAt } = await createMagicToken(user.email, 900, redirect_uri || null)

    // Build magic link URL
    const SSO_BASE_URL = process.env.SSO_BASE_URL || 'http://localhost:3000'
    const magicLink = `${SSO_BASE_URL}/api/admin/magic-login?token=${encodeURIComponent(token)}`

    // Send email with magic link
    const emailContent = buildMagicLinkEmail({
      userType: 'admin',
      email: user.email,
      magicLink,
    })

    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
    })

    logger.info('Admin magic link sent', {
      event: 'magic_link_sent',
      userId: user.id,
      email: user.email,
      expiresAt,
    })

    return res.status(200).json({
      success: true,
      message: 'If an admin account exists with this email, you will receive a magic link shortly'
    })

  } catch (error) {
    logger.error('Magic link request error', {
      event: 'magic_link_error',
      error: error.message,
      stack: error.stack,
    })

    // Generic error to avoid information leakage
    return res.status(200).json({
      success: true,
      message: 'If an admin account exists with this email, you will receive a magic link shortly'
    })
  }
}
