/**
 * DEBUG ENDPOINT - Test token exchange with detailed error reporting
 * This is TEMPORARY for debugging OAuth token exchange issues
 * DELETE after issue is resolved
 */

import { verifyClient } from '../../../lib/oauth/clients.mjs'
import { validateAndConsumeCode } from '../../../lib/oauth/codes.mjs'
import {
  generateAccessToken,
  generateIdToken,
  generateRefreshToken,
} from '../../../lib/oauth/tokens.mjs'
import { requiresRefreshToken, hasScope } from '../../../lib/oauth/scopes.mjs'
import logger from '../../../lib/logger.mjs'
import { getDb } from '../../../lib/db.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    code,
    redirect_uri,
    client_id,
    client_secret,
    code_verifier,
  } = req.body

  const debugInfo = {
    step: 'init',
    timestamp: new Date().toISOString(),
    input: {
      has_code: !!code,
      code_prefix: code?.substring(0, 8),
      has_redirect_uri: !!redirect_uri,
      redirect_uri,
      has_client_id: !!client_id,
      client_id,
      has_client_secret: !!client_secret,
      has_code_verifier: !!code_verifier,
    },
  }

  try {
    // Step 1: Validate required parameters
    debugInfo.step = 'validate_params'
    if (!code) {
      return res.status(400).json({ ...debugInfo, error: 'code is required' })
    }
    if (!redirect_uri) {
      return res.status(400).json({ ...debugInfo, error: 'redirect_uri is required' })
    }
    if (!client_id) {
      return res.status(400).json({ ...debugInfo, error: 'client_id is required' })
    }
    if (!client_secret) {
      return res.status(400).json({ ...debugInfo, error: 'client_secret is required' })
    }

    // Step 2: Verify client
    debugInfo.step = 'verify_client'
    const client = await verifyClient(client_id, client_secret)
    if (!client) {
      debugInfo.error = 'Invalid client credentials'
      return res.status(401).json(debugInfo)
    }
    debugInfo.client = {
      name: client.name,
      require_pkce: client.require_pkce,
    }

    // Step 3: Validate authorization code
    debugInfo.step = 'validate_code'
    const codeData = await validateAndConsumeCode({
      code,
      client_id,
      redirect_uri,
      code_verifier,
    })

    if (!codeData) {
      debugInfo.error = 'Invalid or expired authorization code'
      
      // Check if code exists in database
      const db = await getDb()
      const authCode = await db.collection('authorizationCodes').findOne({ code })
      
      if (!authCode) {
        debugInfo.code_status = 'not_found'
      } else {
        debugInfo.code_status = {
          exists: true,
          client_id: authCode.client_id,
          user_id: authCode.user_id,
          redirect_uri: authCode.redirect_uri,
          used_at: authCode.used_at,
          expires_at: authCode.expires_at,
          has_code_challenge: !!authCode.code_challenge,
        }
      }
      
      return res.status(400).json(debugInfo)
    }

    debugInfo.code_data = {
      user_id: codeData.user_id,
      client_id: codeData.client_id,
      scope: codeData.scope,
    }

    // Step 4: Generate access token
    debugInfo.step = 'generate_access_token'
    const accessToken = await generateAccessToken({
      userId: codeData.user_id,
      clientId: client_id,
      scope: codeData.scope,
    })
    debugInfo.access_token = { generated: true, expires_in: 3600 }

    // Step 5: Generate ID token if needed
    if (hasScope(codeData.scope, 'openid')) {
      debugInfo.step = 'generate_id_token'
      const idToken = await generateIdToken({
        userId: codeData.user_id,
        clientId: client_id,
        scope: codeData.scope,
      })
      debugInfo.id_token = { generated: true }
    }

    // Step 6: Generate refresh token if needed
    if (requiresRefreshToken(codeData.scope)) {
      debugInfo.step = 'generate_refresh_token'
      const refreshToken = await generateRefreshToken({
        userId: codeData.user_id,
        clientId: client_id,
        scope: codeData.scope,
        accessTokenJti: accessToken.jti,
      })
      debugInfo.refresh_token = { generated: true }
    }

    debugInfo.step = 'success'
    debugInfo.success = true

    return res.status(200).json(debugInfo)

  } catch (error) {
    debugInfo.step = 'error'
    debugInfo.error = error.message
    debugInfo.stack = error.stack
    
    logger.error('Debug token exchange error', debugInfo)

    return res.status(500).json(debugInfo)
  }
}
