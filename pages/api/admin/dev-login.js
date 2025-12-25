/**
 * pages/api/admin/dev-login.js — Development-only passwordless admin login
 * WHAT: Allows signing in with email only when ADMIN_DEV_BYPASS is enabled and not in production.
 * WHY: Speed up development without weakening production security.
 */
import { setAdminSessionCookie, clearAdminSessionCookie } from '../../../../lib/auth.mjs'
import { findUserByEmail, createUser, ensureUserUuid } from '../../../lib/users.mjs'
import { generateMD5StylePassword } from '../../../lib/resourcePasswords.mjs'
import { createSession } from '../../../lib/sessions.mjs'

function devBypassEnabled() {
  const flag = (process.env.ADMIN_DEV_BYPASS || '').toLowerCase()
  const enabled = flag === '1' || flag === 'true' || flag === 'yes'
  return enabled && process.env.NODE_ENV !== 'production'
}

export default async function handler(req, res) {
  if (!devBypassEnabled()) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(403).json({ error: 'Dev bypass disabled' })
  }

  if (req.method === 'POST') {
    try {
      const emailRaw = (req.body?.email || '').toString()
      const email = emailRaw.toLowerCase().trim()
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' })
      }

      // Find or create the admin user
      let user = await findUserByEmail(email)
      if (!user) {
        const name = email.split('@')[0]
        const role = (process.env.ADMIN_DEV_ROLE || 'super-admin').trim() || 'super-admin'
        const password = generateMD5StylePassword()
        user = await createUser({ email, name, role, password })
      }

      user = await ensureUserUuid(user)

      // Create session in database (stores hashed token, enables revocation)
      const metadata = {
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null,
      }
      
      const sessionData = await createSession(
        user.id,
        user.email,
        user.role || 'super-admin',
        4 * 60 * 60, // 4 hours (consistent with security hardening)
        metadata
      )

      // Create cookie with session token
      const tokenData = {
        token: sessionData.token,
        expiresAt: sessionData.expiresAt,
        userId: user.id,
        role: user.role || 'super-admin',
      }
      const signedToken = Buffer.from(JSON.stringify(tokenData)).toString('base64')
      setAdminSessionCookie(res, signedToken, 4 * 60 * 60)

      return res.status(200).json({ success: true, devBypass: true, message: 'Dev bypass login successful' })
    } catch (error) {
      const msg = (error && (error.message || error.toString())) || ''
      if (msg.includes('MONGODB_URI is required')) {
        return res.status(503).json({ error: 'Service unavailable: database not configured' })
      }
      if (msg.includes('MongoServerSelectionError') || msg.toLowerCase().includes('server selection')) {
        return res.status(503).json({ error: 'Service unavailable: database unreachable' })
      }
      console.error('Dev login error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      clearAdminSessionCookie(res)
      return res.status(200).json({ success: true, message: 'Logged out (dev bypass)' })
    } catch (error) {
      console.error('Dev logout error:', error)
      return res.status(500).json({ error: 'Logout failed' })
    }
  }

  res.setHeader('Allow', 'POST, DELETE')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}