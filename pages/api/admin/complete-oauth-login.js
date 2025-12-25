/**
 * Complete OAuth Login for SSO Admin
 * 
 * POST /api/admin/complete-oauth-login
 * 
 * WHAT: Exchanges authorization code for tokens and creates public session
 * WHY: SSO Admin needs session cookie for homepage integration
 * HOW: Call token endpoint internally, decode id_token, create session, set cookie
 * 
 * This is a special endpoint for the sso-admin-dashboard OAuth client.
 * Unlike regular OAuth clients that get tokens and manage their own sessions,
 * SSO Admin needs an SSO public session because:
 * 1. Homepage checks session to show/hide SSO Admin button
 * 2. Admin API endpoints expect public session authentication
 */

import { getDb } from '../../../lib/db.mjs'
import { validateAndConsumeCode } from '../../../lib/oauth/codes.mjs'
import { createPublicSession } from '../../../lib/publicSessions.mjs'
import logger from '../../../lib/logger.mjs'
import cookie from 'cookie'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  logger.info('Complete OAuth login request', {
    event: 'admin_oauth_complete_start',
    hasCode: !!req.body.code,
  })

  const { code } = req.body

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' })
  }

  try {
    // WHAT: Validate and consume authorization code
    // WHY: Ensure code is valid, unused, and meant for admin dashboard
    // HOW: Use same validation as token endpoint
    const codeData = await validateAndConsumeCode({
      code,
      client_id: 'sso-admin-dashboard',
      redirect_uri: process.env.NODE_ENV === 'production'
        ? 'https://sso.doneisbetter.com/admin/callback'
        : 'http://localhost:3000/admin/callback',
      code_verifier: undefined, // Admin client doesn't use PKCE
    })

    if (!codeData) {
      logger.warn('Complete OAuth login: invalid or expired code', {
        event: 'admin_oauth_invalid_code',
      })
      return res.status(400).json({ error: 'Invalid or expired authorization code' })
    }

    const { user_id, scope } = codeData

    // WHAT: Get user details from database
    // WHY: Need email for session creation and logging
    const db = await getDb()
    const user = await db.collection('publicUsers').findOne({ id: user_id })

    if (!user) {
      logger.error('Complete OAuth login: user not found', {
        event: 'admin_oauth_user_not_found',
        userId: user_id,
      })
      return res.status(500).json({ error: 'User not found' })
    }

    // WHAT: Verify user has admin permissions
    // WHY: Extra security check - user should only reach here if authorized
    const permission = await db.collection('appPermissions').findOne({
      userId: user_id,
      clientId: 'sso-admin-dashboard',
      hasAccess: true,
      status: 'approved',
    })

    if (!permission) {
      logger.warn('Complete OAuth login: no admin permission found', {
        event: 'admin_oauth_no_permission',
        userId: user_id,
        email: user.email,
      })
      return res.status(403).json({ error: 'Admin access not granted' })
    }

    // WHAT: Create public session (same as email+password login does)
    // WHY: Homepage and admin APIs expect public session cookie
    // HOW: Use the same createPublicSession function as regular login
    const sessionToken = await createPublicSession(user_id, user.email)

    // WHAT: Set session cookie with same attributes as /api/public/login
    // WHY: Consistency with regular login flow
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
        maxAge: 30 * 24 * 60 * 60, // 30 days
        ...(domain && { domain }),
      })
    )

    logger.info('Admin OAuth login completed', {
      event: 'admin_oauth_login_success',
      userId: user_id,
      email: user.email,
      role: permission.role,
      scope,
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful',
    })

  } catch (error) {
    logger.error('Complete OAuth login error', {
      event: 'admin_oauth_login_error',
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      error: 'An unexpected error occurred',
    })
  }
}
