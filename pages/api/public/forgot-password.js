/**
 * pages/api/public/forgot-password.js - Public user forgot password endpoint
 * WHAT: Generates new password and emails it to public user
 * WHY: Public users who forget their password need a way to regain access
 */

import { findPublicUserByEmail, updatePublicUserPassword } from '../../../lib/publicUsers.mjs'
import { sendEmail } from '../../../lib/email.mjs'
import { buildForgotPasswordEmail } from '../../../lib/emailTemplates.mjs'
import { generateStrongPassword } from '../../../lib/passwordGenerator.mjs'
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

    // Find user
    const user = await findPublicUserByEmail(emailLower)

    // SECURITY: Always return success even if user not found
    // WHY: Prevents email enumeration attacks
    if (!user) {
      logger.warn('Forgot password requested for non-existent public user', {
        event: 'forgot_password_not_found',
        email: emailLower,
        userType: 'public',
      })
      return res.status(200).json({ 
        success: true,
        message: 'If an account exists with this email, you will receive a password reset email shortly'
      })
    }

    // Generate new strong password
    const newPassword = generateStrongPassword(16)

    // Update password in database (will be bcrypt hashed)
    await updatePublicUserPassword(user.id, newPassword)

    // Send email with new password
    const emailContent = buildForgotPasswordEmail({
      userType: 'public',
      email: user.email,
      newPassword,
    })

    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      text: emailContent.text,
    })

    logger.info('Public user password reset via forgot password', {
      event: 'forgot_password_success',
      userId: user.id,
      email: user.email,
      userType: 'public',
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
      userType: 'public',
    })

    // Generic error to avoid information leakage
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset email shortly'
    })
  }
}
