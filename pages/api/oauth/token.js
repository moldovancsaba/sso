/**
 * OAuth2 Token Endpoint
 * 
 * POST /api/oauth/token - Exchange authorization code or refresh token for access token
 * 
 * This is the core endpoint where clients exchange authorization codes for tokens.
 * 
 * Supported Grant Types:
 * - authorization_code: Exchange authorization code for tokens (first time)
 * - refresh_token: Exchange refresh token for new access token
 * 
 * Request Body (authorization_code):
 * - grant_type: "authorization_code"
 * - code: Authorization code from /authorize
 * - redirect_uri: Must match the one used in /authorize
 * - client_id: OAuth client ID
 * - client_secret: OAuth client secret
 * - code_verifier: PKCE code verifier (required only if PKCE was used during authorization)
 * 
 * Request Body (refresh_token):
 * - grant_type: "refresh_token"
 * - refresh_token: Previously issued refresh token
 * - client_id: OAuth client ID
 * - client_secret: OAuth client secret
 * - scope: Optional - requested scope (must be subset of original)
 * 
 * Response:
 * - access_token: JWT access token
 * - token_type: "Bearer"
 * - expires_in: Seconds until expiration (3600)
 * - refresh_token: Refresh token (if offline_access scope)
 * - id_token: OIDC ID token (if openid scope)
 * - scope: Granted scopes
 */

import { verifyClient } from '../../../lib/oauth/clients.mjs'
import { validateAndConsumeCode } from '../../../lib/oauth/codes.mjs'
import {
  generateAccessToken,
  generateIdToken,
  generateRefreshToken,
  verifyRefreshToken,
  rotateRefreshToken,
} from '../../../lib/oauth/tokens.mjs'
import { requiresRefreshToken, hasScope, filterScopes } from '../../../lib/oauth/scopes.mjs'
import logger from '../../../lib/logger.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { grant_type } = req.body

  try {
    if (grant_type === 'authorization_code') {
      return await handleAuthorizationCodeGrant(req, res)
    }

    if (grant_type === 'refresh_token') {
      return await handleRefreshTokenGrant(req, res)
    }

    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'grant_type must be authorization_code or refresh_token',
    })
  } catch (error) {
    logger.error('Token endpoint error', {
      error: error.message,
      grant_type,
    })

    return res.status(500).json({
      error: 'server_error',
      error_description: 'An internal error occurred',
    })
  }
}

/**
 * Handle authorization_code grant type
 * 
 * Exchange authorization code for access token, refresh token, and ID token.
 */
async function handleAuthorizationCodeGrant(req, res) {
  const {
    code,
    redirect_uri,
    client_id,
    client_secret,
    code_verifier,
  } = req.body

  // Validate required parameters
  if (!code) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'code is required',
    })
  }

  if (!redirect_uri) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'redirect_uri is required',
    })
  }

  if (!client_id) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'client_id is required',
    })
  }

  if (!client_secret) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'client_secret is required',
    })
  }

  // WHAT: code_verifier is now optional
  // WHY: It's only required if the authorization code was created with PKCE
  // The validateAndConsumeCode function will check if PKCE is required

  // Authenticate client
  const client = await verifyClient(client_id, client_secret)
  if (!client) {
    logger.warn('Token request: invalid client credentials', { client_id })
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid client credentials',
    })
  }

  // Validate and consume authorization code
  const codeData = await validateAndConsumeCode({
    code,
    client_id,
    redirect_uri,
    code_verifier,
  })

  if (!codeData) {
    logger.warn('Token request: invalid or expired authorization code', {
      client_id,
      code_prefix: code.substring(0, 8) + '...',
    })
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code',
    })
  }

  const { user_id, scope } = codeData

  // Generate access token
  const accessToken = await generateAccessToken({
    userId: user_id,
    clientId: client_id,
    scope,
  })

  const response = {
    access_token: accessToken.token,
    token_type: 'Bearer',
    expires_in: 3600, // 1 hour
    scope,
  }

  // Generate ID token if openid scope is present
  if (hasScope(scope, 'openid')) {
    const idToken = await generateIdToken({
      userId: user_id,
      clientId: client_id,
      scope,
    })

    response.id_token = idToken.token
  }

  // Generate refresh token if offline_access scope is present
  if (requiresRefreshToken(scope)) {
    const refreshToken = await generateRefreshToken({
      userId: user_id,
      clientId: client_id,
      scope,
      accessTokenJti: accessToken.jti,
    })

    response.refresh_token = refreshToken.token
  }

  logger.info('Tokens issued', {
    client_id,
    user_id,
    scope,
    has_refresh_token: !!response.refresh_token,
    has_id_token: !!response.id_token,
  })

  return res.status(200).json(response)
}

/**
 * Handle refresh_token grant type
 * 
 * Exchange refresh token for new access token (and optionally new refresh token).
 */
async function handleRefreshTokenGrant(req, res) {
  const {
    refresh_token,
    client_id,
    client_secret,
    scope: requestedScope,
  } = req.body

  // Validate required parameters
  if (!refresh_token) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'refresh_token is required',
    })
  }

  if (!client_id) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'client_id is required',
    })
  }

  if (!client_secret) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'client_secret is required',
    })
  }

  // Authenticate client
  const client = await verifyClient(client_id, client_secret)
  if (!client) {
    logger.warn('Refresh token request: invalid client credentials', { client_id })
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid client credentials',
    })
  }

  // Verify refresh token
  const tokenData = await verifyRefreshToken(refresh_token)
  if (!tokenData) {
    logger.warn('Refresh token request: invalid or expired refresh token', {
      client_id,
    })
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired refresh token',
    })
  }

  // Verify client_id matches
  if (tokenData.client_id !== client_id) {
    logger.warn('Refresh token request: client_id mismatch', {
      expected: tokenData.client_id,
      received: client_id,
    })
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Refresh token does not belong to this client',
    })
  }

  // Determine final scope
  // If client requests specific scopes, they must be a subset of original scopes
  let finalScope = tokenData.scope
  if (requestedScope) {
    finalScope = filterScopes(requestedScope, tokenData.scope.split(' '))
    if (!finalScope) {
      return res.status(400).json({
        error: 'invalid_scope',
        error_description: 'Requested scope exceeds granted scope',
      })
    }
  }

  // Generate new access token
  const accessToken = await generateAccessToken({
    userId: tokenData.user_id,
    clientId: client_id,
    scope: finalScope,
  })

  const response = {
    access_token: accessToken.token,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: finalScope,
  }

  // Generate new ID token if openid scope is present
  if (hasScope(finalScope, 'openid')) {
    const idToken = await generateIdToken({
      userId: tokenData.user_id,
      clientId: client_id,
      scope: finalScope,
    })

    response.id_token = idToken.token
  }

  // Rotate refresh token (best practice for security)
  if (requiresRefreshToken(finalScope)) {
    const newRefreshToken = await rotateRefreshToken(refresh_token, accessToken.jti)

    if (newRefreshToken) {
      response.refresh_token = newRefreshToken.token
    }
  }

  logger.info('Tokens refreshed', {
    client_id,
    user_id: tokenData.user_id,
    scope: finalScope,
    rotated_refresh_token: !!response.refresh_token,
  })

  return res.status(200).json(response)
}
