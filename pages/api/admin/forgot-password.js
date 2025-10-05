/**
 * pages/api/admin/forgot-password.js - Admin forgot password endpoint
 * WHAT: Generates new password and emails it to admin user
 * WHY: Admins who forget their password need a way to regain access
 */

import { findUserByEmail } from '../../../lib/users.mjs'
import { getDb } from '../../../lib/db.mjs'
import { sendEmail } from '../../../lib/email.mjs'
import { buildForgotPasswordEmail } from '../../../lib/emailTemplates.mjs'
import { generateAdminPassword } from '../../../lib/passwordGenerator.mjs'
import logger from '../../../lib/logger.mjs'

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

    // Check for admin alias
    const aliasEmail = process.env.SSO_ADMIN_ALIAS_EMAIL || 'sso@doneisbetter.com'
    const searchEmail = emailLower === 'admin' ? aliasEmail : emailLower

    // Find user
    const user = await findUserByEmail(searchEmail)

    // SECURITY: Always return success even if user not found
    // WHY: Prevents email enumeration attacks
    if (!user) {
      logger.warn('Forgot password requested for non-existent admin', {
        event: 'forgot_password_not_found',
        email: searchEmail,
      })
      return res.status(200).json({ 
        success: true,
        message: 'If an account exists with this email, you will receive a password reset email shortly'
      })
    }

    // Generate new password (32-hex for admins)
    const newPassword = generateAdminPassword()

    // Update password in database
    const db = await getDb()
    await db.collection('users').updateOne(
      { email: user.email },
      {
        $set: {
          password: newPassword,
          updatedAt: new Date().toISOString(),
        }
      }
    )

    // Send email with new password
    const emailContent = buildForgotPasswordEmail({
      userType: 'admin',
      email: user.email,
      newPassword,
    })

    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
    })

    logger.info('Admin password reset via forgot password', {
      event: 'forgot_password_success',
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    })

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset email shortly'
    })

  } catch (error) {
    logger.error('Forgot password error', {
      event: 'forgot_password_error',
      error: error.message,
      stack: error.stack,
    })

    // Generic error to avoid information leakage
    return res.status(500).json({
      error: 'An error occurred. Please try again later.'
    })
  }
}
