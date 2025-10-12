/**
 * lib/auth.mjs — DB-backed admin session helpers (Pages Router)
 * WHAT: Validates the HttpOnly 'admin-session' cookie, fetches user from MongoDB, exposes auth helpers.
 * WHY: Introduce multiple users with email+password while preserving simple cookie session model.
 */
import { findUserById } from './users.mjs'

const COOKIE_NAME = process.env.ADMIN_SESSION_COOKIE || 'admin-session'

/**
 * decodeSessionToken
 * Decodes base64 JSON session and validates expiration.
 * Token shape: { token: string; expiresAt: string; userId: string; role: 'admin'|'super-admin' }
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
 * Reads the admin-session cookie, validates it, then fetches the user from DB.
 * Returns a sanitized AdminUser or null.
 */
export async function getAdminUser(req) {
  const adminSession = getCookie(req, COOKIE_NAME)
  if (!adminSession) return null
  const tokenData = decodeSessionToken(adminSession)
  if (!tokenData) return null
  const user = await findUserById(tokenData.userId)
  if (!user) return null
  // Map DB user to AdminUser view model; permissions derived from role
  // Role-based permissions: super-admin gets full control; admin limited by least-privilege
  const superAdminPermissions = ['read', 'write', 'delete', 'manage-users', 'manage-orgs', 'manage-org-users']
  const adminPermissions = ['read', 'write', 'manage-users']
  const permissions = user.role === 'super-admin' ? superAdminPermissions : adminPermissions
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
  if (user.role === 'super-admin') return true
  return (user.permissions || []).includes(permission)
}

