/**
 * Facebook OAuth Integration Module
 * 
 * WHAT: Handles Facebook Login OAuth flow for public user authentication
 * WHY: Allow users to sign in with their Facebook accounts instead of passwords
 * HOW: OAuth 2.0 authorization code flow with Facebook Graph API
 * 
 * Flow:
 * 1. User clicks "Login with Facebook" → redirected to Facebook
 * 2. User authorizes app on Facebook
 * 3. Facebook redirects back with authorization code
 * 4. Exchange code for access token
 * 5. Fetch user profile from Facebook
 * 6. Link to existing user or create new user
 * 7. Create session and redirect to client app
 */

import { randomUUID } from 'crypto'
import { getDb } from './db.mjs'
import logger from './logger.mjs'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI

/**
 * Generate Facebook OAuth authorization URL
 * 
 * @param {string} state - CSRF protection state token
 * @param {string} redirectAfterLogin - Where to send user after successful login
 * @returns {string} Facebook authorization URL
 */
export function getFacebookAuthUrl(state, redirectAfterLogin = null) {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    state: state,
    scope: 'email,public_profile', // Request email and basic profile
    response_type: 'code',
  })

  // WHAT: Store redirect destination in state for callback
  // WHY: Need to know where to send user after Facebook login completes
  if (redirectAfterLogin) {
    params.append('redirect_after_login', redirectAfterLogin)
  }

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 * 
 * @param {string} code - Authorization code from Facebook callback
 * @returns {Promise<{access_token: string, token_type: string, expires_in: number}>}
 */
export async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    code: code,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    logger.error('Facebook token exchange failed', { error })
    throw new Error(`Facebook token exchange failed: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  
  logger.info('Facebook token exchanged successfully')
  
  return data
}

/**
 * Fetch user profile from Facebook Graph API
 * 
 * @param {string} accessToken - Facebook access token
 * @returns {Promise<{id: string, email: string, name: string, picture?: object}>}
 */
export async function getFacebookUserProfile(accessToken) {
  const params = new URLSearchParams({
    fields: 'id,email,name,picture',
    access_token: accessToken,
  })

  const response = await fetch(`https://graph.facebook.com/v18.0/me?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    logger.error('Facebook profile fetch failed', { error })
    throw new Error(`Facebook profile fetch failed: ${error.error?.message || response.statusText}`)
  }

  const profile = await response.json()
  
  logger.info('Facebook profile fetched', {
    facebookId: profile.id,
    email: profile.email,
    name: profile.name,
  })
  
  return profile
}

/**
 * Link Facebook account to existing user or create new user
 * 
 * WHAT: Associates Facebook profile with publicUser account
 * WHY: Enable Facebook Login while maintaining existing user data
 * HOW: Match by email if exists, otherwise create new user
 * 
 * @param {object} facebookProfile - Facebook user profile
 * @returns {Promise<{user: object, isNewUser: boolean}>}
 */
export async function linkOrCreateUser(facebookProfile) {
  const db = await getDb()
  const usersCollection = db.collection('publicUsers')
  
  const { id: facebookId, email, name, picture } = facebookProfile
  
  if (!email) {
    throw new Error('Facebook profile must include email address')
  }
  
  const now = new Date().toISOString()
  
  // WHAT: Check if user already exists with this Facebook ID
  // WHY: User may have linked Facebook before
  let user = await usersCollection.findOne({
    'socialProviders.facebook.id': facebookId
  })
  
  if (user) {
    // User already linked with Facebook - update last login
    await usersCollection.updateOne(
      { id: user.id },
      {
        $set: {
          'socialProviders.facebook.lastLoginAt': now,
          lastLoginAt: now,
        }
      }
    )
    
    logger.info('Facebook user logged in (existing link)', {
      userId: user.id,
      email: user.email,
      facebookId,
    })
    
    return { user, isNewUser: false }
  }
  
  // WHAT: Check if user exists with same email
  // WHY: Link Facebook to existing email-based account
  user = await usersCollection.findOne({
    email: email.toLowerCase()
  })
  
  if (user) {
    // WHAT: Link Facebook to existing user account
    // WHY: Same person using different login method
    await usersCollection.updateOne(
      { id: user.id },
      {
        $set: {
          socialProviders: {
            ...user.socialProviders,
            facebook: {
              id: facebookId,
              email,
              name,
              picture: picture?.data?.url || null,
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
    
    logger.info('Facebook linked to existing user', {
      userId: user.id,
      email: user.email,
      facebookId,
    })
    
    return { user, isNewUser: false }
  }
  
  // WHAT: Create new user with Facebook profile
  // WHY: First time this person is logging in
  const userId = randomUUID()
  
  const newUser = {
    id: userId,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    status: 'active',
    emailVerified: true, // Facebook verified their email
    socialProviders: {
      facebook: {
        id: facebookId,
        email,
        name,
        picture: picture?.data?.url || null,
        linkedAt: now,
        lastLoginAt: now,
      }
    },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  }
  
  await usersCollection.insertOne(newUser)
  
  logger.info('New user created via Facebook', {
    userId,
    email: newUser.email,
    facebookId,
  })
  
  return { user: newUser, isNewUser: true }
}
