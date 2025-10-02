/**
 * OAuth2 Authorization Code Generation (Post-Consent)
 * 
 * POST /api/oauth/authorize/approve - Generate authorization code after user consent
 * 
 * This endpoint is called by the consent UI after the user approves access.
 * It generates an authorization code that the client can exchange for tokens.
 */

import { getAdminUser } from '../../../../lib/auth.mjs'
import { createAuthorizationCode } from '../../../../lib/oauth/codes.mjs'
import logger from '../../../../lib/logger.mjs'
import { runCors } from '../../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Authenticate user
  const user = await getAdminUser(req)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
  } = req.body

  // Validate required parameters
  if (!client_id || !redirect_uri || !scope || !state || !code_challenge) {
    return res.status(400).json({
      error: 'Missing required parameters',
    })
  }

  try {
    // Generate authorization code
    const code = await createAuthorizationCode({
      client_id,
      user_id: user.id,
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method: code_challenge_method || 'S256',
    })

    logger.info('Authorization code issued (post-consent)', {
      client_id,
      user_id: user.id,
      scope,
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
