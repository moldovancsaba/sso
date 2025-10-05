/**
 * lib/passwordReset.mjs — Password reset token service
 * WHAT: Manages issuing and consuming time-limited, single-use password reset tokens for all user types.
 * WHY: Secure token lifecycle with HMAC-SHA256 signing, sha256 token storage, and single-use enforcement.
 */
import crypto from 'crypto'
import { randomUUID } from 'crypto'
import { getDb } from './db.mjs'
import logger from './logger.mjs'

/**
 * WHAT: Get password reset token TTL from environment
 * WHY: Configurable expiry time; default 15 minutes (900 seconds)
 */
const PASSWORD_RESET_TTL = parseInt(process.env.PASSWORD_RESET_TOKEN_TTL || '900', 10)

/**
 * WHAT: Reuse existing admin magic link secret for HMAC signing
 * WHY: Avoid proliferating secrets; ADMIN_MAGIC_SECRET is already secure and established
 */
const HMAC_SECRET = process.env.ADMIN_MAGIC_SECRET

/**
 * b64urlEncode
 * WHAT: Encodes buffer to base64url format (no padding, URL-safe).
 * WHY: Tokens must be URL-safe for links; base64url is standard for web tokens.
 * 
 * @param {Buffer|string} input - Data to encode
 * @returns {string} - Base64url encoded string
 */
function b64urlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/**
 * b64urlDecode
 * WHAT: Decodes base64url string to buffer.
 * WHY: Reverse of encoding; required to extract token payload and signature.
 * 
 * @param {string} input - Base64url encoded string
 * @returns {Buffer} - Decoded buffer
 */
function b64urlDecode(input) {
  const pad = input.length % 4 === 2 ? '==' : input.length % 4 === 3 ? '=' : ''
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  return Buffer.from(base64, 'base64')
}

/**
 * sign
 * WHAT: Creates HMAC-SHA256 signature of payload.
 * WHY: Prevents token tampering; only server with HMAC_SECRET can create valid tokens.
 * 
 * @param {string} payload - String to sign
 * @param {string} secret - HMAC secret key
 * @returns {Buffer} - HMAC-SHA256 signature
 */
function sign(payload, secret) {
  const h = crypto.createHmac('sha256', secret)
  h.update(payload)
  return h.digest()
}

/**
 * hash
 * WHAT: Creates SHA256 hash of input.
 * WHY: Store tokenHash instead of raw token in DB; prevents token leakage from DB dumps.
 * 
 * @param {string} input - String to hash
 * @returns {string} - Hex-encoded SHA256 hash
 */
function hash(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * issue
 * WHAT: Issues a new password reset token for a user.
 * WHY: Generates secure, time-limited, single-use token stored in database.
 * 
 * @param {Object} params
 * @param {string} params.userType - 'admin' | 'public' | 'org'
 * @param {string} params.userId - User's UUID
 * @param {string} params.email - User's email (lowercased)
 * @param {string} [params.orgId] - Organization UUID (required for org users)
 * @param {number} [params.ttl] - Token lifetime in seconds (default: PASSWORD_RESET_TTL)
 * @param {Object} [params.meta] - Additional metadata (ip, userAgent)
 * @returns {Promise<Object>} - { token, jti, exp }
 * @throws {Error} - If HMAC_SECRET is missing or parameters are invalid
 */
export async function issue({ userType, userId, email, orgId, ttl = PASSWORD_RESET_TTL, meta = {} }) {
  // WHAT: Validate HMAC secret is configured
  // WHY: Cannot create secure tokens without secret
  if (!HMAC_SECRET) {
    throw new Error('ADMIN_MAGIC_SECRET is required for password reset tokens')
  }

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
    throw new Error('orgId is required for org user password reset')
  }

  const now = new Date()
  const exp = new Date(now.getTime() + ttl * 1000)
  const jti = randomUUID()

  // WHAT: Build canonical payload string
  // WHY: Consistent format for signing; includes all essential token data
  const payloadParts = [jti, userType, 'password_reset', exp.toISOString()]
  if (orgId) payloadParts.push(orgId)
  const payloadString = payloadParts.join('.')

  // WHAT: Create HMAC-SHA256 signature
  // WHY: Proves token was issued by server; prevents forgery
  const payloadPart = b64urlEncode(payloadString)
  const sigPart = b64urlEncode(sign(payloadPart, HMAC_SECRET))
  const token = `${payloadPart}.${sigPart}`

  // WHAT: Hash the full token for database storage
  // WHY: Storing tokenHash instead of raw token prevents leakage from DB
  const tokenHash = hash(token)

  // WHAT: Store token metadata in database
  // WHY: Single-use enforcement, expiry tracking, audit trail
  const db = await getDb()
  const col = db.collection('passwordResetTokens')
  
  // WHAT: Ensure indexes exist (defensive, migration should have created them)
  try {
    await col.createIndex({ tokenHash: 1 }, { unique: true })
    await col.createIndex({ jti: 1 }, { unique: true })
  } catch {}

  const doc = {
    jti,
    tokenHash,
    userType,
    userId,
    orgId: orgId || null,
    email: email.toLowerCase(),
    purpose: 'password_reset',
    exp: exp.toISOString(),
    expTs: exp, // Date object for TTL index
    usedAt: null,
    createdAt: now.toISOString(),
    createdByIp: meta.ip || null,
    userAgent: meta.userAgent || null,
  }

  await col.insertOne(doc)

  // WHAT: Log token issuance (mask token for security)
  // WHY: Audit trail; security monitoring
  logger.info('Password reset token issued', {
    event: 'password_reset_token_issued',
    jti,
    userType,
    userId,
    email: email.toLowerCase(),
    orgId: orgId || null,
    exp: exp.toISOString(),
    ttl,
    timestamp: now.toISOString(),
    ...meta,
  })

  return { token, jti, exp: exp.toISOString() }
}

/**
 * consume
 * WHAT: Validates and consumes a password reset token (single-use).
 * WHY: Secure token validation with signature check, expiry check, and usage tracking.
 * 
 * @param {string} token - Password reset token to validate
 * @returns {Promise<Object>} - Token document from database
 * @throws {Error} - If token is invalid, expired, already used, or signature fails
 */
export async function consume(token) {
  // WHAT: Validate HMAC secret is configured
  // WHY: Cannot verify tokens without secret
  if (!HMAC_SECRET) {
    throw new Error('ADMIN_MAGIC_SECRET is required to verify password reset tokens')
  }

  // WHAT: Validate token format
  // WHY: Fail fast on malformed tokens
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Invalid token format')
  }

  const [payloadPart, sigPart] = token.split('.')
  
  // WHAT: Verify HMAC signature
  // WHY: Ensures token was issued by this server; prevents forgery
  const expectedSig = b64urlEncode(sign(payloadPart, HMAC_SECRET))
  if (sigPart !== expectedSig) {
    logger.warn('Password reset token signature verification failed', {
      event: 'password_reset_token_invalid_signature',
      timestamp: new Date().toISOString(),
    })
    throw new Error('Invalid token signature')
  }

  // WHAT: Decode and parse payload
  // WHY: Extract token claims for validation
  let payloadString
  try {
    payloadString = b64urlDecode(payloadPart).toString('utf8')
  } catch {
    throw new Error('Invalid token payload')
  }

  const parts = payloadString.split('.')
  if (parts.length < 4) {
    throw new Error('Invalid token payload structure')
  }

  const [jti, userType, purpose, expStr, orgId] = parts

  // WHAT: Validate purpose
  // WHY: Ensure token is for password reset (not email verification or other)
  if (purpose !== 'password_reset') {
    throw new Error('Invalid token purpose')
  }

  // WHAT: Check expiry
  // WHY: Tokens must expire for security
  const now = new Date()
  const exp = new Date(expStr)
  if (now > exp) {
    logger.warn('Password reset token expired', {
      event: 'password_reset_token_expired',
      jti,
      userType,
      exp: expStr,
      timestamp: now.toISOString(),
    })
    throw new Error('Token has expired')
  }

  // WHAT: Lookup token in database by tokenHash
  // WHY: Verify token exists and check single-use status
  const tokenHash = hash(token)
  const db = await getDb()
  const col = db.collection('passwordResetTokens')
  const doc = await col.findOne({ tokenHash })

  if (!doc) {
    logger.warn('Password reset token not found', {
      event: 'password_reset_token_not_found',
      jti,
      timestamp: now.toISOString(),
    })
    throw new Error('Token not found')
  }

  // WHAT: Check if token already used
  // WHY: Single-use enforcement; prevent replay attacks
  if (doc.usedAt) {
    logger.warn('Password reset token already used', {
      event: 'password_reset_token_already_used',
      jti,
      userType: doc.userType,
      usedAt: doc.usedAt,
      timestamp: now.toISOString(),
    })
    throw new Error('Token has already been used')
  }

  // WHAT: Mark token as used (single-use enforcement)
  // WHY: Prevent token reuse; security requirement
  await col.updateOne(
    { tokenHash },
    { $set: { usedAt: now.toISOString() } }
  )

  // WHAT: Log successful token consumption
  // WHY: Audit trail; security monitoring
  logger.info('Password reset token consumed', {
    event: 'password_reset_token_consumed',
    jti: doc.jti,
    userType: doc.userType,
    userId: doc.userId,
    email: doc.email,
    orgId: doc.orgId,
    timestamp: now.toISOString(),
  })

  return doc
}

/**
 * invalidateByUser
 * WHAT: Invalidates all password reset tokens for a specific user.
 * WHY: Security measure; when password is changed, invalidate pending reset tokens.
 * 
 * @param {string} userId - User's UUID
 * @returns {Promise<number>} - Number of tokens invalidated
 */
export async function invalidateByUser(userId) {
  const now = new Date().toISOString()
  const db = await getDb()
  const col = db.collection('passwordResetTokens')

  // WHAT: Mark all user's tokens as used
  // WHY: Prevent use of old reset tokens after password change
  const result = await col.updateMany(
    { userId, usedAt: null },
    { $set: { usedAt: now } }
  )

  if (result.modifiedCount > 0) {
    logger.info('Password reset tokens invalidated', {
      event: 'password_reset_tokens_invalidated',
      userId,
      count: result.modifiedCount,
      timestamp: now,
    })
  }

  return result.modifiedCount
}
