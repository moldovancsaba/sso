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
    const { oauth_request, state } = req.query

    // WHAT: Generate CSRF protection state token
    // WHY: Prevent CSRF attacks by validating state on callback
    const csrfToken = randomBytes(16).toString('hex')

    // WHAT: Determine redirect URI based on environment
    // WHY: Support localhost testing while keeping production secure
    const host = req.headers.host || ''
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = host.includes('localhost') 
      ? `${protocol}://${host}/api/auth/google/callback`
      : process.env.GOOGLE_REDIRECT_URI

    // WHAT: Build Google OAuth authorization URL with OAuth request
    // WHY: Need to preserve OAuth flow context through Google redirect
    // HOW: Pass oauth_request to getGoogleAuthUrl, which encodes it in state parameter
    // Extract admin_login flag from state if present
    let adminLogin = false
    if (state) {
      try {
        const stateJson = Buffer.from(state, 'base64url').toString('utf-8')
        const stateData = JSON.parse(stateJson)
        adminLogin = stateData.admin_login === true
      } catch {}
    }

    let googleAuthUrl = getGoogleAuthUrl(csrfToken, oauth_request, redirectUri)
    
    // Add admin_login flag to state if needed
    if (adminLogin) {
      const url = new URL(googleAuthUrl)
      const existingState = url.searchParams.get('state')
      const stateData = JSON.parse(Buffer.from(existingState, 'base64url').toString('utf-8'))
      stateData.admin_login = true
      url.searchParams.set('state', Buffer.from(JSON.stringify(stateData)).toString('base64url'))
      googleAuthUrl = url.toString()
    }

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
