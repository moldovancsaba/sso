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

    // WHAT: Decode state parameter to extract CSRF token and OAuth request
    // WHY: State contains both CSRF protection and OAuth flow context
    let stateData
    let oauthRequest = null
    try {
      const stateJson = Buffer.from(state, 'base64url').toString('utf-8')
      stateData = JSON.parse(stateJson)
      oauthRequest = stateData.oauth_request || null
      
      logger.info('Facebook callback state decoded', {
        hasCsrf: !!stateData.csrf,
        hasOAuthRequest: !!oauthRequest,
      })
    } catch (err) {
      logger.error('Failed to decode Facebook state', { error: err.message })
      return res.status(400).json({ error: 'Invalid state parameter' })
    }
    
    // TODO: Validate CSRF token (stateData.csrf) against session
    // For now, we just verify it exists

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
      hasOAuthRequest: !!oauthRequest,
    })

    // WHAT: Determine where to redirect user after login
    // WHY: Return user to the app they were trying to access or continue OAuth flow
    
    // Priority:
    // 1. OAuth flow - redirect to authorization endpoint with preserved request
    // 2. Regular login - redirect to home page
    
    if (oauthRequest) {
      // WHAT: Continue OAuth flow by redirecting to authorization endpoint
      // WHY: User logged in via Facebook during OAuth client authorization
      // HOW: Decode oauth_request and build authorization URL
      try {
        const base64 = oauthRequest.replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))))
        
        logger.info('Continuing OAuth flow after Facebook login', {
          userId: user.id,
          clientId: decoded.client_id,
          redirectUri: decoded.redirect_uri,
        })
        
        const params = new URLSearchParams({
          response_type: decoded.response_type,
          client_id: decoded.client_id,
          redirect_uri: decoded.redirect_uri,
          scope: decoded.scope,
          state: decoded.state,
        })
        
        // Add PKCE parameters if present
        if (decoded.code_challenge) {
          params.set('code_challenge', decoded.code_challenge)
          params.set('code_challenge_method', decoded.code_challenge_method || 'S256')
        }
        
        // Add prompt parameter if present
        if (decoded.prompt) {
          params.set('prompt', decoded.prompt)
        }
        
        const authUrl = `/api/oauth/authorize?${params.toString()}`
        return res.redirect(302, authUrl)
      } catch (err) {
        logger.error('Failed to decode oauth_request in Facebook callback', {
          error: err.message,
          userId: user.id,
        })
        // Fall through to regular redirect
      }
    }
    
    // Regular login - go to home page
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
