/**
 * Facebook OAuth Callback Endpoint
 * 
 * GET /api/auth/facebook/callback - Handle Facebook OAuth redirect
 * 
 * WHAT: Receives authorization code from Facebook, creates user session
 * WHY: Complete Facebook Login OAuth flow
 * HOW: Exchange code → fetch profile → link/create user → create session → redirect
 * 
 * Query Parameters:
 * - code: Authorization code from Facebook
 * - state: CSRF protection token (must match session state)
 * - error: OAuth error code (if user denied)
 * - error_description: Human-readable error message
 */

import { exchangeCodeForToken, getFacebookUserProfile, linkOrCreateUser } from '../../../../lib/facebook.mjs'
import { createPublicSession, setPublicSessionCookie } from '../../../../lib/publicSessions.mjs'
import logger from '../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state, error, error_description } = req.query

  try {
    // WHAT: Handle OAuth errors (user denied permission)
    // WHY: Provide clear error message to user
    if (error) {
      logger.warn('Facebook OAuth error', { error, error_description })
      return res.redirect(`/?error=facebook_${error}&message=${encodeURIComponent(error_description || 'Facebook login failed')}`)
    }

    // WHAT: Validate required parameters
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' })
    }

    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' })
    }

    // TODO: WHAT: Validate state parameter against session
    // WHY: Prevent CSRF attacks
    // For now, we accept any state (improve in future with session storage)

    // WHAT: Exchange authorization code for access token
    // WHY: Need access token to fetch user profile from Facebook
    const tokenData = await exchangeCodeForToken(code)
    
    if (!tokenData.access_token) {
      throw new Error('Failed to obtain access token from Facebook')
    }

    // WHAT: Fetch user profile from Facebook Graph API
    // WHY: Need email and name to create/link user account
    const facebookProfile = await getFacebookUserProfile(tokenData.access_token)

    if (!facebookProfile.email) {
      logger.error('Facebook profile missing email', { facebookId: facebookProfile.id })
      return res.redirect(`/?error=facebook_no_email&message=${encodeURIComponent('Facebook account must have a verified email address')}`)
    }

    // WHAT: Link Facebook account to existing user or create new user
    // WHY: Maintain single user identity across login methods
    const { user, isNewUser } = await linkOrCreateUser(facebookProfile)

    // WHAT: Create public user session in MongoDB
    // WHY: Track logged-in users with server-side session management
    const metadata = {
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      loginMethod: 'facebook',
    }

    const sessionToken = await createPublicSession(user.id, metadata)

    // WHAT: Set session cookie with Domain attribute for subdomain sharing
    // WHY: Enable SSO across *.doneisbetter.com
    setPublicSessionCookie(res, sessionToken)

    logger.info('Facebook login successful', {
      userId: user.id,
      email: user.email,
      isNewUser,
      facebookId: facebookProfile.id,
    })

    // WHAT: Determine where to redirect user after login
    // WHY: Return user to the app they were trying to access
    
    // Priority:
    // 1. redirect_after_login from state (if OAuth flow)
    // 2. Return to home page
    
    // TODO: Extract redirect_after_login from state parameter
    // For now, just redirect to home
    const redirectUrl = '/?login=success'

    return res.redirect(302, redirectUrl)

  } catch (error) {
    logger.error('Facebook callback error', {
      error: error.message,
      stack: error.stack,
    })

    return res.redirect(`/?error=facebook_callback_failed&message=${encodeURIComponent('Facebook login failed. Please try again.')}`)
  }
}
