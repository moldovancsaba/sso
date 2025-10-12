/**
 * OAuth2 Consent Storage Endpoint
 * 
 * POST /api/oauth/consent - Store user consent decision
 * 
 * Stores the user's decision to grant or deny access to a client application.
 */

import { getAuthenticatedUser } from '../../../lib/unifiedAuth.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'
import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // WHAT: Authenticate user (admin or public)
  // WHY: OAuth consent should work for both user types
  const auth = await getAuthenticatedUser(req)
  
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const user = auth.user

  const { client_id, scope, approved } = req.body

  if (!client_id || !scope) {
    return res.status(400).json({ error: 'client_id and scope are required' })
  }

  try {
    const db = await getDb()
    const now = new Date().toISOString()

    if (approved) {
      // Store or update consent
      await db.collection('userConsents').updateOne(
        { user_id: user.id, client_id },
        {
          $set: {
            user_id: user.id,
            client_id,
            scope,
            granted_at: now,
            expires_at: null, // Never expires unless revoked
            revoked_at: null,
          },
        },
        { upsert: true }
      )

      // Create index if not exists
      await db.collection('userConsents').createIndex({ user_id: 1, client_id: 1 }, { unique: true })

      logger.info('User consent granted', {
        user_id: user.id,
        client_id,
        scope,
      })

      return res.status(200).json({ success: true })
    } else {
      // User denied - optionally store denial
      logger.info('User consent denied', {
        user_id: user.id,
        client_id,
        scope,
      })

      return res.status(200).json({ success: true, denied: true })
    }
  } catch (error) {
    logger.error('Failed to store consent', {
      error: error.message,
      user_id: user.id,
      client_id,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
}
