/**
 * Unified Authentication Helper
 * 
 * WHAT: Provides a single function to check both admin and public user sessions
 * WHY: OAuth endpoints need to support both admin and public users for authorization flows
 * HOW: Checks admin session first, then public session, returns user with type indicator
 * 
 * This helper is specifically for OAuth flow endpoints that need to support both user types.
 * For admin-only or public-only endpoints, use the specific helpers from auth.mjs or publicSessions.mjs.
 */

import { getAdminUser } from './auth.mjs'
import { getPublicUserFromRequest } from './publicSessions.mjs'

/**
 * getAuthenticatedUser
 * 
 * WHAT: Checks both admin and public user sessions in a single call
 * WHY: OAuth authorization flows need to work for both user types
 * HOW: Try admin session first, then public session
 * 
 * @param {IncomingMessage} req - HTTP request object
 * @returns {Promise<{user: object, userType: 'admin'|'public'}|null>} - User object with type indicator, or null
 * 
 * Example usage in OAuth endpoints:
 * ```
 * const auth = await getAuthenticatedUser(req)
 * if (!auth) {
 *   // Redirect to login with OAuth params preserved
 *   return res.redirect(...)
 * }
 * 
 * // Use auth.user for user data
 * // Use auth.userType to know which type of user ('admin' or 'public')
 * const userId = auth.user.id
 * ```
 */
export async function getAuthenticatedUser(req) {
  // WHAT: Check admin session first
  // WHY: Admins may need to authorize OAuth clients during development/testing
  // HOW: Use existing getAdminUser helper from auth.mjs
  const adminUser = await getAdminUser(req)
  if (adminUser) {
    return {
      user: adminUser,
      userType: 'admin'
    }
  }

  // WHAT: Check public user session if no admin session
  // WHY: Most OAuth authorization flows will be for public users
  // HOW: Use existing getPublicUserFromRequest helper from publicSessions.mjs
  const publicUser = await getPublicUserFromRequest(req)
  if (publicUser) {
    return {
      user: publicUser,
      userType: 'public'
    }
  }

  // WHAT: Return null if no session found
  // WHY: Caller can redirect to login or return 401
  return null
}

/**
 * requireAuthentication
 * 
 * WHAT: Middleware-style helper that enforces authentication
 * WHY: Simplifies OAuth endpoint code by handling auth check and error response
 * HOW: Checks authentication and returns appropriate response if not authenticated
 * 
 * @param {IncomingMessage} req - HTTP request object
 * @param {ServerResponse} res - HTTP response object
 * @param {Function} handler - Async handler function to call if authenticated
 * 
 * Example usage:
 * ```
 * export default async function handler(req, res) {
 *   return requireAuthentication(req, res, async (auth) => {
 *     // auth.user and auth.userType available here
 *     // Your endpoint logic...
 *   })
 * }
 * ```
 */
export async function requireAuthentication(req, res, handler) {
  const auth = await getAuthenticatedUser(req)
  
  if (!auth) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Authentication required'
    })
  }

  return handler(auth)
}
