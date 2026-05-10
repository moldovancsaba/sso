/**
 * pages/api/public/account.js - Delete user account
 * WHAT: Permanently deletes user account and all associated data
 * WHY: Users have right to delete their account and data (GDPR compliance)
 */

import { clearPublicSessionCookie, getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get logged-in user
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const db = await getDb()
    
    // WHAT: Delete all user data across all collections
    // WHY: Complete removal of user data for privacy compliance
    
    // Delete user record
    await db.collection('publicUsers').deleteOne({ 
      email: user.email 
    })
    
    // Delete all sessions
    await db.collection('publicSessions').deleteMany({ 
      userId: user.id 
    })
    
    // Delete all OAuth authorizations
    await db.collection('authorizationCodes').deleteMany({ 
      userId: user.id 
    })
    
    // Delete all access tokens
    await db.collection('accessTokens').deleteMany({ 
      userId: user.id 
    })
    
    // Delete all refresh tokens
    await db.collection('refreshTokens').deleteMany({ 
      userId: user.id 
    })
    
    // Delete any login PINs
    await db.collection('loginPins').deleteMany({ 
      userId: user.id 
    })
    
    // Delete any magic link tokens
    await db.collection('publicMagicTokens').deleteMany({ 
      email: user.email 
    })

    logger.info('User account deleted', {
      event: 'account_deleted',
      userId: user.id,
      email: user.email
    })

    clearPublicSessionCookie(res)

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    })

  } catch (error) {
    logger.error('Delete account error', {
      event: 'delete_account_error',
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json({
      error: 'An unexpected error occurred'
    })
  }
}
