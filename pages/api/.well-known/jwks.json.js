/**
 * JWKS (JSON Web Key Set) Endpoint
 * 
 * GET /.well-known/jwks.json
 * 
 * This endpoint exposes the public keys used to sign JWTs.
 * Clients and resource servers use this to verify JWT signatures.
 * 
 * The response contains an array of JWKs (JSON Web Keys) in the
 * standard format defined by RFC 7517.
 * 
 * Example response:
 * {
 *   "keys": [
 *     {
 *       "kty": "RSA",
 *       "use": "sig",
 *       "kid": "sso-2025",
 *       "alg": "RS256",
 *       "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx...",
 *       "e": "AQAB"
 *     }
 *   ]
 * }
 * 
 * Spec: https://tools.ietf.org/html/rfc7517
 */

import { getJwks } from '../../../lib/oauth/jwks.mjs'
import { runCors } from '../../../lib/cors.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get JWKS
    const jwks = getJwks()

    // Set cache headers (public keys can be cached for a long time)
    res.setHeader('Cache-Control', 'public, max-age=86400') // 24 hours
    res.setHeader('Content-Type', 'application/json')

    logger.info('JWKS requested', {
      key_count: jwks.keys.length,
    })

    return res.status(200).json(jwks)
  } catch (error) {
    logger.error('JWKS endpoint error', {
      error: error.message,
    })

    return res.status(500).json({
      error: 'Internal server error',
      error_description: 'Failed to retrieve public keys',
    })
  }
}
