/**
 * pages/api/admin/magic-link.js — Magic link consumer endpoint
 * WHAT: Accepts a signed, single-use token (?t=...) and establishes an admin session, then redirects to /admin.
 * WHY: Provide a secure, auditable "master URL" that expires quickly and can be invalidated via one-time use.
 */
import { consumeMagicToken } from '../../../lib/magic.mjs'
import { findUserByEmail, ensureUserUuid } from '../../../lib/users.mjs'
import { setAdminSessionCookie } from '../../../lib/auth.mjs'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const token = (req.query?.t || '').toString()
    if (!token) return res.status(400).json({ error: 'Missing token' })

    const { ok, payload, error } = await consumeMagicToken(token)
    if (!ok) {
      const map = {
        invalid_token: 400,
        bad_signature: 401,
        bad_payload: 400,
        expired: 410,
        unknown_token: 404,
        already_used: 410,
      }
      const code = map[error] || 400
      return res.status(code).json({ error: 'Magic link invalid', code: error })
    }

    const email = (payload?.email || '').toLowerCase().trim()

    // Optional allowlist: if ADMIN_MAGIC_ALLOWED_EMAILS is set, restrict usage
    const allow = (process.env.ADMIN_MAGIC_ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    if (allow.length && !allow.includes(email)) {
      return res.status(403).json({ error: 'Not allowed for this email' })
    }

    // Load user and ensure UUID exists
    let user = await findUserByEmail(email)
    if (!user) return res.status(404).json({ error: 'User not found' })
    user = await ensureUserUuid(user)

    // Build a fresh session token (7 days)
    const tokenStr = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const tokenData = {
      token: tokenStr,
      expiresAt: expiresAt.toISOString(),
      userId: user.id,
      role: user.role || 'super-admin',
    }
    const signedToken = Buffer.from(JSON.stringify(tokenData)).toString('base64')

    // Set admin session cookie and redirect
    setAdminSessionCookie(res, signedToken, 7 * 24 * 60 * 60)
    res.writeHead(302, { Location: '/admin' })
    return res.end()
  } catch (error) {
    const msg = (error && (error.message || error.toString())) || ''
    if (msg.includes('MONGODB_URI is required')) {
      return res.status(503).json({ error: 'Service unavailable: database not configured' })
    }
    if (msg.includes('MongoServerSelectionError') || msg.toLowerCase().includes('server selection')) {
      return res.status(503).json({ error: 'Service unavailable: database unreachable' })
    }
    console.error('Magic link error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}