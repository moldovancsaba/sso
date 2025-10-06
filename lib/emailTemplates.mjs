/**
 * lib/emailTemplates.mjs — Plain text email templates
 * WHAT: Centralized email template builder for all user types and email purposes.
 * WHY: Consistency, reusability, and easy updates to email content across the application.
 */

/**
 * WHAT: Get base URL from environment variable
 * WHY: All email links must use the correct SSO base URL (production or development)
 */
const SSO_BASE_URL = process.env.SSO_BASE_URL || 'http://localhost:3000'

/**
 * WHAT: Get configured TTL values for display in emails
 * WHY: Users need to know how long tokens are valid
 */
const PASSWORD_RESET_TTL = parseInt(process.env.PASSWORD_RESET_TOKEN_TTL || '900', 10)
const EMAIL_VERIFICATION_TTL = parseInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL || '86400', 10)

/**
 * formatDuration
 * WHAT: Converts seconds to human-readable duration (e.g., "15 minutes", "24 hours").
 * WHY: Email recipients need to understand token expiry in clear terms.
 * 
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Human-readable duration
 */
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''}`
}

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
 * buildPasswordResetEmail
 * WHAT: Builds password reset email content for any user type.
 * WHY: Unified template ensures consistent UX across all user types.
 * 
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.email - Recipient email address
 * @param {string} params.token - Password reset token
 * @param {string} [params.orgId] - Organization ID (for org users only)
 * @returns {Object} - { subject, text }
 */
export function buildPasswordResetEmail({ userType, email, token, orgId }) {
  const typeLabel = getUserTypeLabel(userType)
  const duration = formatDuration(PASSWORD_RESET_TTL)
  
  // WHAT: Build password reset URL based on user type
  // WHY: Different user types have different password reset UI routes
  let resetUrl
  switch (userType) {
    case 'admin':
      resetUrl = `${SSO_BASE_URL}/admin/password-reset?token=${encodeURIComponent(token)}`
      break
    case 'public':
      resetUrl = `${SSO_BASE_URL}/password-reset?token=${encodeURIComponent(token)}`
      break
    case 'org':
      resetUrl = `${SSO_BASE_URL}/orgs/${orgId}/password-reset?token=${encodeURIComponent(token)}`
      break
    default:
      resetUrl = `${SSO_BASE_URL}/password-reset?token=${encodeURIComponent(token)}`
  }

  const subject = `Reset Your ${typeLabel} Password`

  // WHAT: Plain text email body with clear instructions
  // WHY: Plain text is more reliable, better for accessibility, and avoids spam filters
  const text = `Hello,

You requested to reset your password for your ${typeLabel} account (${email}).

To reset your password, please click the link below or copy and paste it into your browser:

${resetUrl}

This link will expire in ${duration} and can only be used once.

If you did not request a password reset, please ignore this email. Your password will not be changed.

For security reasons, do not share this link with anyone.

---
${process.env.EMAIL_FROM_NAME || 'SSO Service'}
This is an automated message. Please do not reply to this email.`

  return { subject, text }
}

/**
 * buildEmailVerificationEmail
 * WHAT: Builds email verification email content for any user type.
 * WHY: Email ownership verification is required for security and account recovery.
 * 
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.email - Recipient email address
 * @param {string} params.token - Email verification token
 * @param {string} [params.orgId] - Organization ID (for org users only)
 * @returns {Object} - { subject, text }
 */
export function buildEmailVerificationEmail({ userType, email, token, orgId }) {
  const typeLabel = getUserTypeLabel(userType)
  const duration = formatDuration(EMAIL_VERIFICATION_TTL)
  
  // WHAT: Build verification URL based on user type (GET endpoint, triggers redirect)
  // WHY: Single-click verification; GET request allows email client preview safety
  let verificationUrl
  switch (userType) {
    case 'admin':
      verificationUrl = `${SSO_BASE_URL}/api/admin/email-verification/confirm?token=${encodeURIComponent(token)}`
      break
    case 'public':
      verificationUrl = `${SSO_BASE_URL}/api/public/email-verification/confirm?token=${encodeURIComponent(token)}`
      break
    case 'org':
      verificationUrl = `${SSO_BASE_URL}/api/admin/orgs/${orgId}/email-verification/confirm?token=${encodeURIComponent(token)}`
      break
    default:
      verificationUrl = `${SSO_BASE_URL}/api/public/email-verification/confirm?token=${encodeURIComponent(token)}`
  }

  const subject = `Verify Your ${typeLabel} Email Address`

  // WHAT: Plain text email body with verification link
  // WHY: Clear call to action; explains consequences of not verifying
  const text = `Hello,

Thank you for creating your ${typeLabel} account with ${email}.

To complete your registration and verify your email address, please click the link below:

${verificationUrl}

This verification link will expire in ${duration} and can only be used once.

Verifying your email address allows you to:
- Recover your account if you forget your password
- Receive important account notifications
- Confirm your identity

If you did not create an account, please ignore this email.

---
${process.env.EMAIL_FROM_NAME || 'SSO Service'}
This is an automated message. Please do not reply to this email.`

  return { subject, text }
}

/**
 * buildPasswordResetSuccessEmail
 * WHAT: Builds notification email sent after successful password reset.
 * WHY: Security notification; alerts user if password was changed without their knowledge.
 * 
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.email - Recipient email address
 * @returns {Object} - { subject, text }
 */
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

export function buildPasswordResetSuccessEmail({ userType, email }) {
  const typeLabel = getUserTypeLabel(userType)
  const timestamp = new Date().toISOString()

  const subject = `Your ${typeLabel} Password Has Been Reset`

  // WHAT: Security notification with timestamp
  // WHY: User should know when password was changed; provides audit trail
  const text = `Hello,

This is to confirm that your password for your ${typeLabel} account (${email}) was successfully reset on ${timestamp}.

If you made this change, no further action is needed.

If you did not reset your password, please contact support immediately and secure your account.

For security, we recommend:
- Using a strong, unique password
- Not sharing your password with anyone
- Enabling additional security features if available

---
${process.env.EMAIL_FROM_NAME || 'SSO Service'}
This is an automated message. Please do not reply to this email.`

  return { subject, text }
}

/**
 * buildWelcomeAfterVerificationEmail
 * WHAT: Builds welcome email sent after successful email verification.
 * WHY: Positive UX; confirms account is fully activated.
 * 
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.email - Recipient email address
 * @param {string} [params.name] - User's name (optional)
 * @returns {Object} - { subject, text }
 */
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

export function buildWelcomeAfterVerificationEmail({ userType, email, name }) {
  const typeLabel = getUserTypeLabel(userType)
  const greeting = name ? `Hello ${name}` : 'Hello'

  const subject = `Welcome! Your ${typeLabel} Email Is Verified`

  // WHAT: Welcoming message confirming verification
  // WHY: Positive reinforcement; clear next steps
  const text = `${greeting},

Your email address (${email}) has been successfully verified!

Your ${typeLabel} account is now fully activated and ready to use.

You can now:
- Access all features of your account
- Receive important notifications
- Reset your password if needed

Thank you for verifying your email address.

If you have any questions or need assistance, please contact support.

---
${process.env.EMAIL_FROM_NAME || 'SSO Service'}
This is an automated message. Please do not reply to this email.`

  return { subject, text }
}
