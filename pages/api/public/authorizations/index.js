/**
 * pages/api/public/authorizations/index.js - List user's OAuth authorizations
 * WHAT: Returns all OAuth authorizations (connected services) for the logged-in user
 * WHY: Users need to see which services have access to their account
 */

import { getPublicUserFromRequest } from '../../../../lib/publicSessions.mjs'
import { getDb } from '../../../../lib/db.mjs'
import logger from '../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get logged-in user
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const db = await getDb()
    
    // WHAT: Fetch all authorization codes and access tokens for this user
    // WHY: Show user which services they've authorized
    const authCodes = await db.collection('authorizationCodes')
      .find({ userId: user.id })
      .toArray()
    
    // Get unique client IDs from authorization codes
    const clientIds = [...new Set(authCodes.map(code => code.clientId))]
    
    // Fetch client details
    const clients = await db.collection('oauthClients')
      .find({ clientId: { $in: clientIds } })
      .toArray()
    
    // Build client lookup map
    const clientMap = {}
    clients.forEach(client => {
      clientMap[client.clientId] = client
    })
    
    // Group authorizations by client
    const authorizationsByClient = {}
    authCodes.forEach(code => {
      if (!authorizationsByClient[code.clientId]) {
        const client = clientMap[code.clientId] || {}
        authorizationsByClient[code.clientId] = {
          _id: code._id.toString(),
          clientId: code.clientId,
          clientName: client.name || code.clientId,
          scope: code.scope,
          createdAt: code.createdAt || code.issuedAt,
          lastUsed: code.issuedAt
        }
      }
    })
    
    const authorizations = Object.values(authorizationsByClient)
    
    logger.info('User authorizations listed', {
      event: 'list_authorizations',
      userId: user.id,
      count: authorizations.length
    })

    return res.status(200).json({
      authorizations
    })

  } catch (error) {
    logger.error('List authorizations error', {
      event: 'list_authorizations_error',
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json({
      error: 'An unexpected error occurred'
    })
  }
}
