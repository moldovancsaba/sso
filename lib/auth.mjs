/**
 * lib/auth.mjs — DB-backed admin session helpers (Pages Router)
 * WHAT: Validates the HttpOnly 'admin-session' cookie against database, fetches user from MongoDB.
 * WHY: Introduce multiple users with email+password while preserving simple cookie session model.
 * CRITICAL: Session validation now checks database state to enable revocation and proper expiration.
 */
import { findUserById } from './users.mjs'
import { validateSession } from './sessions.mjs'
import { getDb } from './db.mjs'

const COOKIE_NAME = process.env.ADMIN_SESSION_COOKIE || 'admin-session'

/**
 * decodeSessionToken
 * Decodes base64 JSON session and validates expiration.
 * Token shape: { token: string; expiresAt: string; userId: string; role: 'admin'|'user'|'none' }
 */
export function decodeSessionToken(sessionToken) {
  try {
    const json = Buffer.from(sessionToken || '', 'base64').toString()
    const tokenData = JSON.parse(json)
    if (!tokenData?.token || !tokenData?.expiresAt || !tokenData?.userId || !tokenData?.role) return null
    const expiresAt = new Date(tokenData.expiresAt)
    const now = new Date()
    if (now > expiresAt) return null
    return tokenData
  } catch {
    return null
  }
}

/**
 * getCookie
 * Returns a cookie value by name from the request.
 */
export function getCookie(req, name) {
  const raw = req.headers?.cookie || ''
  const parts = raw.split(';').map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq > 0) {
      const k = part.slice(0, eq)
      const v = part.slice(eq + 1)
      if (k === name) return decodeURIComponent(v)
    }
  }
  return undefined
}

/**
 * setAdminSessionCookie
 * Sets a secure HttpOnly session cookie on the response.
 * WHAT: Sets session cookie with Domain attribute for subdomain sharing.
 * WHY: Enable SSO across *.doneisbetter.com subdomains (cardmass, playmass, etc.).
 */
export function setAdminSessionCookie(res, signedToken, maxAgeSeconds = 30 * 24 * 60 * 60) {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
    'Path=/',
    'HttpOnly',
  ]
  
  // Set Domain for subdomain sharing (e.g., .doneisbetter.com)
  // WHY: Allows cookie to be sent to cardmass.doneisbetter.com, playmass.doneisbetter.com, etc.
  const domain = process.env.SSO_COOKIE_DOMAIN
  if (domain) {
    attrs.push(`Domain=${domain}`)
  }
  
  // SameSite=None required for cross-site SSO (with Secure flag)
  // WHY: Allows cookie to be sent in cross-site requests (SSO flow)
  if (process.env.NODE_ENV === 'production') {
    attrs.push('SameSite=None')
    attrs.push('Secure')
  } else {
    // Development: use Lax for localhost (Secure not required)
    attrs.push('SameSite=Lax')
  }
  
  attrs.push(`Max-Age=${maxAgeSeconds}`)
  res.setHeader('Set-Cookie', attrs.join('; '))
}

/**
 * clearAdminSessionCookie
 * Deletes the admin session cookie.
 * WHAT: Clears session cookie with same Domain attribute as when it was set.
 * WHY: Ensure cookie is properly cleared across all subdomains.
 */
export function clearAdminSessionCookie(res) {
  const attrs = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
  ]
  
  // Must match Domain from setAdminSessionCookie
  const domain = process.env.SSO_COOKIE_DOMAIN
  if (domain) {
    attrs.push(`Domain=${domain}`)
  }
  
  if (process.env.NODE_ENV === 'production') {
    attrs.push('SameSite=None')
    attrs.push('Secure')
  } else {
    attrs.push('SameSite=Lax')
  }
  
  attrs.push('Max-Age=0')
  res.setHeader('Set-Cookie', attrs.join('; '))
}

/**
 * getAdminUser
 * WHAT: Reads the admin-session cookie, validates it against database, then fetches the user.
 * WHY: Ensures sessions can be revoked and properly expired on the server side.
 * HOW: Validates both cookie expiration AND database session state.
 * 
 * Returns a sanitized AdminUser or null.
 */
export async function getAdminUser(req) {
  // WHAT: Extract session cookie from request
  // WHY: HttpOnly cookie contains base64-encoded session token
  const adminSession = getCookie(req, COOKIE_NAME)
  if (!adminSession) return null
  
  // WHAT: Decode and validate cookie expiration
  // WHY: Quick client-side validation before expensive DB lookup
  const tokenData = decodeSessionToken(adminSession)
  if (!tokenData) return null
  
  // WHAT: Validate session token against database
  // WHY: Ensures session hasn't been revoked and updates sliding expiration
  // CRITICAL: This fixes the 20-30 second logout issue by checking DB state
  const sessionValidation = await validateSession(tokenData.token)
  if (!sessionValidation.valid) {
    // Session is invalid, expired, or revoked in database
    return null
  }
  
  // WHAT: Fetch user from database using userId from session
  // WHY: Get current user data (name, email, role may have changed)
  const user = await findUserById(tokenData.userId)
  if (!user) return null
  
  // Map DB user to AdminUser view model; permissions derived from role
  // Role-based permissions: admin gets full control; user is limited
  const adminPermissions = ['read', 'write', 'delete', 'manage-users', 'manage-orgs', 'manage-org-users']
  const userPermissions = ['read']
  const permissions = user.role === 'admin' ? adminPermissions : userPermissions
  return {
    id: user.id || user._id?.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    permissions,
  }
}

/**
 * isAuthenticated
 * Convenience helper for boolean checks.
 */
export async function isAuthenticated(req) {
  const user = await getAdminUser(req)
  return user !== null
}

/**
 * hasPermission
 * Simplified permission check based on role+permissions.
 */
export async function hasPermission(req, permission) {
  const user = await getAdminUser(req)
  if (!user) return false
  if (user.role === 'admin') return true
  return (user.permissions || []).includes(permission)
}

/**
 * requireAdmin
 * WHAT: API route middleware that enforces admin authentication
 * WHY: Centralized auth check prevents security drift across admin endpoints
 * HOW: Validates admin session and returns user, or sends 401/403 error
 * 
 * @param {Object} req - Next.js API request
 * @param {Object} res - Next.js API response
 * @returns {Promise<Object|null>} Admin user object if authenticated, null if error sent
 */
export async function requireAdmin(req, res) {
  // WHAT: Get admin user from session cookie
  // WHY: HttpOnly cookie with Domain=.doneisbetter.com enables SSO across subdomains
  const adminUser = await getAdminUser(req)
  
  if (!adminUser) {
    // WHAT: Return 401 Unauthorized with consistent error format
    // WHY: Client code expects { error: { code, message } } shape for error handling
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Admin authentication required'
      }
    })
    return null
  }
  
  // WHAT: Check if user has admin role
  // WHY: Only admins should access these endpoints (least-privilege principle)
  if (adminUser.role !== 'admin') {
    // WHAT: Return 403 Forbidden
    // WHY: User is authenticated but lacks required role
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin role required'
      }
    })
    return null
  }
  
  // WHAT: Return admin user object for use in API handler
  // WHY: Handler needs user ID for audit trail (grantedBy, revokedBy fields)
  return adminUser
}

/**
 * UNIFIED ADMIN SYSTEM FUNCTIONS
 * 
 * WHAT: Functions for checking admin permissions via appPermissions collection
 * WHY: Unify admin and public user systems - treat SSO Admin as OAuth client
 * HOW: Check appPermissions for 'sso-admin-dashboard' client access
 */

const ADMIN_CLIENT_ID = 'sso-admin-dashboard'

/**
 * getAdminPermission
 * WHAT: Check if a user has admin access via appPermissions
 * WHY: Unified permission system - admins are regular users with special permissions
 * HOW: Query appPermissions collection for SSO Admin client access
 * 
 * @param {string} userId - User ID to check
 * @returns {Promise<{role: string}|null>} Admin permission object or null
 */
export async function getAdminPermission(userId) {
  try {
    const db = await getDb()
    const appPermissionsCollection = db.collection('appPermissions')
    
    // WHAT: Query appPermissions for SSO Admin Dashboard access
    // WHY: Admin access is managed like any other OAuth client app
    const permission = await appPermissionsCollection.findOne({
      userId,
      clientId: ADMIN_CLIENT_ID,
      status: 'approved',
      hasAccess: true,
    })
    
    if (!permission) {
      return null
    }
    
    // WHAT: Return permission object with role
    // WHY: Handler needs role for authorization
    return {
      role: permission.role || 'user', // 'admin', 'user', or 'none'
      grantedAt: permission.grantedAt,
      grantedBy: permission.grantedBy,
    }
  } catch (error) {
    console.error('Error checking admin permission:', error)
    return null
  }
}

/**
 * getPublicUserWithAdminCheck
 * WHAT: Validates public session and checks admin permissions
 * WHY: Unified system - all users (including admins) use public sessions
 * HOW: Validate public session → check appPermissions for admin access
 * 
 * @param {Object} req - Next.js API request
 * @returns {Promise<{user: Object, adminPermission: Object}|null>}
 */
export async function getPublicUserWithAdminCheck(req) {
  try {
    // WHAT: Get public user from session cookie
    // WHY: All users (including admins) login via public auth system
    const { getPublicUserFromRequest } = await import('./publicSessions.mjs')
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      return null
    }
    
    // WHAT: Check if user has admin permissions
    // WHY: Determine if this user can access admin dashboard
    const adminPermission = await getAdminPermission(user.id)
    
    if (!adminPermission) {
      return null
    }
    
    return {
      user,
      adminPermission,
    }
  } catch (error) {
    console.error('Error checking public user admin access:', error)
    return null
  }
}

/**
 * requireUnifiedAdmin
 * WHAT: API route middleware for unified admin authentication
 * WHY: New admin endpoints use public sessions + appPermissions
 * HOW: Validates public session → checks admin permission → returns user
 * 
 * @param {Object} req - Next.js API request
 * @param {Object} res - Next.js API response
 * @returns {Promise<Object|null>} User object with admin permission, or null if error sent
 */
export async function requireUnifiedAdmin(req, res) {
  // WHAT: Get public user with admin permission check
  const result = await getPublicUserWithAdminCheck(req)
  
  if (!result) {
    // WHAT: Return 401 if not logged in or no admin access
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Admin authentication required. Please login at https://sso.doneisbetter.com'
      }
    })
    return null
  }
  
  // WHAT: Check if user has admin role
  // WHY: Consolidated role system - only 'admin' role has access
  if (result.adminPermission.role !== 'admin') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin role required'
      }
    })
    return null
  }
  
  // WHAT: Return user with admin metadata
  // WHY: Handler needs user ID and role for authorization + audit trail
  return {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.adminPermission.role,
    permissions: ['read', 'write', 'delete', 'manage-users', 'manage-orgs', 'manage-org-users'],
  }
}

