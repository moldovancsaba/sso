/**
 * Public User Logout Endpoint
 * 
 * POST /api/public/logout - Logout public user and clear session
 * 
 * AUTHENTICATION: Public users only - NO admin access
 * 
 * WHY: Public users need to be able to logout and clear their session
 * WHAT: Revokes session in database and clears public-session cookie
 * HOW: Reads session from cookie, revokes in DB, clears cookie
 */

import { getPublicUserFromRequest, clearPublicSessionCookie } from '../../../lib/publicSessions.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get current user from session
    const user = await getPublicUserFromRequest(req)
    
    if (user) {
      // Revoke session in database
      const db = await getDb()
      
      // Find and delete the session
      // The session is stored with the user's UUID
      await db.collection('publicSessions').deleteMany({ userId: user.id })
      
      logger.info('Public user logged out', {
        userId: user.id,
        email: user.email,
      })
    }
    
    // Clear the session cookie regardless of whether session was found
    clearPublicSessionCookie(res)
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    logger.error('Public logout error', {
      error: error.message,
      stack: error.stack,
    })
    
    // Still clear the cookie even if there was an error
    clearPublicSessionCookie(res)
    
    return res.status(200).json({
      success: true,
      message: 'Logged out (with errors)'
    })
  }
}
