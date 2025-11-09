/**
 * Facebook Login Initiation Endpoint
 * 
 * GET /api/auth/facebook/login - Redirect user to Facebook OAuth
 * 
 * WHAT: Initiates Facebook OAuth flow by redirecting to Facebook
 * WHY: Allow users to sign in with Facebook
 * HOW: Generate state token, build Facebook auth URL, redirect
 * 
 * Query Parameters:
 * - redirect_after_login: URL to redirect user after successful login (optional)
 */

import { randomBytes } from 'crypto'
import { getFacebookAuthUrl } from '../../../../lib/facebook.mjs'
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

    // WHAT: Build Facebook OAuth authorization URL with OAuth request
    // WHY: Need to preserve OAuth flow context through Facebook redirect
    // HOW: Pass oauth_request to getFacebookAuthUrl, which encodes it in state parameter
    const facebookAuthUrl = getFacebookAuthUrl(csrfToken, oauth_request)

    logger.info('Initiating Facebook login', {
      csrf: csrfToken,
      hasOAuthRequest: !!oauth_request,
    })

    // WHAT: Redirect user to Facebook OAuth page
    // WHY: Start the OAuth flow
    return res.redirect(302, facebookAuthUrl)

  } catch (error) {
    logger.error('Facebook login initiation error', {
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      error: 'Failed to initiate Facebook login',
      message: error.message,
    })
  }
}
