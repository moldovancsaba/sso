/**
 * OAuth2 Authorization Code Generation (Post-Consent)
 * 
 * POST /api/oauth/authorize/approve - Generate authorization code after user consent
 * 
 * This endpoint is called by the consent UI after the user approves access.
 * It generates an authorization code that the client can exchange for tokens.
 */

import { getAuthenticatedUser } from '../../../../lib/unifiedAuth.mjs'
import { createAuthorizationCode } from '../../../../lib/oauth/codes.mjs'
import { validateAuthorizationRequest, checkInternalClientAccess } from '../../../../lib/oauth/authorizationValidation.mjs'
import logger from '../../../../lib/logger.mjs'
import { runCors } from '../../../../lib/cors.mjs'
import { validateRequestOrigin } from '../../../../lib/middleware/csrf.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const originCheck = validateRequestOrigin(req)
  if (!originCheck.valid) {
    return res.status(403).json({ error: 'Request origin not allowed' })
  }

  // WHAT: Authenticate user (admin or public)
  // WHY: OAuth should work for both user types
  const auth = await getAuthenticatedUser(req)
  
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const user = auth.user

  const {
    client_id,
    redirect_uri,
    scope,
    state,
    nonce, // OIDC nonce parameter
    code_challenge,
    code_challenge_method,
  } = req.body

  // WHAT: Validate required parameters (code_challenge is optional)
  // WHY: Confidential clients may not use PKCE if require_pkce is false
  if (!client_id || !redirect_uri || !scope || !state) {
    return res.status(400).json({
      error: 'Missing required parameters',
    })
  }

  // WHAT: Re-validate the request against the real client record before minting a code
  // WHY: This endpoint is called directly by the browser with values decoded client-side from
  //      an unsigned request blob (see pages/oauth/consent.js) — without re-validating here,
  //      anyone could get a real authorization code minted for an arbitrary client_id/
  //      redirect_uri/scope/code_challenge by POSTing here directly, bypassing every check
  //      /api/oauth/authorize performs and every safeguard the consent screen implies.
  const validation = await validateAuthorizationRequest({ client_id, redirect_uri, scope, code_challenge, code_challenge_method })
  if (!validation.valid) {
    logger.warn('Authorization approval rejected', {
      client_id,
      redirect_uri,
      user_id: user.id,
      error: validation.error,
      error_description: validation.error_description,
    })
    return res.status(400).json({
      error: validation.error,
      error_description: validation.error_description,
    })
  }

  const { client, finalScope } = validation

  const internalAccess = await checkInternalClientAccess(client, user.id)
  if (!internalAccess.allowed) {
    logger.warn('Authorization approval rejected: internal client access denied', {
      client_id,
      user_id: user.id,
    })
    return res.status(403).json({
      error: internalAccess.error,
      error_description: internalAccess.error_description,
    })
  }

  try {
    // Generate authorization code
    const code = await createAuthorizationCode({
      client_id,
      user_id: user.id,
      redirect_uri,
      scope: finalScope,
      nonce, // Include nonce for OIDC ID token validation
      code_challenge,
      code_challenge_method: code_challenge_method || 'S256',
    })

    logger.info('Authorization code issued (post-consent)', {
      client_id,
      user_id: user.id,
      scope: finalScope,
      code_prefix: code.substring(0, 8) + '...',
    })

    return res.status(200).json({
      code,
      state,
    })
  } catch (error) {
    logger.error('Failed to generate authorization code', {
      error: error.message,
      user_id: user.id,
      client_id,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
}
