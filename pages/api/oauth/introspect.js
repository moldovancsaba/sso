/**
 * OAuth2 Token Introspection Endpoint
 * 
 * POST /api/oauth/introspect - Validate and get metadata about a token
 * 
 * This endpoint allows resource servers to validate access tokens
 * and get information about them (user, scopes, expiration, etc.).
 * 
 * Request Body:
 * - token: The token to introspect (access_token or refresh_token)
 * - token_type_hint: Optional hint about token type
 * - client_id: OAuth client ID
 * - client_secret: OAuth client secret
 * 
 * Response:
 * - active: Boolean indicating if token is valid and active
 * - scope: Space-separated list of scopes
 * - client_id: Client the token was issued to
 * - username: User identifier
 * - token_type: Type of token
 * - exp: Expiration timestamp (seconds since epoch)
 * - iat: Issued at timestamp
 * - sub: Subject (user ID)
 */

import { verifyClient } from '../../../lib/oauth/clients.mjs'
import { verifyAccessToken, verifyRefreshToken } from '../../../lib/oauth/tokens.mjs'
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
      logger.warn('Token introspection: invalid client credentials', { client_id })
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      })
    }

    // Try to introspect as access token first
    if (token_type_hint === 'access_token' || !token_type_hint) {
      const accessTokenData = await verifyAccessToken(token)
      
      if (accessTokenData) {
        // Token is valid
        logger.info('Token introspection: valid access token', {
          client_id,
          jti: accessTokenData.jti,
        })

        return res.status(200).json({
          active: true,
          scope: accessTokenData.scope,
          client_id: accessTokenData.client_id || accessTokenData.aud,
          username: accessTokenData.sub,
          token_type: 'Bearer',
          exp: accessTokenData.exp,
          iat: accessTokenData.iat,
          sub: accessTokenData.sub,
          aud: accessTokenData.aud,
          iss: accessTokenData.iss,
          jti: accessTokenData.jti,
        })
      }
    }

    // Try as refresh token
    if (token_type_hint === 'refresh_token' || !token_type_hint) {
      const refreshTokenData = await verifyRefreshToken(token)
      
      if (refreshTokenData) {
        // Token is valid
        logger.info('Token introspection: valid refresh token', {
          client_id,
        })

        const expiresAt = new Date(refreshTokenData.expires_at)
        const exp = Math.floor(expiresAt.getTime() / 1000)
        const createdAt = new Date(refreshTokenData.created_at)
        const iat = Math.floor(createdAt.getTime() / 1000)

        return res.status(200).json({
          active: true,
          scope: refreshTokenData.scope,
          client_id: refreshTokenData.client_id,
          username: refreshTokenData.user_id,
          token_type: 'refresh_token',
          exp,
          iat,
          sub: refreshTokenData.user_id,
        })
      }
    }

    // Token is not valid or not found
    logger.info('Token introspection: inactive token', { client_id })
    
    return res.status(200).json({
      active: false,
    })

  } catch (error) {
    logger.error('Token introspection error', {
      error: error.message,
      client_id,
    })

    // Return inactive on error (safe default)
    return res.status(200).json({
      active: false,
    })
  }
}
