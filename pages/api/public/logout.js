// WHAT: Public user logout API endpoint
// WHY: Enable users to end their session
// Strategic: Clear session cookie and revoke session in database

import { revokePublicSession, clearPublicSessionCookie } from '../../../lib/publicSessions.mjs'
import { runCors } from '../../../lib/cors.mjs'
import logger from '../../../lib/logger.mjs'

const SESSION_COOKIE_NAME = process.env.PUBLIC_SESSION_COOKIE || 'user-session'

export default async function handler(req, res) {
  // WHAT: Enable CORS for cross-domain requests
  if (runCors(req, res)) return
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    // WHAT: Parse session token from cookie
    const cookieHeader = req.headers.cookie || ''
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, ...val] = c.trim().split('=')
        return [key, val.join('=')]
      })
    )
    
    const token = cookies[SESSION_COOKIE_NAME]
    
    // WHAT: Revoke session in database
    if (token) {
      await revokePublicSession(token)
    }
    
    // WHAT: Clear session cookie
    clearPublicSessionCookie(res)
    
    logger.info('User logout successful')
    
    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    })
  } catch (err) {
    logger.error('Logout error', { error: err.message })
    
    // WHAT: Still clear cookie even if database operation fails
    clearPublicSessionCookie(res)
    
    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    })
  }
}
