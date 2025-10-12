/**
 * pages/api/public/authorizations/[id].js - Revoke OAuth authorization
 * WHAT: Removes user's authorization for a specific service
 * WHY: Users need to revoke access for services they no longer want connected
 */

import { getPublicUserFromRequest } from '../../../../lib/publicSessions.mjs'
import { getDb } from '../../../../lib/db.mjs'
import logger from '../../../../lib/logger.mjs'
import { ObjectId } from 'mongodb'

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

    const { id } = req.query
    
    if (!id) {
      return res.status(400).json({ error: 'Authorization ID is required' })
    }

    const db = await getDb()
    
    // Find the authorization code to get the client ID
    let authCode
    try {
      authCode = await db.collection('authorizationCodes').findOne({
        _id: new ObjectId(id),
        userId: user.id
      })
    } catch (err) {
      // Invalid ObjectId format
      return res.status(404).json({ error: 'Authorization not found' })
    }
    
    if (!authCode) {
      return res.status(404).json({ error: 'Authorization not found' })
    }

    const clientId = authCode.clientId
    
    // WHAT: Delete all authorization codes and access tokens for this user + client
    // WHY: Completely revoke access for this service
    await db.collection('authorizationCodes').deleteMany({
      userId: user.id,
      clientId
    })
    
    await db.collection('accessTokens').deleteMany({
      userId: user.id,
      clientId
    })
    
    await db.collection('refreshTokens').deleteMany({
      userId: user.id,
      clientId
    })
    
    logger.info('User revoked authorization', {
      event: 'revoke_authorization',
      userId: user.id,
      clientId
    })

    return res.status(200).json({
      success: true,
      message: 'Authorization revoked successfully'
    })

  } catch (error) {
    logger.error('Revoke authorization error', {
      event: 'revoke_authorization_error',
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json({
      error: 'An unexpected error occurred'
    })
  }
}
