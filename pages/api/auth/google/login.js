/**
 * Google Login Initiation Endpoint
 * 
 * GET /api/auth/google/login - Redirect user to Google OAuth
 * 
 * WHAT: Initiates Google OAuth flow by redirecting to Google
 * WHY: Allow users to sign in with Google
 * HOW: Generate state token, build Google auth URL, redirect
 * 
 * Query Parameters:
 * - oauth_request: Base64-encoded OAuth request (optional)
 */

import { randomBytes } from 'crypto'
import { getGoogleAuthUrl } from '../../../../lib/google.mjs'
import logger from '../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { oauth_request } = req.query

    // WHAT: Generate CSRF protection state token
    // WHY: Prevent CSRF attacks by validating state on callback
    const csrfToken = randomBytes(16).toString('hex')

    // WHAT: Build Google OAuth authorization URL with OAuth request
    // WHY: Need to preserve OAuth flow context through Google redirect
    // HOW: Pass oauth_request to getGoogleAuthUrl, which encodes it in state parameter
    const googleAuthUrl = getGoogleAuthUrl(csrfToken, oauth_request)

    logger.info('Initiating Google login', {
      csrf: csrfToken,
      hasOAuthRequest: !!oauth_request,
    })

    // WHAT: Redirect user to Google OAuth page
    // WHY: Start the OAuth flow
    return res.redirect(302, googleAuthUrl)

  } catch (error) {
    logger.error('Google login initiation error', {
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      error: 'Failed to initiate Google login',
      message: error.message,
    })
  }
}
