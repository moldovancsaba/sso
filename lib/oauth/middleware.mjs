/**
 * OAuth Token Validation Middleware
 * 
 * WHAT: Validates OAuth access tokens in API routes
 * WHY: APIs need to authenticate app-to-app requests using OAuth tokens
 * HOW: Extract Bearer token from Authorization header, verify JWT, check expiration
 * 
 * Used in Phase 4C for bidirectional permission APIs where apps authenticate
 * with client_credentials tokens to manage permissions.
 */

import jwt from 'jsonwebtoken'
import logger from '../logger.mjs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Validate OAuth access token from request
 * 
 * WHAT: Extracts and validates Bearer token from Authorization header
 * WHY: API routes need to authenticate OAuth clients
 * HOW: Parse header, verify JWT signature, check expiration, return token data
 * 
 * @param {Object} req - Next.js request object
 * @returns {Promise<Object|null>} Token payload if valid, null if invalid
 */
export async function validateAccessToken(req) {
  try {
    // WHAT: Extract Bearer token from Authorization header
    // WHY: OAuth 2.0 standard uses Bearer token authentication
    const authHeader = req.headers['authorization'] || req.headers['Authorization']
    
    if (!authHeader) {
      logger.debug('No Authorization header present')
      return null
    }

    // WHAT: Parse "Bearer <token>" format
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Invalid Authorization header format', { authHeader: authHeader.substring(0, 20) })
      return null
    }

    const token = parts[1]

    // WHAT: Verify JWT signature and expiration
    // WHY: Ensure token is authentic and not expired
    const decoded = jwt.verify(token, JWT_SECRET)

    // WHAT: Check token type is access_token
    // WHY: Refresh tokens and ID tokens shouldn't be used for API authentication
    if (decoded.token_type !== 'access') {
      logger.warn('Invalid token type for API authentication', { 
        token_type: decoded.token_type,
        jti: decoded.jti 
      })
      return null
    }

    logger.debug('Access token validated successfully', {
      jti: decoded.jti,
      clientId: decoded.client_id,
      userId: decoded.sub || null,
      scope: decoded.scope,
    })

    return {
      jti: decoded.jti,
      clientId: decoded.client_id,
      userId: decoded.sub || null, // null for client_credentials tokens
      scope: decoded.scope,
      issuedAt: decoded.iat,
      expiresAt: decoded.exp,
    }
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.debug('Access token expired', { expiredAt: error.expiredAt })
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token', { error: error.message })
    } else {
      logger.error('Token validation error', { error: error.message })
    }
    return null
  }
}

/**
 * Check if token has required scope
 * 
 * WHAT: Verifies token contains a specific scope
 * WHY: Different APIs require different permissions
 * HOW: Parse scope string and check for presence of required scope
 * 
 * @param {Object} tokenData - Token payload from validateAccessToken()
 * @param {string} requiredScope - Scope to check for (e.g., 'manage_permissions')
 * @returns {boolean} True if token has the scope, false otherwise
 */
export function hasScope(tokenData, requiredScope) {
  if (!tokenData || !tokenData.scope) {
    return false
  }

  const scopes = tokenData.scope.split(' ')
  return scopes.includes(requiredScope)
}

/**
 * Require OAuth authentication middleware
 * 
 * WHAT: Higher-order function that validates OAuth token and checks scope
 * WHY: Simplifies protecting API routes with OAuth
 * HOW: Returns error response if token invalid or scope missing
 * 
 * Usage in API route:
 * ```
 * export default async function handler(req, res) {
 *   const tokenData = await requireOAuthToken(req, res, 'manage_permissions')
 *   if (!tokenData) return // Response already sent
 *   
 *   // Token is valid, proceed with API logic
 *   // tokenData.clientId = app making the request
 *   // tokenData.userId = user context (null for client_credentials)
 * }
 * ```
 * 
 * @param {Object} req - Next.js request
 * @param {Object} res - Next.js response
 * @param {string} [requiredScope] - Optional scope to require
 * @returns {Promise<Object|null>} Token data if valid, null if error (response already sent)
 */
export async function requireOAuthToken(req, res, requiredScope = null) {
  const tokenData = await validateAccessToken(req)

  if (!tokenData) {
    res.status(401).json({
      error: 'unauthorized',
      error_description: 'Valid access token required',
    })
    return null
  }

  // WHAT: Check scope if required
  // WHY: Some APIs need specific permissions
  if (requiredScope && !hasScope(tokenData, requiredScope)) {
    logger.warn('Token missing required scope', {
      clientId: tokenData.clientId,
      required: requiredScope,
      has: tokenData.scope,
    })
    res.status(403).json({
      error: 'insufficient_scope',
      error_description: `Scope '${requiredScope}' required`,
    })
    return null
  }

  return tokenData
}

/**
 * Check if client is authorized to manage permissions for a specific app
 * 
 * WHAT: Validates that the authenticated client can modify permissions for given clientId
 * WHY: Apps should only be able to manage their own permissions, not other apps'
 * HOW: Compare token clientId with target clientId
 * 
 * @param {Object} tokenData - Token payload from validateAccessToken()
 * @param {string} targetClientId - Client ID of the app whose permissions are being modified
 * @returns {boolean} True if authorized, false otherwise
 */
export function canManagePermissionsFor(tokenData, targetClientId) {
  if (!tokenData || !tokenData.clientId) {
    return false
  }

  // WHAT: Client can only manage permissions for itself
  // WHY: Prevents apps from modifying other apps' permission data
  return tokenData.clientId === targetClientId
}
