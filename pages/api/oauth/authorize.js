/**
 * OAuth2 Authorization Endpoint
 * 
 * GET /api/oauth/authorize - Initiate OAuth2 authorization flow
 * 
 * This is the entry point for OAuth2 clients to request user authentication.
 * It validates the request, checks if the user is authenticated, and redirects
 * to the consent page or returns an authorization code.
 * 
 * Parameters (query string):
 * - response_type: Must be "code" (Authorization Code Flow)
 * - client_id: OAuth client ID (UUID)
 * - redirect_uri: Where to send the user after authorization
 * - scope: Space-separated list of scopes
 * - state: CSRF protection token from client
 * - code_challenge: PKCE code challenge (optional for confidential clients)
 * - code_challenge_method: PKCE method (S256 or plain)
 */

import { getAdminUser } from '../../../lib/auth.mjs'
import { getClient, validateRedirectUri, validateClientScopes } from '../../../lib/oauth/clients.mjs'
import { validateScopes, ensureRequiredScopes } from '../../../lib/oauth/scopes.mjs'
import { createAuthorizationCode } from '../../../lib/oauth/codes.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method = 'S256',
  } = req.query

  try {
    // Validate required parameters
    if (!response_type || response_type !== 'code') {
      return respondWithError(res, redirect_uri, state, 'invalid_request', 'response_type must be "code"')
    }

    if (!client_id) {
      return respondWithError(res, redirect_uri, state, 'invalid_request', 'client_id is required')
    }

    if (!redirect_uri) {
      return respondWithError(res, redirect_uri, state, 'invalid_request', 'redirect_uri is required')
    }

    if (!scope) {
      return respondWithError(res, redirect_uri, state, 'invalid_request', 'scope is required')
    }

    if (!state) {
      return respondWithError(res, redirect_uri, state, 'invalid_request', 'state is required for CSRF protection')
    }

    // Validate client first to check PKCE requirement
    const client = await getClient(client_id)
    if (!client) {
      logger.warn('Authorization request: client not found', { client_id })
      return respondWithError(res, redirect_uri, state, 'invalid_client', 'Client not found')
    }

    if (client.status !== 'active') {
      logger.warn('Authorization request: client suspended', { client_id, status: client.status })
      return respondWithError(res, redirect_uri, state, 'unauthorized_client', 'Client is suspended')
    }

    // WHAT: Check if PKCE is required for this client
    // WHY: Confidential clients (server-side) may not need PKCE if they use client_secret
    if (client.require_pkce) {
      if (!code_challenge) {
        return respondWithError(res, redirect_uri, state, 'invalid_request', 'code_challenge is required (PKCE) for this client')
      }
      if (!['S256', 'plain'].includes(code_challenge_method)) {
        return respondWithError(res, redirect_uri, state, 'invalid_request', 'code_challenge_method must be S256 or plain')
      }
    } else {
      // PKCE is optional, but if provided, validate the method
      if (code_challenge && !['S256', 'plain'].includes(code_challenge_method)) {
        return respondWithError(res, redirect_uri, state, 'invalid_request', 'code_challenge_method must be S256 or plain')
      }
      logger.info('PKCE not required for this client', {
        client_id,
        client_name: client.name,
        has_code_challenge: !!code_challenge,
      })
    }

    // Validate redirect_uri
    const isValidRedirect = await validateRedirectUri(client_id, redirect_uri)
    if (!isValidRedirect) {
      logger.warn('Authorization request: invalid redirect_uri', {
        client_id,
        redirect_uri,
        allowed: client.redirect_uris,
      })
      // Don't redirect on invalid redirect_uri (security: prevent open redirect)
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid redirect_uri',
      })
    }

    // Validate scopes
    const scopeValidation = validateScopes(scope)
    if (!scopeValidation.valid) {
      return respondWithError(res, redirect_uri, state, 'invalid_scope', `Invalid scopes: ${scopeValidation.invalid.join(', ')}`)
    }

    // Ensure required scopes (e.g., openid)
    const finalScope = ensureRequiredScopes(scope)

    // Check if client is allowed to request these scopes
    const isValidForClient = await validateClientScopes(client_id, finalScope)
    if (!isValidForClient) {
      logger.warn('Authorization request: scopes not allowed for client', {
        client_id,
        requested: finalScope,
        allowed: client.allowed_scopes,
      })
      return respondWithError(res, redirect_uri, state, 'invalid_scope', 'One or more scopes not allowed for this client')
    }

    // Check if user is authenticated
    const user = await getAdminUser(req)
    if (!user) {
      // User not authenticated - redirect to login with return URL
      logger.info('Authorization request: user not authenticated, redirecting to login', {
        client_id,
        client_name: client.name,
      })

      // Store authorization request in session for after login
      const authRequest = {
        response_type,
        client_id,
        redirect_uri,
        scope: finalScope,
        state,
        code_challenge,
        code_challenge_method,
        client_name: client.name,
        client_homepage: client.homepage_uri,
        client_logo: client.logo_uri,
      }

      // Encode and pass to login
      const encodedRequest = Buffer.from(JSON.stringify(authRequest)).toString('base64url')
      const loginUrl = `/admin?oauth_request=${encodedRequest}`

      return res.redirect(302, loginUrl)
    }

    // User is authenticated - check for existing consent
    const db = await getDb()
    const existingConsent = await db.collection('userConsents').findOne({
      user_id: user.id,
      client_id,
      revoked_at: null,
    })

    // Check if all requested scopes are already granted
    const requestedScopes = finalScope.split(' ')
    const hasConsent = existingConsent && requestedScopes.every(s => 
      existingConsent.scope.split(' ').includes(s)
    )

    if (!hasConsent) {
      // Need user consent - redirect to consent page
      logger.info('Authorization request: consent required', {
        client_id,
        client_name: client.name,
        user_id: user.id,
        scope: finalScope,
      })

      const authRequest = {
        response_type,
        client_id,
        redirect_uri,
        scope: finalScope,
        state,
        code_challenge,
        code_challenge_method,
        client_name: client.name,
        client_homepage: client.homepage_uri,
        client_logo: client.logo_uri,
      }

      const encodedRequest = Buffer.from(JSON.stringify(authRequest)).toString('base64url')
      const consentUrl = `/oauth/consent?request=${encodedRequest}`

      return res.redirect(302, consentUrl)
    }

    // User has already consented - generate authorization code
    const code = await createAuthorizationCode({
      client_id,
      user_id: user.id,
      redirect_uri,
      scope: finalScope,
      code_challenge,
      code_challenge_method,
    })

    logger.info('Authorization code issued', {
      client_id,
      client_name: client.name,
      user_id: user.id,
      scope: finalScope,
      code_prefix: code.substring(0, 8) + '...',
    })

    // Redirect back to client with code and state
    const redirectUrl = new URL(redirect_uri)
    redirectUrl.searchParams.set('code', code)
    redirectUrl.searchParams.set('state', state)

    return res.redirect(302, redirectUrl.toString())

  } catch (error) {
    logger.error('Authorization endpoint error', {
      error: error.message,
      client_id,
      redirect_uri,
    })

    return respondWithError(
      res,
      redirect_uri,
      state,
      'server_error',
      'An internal error occurred'
    )
  }
}

/**
 * Send OAuth2 error response
 * 
 * Errors are returned to the client via redirect with error parameters.
 * This follows the OAuth2 spec for error handling.
 * 
 * @param {Object} res - Response object
 * @param {string} redirect_uri - Client redirect URI
 * @param {string} state - Client state parameter
 * @param {string} error - Error code
 * @param {string} error_description - Human-readable error description
 */
function respondWithError(res, redirect_uri, state, error, error_description) {
  // If we don't have a valid redirect_uri, return JSON error
  if (!redirect_uri) {
    return res.status(400).json({
      error,
      error_description,
    })
  }

  try {
    const redirectUrl = new URL(redirect_uri)
    redirectUrl.searchParams.set('error', error)
    redirectUrl.searchParams.set('error_description', error_description)
    if (state) {
      redirectUrl.searchParams.set('state', state)
    }

    return res.redirect(302, redirectUrl.toString())
  } catch (err) {
    // Invalid redirect_uri - return JSON error
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Invalid redirect_uri',
    })
  }
}
