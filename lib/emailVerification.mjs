/**
 * lib/emailVerification.mjs — Email verification service
 * WHAT: Wrapper around lib/magic.mjs for email verification tokens across all user types.
 * WHY: Clean API for email verification; reuses existing magic link infrastructure for consistency.
 * 
 * NOTE: This module wraps lib/magic.mjs functionality with typ='email_verification'.
 * We reuse the existing adminMagicTokens collection for backward compatibility and
 * to avoid duplicating token management infrastructure.
 */
import { createMagicToken, consumeMagicToken } from './magic.mjs'
import logger from './logger.mjs'

/**
 * WHAT: Get email verification token TTL from environment
 * WHY: Configurable expiry time; default 24 hours (86400 seconds)
 */
const EMAIL_VERIFICATION_TTL = parseInt(process.env.EMAIL_VERIFICATION_TOKEN_TTL || '86400', 10)

/**
 * issue
 * WHAT: Issues a new email verification token for a user.
 * WHY: Generates secure, time-limited, single-use token for email ownership verification.
 * 
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.userId - User's UUID
 * @param {string} params.email - User's email (will be lowercased)
 * @param {string} [params.orgId] - Organization UUID (required for org users)
 * @param {number} [params.ttl] - Token lifetime in seconds (default: EMAIL_VERIFICATION_TTL)
 * @returns {Promise<Object>} - { token, jti, exp }
 * @throws {Error} - If parameters are invalid
 */
export async function issue({ userType, userId, email, orgId, ttl = EMAIL_VERIFICATION_TTL }) {
  // WHAT: Validate required parameters
  // WHY: Fail fast on invalid input
  if (!userType || !['admin', 'public', 'org'].includes(userType)) {
    throw new Error('Invalid userType: must be admin, public, or org')
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid userId')
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Invalid email')
  }
  if (userType === 'org' && !orgId) {
    throw new Error('orgId is required for org user email verification')
  }

  // WHAT: Create magic token with typ='email_verification'
  // WHY: Reuse proven magic link infrastructure; add userType/userId/orgId for verification
  const result = await createMagicToken(email, ttl, {
    typ: 'email_verification',
    userType,
    userId,
    orgId,
  })

  // WHAT: Log email verification token issuance
  // WHY: Audit trail; security monitoring
  logger.info('Email verification token issued', {
    event: 'email_verification_token_issued',
    jti: result.jti,
    userType,
    userId,
    email: email.toLowerCase(),
    orgId: orgId || null,
    exp: result.expiresAt,
    ttl,
    timestamp: new Date().toISOString(),
  })

  return {
    token: result.token,
    jti: result.jti,
    exp: result.expiresAt,
  }
}

/**
 * consume
 * WHAT: Validates and consumes an email verification token (single-use).
 * WHY: Secure token validation with signature check, expiry check, and usage tracking.
 * 
 * @param {string} token - Email verification token to validate
 * @returns {Promise<Object>} - Token payload from magic link { ok: true, payload }
 * @throws {Error} - If token is invalid, expired, or already used
 */
export async function consume(token) {
  // WHAT: Consume the magic token
  // WHY: Reuse existing validation logic; returns payload or throws error
  const result = await consumeMagicToken(token)

  if (!result.ok) {
    // WHAT: Log failed verification attempt
    // WHY: Security monitoring; detect potential attacks
    logger.warn('Email verification token consumption failed', {
      event: 'email_verification_token_failed',
      error: result.error,
      timestamp: new Date().toISOString(),
    })
    throw new Error(result.error || 'Token validation failed')
  }

  // WHAT: Validate token type is email_verification
  // WHY: Ensure token was issued for email verification, not admin magic login
  if (result.payload.typ !== 'email_verification') {
    logger.warn('Invalid token type for email verification', {
      event: 'email_verification_invalid_type',
      typ: result.payload.typ,
      timestamp: new Date().toISOString(),
    })
    throw new Error('Invalid token type')
  }

  // WHAT: Log successful email verification token consumption
  // WHY: Audit trail; security monitoring
  logger.info('Email verification token consumed', {
    event: 'email_verification_token_consumed',
    jti: result.payload.jti,
    email: result.payload.email,
    timestamp: new Date().toISOString(),
  })

  return result.payload
}
