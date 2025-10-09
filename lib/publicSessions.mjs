// WHAT: Public user session management for SSO service
// WHY: Separate session handling for public users (different cookie, different collection)
// Strategic: Keep public user sessions separate from admin sessions for security

import { randomBytes, createHash } from 'crypto'
import { getDb } from './db.mjs'
import logger from './logger.mjs'

const SESSION_COOKIE_NAME = process.env.PUBLIC_SESSION_COOKIE || 'user-session'
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * WHAT: Create a new public user session
 * WHY: Track logged-in public users with HttpOnly cookies
 * 
 * @param {string} userId - User UUID
 * @param {Object} metadata - { ip, userAgent }
 * @returns {Promise<string>} Session token (to be stored in cookie)
 */
export async function createPublicSession(userId, metadata = {}) {
  const db = await getDb()
  const sessionsCollection = db.collection('publicSessions')
  
  // WHAT: Generate random session token (32 bytes = 64 hex chars)
  const token = randomBytes(32).toString('hex')
  
  // WHAT: Hash token before storing (never store raw tokens)
  // WHY: If database is compromised, attacker can't use stored tokens
  const tokenHash = createHash('sha256').update(token).digest('hex')
  
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS)
  
  const session = {
    tokenHash,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastAccessedAt: now.toISOString(),
    ip: metadata.ip || null,
    userAgent: metadata.userAgent || null,
  }
  
  await sessionsCollection.insertOne(session)
  
  // WHAT: Create TTL index on expiresAt for automatic cleanup
  await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  
  logger.info('Public user session created', {
    userId,
    expiresAt: session.expiresAt,
    ip: metadata.ip,
  })
  
  // WHAT: Return raw token (to be stored in cookie)
  // WHY: Cookie will contain raw token; we compare hash on validation
  return token
}

/**
 * WHAT: Validate public user session token
 * WHY: Check if user is logged in
 * 
 * @param {string} token - Session token from cookie
 * @returns {Promise<Object|null>} { userId, session } if valid, null otherwise
 */
export async function validatePublicSession(token) {
  if (!token) return null
  
  const db = await getDb()
  const sessionsCollection = db.collection('publicSessions')
  
  // WHAT: Hash token to compare with stored hash
  const tokenHash = createHash('sha256').update(token).digest('hex')
  
  // WHAT: Find session and check if not expired
  const session = await sessionsCollection.findOne({
    tokenHash,
    expiresAt: { $gt: new Date().toISOString() },
  })
  
  if (!session) {
    return null
  }
  
  // WHAT: Update last accessed timestamp
  await sessionsCollection.updateOne(
    { _id: session._id },
    { $set: { lastAccessedAt: new Date().toISOString() } }
  )
  
  return {
    userId: session.userId,
    session: {
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastAccessedAt: session.lastAccessedAt,
    },
  }
}

/**
 * WHAT: Revoke public user session
 * WHY: Enable logout functionality
 * 
 * @param {string} token - Session token from cookie
 * @returns {Promise<boolean>} Success
 */
export async function revokePublicSession(token) {
  if (!token) return false
  
  const db = await getDb()
  const sessionsCollection = db.collection('publicSessions')
  
  const tokenHash = createHash('sha256').update(token).digest('hex')
  
  const result = await sessionsCollection.deleteOne({ tokenHash })
  
  if (result.deletedCount > 0) {
    logger.info('Public user session revoked', { tokenHash: tokenHash.substring(0, 8) + '...' })
    return true
  }
  
  return false
}

/**
 * WHAT: Revoke all sessions for a user
 * WHY: Enable "logout all devices" functionality
 * 
 * @param {string} userId - User UUID
 * @returns {Promise<number>} Number of sessions revoked
 */
export async function revokeAllUserSessions(userId) {
  const db = await getDb()
  const sessionsCollection = db.collection('publicSessions')
  
  const result = await sessionsCollection.deleteMany({ userId })
  
  logger.info('All public user sessions revoked', {
    userId,
    count: result.deletedCount,
  })
  
  return result.deletedCount
}

/**
 * WHAT: Get public user from request cookie
 * WHY: Helper for API routes to check authentication
 * 
 * @param {Object} req - Next.js request object
 * @returns {Promise<Object|null>} User object if authenticated, null otherwise
 */
export async function getPublicUserFromRequest(req) {
  // WHAT: Parse session token from cookie header
  const cookieHeader = req.headers.cookie || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
  
  const token = cookies[SESSION_COOKIE_NAME]
  if (!token) return null
  
  // WHAT: Validate session
  const sessionData = await validatePublicSession(token)
  if (!sessionData) return null
  
  // WHAT: Get user data
  const { findPublicUserById } = await import('./publicUsers.mjs')
  const user = await findPublicUserById(sessionData.userId)
  
  return user
}

/**
 * WHAT: Set public session cookie
 * WHY: Helper to set cookie with correct security attributes
 * 
 * @param {Object} res - Next.js response object
 * @param {string} token - Session token
 */
export function setPublicSessionCookie(res, token) {
  // WHAT: Determine if we're in production based on multiple indicators
  // WHY: NODE_ENV might not be set in all environments, so check domain too
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL_ENV === 'production' ||
                      process.env.VERCEL === '1' || // Vercel sets this automatically
                      (typeof window === 'undefined' && process.env.SSO_COOKIE_DOMAIN)
  
  // WHAT: Smart cookie domain detection
  // WHY: Always use .doneisbetter.com in production, even if env var not set
  let cookieDomain = process.env.SSO_COOKIE_DOMAIN
  if (!cookieDomain && (isProduction || process.env.VERCEL)) {
    cookieDomain = '.doneisbetter.com' // Default for production
  }
  
  const maxAge = SESSION_LIFETIME_MS / 1000 // Convert to seconds
  
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Max-Age=${maxAge}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
  ]
  
  // WHAT: Always set Secure and Domain in production
  // WHY: Required for cross-subdomain SSO to work
  if (isProduction || cookieDomain) {
    cookieOptions.push(`Secure`) // HTTPS only
    cookieOptions.push(`Domain=${cookieDomain}`) // Share across subdomains
  }
  
  logger.info('Setting public session cookie', { 
    cookieDomain, 
    isProduction, 
    cookiePreview: cookieOptions.join('; ').substring(0, 100) + '...'
  })
  
  res.setHeader('Set-Cookie', cookieOptions.join('; '))
}

/**
 * WHAT: Clear public session cookie
 * WHY: Helper for logout functionality
 * 
 * @param {Object} res - Next.js response object
 */
export function clearPublicSessionCookie(res) {
  // WHAT: Determine if we're in production based on multiple indicators
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL_ENV === 'production' ||
                      process.env.VERCEL === '1' ||
                      (typeof window === 'undefined' && process.env.SSO_COOKIE_DOMAIN)
  
  // WHAT: Smart cookie domain detection
  let cookieDomain = process.env.SSO_COOKIE_DOMAIN
  if (!cookieDomain && (isProduction || process.env.VERCEL)) {
    cookieDomain = '.doneisbetter.com' // Default for production
  }
  
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=`,
    `Max-Age=0`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
  ]
  
  if (isProduction || cookieDomain) {
    cookieOptions.push(`Secure`)
    cookieOptions.push(`Domain=${cookieDomain}`)
  }
  
  res.setHeader('Set-Cookie', cookieOptions.join('; '))
}
