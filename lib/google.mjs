/**
 * Google OAuth Integration Module
 * 
 * WHAT: Handles Google Sign-In OAuth flow for public user authentication
 * WHY: Allow users to sign in with their Google accounts instead of passwords
 * HOW: OAuth 2.0 authorization code flow with Google APIs
 * 
 * Flow:
 * 1. User clicks "Login with Google" → redirected to Google
 * 2. User authorizes app on Google
 * 3. Google redirects back with authorization code
 * 4. Exchange code for access token
 * 5. Fetch user profile from Google
 * 6. Link to existing user or create new user
 * 7. Create session and redirect to client app
 */

import { randomUUID } from 'crypto'
import { getDb } from './db.mjs'
import logger from './logger.mjs'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI

/**
 * Generate Google OAuth authorization URL
 * 
 * @param {string} csrfToken - CSRF protection token
 * @param {string} oauthRequest - Base64-encoded OAuth request from SSO authorization flow
 * @returns {string} Google authorization URL
 */
export function getGoogleAuthUrl(csrfToken, oauthRequest = null) {
  // WHAT: Encode OAuth request in state parameter
  // WHY: Google preserves state parameter, allowing us to continue OAuth flow after login
  // HOW: JSON.stringify({ csrf, oauth }) → base64url encode → pass as state
  const stateData = {
    csrf: csrfToken,
  }
  
  // Include OAuth request if present (user is logging in via OAuth client)
  if (oauthRequest) {
    stateData.oauth_request = oauthRequest
  }
  
  const stateParam = Buffer.from(JSON.stringify(stateData)).toString('base64url')
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    state: stateParam,
    scope: 'openid email profile', // Request email and basic profile (OIDC)
    response_type: 'code',
    access_type: 'online', // Don't need offline access/refresh tokens
    prompt: 'select_account', // Always show account selector
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 * 
 * @param {string} code - Authorization code from Google callback
 * @returns {Promise<{access_token: string, id_token: string, token_type: string, expires_in: number}>}
 */
export async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    code: code,
    grant_type: 'authorization_code',
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.json()
    logger.error('Google token exchange failed', { error })
    throw new Error(`Google token exchange failed: ${error.error_description || response.statusText}`)
  }

  const data = await response.json()
  
  logger.info('Google token exchanged successfully')
  
  return data
}

/**
 * Fetch user profile from Google People API
 * 
 * @param {string} accessToken - Google access token
 * @returns {Promise<{id: string, email: string, name: string, picture?: string, email_verified: boolean}>}
 */
export async function getGoogleUserProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    logger.error('Google profile fetch failed', { error })
    throw new Error(`Google profile fetch failed: ${error.error?.message || response.statusText}`)
  }

  const profile = await response.json()
  
  logger.info('Google profile fetched', {
    googleId: profile.id,
    email: profile.email,
    name: profile.name,
    emailVerified: profile.verified_email,
  })
  
  return profile
}

/**
 * Link Google account to existing user or create new user
 * 
 * WHAT: Associates Google profile with publicUser account
 * WHY: Enable Google Sign-In while maintaining existing user data
 * HOW: Match by email if exists, otherwise create new user
 * 
 * @param {object} googleProfile - Google user profile
 * @returns {Promise<{user: object, isNewUser: boolean}>}
 */
export async function linkOrCreateUser(googleProfile) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  const { id: googleId, email, name, picture, verified_email } = googleProfile
  
  if (!email) {
    throw new Error('Google profile must include email address')
  }
  
  const now = new Date().toISOString()
  
  // WHAT: Check if user already exists with this Google ID
  // WHY: User may have linked Google before
  let user = await usersCollection.findOne({
    'socialProviders.google.id': googleId
  })
  
  if (user) {
    // User already linked with Google - update last login
    await usersCollection.updateOne(
      { id: user.id },
      {
        $set: {
          'socialProviders.google.lastLoginAt': now,
          lastLoginAt: now,
        }
      }
    )
    
    logger.info('Google user logged in (existing link)', {
      userId: user.id,
      email: user.email,
      googleId,
    })
    
    return { user, isNewUser: false }
  }
  
  // WHAT: Check if user exists with same email
  // WHY: Link Google to existing email-based account
  user = await usersCollection.findOne({
    email: email.toLowerCase()
  })
  
  if (user) {
    // WHAT: Link Google to existing user account
    // WHY: Same person using different login method
    await usersCollection.updateOne(
      { id: user.id },
      {
        $set: {
          socialProviders: {
            ...user.socialProviders,
            google: {
              id: googleId,
              email,
              name,
              picture: picture || null,
              emailVerified: verified_email || false,
              linkedAt: now,
              lastLoginAt: now,
            }
          },
          lastLoginAt: now,
        }
      }
    )
    
    // Fetch updated user
    user = await usersCollection.findOne({ id: user.id })
    
    logger.info('Google linked to existing user', {
      userId: user.id,
      email: user.email,
      googleId,
    })
    
    return { user, isNewUser: false }
  }
  
  // WHAT: Create new user with Google profile
  // WHY: First time this person is logging in
  const userId = randomUUID()
  
  const newUser = {
    id: userId,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    status: 'active',
    emailVerified: verified_email || false, // Google verified their email
    socialProviders: {
      google: {
        id: googleId,
        email,
        name,
        picture: picture || null,
        emailVerified: verified_email || false,
        linkedAt: now,
        lastLoginAt: now,
      }
    },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  }
  
  await usersCollection.insertOne(newUser)
  
  logger.info('New user created via Google', {
    userId,
    email: newUser.email,
    googleId,
  })
  
  return { user: newUser, isNewUser: true }
}
