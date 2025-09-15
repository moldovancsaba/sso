/**
 * pages/api/admin/login.js — Email + password admin login (Pages Router)
 * WHAT: Authenticates against local MongoDB Users collection; preserves 'admin' alias fallback.
 * WHY: Enable multiple admin users while keeping a simple cookie session model (HttpOnly).
 */
import crypto from 'crypto'
import { findUserByEmail, ensureUserUuid } from '../../../lib/users.mjs'
import { setAdminSessionCookie, clearAdminSessionCookie } from '../../../lib/auth.mjs'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const emailRaw = (req.body?.email || '').toString()
      const password = (req.body?.password || '').toString()

      if (!emailRaw || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }

      const email = emailRaw.toLowerCase()

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
        // Simple brute force protection delay
        await new Promise((r) => setTimeout(r, 800))
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      // Ensure the user has a stable UUID identifier used across the system
      user = await ensureUserUuid(user)

      // Build session token (7 days)
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const tokenData = {
        token,
        expiresAt: expiresAt.toISOString(),
        userId: user?.id || 'admin',
        role: (user?.role || 'super-admin'),
      }

      const signedToken = Buffer.from(JSON.stringify(tokenData)).toString('base64')

      // Set secure cookie
      setAdminSessionCookie(res, signedToken, 7 * 24 * 60 * 60)

      return res.status(200).json({ success: true, token: signedToken, message: 'Login successful' })
    } catch (error) {
      // Be explicit about DB configuration/availability to avoid ambiguous timeouts
      const msg = (error && (error.message || error.toString())) || ''
      if (msg.includes('MONGODB_URI is required')) {
        return res.status(503).json({ error: 'Service unavailable: database not configured' })
      }
      if (msg.includes('MongoServerSelectionError') || msg.toLowerCase().includes('server selection')) {
        return res.status(503).json({ error: 'Service unavailable: database unreachable' })
      }
      console.error('Admin login error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      clearAdminSessionCookie(res)
      return res.status(200).json({ success: true, message: 'Logged out successfully' })
    } catch (error) {
      console.error('Admin logout error:', error)
      return res.status(500).json({ error: 'Logout failed' })
    }
  }

  res.setHeader('Allow', 'POST, DELETE')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}

