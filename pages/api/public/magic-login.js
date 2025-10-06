/**
 * pages/api/public/magic-login.js - Verify magic link token and log in public user
 * WHAT: Consumes magic link token, creates public session, redirects to user dashboard
 * WHY: Completes passwordless authentication flow for public users
 */

import { findPublicUserByEmail } from '../../../lib/publicUsers.mjs'
import { createPublicSession } from '../../../lib/publicSessions.mjs'
import logger from '../../../lib/logger.mjs'
import cookie from 'cookie'
import crypto from 'crypto'
import { getDb } from '../../../lib/db.mjs'

/**
 * Consume a public magic link token
 * WHAT: Validates token, marks as used, prevents replay
 * WHY: Mirrors admin consumeMagicToken for public users
 */
async function consumePublicMagicToken(token) {
  const SECRET = process.env.PUBLIC_MAGIC_SECRET || process.env.JWT_SECRET
  if (!SECRET) {
    throw new Error('PUBLIC_MAGIC_SECRET or JWT_SECRET must be set')
  }

  // Parse token
  const [payloadB64, signatureB64] = token.split('.')
  if (!payloadB64 || !signatureB64) {
    throw new Error('Invalid token format')
  }

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', SECRET)
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  if (signatureB64 !== expectedSig) {
    throw new Error('Invalid token signature')
  }

  // Decode payload
  const payloadJson = Buffer.from(
    payloadB64.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('utf8')
  const payload = JSON.parse(payloadJson)

  // Validate payload structure
  if (payload.typ !== 'public-magic') {
    throw new Error('Invalid token type')
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    throw new Error('Token expired')
  }

  // Check database for token usage
  const db = await getDb()
  const tokenDoc = await db.collection('publicMagicTokens').findOne({
    jti: payload.jti,
    email: payload.email,
  })

  if (!tokenDoc) {
    throw new Error('Token not found')
  }

  if (tokenDoc.usedAt) {
    throw new Error('Token already used')
  }

  // Mark token as used
  await db.collection('publicMagicTokens').updateOne(
    { jti: payload.jti },
    { $set: { usedAt: new Date() } }
  )

  return {
    email: payload.email,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    // Consume the magic token (validates and marks as used)
    const { email } = await consumePublicMagicToken(token)

    // Find public user
    const user = await findPublicUserByEmail(email)

    if (!user) {
      logger.error('Magic token valid but public user not found', {
        event: 'public_magic_login_user_not_found',
        email,
      })
      return res.status(401).json({ error: 'Invalid or expired magic link' })
    }

    // Create public session
    const sessionToken = await createPublicSession(user._id.toString(), user.email)

    // Set secure session cookie
    const cookieName = process.env.PUBLIC_SESSION_COOKIE || 'public-session'
    const isProduction = process.env.NODE_ENV === 'production'
    const domain = process.env.SSO_COOKIE_DOMAIN

    res.setHeader(
      'Set-Cookie',
      cookie.serialize(cookieName, sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        ...(domain && { domain }),
      })
    )

    logger.info('Public magic login successful', {
      event: 'public_magic_login_success',
      userId: user._id.toString(),
      email: user.email,
    })

    // Redirect to user dashboard/demo page
    return res.redirect(302, '/demo')

  } catch (error) {
    logger.error('Public magic login error', {
      event: 'public_magic_login_error',
      error: error.message,
      stack: error.stack,
    })

    // Return user-friendly error page
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Magic Link Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              max-width: 500px;
              padding: 2rem;
            }
            h1 { margin-bottom: 1rem; }
            p { margin-bottom: 1.5rem; line-height: 1.6; }
            a {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              background: rgba(255,255,255,0.2);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            a:hover { background: rgba(255,255,255,0.3); }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔗 Invalid or Expired Magic Link</h1>
            <p>This magic link has expired, been used already, or is invalid.</p>
            <p>Please request a new magic link to sign in.</p>
            <a href="/login">← Back to Login</a>
          </div>
        </body>
      </html>
    `)
  }
}
