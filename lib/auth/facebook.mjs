/**
 * lib/auth/facebook.mjs
 * 
 * WHAT: Facebook OAuth 2.0 integration for SSO service
 * WHY: Enable users to sign in with their Facebook account instead of email/password
 * HOW: Use Facebook Graph API to authenticate users and fetch their profile data
 */

import logger from '../logger.mjs'

// WHAT: Facebook OAuth endpoints
// WHY: Centralized configuration for all Facebook API calls
const FACEBOOK_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth'
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token'
const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/v18.0'

/**
 * getAuthorizationUrl
 * WHAT: Generates Facebook OAuth authorization URL
 * WHY: Redirects user to Facebook login page with proper parameters
 * 
 * @param {string} state - CSRF protection token (stored in session)
 * @param {string} redirectUri - Where Facebook should redirect after login
 * @returns {string} Complete Facebook authorization URL
 */
export function getAuthorizationUrl(state, redirectUri) {
  const appId = process.env.FACEBOOK_APP_ID
  
  if (!appId) {
    throw new Error('FACEBOOK_APP_ID environment variable is not set')
  }
  
  // WHAT: Build authorization URL with required parameters
  // WHY: Facebook requires specific scope and state for security
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state: state,
    scope: 'email,public_profile', // WHAT: Request email and basic profile access
    response_type: 'code', // WHAT: Use authorization code flow (most secure)
    display: 'popup', // WHAT: Optimize for popup/modal experience
  })
  
  const url = `${FACEBOOK_AUTH_URL}?${params.toString()}`
  
  logger.info('Generated Facebook authorization URL', {
    redirectUri,
    scope: 'email,public_profile',
  })
  
  return url
}

/**
 * exchangeCodeForToken
 * WHAT: Exchange authorization code for access token
 * WHY: Access token is needed to call Facebook Graph API
 * 
 * @param {string} code - Authorization code from Facebook callback
 * @param {string} redirectUri - Must match the redirect_uri from authorization request
 * @returns {Promise<Object>} { accessToken, tokenType, expiresIn }
 */
export async function exchangeCodeForToken(code, redirectUri) {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  
  if (!appId || !appSecret) {
    throw new Error('FACEBOOK_APP_ID or FACEBOOK_APP_SECRET environment variable is not set')
  }
  
  // WHAT: Build token exchange request
  // WHY: Facebook requires app credentials and authorization code
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code: code,
    redirect_uri: redirectUri,
  })
  
  const url = `${FACEBOOK_TOKEN_URL}?${params.toString()}`
  
  try {
    // WHAT: Call Facebook token endpoint
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Facebook token exchange failed', {
        status: response.status,
        error: errorData,
      })
      throw new Error(`Facebook token exchange failed: ${errorData.error?.message || response.statusText}`)
    }
    
    const data = await response.json()
    
    // WHAT: Extract access token from response
    // WHY: This token is used to fetch user profile
    logger.info('Facebook token exchange successful', {
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    })
    
    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'bearer',
      expiresIn: data.expires_in || 5184000, // Default: 60 days
    }
  } catch (error) {
    logger.error('Failed to exchange Facebook code for token', {
      error: error.message,
      code: code.substring(0, 10) + '...', // Log partial code for debugging
    })
    throw error
  }
}

/**
 * getUserProfile
 * WHAT: Fetch user profile from Facebook Graph API
 * WHY: We need user's email, name, and ID to create/link account
 * 
 * @param {string} accessToken - Facebook access token
 * @returns {Promise<Object>} { id, email, name, picture }
 */
export async function getUserProfile(accessToken) {
  if (!accessToken) {
    throw new Error('Facebook access token is required')
  }
  
  // WHAT: Request specific fields from Facebook
  // WHY: By default, Facebook returns minimal data; we need email and picture
  const fields = 'id,email,name,picture.type(large)'
  const url = `${FACEBOOK_GRAPH_URL}/me?fields=${fields}&access_token=${accessToken}`
  
  try {
    // WHAT: Call Facebook Graph API /me endpoint
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('Facebook profile fetch failed', {
        status: response.status,
        error: errorData,
      })
      throw new Error(`Facebook profile fetch failed: ${errorData.error?.message || response.statusText}`)
    }
    
    const data = await response.json()
    
    // WHAT: Validate required fields
    // WHY: Email is mandatory for our SSO system (primary identifier)
    if (!data.id) {
      throw new Error('Facebook user ID not found in response')
    }
    
    if (!data.email) {
      logger.warn('Facebook user did not grant email permission', {
        facebookId: data.id,
        name: data.name,
      })
      throw new Error('Email permission is required. Please grant access to your email address.')
    }
    
    // WHAT: Extract and normalize user data
    // WHY: Ensure consistent data structure for our database
    const profile = {
      id: data.id, // Facebook user ID (unique, never changes)
      email: data.email.toLowerCase().trim(), // Normalize email for consistency
      name: data.name || 'Facebook User',
      picture: data.picture?.data?.url || null, // Profile picture URL
      verified: data.verified || false, // Facebook account verification status
    }
    
    logger.info('Facebook profile fetched successfully', {
      facebookId: profile.id,
      email: profile.email,
      name: profile.name,
      hasProfilePicture: !!profile.picture,
    })
    
    return profile
  } catch (error) {
    logger.error('Failed to fetch Facebook user profile', {
      error: error.message,
      accessToken: accessToken.substring(0, 10) + '...', // Log partial token for debugging
    })
    throw error
  }
}

/**
 * verifyAccessToken
 * WHAT: Verify that access token is valid and belongs to our app
 * WHY: Security - prevent token spoofing and replay attacks
 * 
 * @param {string} accessToken - Facebook access token to verify
 * @returns {Promise<boolean>} True if token is valid
 */
export async function verifyAccessToken(accessToken) {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  
  if (!appId || !appSecret || !accessToken) {
    return false
  }
  
  try {
    // WHAT: Use Facebook's debug_token endpoint to verify token
    // WHY: This confirms token is valid and issued to our app
    const appAccessToken = `${appId}|${appSecret}`
    const url = `${FACEBOOK_GRAPH_URL}/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      logger.warn('Facebook token verification failed', {
        status: response.status,
      })
      return false
    }
    
    const data = await response.json()
    
    // WHAT: Check token validity and app ID match
    // WHY: Ensure token is valid and belongs to our app (not another app's token)
    const isValid = data.data?.is_valid === true && data.data?.app_id === appId
    
    if (!isValid) {
      logger.warn('Facebook token validation failed', {
        isValid: data.data?.is_valid,
        appIdMatch: data.data?.app_id === appId,
        tokenAppId: data.data?.app_id,
        expectedAppId: appId,
      })
    }
    
    return isValid
  } catch (error) {
    logger.error('Failed to verify Facebook access token', {
      error: error.message,
    })
    return false
  }
}

/**
 * generateStateToken
 * WHAT: Generate cryptographically secure random state token
 * WHY: CSRF protection - prevents authorization code interception attacks
 * 
 * @returns {string} Base64-encoded random token
 */
export function generateStateToken() {
  // WHAT: Generate 32 random bytes
  // WHY: 32 bytes = 256 bits of entropy (sufficient for CSRF protection)
  const buffer = new Uint8Array(32)
  crypto.getRandomValues(buffer)
  
  // WHAT: Encode as base64url (URL-safe)
  // WHY: State token is passed in URL parameters
  return Buffer.from(buffer).toString('base64url')
}
