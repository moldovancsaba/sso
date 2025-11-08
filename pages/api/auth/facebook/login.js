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
    const { redirect_after_login } = req.query

    // WHAT: Generate CSRF protection state token
    // WHY: Prevent CSRF attacks by validating state on callback
    const state = randomBytes(16).toString('hex')

    // TODO: Store state in session/database for validation
    // For now, we just generate it (improve security later)

    // WHAT: Build Facebook OAuth authorization URL
    // WHY: Redirect user to Facebook to authorize our app
    const facebookAuthUrl = getFacebookAuthUrl(state, redirect_after_login)

    logger.info('Initiating Facebook login', {
      state,
      redirectAfterLogin: redirect_after_login || 'none',
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
