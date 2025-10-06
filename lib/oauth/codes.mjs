/**
 * OAuth2 Authorization Codes Management
 * 
 * Handles short-lived authorization codes issued during the OAuth2 flow.
 * Codes are exchanged for tokens at the token endpoint.
 * 
 * Security:
 * - Codes are single-use only (marked as 'used' after first exchange)
 * - Short expiration time (10 minutes default)
 * - PKCE code_challenge validation required
 * - Redirect URI must match exactly
 */

import { randomBytes } from 'crypto'
import { getDb } from '../db.mjs'
import logger from '../logger.mjs'

// Default code lifetime: 10 minutes
const DEFAULT_CODE_LIFETIME_SECONDS = 600

/**
 * Generate a new authorization code
 * 
 * @param {Object} params
 * @param {string} params.client_id - Client ID
 * @param {string} params.user_id - User UUID
 * @param {string} params.redirect_uri - Redirect URI (must match token request)
 * @param {string} params.scope - Space-separated scopes
 * @param {string} [params.code_challenge] - PKCE code challenge (optional for confidential clients)
 * @param {string} [params.code_challenge_method] - PKCE method ('S256' or 'plain')
 * @param {number} [params.lifetime_seconds] - Code lifetime in seconds (default: 600)
 * @returns {Promise<string>} - The authorization code
 */
export async function createAuthorizationCode(params) {
  const {
    client_id,
    user_id,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method = 'S256',
    lifetime_seconds = DEFAULT_CODE_LIFETIME_SECONDS,
  } = params

  // Validation
  if (!client_id) {
    throw new Error('client_id is required')
  }
  if (!user_id) {
    throw new Error('user_id is required')
  }
  if (!redirect_uri) {
    throw new Error('redirect_uri is required')
  }
  if (!scope) {
    throw new Error('scope is required')
  }
  // WHAT: PKCE is now optional - validate only if provided
  // WHY: Confidential clients (server-side with client_secret) don't need PKCE
  if (code_challenge && code_challenge_method && !['S256', 'plain'].includes(code_challenge_method)) {
    throw new Error('code_challenge_method must be S256 or plain')
  }

  // Generate secure random code (256 bits = 32 bytes = 64 hex chars)
  const code = randomBytes(32).toString('hex')

  const now = new Date()
  const expiresAt = new Date(now.getTime() + lifetime_seconds * 1000)

  const authCode = {
    code,
    client_id,
    user_id,
    redirect_uri,
    scope,
    code_challenge: code_challenge || null, // WHAT: Store null if PKCE not used
    code_challenge_method: code_challenge_method || null,
    expires_at: expiresAt.toISOString(),
    used_at: null,
    created_at: now.toISOString(),
  }

  try {
    const db = await getDb()
    await db.collection('authorizationCodes').insertOne(authCode)

    // Create TTL index on expires_at if it doesn't exist
    // This automatically deletes expired codes
    await db.collection('authorizationCodes').createIndex(
      { expires_at: 1 },
      { expireAfterSeconds: 0 }
    )

    logger.info('Authorization code created', {
      code_prefix: code.substring(0, 8) + '...',
      client_id,
      user_id,
      scope,
      expires_at: authCode.expires_at,
    })

    return code
  } catch (error) {
    logger.error('Failed to create authorization code', {
      error: error.message,
      client_id,
      user_id,
    })
    throw error
  }
}

/**
 * Validate and consume an authorization code
 * 
 * This marks the code as used and verifies all parameters.
 * Codes can only be used once.
 * 
 * @param {Object} params
 * @param {string} params.code - Authorization code
 * @param {string} params.client_id - Client ID (must match code)
 * @param {string} params.redirect_uri - Redirect URI (must match code)
 * @param {string} [params.code_verifier] - PKCE code verifier (required only if code has code_challenge)
 * @returns {Promise<Object|null>} - Code data if valid, null if invalid/expired/used
 */
export async function validateAndConsumeCode(params) {
  const { code, client_id, redirect_uri, code_verifier } = params

  // Validation
  if (!code) {
    throw new Error('code is required')
  }
  if (!client_id) {
    throw new Error('client_id is required')
  }
  if (!redirect_uri) {
    throw new Error('redirect_uri is required')
  }
  // WHAT: code_verifier validation moved to after we fetch the auth code
  // WHY: We need to check if PKCE was used for this specific authorization code

  try {
    const db = await getDb()
    const authCode = await db.collection('authorizationCodes').findOne({ code })

    if (!authCode) {
      logger.warn('Authorization code not found', {
        code_prefix: code.substring(0, 8) + '...',
        client_id,
      })
      return null
    }

    // Check if already used
    if (authCode.used_at) {
      logger.warn('Authorization code already used', {
        code_prefix: code.substring(0, 8) + '...',
        used_at: authCode.used_at,
        client_id,
      })
      return null
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(authCode.expires_at)
    if (now > expiresAt) {
      logger.warn('Authorization code expired', {
        code_prefix: code.substring(0, 8) + '...',
        expires_at: authCode.expires_at,
        client_id,
      })
      return null
    }

    // Verify client_id matches
    if (authCode.client_id !== client_id) {
      logger.warn('Authorization code client_id mismatch', {
        code_prefix: code.substring(0, 8) + '...',
        expected: authCode.client_id,
        received: client_id,
      })
      return null
    }

    // Verify redirect_uri matches EXACTLY
    if (authCode.redirect_uri !== redirect_uri) {
      logger.warn('Authorization code redirect_uri mismatch', {
        code_prefix: code.substring(0, 8) + '...',
        expected: authCode.redirect_uri,
        received: redirect_uri,
      })
      return null
    }

    // WHAT: Verify PKCE only if code_challenge was set during authorization
    // WHY: Confidential clients don't need PKCE, so code_challenge may be null
    if (authCode.code_challenge) {
      // PKCE was used during authorization, so code_verifier is required
      if (!code_verifier) {
        logger.warn('Authorization code requires PKCE but code_verifier not provided', {
          code_prefix: code.substring(0, 8) + '...',
          client_id,
        })
        return null
      }

      const isValidVerifier = await verifyCodeChallenge(
        code_verifier,
        authCode.code_challenge,
        authCode.code_challenge_method
      )

      if (!isValidVerifier) {
        logger.warn('Authorization code PKCE verification failed', {
          code_prefix: code.substring(0, 8) + '...',
          client_id,
          code_challenge_method: authCode.code_challenge_method,
        })
        return null
      }

      logger.info('PKCE verification successful', {
        code_prefix: code.substring(0, 8) + '...',
        client_id,
      })
    } else {
      // PKCE not used - this is valid for confidential clients
      logger.info('PKCE not required for this authorization code', {
        code_prefix: code.substring(0, 8) + '...',
        client_id,
      })
    }

    // Mark code as used (important: do this atomically)
    const updateResult = await db.collection('authorizationCodes').findOneAndUpdate(
      { code, used_at: null }, // Only update if not already used
      { $set: { used_at: now.toISOString() } },
      { returnDocument: 'after' }
    )

    if (!updateResult) {
      // Code was already used by another request (race condition)
      logger.warn('Authorization code was already consumed by another request', {
        code_prefix: code.substring(0, 8) + '...',
        client_id,
      })
      return null
    }

    logger.info('Authorization code validated and consumed', {
      code_prefix: code.substring(0, 8) + '...',
      client_id,
      user_id: authCode.user_id,
      scope: authCode.scope,
    })

    return {
      user_id: authCode.user_id,
      client_id: authCode.client_id,
      scope: authCode.scope,
      redirect_uri: authCode.redirect_uri,
    }
  } catch (error) {
    logger.error('Failed to validate authorization code', {
      error: error.message,
      code_prefix: code.substring(0, 8) + '...',
      client_id,
    })
    throw error
  }
}

/**
 * Verify PKCE code_challenge against code_verifier
 * 
 * @param {string} verifier - Code verifier from client
 * @param {string} challenge - Code challenge from authorization request
 * @param {string} method - Challenge method ('S256' or 'plain')
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
async function verifyCodeChallenge(verifier, challenge, method) {
  if (!verifier || !challenge || !method) {
    return false
  }

  try {
    if (method === 'plain') {
      // Plain method: verifier must equal challenge
      return verifier === challenge
    }

    if (method === 'S256') {
      // S256 method: SHA-256(verifier) in base64url must equal challenge
      const crypto = await import('crypto')
      const hash = crypto.createHash('sha256').update(verifier).digest()
      
      // Convert to base64url format (base64 with URL-safe characters)
      const computed = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')

      return computed === challenge
    }

    return false
  } catch (error) {
    logger.error('Failed to verify PKCE code challenge', {
      error: error.message,
      method,
    })
    return false
  }
}

/**
 * Revoke authorization code (if not yet used)
 * 
 * @param {string} code - Authorization code
 * @returns {Promise<boolean>} - True if revoked, false if not found or already used
 */
export async function revokeAuthorizationCode(code) {
  if (!code) {
    throw new Error('code is required')
  }

  try {
    const db = await getDb()
    const result = await db.collection('authorizationCodes').findOneAndUpdate(
      { code, used_at: null }, // Only revoke unused codes
      { $set: { used_at: new Date().toISOString(), revoked: true } },
      { returnDocument: 'after' }
    )

    if (result) {
      logger.info('Authorization code revoked', {
        code_prefix: code.substring(0, 8) + '...',
        client_id: result.client_id,
      })
      return true
    }

    return false
  } catch (error) {
    logger.error('Failed to revoke authorization code', {
      error: error.message,
      code_prefix: code.substring(0, 8) + '...',
    })
    throw error
  }
}

/**
 * Clean up expired authorization codes (manual cleanup)
 * 
 * Note: MongoDB TTL index handles this automatically, but this function
 * can be called for immediate cleanup if needed.
 * 
 * @returns {Promise<number>} - Number of codes deleted
 */
export async function cleanupExpiredCodes() {
  try {
    const db = await getDb()
    const now = new Date().toISOString()

    const result = await db.collection('authorizationCodes').deleteMany({
      expires_at: { $lt: now },
    })

    if (result.deletedCount > 0) {
      logger.info('Expired authorization codes cleaned up', {
        count: result.deletedCount,
      })
    }

    return result.deletedCount
  } catch (error) {
    logger.error('Failed to cleanup expired authorization codes', {
      error: error.message,
    })
    throw error
  }
}

/**
 * Get authorization code info (for debugging, admin use only)
 * 
 * @param {string} code - Authorization code
 * @returns {Promise<Object|null>} - Code data or null if not found
 */
export async function getAuthorizationCode(code) {
  if (!code) {
    throw new Error('code is required')
  }

  try {
    const db = await getDb()
    const authCode = await db.collection('authorizationCodes').findOne({ code })
    return authCode
  } catch (error) {
    logger.error('Failed to get authorization code', {
      error: error.message,
      code_prefix: code.substring(0, 8) + '...',
    })
    throw error
  }
}
