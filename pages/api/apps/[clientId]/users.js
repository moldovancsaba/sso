/**
 * pages/api/apps/[clientId]/users.js
 *
 * WHAT: List the users of one OAuth client - every SSO account that consented to it or
 *       holds a permission record for it - for the client's own rights management.
 * WHY: An app learns about a user only when that user first signs in to it, so an account
 *      that registered at SSO and consented to the app, but has not returned, was invisible
 *      to the app's admin screen: nothing there could grant or withhold anything for it.
 *      SSO already holds the whole list; this is the read that hands it to the client.
 * HOW: GET, machine token only. The bearer must carry `manage_permissions` and belong to
 *      the client it asks about - the same gate the per-user permission write uses
 *      (pages/api/users/[userId]/apps/[clientId]/permissions.js): a bearer that may write
 *      every user's permission record for a client may read who those users are, and no
 *      client can read another client's users.
 *
 * Query: `search` (email or name, case-insensitive substring), `page` (1-based),
 *        `limit` (default 50, at most 200).
 * Response: { clientId, users: [AppUserDTO], total, page, pages, limit }.
 */

import { listAppUsers } from '../../../../lib/appUsers.mjs'
import { getDb } from '../../../../lib/db.mjs'
import logger from '../../../../lib/logger.mjs'
import { canManagePermissionsFor, requireOAuthToken } from '../../../../lib/oauth/middleware.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { clientId } = req.query
  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'Missing parameters', message: 'clientId is required' })
  }

  // WHAT: Require a machine token with manage_permissions, for this very client.
  // WHY: The list names every user of the client by email; only the client itself, acting
  //      as itself, may read it. A user-bound token never carries manage_permissions
  //      (machineOnly), so no end user can list the others.
  const tokenData = await requireOAuthToken(req, res, 'manage_permissions')
  if (!tokenData) return // Response already sent

  if (!canManagePermissionsFor(tokenData, clientId)) {
    logger.warn('App users listing denied: client mismatch', {
      tokenClientId: tokenData.clientId,
      requestedClientId: clientId,
    })
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Client can only list its own users',
    })
  }

  try {
    const db = await getDb()
    const result = await listAppUsers(db, clientId, {
      search: typeof req.query.search === 'string' ? req.query.search : '',
      page: req.query.page,
      limit: req.query.limit,
    })
    return res.status(200).json({ clientId, ...result })
  } catch (error) {
    logger.error('Error listing app users', {
      error: error.message,
      stack: error.stack,
      clientId,
    })
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to list users',
    })
  }
}
