/**
 * OAuth2/OIDC Token Generation Module
 * 
 * Handles generation and verification of:
 * - JWT access tokens (RS256 signature)
 * - OIDC ID tokens (RS256 signature with user claims)
 * - Refresh tokens (with rotation support)
 * 
 * Security:
 * - Access tokens are stateless JWTs signed with RSA private key
 * - Refresh tokens are stored hashed in database with rotation tracking
 * - ID tokens include standard OIDC claims
 * - All tokens include jti (JWT ID) for revocation support
 */

import jwt from 'jsonwebtoken'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { randomBytes, createHash } from 'crypto'
import { getDb } from '../db.mjs'
import logger from '../logger.mjs'
import { findUserById } from '../users.mjs'

// Load RSA keys (lazy load to avoid errors at import time)
let PRIVATE_KEY = null
let PUBLIC_KEY = null

/**
 * Load RSA keys from filesystem
 * 
 * Keys are loaded lazily to avoid issues during cold starts or if keys don't exist yet.
 */
/**
 * Load RSA keys from environment variables or filesystem
 * 
 * WHAT: Tries environment variables first, then falls back to filesystem
 * WHY: Vercel and other serverless platforms use environment variables for secrets
 * HOW: Check JWT_PRIVATE_KEY and JWT_PUBLIC_KEY env vars, then try reading from keys/ directory
 * 
 * Keys are loaded lazily to avoid issues during cold starts or if keys don't exist yet.
 */
function loadKeys() {
  if (PRIVATE_KEY && PUBLIC_KEY) {
    return { PRIVATE_KEY, PUBLIC_KEY }
  }

  // WHAT: Try loading keys from environment variables first (for serverless deployments)
  // WHY: Vercel, AWS Lambda, etc. don't have persistent filesystem but support env vars
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    try {
      // WHAT: Environment variables may have escaped newlines, convert them to real newlines
      // WHY: Vercel/GitHub Secrets often escape newlines as \n literal strings
      PRIVATE_KEY = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
      PUBLIC_KEY = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
      
      logger.info('RSA keys loaded from environment variables')
      return { PRIVATE_KEY, PUBLIC_KEY }
    } catch (error) {
      logger.warn('Failed to load RSA keys from environment variables', { error: error.message })
      // Fall through to filesystem loading
    }
  }

  // WHAT: Fall back to loading keys from filesystem (for local development)
  // WHY: Local dev uses files, production uses env vars
  try {
    const keysDir = resolve(process.cwd(), 'keys')
    const privateKeyPath = resolve(keysDir, 'private.pem')
    const publicKeyPath = resolve(keysDir, 'public.pem')
    
    if (existsSync(privateKeyPath) && existsSync(publicKeyPath)) {
      PRIVATE_KEY = readFileSync(privateKeyPath, 'utf8')
      PUBLIC_KEY = readFileSync(publicKeyPath, 'utf8')
      
      logger.info('RSA keys loaded from filesystem')
      return { PRIVATE_KEY, PUBLIC_KEY }
    }
  } catch (error) {
    logger.warn('Failed to load RSA keys from filesystem', { error: error.message })
  }

  // WHAT: No keys found - throw helpful error
  // WHY: Without keys, OAuth cannot work at all
  throw new Error(
    'Failed to load RSA keys. ' +
    'Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY environment variables, ' +
    'OR create keys locally: ' +
    'openssl genrsa -out keys/private.pem 2048 && openssl rsa -in keys/private.pem -pubout -out keys/public.pem'
  )
}

// Token configuration
const JWT_ISSUER = process.env.JWT_ISSUER || process.env.SSO_BASE_URL || 'https://sso.doneisbetter.com'
const JWT_KEY_ID = process.env.JWT_KEY_ID || 'sso-2025'
const ACCESS_TOKEN_LIFETIME = parseInt(process.env.OAUTH2_ACCESS_TOKEN_LIFETIME || '3600', 10) // 1 hour
const REFRESH_TOKEN_LIFETIME = parseInt(process.env.OAUTH2_REFRESH_TOKEN_LIFETIME || '2592000', 10) // 30 days

/**
 * Generate JWT access token
 * 
 * Access tokens are stateless JWTs that can be verified by any service with the public key.
 * They contain minimal claims to keep size small.
 * 
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.clientId - Client ID
 * @param {string} params.scope - Space-separated scopes
 * @param {number} [params.expiresIn] - Token lifetime in seconds (default: 3600)
 * @returns {Promise<{token: string, jti: string, expiresAt: string}>}
 */
export async function generateAccessToken(params) {
  const { userId, clientId, scope, expiresIn = ACCESS_TOKEN_LIFETIME } = params

  if (!userId || !clientId || !scope) {
    throw new Error('userId, clientId, and scope are required')
  }

  const { PRIVATE_KEY } = loadKeys()
  const jti = randomBytes(16).toString('hex') // Unique token ID for revocation
  const now = Math.floor(Date.now() / 1000)
  const exp = now + expiresIn

  const payload = {
    iss: JWT_ISSUER, // Issuer
    sub: userId, // Subject (user ID)
    aud: clientId, // Audience (client ID)
    exp, // Expiration time
    iat: now, // Issued at
    jti, // JWT ID (for revocation)
    scope, // Granted scopes
    client_id: clientId,
    token_type: 'access_token',
  }

  try {
    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'RS256',
      keyid: JWT_KEY_ID,
    })

    const expiresAt = new Date(exp * 1000).toISOString()

    logger.info('Access token generated', {
      jti,
      userId,
      clientId,
      scope,
      expiresAt,
    })

    return { token, jti, expiresAt }
  } catch (error) {
    logger.error('Failed to generate access token', {
      error: error.message,
      userId,
      clientId,
    })
    throw error
  }
}

/**
 * Generate OIDC ID token
 * 
 * ID tokens are JWTs containing user identity information.
 * They follow OpenID Connect standard claims.
 * 
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.clientId - Client ID
 * @param {string} params.scope - Space-separated scopes
 * @param {number} [params.expiresIn] - Token lifetime in seconds (default: 3600)
 * @returns {Promise<{token: string, jti: string, expiresAt: string}>}
 */
export async function generateIdToken(params) {
  const { userId, clientId, scope, expiresIn = ACCESS_TOKEN_LIFETIME } = params

  if (!userId || !clientId) {
    throw new Error('userId and clientId are required')
  }

  // Fetch user data for claims
  const user = await findUserById(userId)
  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const { PRIVATE_KEY } = loadKeys()
  const jti = randomBytes(16).toString('hex')
  const now = Math.floor(Date.now() / 1000)
  const exp = now + expiresIn

  // Standard OIDC claims
  const payload = {
    iss: JWT_ISSUER,
    sub: userId,
    aud: clientId,
    exp,
    iat: now,
    jti,
  }

  // Add claims based on requested scopes
  const scopes = scope.split(' ')

  if (scopes.includes('profile')) {
    payload.name = user.name
    payload.updated_at = user.updatedAt || user.updated_at
  }

  if (scopes.includes('email')) {
    payload.email = user.email
    payload.email_verified = true // We assume email is verified since it's our SSO
  }

  try {
    const token = jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'RS256',
      keyid: JWT_KEY_ID,
    })

    const expiresAt = new Date(exp * 1000).toISOString()

    logger.info('ID token generated', {
      jti,
      userId,
      clientId,
      scope,
      expiresAt,
    })

    return { token, jti, expiresAt }
  } catch (error) {
    logger.error('Failed to generate ID token', {
      error: error.message,
      userId,
      clientId,
    })
    throw error
  }
}

/**
 * Generate refresh token
 * 
 * Refresh tokens are long-lived tokens stored in the database.
 * They are hashed before storage and support rotation (new token issued on each use).
 * 
 * @param {Object} params
 * @param {string} params.userId - User UUID
 * @param {string} params.clientId - Client ID
 * @param {string} params.scope - Space-separated scopes
 * @param {string} [params.accessTokenJti] - JTI of associated access token
 * @param {string} [params.parentToken] - Parent refresh token (for rotation tracking)
 * @param {number} [params.expiresIn] - Token lifetime in seconds (default: 30 days)
 * @returns {Promise<{token: string, tokenHash: string, expiresAt: string}>}
 */
export async function generateRefreshToken(params) {
  const {
    userId,
    clientId,
    scope,
    accessTokenJti = null,
    parentToken = null,
    expiresIn = REFRESH_TOKEN_LIFETIME,
  } = params

  if (!userId || !clientId || !scope) {
    throw new Error('userId, clientId, and scope are required')
  }

  // Generate secure random token (256 bits)
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiresIn * 1000)

  const refreshToken = {
    token: tokenHash, // Store hashed version
    client_id: clientId,
    user_id: userId,
    scope,
    access_token_jti: accessTokenJti,
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
    revoke_reason: null,
    parent_token: parentToken, // For rotation tracking
    created_at: now.toISOString(),
    last_used_at: null,
  }

  try {
    const db = await getDb()
    await db.collection('refreshTokens').insertOne(refreshToken)

    // Create indexes if they don't exist
    await db.collection('refreshTokens').createIndex({ token: 1 }, { unique: true })
    await db.collection('refreshTokens').createIndex({ user_id: 1 })
    await db.collection('refreshTokens').createIndex({ client_id: 1 })
    await db.collection('refreshTokens').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

    logger.info('Refresh token generated', {
      tokenHash: tokenHash.substring(0, 16) + '...',
      userId,
      clientId,
      scope,
      expiresAt: refreshToken.expires_at,
    })

    // Return plaintext token (only time it's visible)
    return {
      token,
      tokenHash,
      expiresAt: refreshToken.expires_at,
    }
  } catch (error) {
    logger.error('Failed to generate refresh token', {
      error: error.message,
      userId,
      clientId,
    })
    throw error
  }
}

/**
 * Verify and decode JWT access token
 * 
 * @param {string} token - JWT access token
 * @returns {Promise<Object|null>} - Decoded token payload or null if invalid
 */
export async function verifyAccessToken(token) {
  if (!token) {
    return null
  }

  try {
    const { PUBLIC_KEY } = loadKeys()

    const decoded = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: JWT_ISSUER,
    })

    // Check if token is in revocation list
    const isRevoked = await isTokenRevoked(decoded.jti)
    if (isRevoked) {
      logger.warn('Access token is revoked', { jti: decoded.jti })
      return null
    }

    return decoded
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Access token expired', { token: token.substring(0, 20) + '...' })
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid access token', { error: error.message })
    } else {
      logger.error('Failed to verify access token', { error: error.message })
    }
    return null
  }
}

/**
 * Verify refresh token and retrieve metadata
 * 
 * @param {string} token - Plaintext refresh token
 * @returns {Promise<Object|null>} - Token metadata or null if invalid/expired/revoked
 */
export async function verifyRefreshToken(token) {
  if (!token) {
    return null
  }

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const db = await getDb()

    const refreshToken = await db.collection('refreshTokens').findOne({ token: tokenHash })

    if (!refreshToken) {
      logger.warn('Refresh token not found', {
        tokenHash: tokenHash.substring(0, 16) + '...',
      })
      return null
    }

    // Check if revoked
    if (refreshToken.revoked_at) {
      logger.warn('Refresh token is revoked', {
        tokenHash: tokenHash.substring(0, 16) + '...',
        revoked_at: refreshToken.revoked_at,
        reason: refreshToken.revoke_reason,
      })
      return null
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(refreshToken.expires_at)
    if (now > expiresAt) {
      logger.warn('Refresh token expired', {
        tokenHash: tokenHash.substring(0, 16) + '...',
        expires_at: refreshToken.expires_at,
      })
      return null
    }

    // Update last_used_at
    await db.collection('refreshTokens').updateOne(
      { token: tokenHash },
      { $set: { last_used_at: now.toISOString() } }
    )

    return refreshToken
  } catch (error) {
    logger.error('Failed to verify refresh token', { error: error.message })
    return null
  }
}

/**
 * Rotate refresh token (issue new one, revoke old one)
 * 
 * @param {string} oldToken - Current refresh token
 * @param {string} accessTokenJti - JTI of new access token
 * @returns {Promise<Object|null>} - New tokens or null if old token invalid
 */
export async function rotateRefreshToken(oldToken, accessTokenJti) {
  if (!oldToken) {
    throw new Error('oldToken is required')
  }

  try {
    const oldTokenData = await verifyRefreshToken(oldToken)

    if (!oldTokenData) {
      return null
    }

    // Revoke old token
    await revokeRefreshToken(oldToken, 'rotated')

    // Generate new refresh token
    const oldTokenHash = createHash('sha256').update(oldToken).digest('hex')
    const newToken = await generateRefreshToken({
      userId: oldTokenData.user_id,
      clientId: oldTokenData.client_id,
      scope: oldTokenData.scope,
      accessTokenJti,
      parentToken: oldTokenHash, // Track rotation chain
    })

    logger.info('Refresh token rotated', {
      oldTokenHash: oldTokenHash.substring(0, 16) + '...',
      newTokenHash: newToken.tokenHash.substring(0, 16) + '...',
      userId: oldTokenData.user_id,
      clientId: oldTokenData.client_id,
    })

    return newToken
  } catch (error) {
    logger.error('Failed to rotate refresh token', { error: error.message })
    throw error
  }
}

/**
 * Revoke refresh token
 * 
 * @param {string} token - Plaintext refresh token
 * @param {string} [reason] - Reason for revocation
 * @returns {Promise<boolean>} - True if revoked, false if not found
 */
export async function revokeRefreshToken(token, reason = 'manual') {
  if (!token) {
    throw new Error('token is required')
  }

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const db = await getDb()

    const result = await db.collection('refreshTokens').findOneAndUpdate(
      { token: tokenHash, revoked_at: null },
      {
        $set: {
          revoked_at: new Date().toISOString(),
          revoke_reason: reason,
        },
      },
      { returnDocument: 'after' }
    )

    if (result) {
      logger.info('Refresh token revoked', {
        tokenHash: tokenHash.substring(0, 16) + '...',
        reason,
        userId: result.user_id,
        clientId: result.client_id,
      })
      return true
    }

    return false
  } catch (error) {
    logger.error('Failed to revoke refresh token', { error: error.message })
    throw error
  }
}

/**
 * Revoke all refresh tokens for a user (on logout, password change, etc.)
 * 
 * @param {string} userId - User UUID
 * @param {string} [clientId] - Optional: only revoke tokens for specific client
 * @param {string} [reason] - Reason for revocation
 * @returns {Promise<number>} - Number of tokens revoked
 */
export async function revokeUserRefreshTokens(userId, clientId = null, reason = 'user_logout') {
  if (!userId) {
    throw new Error('userId is required')
  }

  try {
    const db = await getDb()
    const query = { user_id: userId, revoked_at: null }

    if (clientId) {
      query.client_id = clientId
    }

    const result = await db.collection('refreshTokens').updateMany(query, {
      $set: {
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
      },
    })

    logger.info('User refresh tokens revoked', {
      userId,
      clientId: clientId || 'all',
      count: result.modifiedCount,
      reason,
    })

    return result.modifiedCount
  } catch (error) {
    logger.error('Failed to revoke user refresh tokens', { error: error.message, userId })
    throw error
  }
}

/**
 * Check if access token JTI is revoked
 * 
 * For now, we check the associated refresh token.
 * In the future, we might maintain a separate revocation list for access tokens.
 * 
 * @param {string} jti - JWT ID
 * @returns {Promise<boolean>} - True if revoked, false otherwise
 */
async function isTokenRevoked(jti) {
  if (!jti) {
    return false
  }

  try {
    const db = await getDb()

    // Check if any refresh token with this access_token_jti is revoked
    const revokedRefreshToken = await db.collection('refreshTokens').findOne({
      access_token_jti: jti,
      revoked_at: { $ne: null },
    })

    return !!revokedRefreshToken
  } catch (error) {
    logger.error('Failed to check token revocation', { error: error.message, jti })
    return false // Fail open (don't block if check fails)
  }
}

/**
 * Get public key in PEM format (for JWKS endpoint)
 * 
 * @returns {string} - Public key PEM
 */
export function getPublicKey() {
  const { PUBLIC_KEY } = loadKeys()
  return PUBLIC_KEY
}

/**
 * Get public key in JWK format (for JWKS endpoint)
 * 
 * @returns {Object} - JWK object
 */
export function getPublicKeyJwk() {
  const { PUBLIC_KEY } = loadKeys()

  // Parse PEM to JWK (simplified - for production use a library like node-jose)
  // This is a basic implementation for RSA keys
  const jwk = {
    kty: 'RSA',
    use: 'sig',
    kid: JWT_KEY_ID,
    alg: 'RS256',
    // Note: For full JWK, you'd need to extract n (modulus) and e (exponent) from the key
    // For now, we'll implement this properly when setting up the JWKS endpoint
  }

  return jwk
}

/**
 * Decode JWT without verification (for debugging only)
 * 
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload (unverified)
 */
export function decodeToken(token) {
  if (!token) {
    return null
  }

  try {
    return jwt.decode(token)
  } catch (error) {
    logger.error('Failed to decode token', { error: error.message })
    return null
  }
}
