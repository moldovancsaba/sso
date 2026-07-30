/**
 * pages/api/admin/magic-login.js - Verify magic link token and log in admin
 * WHAT: Consumes magic link token, creates admin session, redirects to admin panel
 * WHY: Completes passwordless authentication flow for admins
 */

import { consumeMagicToken } from '../../../lib/magic.mjs'
import { findUserByEmail } from '../../../lib/users.mjs'
import { createSession } from '../../../lib/sessions.mjs'
import { setAdminSessionCookie } from '../../../lib/auth.mjs'
import { resolveSafeRedirect } from '../../../lib/redirects.mjs'
import logger from '../../../lib/logger.mjs'
import { strictRateLimiter } from '../../../lib/middleware/rateLimit.mjs'
import { applyRateLimiter } from '../../../lib/apiHelpers.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  await applyRateLimiter(strictRateLimiter, req, res)
  if (res.writableEnded) return

  try {
    const { token, redirect_uri, return_to } = req.query

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    // Consume the magic token (validates and marks as used)
    const result = await consumeMagicToken(token)
    
    if (!result.ok) {
      throw new Error(result.error || 'Invalid or expired magic link')
    }
    
    const { email, redirectUri: tokenRedirectUri } = result.payload

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
    const { token: sessionToken, expiresAt } = await createSession(user.id, user.email, user.role)

    // WHAT: Set the session cookie via the shared helper, using the base64-JSON envelope
    //       format decodeSessionToken()/getAdminUser() expect.
    // WHY: This previously set the raw session token via cookie.serialize() — decodeSessionToken
    //      base64-decodes the cookie and JSON.parses it, which fails on a raw hex token, so
    //      sessions created via this magic-link flow silently never authenticated afterward.
    const tokenData = {
      token: sessionToken,
      expiresAt,
      userId: user.id,
      role: user.role,
    }
    const signedToken = Buffer.from(JSON.stringify(tokenData)).toString('base64')
    setAdminSessionCookie(res, signedToken, 7 * 24 * 60 * 60)

    // WHAT: Determine final redirect destination
    // WHY: User should return to where they originally requested authentication
    // Priority: return_to query param → redirect_uri from query → redirectUri from token → fallback
    const finalRedirect = resolveSafeRedirect(
      [return_to, redirect_uri, tokenRedirectUri],
      '/admin'
    )

    logger.info('Admin magic login successful', {
      event: 'magic_login_success',
      userId: user.id,
      email: user.email,
      redirect: finalRedirect,
    })

    // Redirect to original destination
    return res.redirect(302, finalRedirect)

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
              background: linear-gradient(135deg, var(--mantine-color-blue-filled) 0%, var(--mantine-color-violet-filled) 100%);
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
              background: color-mix(in srgb, white 20%, transparent);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              transition: background 0.3s;
            }
            a:hover { background: color-mix(in srgb, white 30%, transparent); }
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
