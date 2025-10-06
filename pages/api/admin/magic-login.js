/**
 * pages/api/admin/magic-login.js - Verify magic link token and log in admin
 * WHAT: Consumes magic link token, creates admin session, redirects to admin panel
 * WHY: Completes passwordless authentication flow for admins
 */

import { consumeMagicToken } from '../../../lib/magic.mjs'
import { findUserByEmail } from '../../../lib/users.mjs'
import { createSession } from '../../../lib/sessions.mjs'
import logger from '../../../lib/logger.mjs'
import cookie from 'cookie'

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
    const { email } = await consumeMagicToken(token)

    // Find admin user
    const user = await findUserByEmail(email)

    if (!user) {
      logger.error('Magic token valid but admin not found', {
        event: 'magic_login_user_not_found',
        email,
      })
      return res.status(401).json({ error: 'Invalid or expired magic link' })
    }

    // Create admin session
    const { token: sessionToken } = await createSession(user.id, user.email, user.role)

    // Set secure session cookie
    const cookieName = process.env.ADMIN_SESSION_COOKIE || 'admin-session'
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

    logger.info('Admin magic login successful', {
      event: 'magic_login_success',
      userId: user.id,
      email: user.email,
    })

    // Redirect to admin panel
    return res.redirect(302, '/admin')

  } catch (error) {
    logger.error('Magic login error', {
      event: 'magic_login_error',
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
            <a href="/admin">← Back to Admin Login</a>
          </div>
        </body>
      </html>
    `)
  }
}
