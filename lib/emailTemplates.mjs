/**
 * lib/emailTemplates.mjs — Plain text email templates
 * WHAT: Centralized email template builder for all user types and email purposes.
 * WHY: Consistency, reusability, and easy updates to email content across the application.
 *
 * NOTE: Only templates with live callers exist here. Password-reset-link,
 * email-verification, reset-success, and welcome-after-verification templates were
 * removed as dead code — nothing called them, and the verification template linked
 * to confirm endpoints that were never built. Email ownership is instead proven by
 * magic-link login (see pages/api/public/magic-login.js).
 */
import { getBaseUrl } from './baseUrl.mjs'

/**
 * getUserTypeLabel
 * WHAT: Returns human-readable label for user type.
 * WHY: Email text should be clear about the account type being managed.
 *
 * @param {string} userType - 'admin' | 'public' | 'org'
 * @returns {string} - Human-readable label
 */
function getUserTypeLabel(userType) {
  switch (userType) {
    case 'admin': return 'Admin'
    case 'public': return 'User'
    case 'org': return 'Organization'
    default: return 'Account'
  }
}

/**
 * buildLoginPinEmail
 * WHAT: Builds email containing 6-digit PIN for login verification.
 * WHY: Random security check to verify email ownership and prevent unauthorized access.
 *
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.email - Recipient email address
 * @param {string} params.pin - 6-digit PIN code
 * @returns {Object} - { subject, text }
 */
export function buildLoginPinEmail({ userType, email, pin }) {
  const typeLabel = getUserTypeLabel(userType)

  const subject = `Your ${typeLabel} Login Verification Code`

  // WHAT: Plain text email with PIN and expiry info
  // WHY: User needs PIN to complete login; must act quickly (5 minutes)
  const text = `Hello,

You are attempting to log in to your ${typeLabel} account (${email}).

For security purposes, please enter this verification code to complete your login:

${pin}

This code will expire in 5 minutes and can only be used once.
You have 3 attempts to enter the correct code.

If you did not attempt to log in, please ignore this email and consider changing your password.

---
${process.env.EMAIL_FROM_NAME || 'SSO Service'}
This is an automated message. Please do not reply to this email.`

  return { subject, text }
}

/**
 * buildMagicLinkEmail
 * WHAT: Builds email containing passwordless magic link for one-click login.
 * WHY: Provides convenient, secure authentication without remembering passwords.
 *
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.email - Recipient email address
 * @param {string} params.magicLink - Full magic link URL
 * @returns {Object} - { subject, text }
 */
export function buildMagicLinkEmail({ userType, email, magicLink }) {
  const typeLabel = getUserTypeLabel(userType)

  const subject = `Your ${typeLabel} Login Link`

  // WHAT: Email with magic link and security warnings
  // WHY: User needs one-click login; security awareness is critical
  const text = `Hello,

You requested a passwordless login link for your ${typeLabel} account (${email}).

Click the link below to log in instantly:

${magicLink}

⚠️ IMPORTANT:
- This link will expire in 15 minutes
- It can only be used once
- Do not share this link with anyone
- If you didn't request this, ignore this email

For your security:
- We will never ask you to share this link
- The link only works from your email address
- After using it once, you'll need to request a new one

If you did not request this login link, your account is still secure. Simply ignore this email.

---
${process.env.EMAIL_FROM_NAME || 'SSO Service'}
This is an automated message. Please do not reply to this email.`

  return { subject, text }
}

/**
 * buildForgotPasswordEmail
 * WHAT: Builds email with new auto-generated password for forgot password flow.
 * WHY: Users who forgot password need immediate access with a new secure password.
 *
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.email - Recipient email address
 * @param {string} params.newPassword - Auto-generated new password
 * @returns {Object} - { subject, text }
 */
export function buildForgotPasswordEmail({ userType, email, newPassword }) {
  const typeLabel = getUserTypeLabel(userType)
  const SSO_BASE_URL = getBaseUrl()

  const subject = `Your New ${typeLabel} Password`

  // WHAT: Email containing new password with security recommendations
  // WHY: User needs immediate access but should change password soon
  const text = `Hello,

You requested a password reset for your ${typeLabel} account (${email}).

Your new password is:

${newPassword}

⚠️ IMPORTANT SECURITY NOTES:
- This password was automatically generated
- We recommend changing it to something memorable after logging in
- Keep this password secure and do not share it with anyone
- Delete this email after you've logged in and changed your password

To log in:
${userType === 'admin' ? `${SSO_BASE_URL}/admin` : `${SSO_BASE_URL}/login`}

If you did not request a password reset, please contact support immediately as someone may be trying to access your account.

---
${process.env.EMAIL_FROM_NAME || 'SSO Service'}
This is an automated message. Please do not reply to this email.`

  return { subject, text }
}
