/**
 * OAuth2 Token Revocation Endpoint
 * 
 * POST /api/oauth/revoke - Revoke an access or refresh token
 * 
 * Allows clients to revoke tokens when they're no longer needed.
 * This is important for security (e.g., when user logs out).
 * 
 * Request Body:
 * - token: The token to revoke (access_token or refresh_token)
 * - token_type_hint: Optional hint about token type ("access_token" or "refresh_token")
 * - client_id: OAuth client ID
 * - client_secret: OAuth client secret
 */

import { verifyClient } from '../../../lib/oauth/clients.mjs'
import { revokeRefreshToken } from '../../../lib/oauth/tokens.mjs'
import logger from '../../../lib/logger.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    token,
    token_type_hint,
    client_id,
    client_secret,
  } = req.body

  // Validate required parameters
  if (!token) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'token is required',
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

  try {
    // Authenticate client
    const client = await verifyClient(client_id, client_secret)
    if (!client) {
      logger.warn('Token revocation: invalid client credentials', { client_id })
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      })
    }

    // Attempt to revoke the token
    // Note: Access tokens are stateless JWTs, so we can only revoke refresh tokens
    // For access tokens, we rely on their short expiration time (1 hour)
    
    if (token_type_hint === 'refresh_token' || !token_type_hint) {
      const revoked = await revokeRefreshToken(token, 'client_revocation')
      
      if (revoked) {
        logger.info('Token revoked', {
          client_id,
          token_type: 'refresh_token',
        })
      }
    }

    // Always return 200 OK (per OAuth2 spec, even if token wasn't found)
    return res.status(200).json({})

  } catch (error) {
    logger.error('Token revocation error', {
      error: error.message,
      client_id,
    })

    // Per OAuth2 spec, still return 200 even on error
    // (to prevent token scanning attacks)
    return res.status(200).json({})
  }
}
