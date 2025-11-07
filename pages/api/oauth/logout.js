/**
 * OAuth2 Logout Endpoint
 * 
 * GET /api/oauth/logout - Logout user and redirect back to client
 * 
 * WHAT: Handles logout for OAuth clients (e.g., Launchmass)
 * WHY: Third-party apps need to trigger SSO logout and redirect users back
 * HOW: Clears public session cookie, revokes session in DB, redirects to client
 * 
 * Query Parameters:
 * - post_logout_redirect_uri: URL to redirect user after logout (required)
 * - client_id: OAuth client ID (optional, for validation)
 * - state: Opaque state value to pass back to client (optional)
 * 
 * Security:
 * - Validates post_logout_redirect_uri against client's registered redirect URIs
 * - Prevents open redirect vulnerabilities
 * - Always clears session even if redirect validation fails
 */

import { getPublicUserFromRequest, revokePublicSession, clearPublicSessionCookie } from '../../../lib/publicSessions.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    post_logout_redirect_uri,
    client_id,
    state,
  } = req.query

  try {
    // WHAT: Get current user session before destroying it
    const user = await getPublicUserFromRequest(req)
    
    // WHAT: Revoke session in database
    // WHY: Prevent the session token from being used again
    if (user) {
      // Parse token from cookie
      const cookieHeader = req.headers.cookie || ''
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [key, ...val] = c.trim().split('=')
          return [key, val.join('=')]
        })
      )
      
      const sessionCookieName = process.env.PUBLIC_SESSION_COOKIE || 'public-session'
      const token = cookies[sessionCookieName]
      
      if (token) {
        await revokePublicSession(token)
      }
      
      logger.info('OAuth logout', {
        userId: user.id,
        email: user.email,
        client_id,
        redirect_uri: post_logout_redirect_uri,
      })
    }
    
    // WHAT: Clear the session cookie
    // WHY: Browser should forget the session immediately
    clearPublicSessionCookie(res)
    
    // WHAT: Validate and redirect to post_logout_redirect_uri
    // WHY: Return user to the app they logged out from
    if (post_logout_redirect_uri) {
      // WHAT: Validate redirect URI if client_id is provided
      // WHY: Prevent open redirect attacks
      if (client_id) {
        const db = await getDb()
        const client = await db.collection('oauthClients').findOne({ id: client_id })
        
        if (client) {
          // Check if redirect URI matches any registered redirect URI
          const isValidRedirect = client.redirectUris.some(uri => {
            // Allow exact match or same origin
            if (uri === post_logout_redirect_uri) return true
            
            try {
              const registeredUrl = new URL(uri)
              const redirectUrl = new URL(post_logout_redirect_uri)
              return registeredUrl.origin === redirectUrl.origin
            } catch {
              return false
            }
          })
          
          if (!isValidRedirect) {
            logger.warn('Invalid post_logout_redirect_uri', {
              client_id,
              provided: post_logout_redirect_uri,
              registered: client.redirectUris,
            })
            
            // WHAT: Redirect to safe fallback instead
            // WHY: User is already logged out, just send them somewhere safe
            return res.redirect(302, '/')
          }
        }
      }
      
      // WHAT: Build final redirect URL with state if provided
      // WHY: State helps client app match logout request to response
      let redirectUrl = post_logout_redirect_uri
      if (state) {
        const separator = redirectUrl.includes('?') ? '&' : '?'
        redirectUrl = `${redirectUrl}${separator}state=${encodeURIComponent(state)}`
      }
      
      return res.redirect(302, redirectUrl)
    }
    
    // WHAT: No redirect URI provided, send to homepage
    // WHY: User is logged out but has nowhere to go
    return res.redirect(302, '/')
    
  } catch (error) {
    logger.error('OAuth logout error', {
      error: error.message,
      stack: error.stack,
      client_id,
    })
    
    // WHAT: Still clear cookie even on error
    // WHY: Logout should always succeed from user's perspective
    clearPublicSessionCookie(res)
    
    // WHAT: Redirect to safe location
    if (post_logout_redirect_uri) {
      return res.redirect(302, post_logout_redirect_uri)
    }
    
    return res.redirect(302, '/')
  }
}
