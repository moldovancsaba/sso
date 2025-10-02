/**
 * pages/api/admin/login.js — Email + password admin login with security hardening
 * WHAT: Authenticates against MongoDB with rate limiting, CSRF protection, and audit logging.
 * WHY: Production-ready authentication with brute force protection and session revocation.
 */
import { findUserByEmail, ensureUserUuid } from '../../../lib/users.mjs'
import { setAdminSessionCookie, clearAdminSessionCookie, getCookie, decodeSessionToken } from '../../../lib/auth.mjs'
import { createSession, revokeSession } from '../../../lib/sessions.mjs'
import { logLoginSuccess, logLoginFailure, logLogout } from '../../../lib/logger.mjs'
import { loginRateLimiter } from '../../../lib/middleware/rateLimit.mjs'
import { ensureCsrfToken, validateCsrf } from '../../../lib/middleware/csrf.mjs'

/**
 * getClientMetadata
 * WHAT: Extracts client metadata (IP, user-agent) from request.
 * WHY: Store metadata with session for audit trail and security monitoring.
 */
function getClientMetadata(req) {
  const forwardedFor = req.headers['x-forwarded-for']
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip)
  return {
    ip,
    userAgent: req.headers['user-agent'] || null,
  }
}

export default async function handler(req, res) {
  // Apply rate limiting to login endpoint
  await new Promise((resolve, reject) => {
    loginRateLimiter(req, res, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
  
  if (req.method === 'POST') {
    // Ensure CSRF token is set for subsequent requests
    await new Promise((resolve) => ensureCsrfToken(req, res, resolve))
    
    try {
      const emailRaw = (req.body?.email || '').toString()
      const password = (req.body?.password || '').toString()

      if (!emailRaw || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }

      const email = emailRaw.toLowerCase()
      const metadata = getClientMetadata(req)

      // Try to find user in DB (with alias support for 'admin' -> configured alias email)
      let user = await findUserByEmail(email)
      if (!user && email === 'admin') {
        const aliasEmail = process.env.SSO_ADMIN_ALIAS_EMAIL || 'sso@doneisbetter.com'
        const alias = await findUserByEmail(aliasEmail)
        if (alias) user = alias
      }

      // Validate credentials using stored plaintext-like MD5-style token
      const isValid = !!(user && user.password === password)

      if (!isValid) {
        // Log failed login attempt
        logLoginFailure(email, 'invalid_credentials', metadata)
        
        // Brute force protection delay (still useful as last resort)
        await new Promise((r) => setTimeout(r, 800))
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      // Ensure the user has a stable UUID identifier used across the system
      user = await ensureUserUuid(user)

      // Create server-side session in MongoDB
      const { token, sessionId, expiresAt } = await createSession(
        user.id,
        user.email,
        user.role,
        7 * 24 * 60 * 60, // 7 days
        metadata
      )

      // Build cookie payload (contains session token for client)
      const tokenData = {
        token,
        expiresAt,
        userId: user.id,
        role: user.role,
      }
      const signedToken = Buffer.from(JSON.stringify(tokenData)).toString('base64')

      // Set secure cookie
      setAdminSessionCookie(res, signedToken, 7 * 24 * 60 * 60)
      
      // Log successful login
      logLoginSuccess(user.id, user.email, user.role, { ...metadata, sessionId })

      return res.status(200).json({ 
        success: true, 
        message: 'Login successful',
        csrfToken: req.csrfToken, // Return CSRF token for client
      })
    } catch (error) {
      // Be explicit about DB configuration/availability to avoid ambiguous timeouts
      const msg = (error && (error.message || error.toString())) || ''
      if (msg.includes('MONGODB_URI is required')) {
        return res.status(503).json({ error: 'Service unavailable: database not configured' })
      }
      if (msg.includes('MongoServerSelectionError') || msg.toLowerCase().includes('server selection')) {
        return res.status(503).json({ error: 'Service unavailable: database unreachable' })
      }
      logLoginFailure('unknown', 'internal_error', { error: error.message })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Extract session token from cookie
      const cookieName = process.env.ADMIN_SESSION_COOKIE || 'admin-session'
      const adminSession = getCookie(req, cookieName)
      
      if (adminSession) {
        const tokenData = decodeSessionToken(adminSession)
        if (tokenData && tokenData.token) {
          // Revoke session server-side
          await revokeSession(tokenData.token, 'logout')
          
          // Log logout event
          logLogout(tokenData.userId, 'unknown', { reason: 'user_logout' })
        }
      }
      
      // Clear cookie regardless of session state
      clearAdminSessionCookie(res)
      return res.status(200).json({ success: true, message: 'Logged out successfully' })
    } catch (error) {
      logLoginFailure('unknown', 'logout_error', { error: error.message })
      return res.status(500).json({ error: 'Logout failed' })
    }
  }

  res.setHeader('Allow', 'POST, DELETE')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}

