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

import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { getAuthenticatedUser } from '../../../lib/unifiedAuth.mjs'
import { validateAuthorizationRequest, checkInternalClientAccess } from '../../../lib/oauth/authorizationValidation.mjs'
import { getInitiatingOrigin, resolveRedirectUriForOrigin } from '../../../lib/oauth/redirectOrigin.mjs'
import { createAuthorizationCode } from '../../../lib/oauth/codes.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'
import { runCors } from '../../../lib/cors.mjs'
import { apiRateLimiter } from '../../../lib/middleware/rateLimit.mjs'
import { applyRateLimiter } from '../../../lib/apiHelpers.mjs'

function normalizeProvider(value) {
  const source = Array.isArray(value) ? value[0] : value
  if (!source || typeof source !== 'string') return null

  const provider = source.trim().toLowerCase()
  if (provider === 'google' || provider === 'facebook') {
    return provider
  }

  return null
}

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  await applyRateLimiter(apiRateLimiter, req, res)
  if (res.writableEnded) return

  const {
    response_type,
    client_id,
    scope,
    state,
    nonce, // OIDC nonce parameter: random value to prevent replay attacks
    code_challenge,
    code_challenge_method = 'S256',
    prompt, // OIDC prompt parameter: 'none', 'login', 'consent', 'select_account'
    provider, // Optional login provider hint: 'google' | 'facebook'
    login_hint, // Optional login hint (email) forwarded to provider login
  } = req.query

  // WHAT: Reassigned below for clients that opted into origin preservation.
  // WHY: see lib/oauth/redirectOrigin.mjs — a multi-domain client whose application
  //      hardcodes one origin would otherwise send every user to that one domain.
  let { redirect_uri } = req.query

  try {
    const requestedProvider = normalizeProvider(provider)
    const loginHint = Array.isArray(login_hint) ? login_hint[0] : login_hint

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

    // WHAT: Validate client exists/active, PKCE requirement, redirect_uri registration, and scopes
    // WHY: Centralized in lib/oauth/authorizationValidation.mjs so /api/oauth/authorize/approve
    //      (called later in this same flow, after consent) enforces identical checks instead of
    //      trusting whatever client_id/redirect_uri/scope the browser sends it directly.
    const validation = await validateAuthorizationRequest({ client_id, redirect_uri, scope, code_challenge, code_challenge_method })
    if (!validation.valid) {
      logger.warn('Authorization request rejected', {
        client_id,
        redirect_uri,
        error: validation.error,
        error_description: validation.error_description,
      })
      return respondWithError(res, redirect_uri, state, validation.error, validation.error_description, {
        redirectVerified: validation.redirectUriVerified,
      })
    }

    const { client, finalScope } = validation

    // WHAT: Return the user to the domain they started on, when this client allows it.
    // WHY: Only ever resolves to another redirect URI already registered on this same
    //      client with the same path; anything uncertain leaves redirect_uri untouched.
    //      Runs after validation so the requested URI is proven to belong to this client
    //      first. On the second pass through this endpoint (after login) the Referer is
    //      this service's own login page, which matches no registered origin, so the value
    //      carried through the login round-trip passes through unchanged.
    const initiatingOrigin = getInitiatingOrigin(req)
    const originPreservedRedirectUri = resolveRedirectUriForOrigin({
      client,
      redirect_uri,
      initiatingOrigin,
    })

    if (originPreservedRedirectUri !== redirect_uri) {
      logger.info('Authorization redirect_uri re-pointed to the initiating origin', {
        client_id,
        client_name: client.name,
        requested: redirect_uri,
        delivering_to: originPreservedRedirectUri,
        initiating_origin: initiatingOrigin,
      })
      redirect_uri = originPreservedRedirectUri
    }

    // WHAT: Check if user is authenticated (admin OR public session)
    // WHY: Admin users need to access sso-admin-dashboard via OAuth too
    // HOW: Use unified auth to check both admin and public sessions
    // FIX: This prevents infinite redirect loop for admin dashboard access
    const auth = await getAuthenticatedUser(req)
    const user = auth ? auth.user : null
    
    // WHAT: Handle prompt=login - force re-authentication even if user has session
    // WHY: When user logs out from 3rd party app, they should be asked to login again
    // HOW: If prompt=login, redirect to login page regardless of existing session
    if (prompt === 'login') {
      logger.info('Authorization request: prompt=login, forcing re-authentication', {
        client_id,
        client_name: client.name,
        has_existing_session: !!user,
      })

      // Store authorization request for after re-authentication
      const authRequest = {
        response_type,
        client_id,
        redirect_uri,
        scope: finalScope,
        state,
        nonce,
        code_challenge,
        code_challenge_method,
        prompt,
        provider: requestedProvider,
        login_hint: loginHint,
        client_name: client.name,
        client_homepage: client.homepage_uri,
        client_logo: client.logo_uri,
      }

      const encodedRequest = Buffer.from(JSON.stringify(authRequest)).toString('base64url')

      if (requestedProvider) {
        const directProviderParams = new URLSearchParams({
          oauth_request: encodedRequest,
        })

        if (requestedProvider === 'google' && prompt === 'login') {
          directProviderParams.set('prompt', 'select_account')
        }
        if (requestedProvider === 'google' && loginHint) {
          directProviderParams.set('login_hint', loginHint)
        }

        return res.redirect(302, `/api/auth/${requestedProvider}/login?${directProviderParams.toString()}`)
      }

      // Add force_login flag to tell login page to show credentials form
      const loginUrl = `/login?oauth_request=${encodedRequest}&force_login=true`

      return res.redirect(302, loginUrl)
    }
    
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
        nonce,
        code_challenge,
        code_challenge_method,
        prompt,
        provider: requestedProvider,
        login_hint: loginHint,
        client_name: client.name,
        client_homepage: client.homepage_uri,
        client_logo: client.logo_uri,
      }

      // WHAT: Encode OAuth request and redirect to public login page
      // WHY: Users need to register/login with email+password, not admin token
      // HOW: Redirect to /login (public) instead of /admin (admin token form)
      const encodedRequest = Buffer.from(JSON.stringify(authRequest)).toString('base64url')

      if (requestedProvider) {
        const directProviderParams = new URLSearchParams({
          oauth_request: encodedRequest,
        })

        if (requestedProvider === 'google' && loginHint) {
          directProviderParams.set('login_hint', loginHint)
        }

        const directLoginUrl = `/api/auth/${requestedProvider}/login?${directProviderParams.toString()}`
        return res.redirect(302, directLoginUrl)
      }

      const loginUrl = `/login?oauth_request=${encodedRequest}`

      return res.redirect(302, loginUrl)
    }

    // User is authenticated - check for existing consent
    logger.info('Authorization request: user authenticated', {
      client_id,
      client_name: client.name,
      user_id: user.id,
      user_type: 'public', // Always public for OAuth flows
    })

    const db = await getDb()
    
    // WHAT: Check appPermissions for internal/restricted clients (like admin dashboard)
    // WHY: Some clients require explicit permission grants, not just user consent
    // HOW: Query appPermissions - if client is internal, require approved permission
    const internalAccess = await checkInternalClientAccess(client, user.id)
    if (!internalAccess.allowed) {
      logger.warn('Authorization request: internal client access denied', {
        client_id,
        client_name: client.name,
        user_id: user.id,
        email: user.email,
      })
      return respondWithError(res, redirect_uri, state, internalAccess.error, internalAccess.error_description, {
        redirectVerified: true,
      })
    }
    
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

    // WHAT: Handle prompt=consent - force consent screen even if already granted
    // WHY: Client may want explicit re-consent from user
    const forceConsent = prompt === 'consent' || prompt === 'select_account'

    if (!hasConsent || forceConsent) {
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
        nonce, // Include nonce in consent request
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
      nonce, // Store nonce with authorization code
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
 * Errors are returned to the client via redirect with error parameters, but only once
 * redirect_uri has been confirmed to belong to a real, active, registered client — per
 * OAuth 2.0 RFC 6749 §4.1.2.1, a missing/invalid/mismatching redirect_uri must never itself
 * be used as a redirect target (that's an open redirect to an attacker-chosen URL).
 * Before that point, every error is returned as JSON instead.
 *
 * @param {Object} res - Response object
 * @param {string} redirect_uri - Client redirect URI
 * @param {string} state - Client state parameter
 * @param {string} error - Error code
 * @param {string} error_description - Human-readable error description
 * @param {Object} [options]
 * @param {boolean} [options.redirectVerified=false] - True once redirect_uri has been confirmed
 *   registered to the resolved client (set via validateAuthorizationRequest's return value)
 */
function respondWithError(res, redirect_uri, state, error, error_description, options = {}) {
  const { redirectVerified = false } = options

  if (!redirect_uri || !redirectVerified) {
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
