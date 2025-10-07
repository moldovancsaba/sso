/**
 * pages/api/users/[userId]/apps/[clientId]/request-access.js
 * 
 * WHAT: Public endpoint to request access to an app (creates pending permission)
 * WHY: OAuth callbacks need to create permission records when user first attempts access
 * HOW: Creates appPermission record with status='pending' for admin approval
 */

import { getAppPermission, createAppPermission } from '../../../../../../lib/appPermissions.mjs'
import { logAccessAttempt } from '../../../../../../lib/appAccessLogs.mjs'
import { getDb } from '../../../../../../lib/db.mjs'
import logger from '../../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  // WHAT: Only POST method allowed
  // WHY: This endpoint creates a new resource
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, clientId } = req.query

    // WHAT: Validate input parameters
    // WHY: Prevent invalid operations
    if (!userId || !clientId) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'userId and clientId are required',
      })
    }

    // WHAT: Validate bearer token (OAuth access token)
    // WHY: Only authenticated users can request access
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Bearer token required',
      })
    }

    // TODO: Validate access token properly
    // For now, we trust the token since it's from OAuth callback

    // WHAT: Check if permission already exists
    // WHY: Don't create duplicates
    const existingPermission = await getAppPermission(userId, clientId)
    if (existingPermission) {
      logger.info('Permission already exists', {
        userId,
        clientId,
        status: existingPermission.status,
      })

      return res.status(200).json({
        message: 'Permission record already exists',
        permission: {
          userId: existingPermission.userId,
          clientId: existingPermission.clientId,
          appName: existingPermission.appName,
          hasAccess: existingPermission.hasAccess,
          status: existingPermission.status,
          role: existingPermission.role,
          requestedAt: existingPermission.requestedAt,
        },
      })
    }

    // WHAT: Get OAuth client details
    // WHY: Need app name for permission record
    const db = await getDb()
    const client = await db.collection('oauthClients').findOne({ client_id: clientId })
    
    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'OAuth client does not exist',
      })
    }

    const appName = client.appName || client.name || 'Unknown App'

    // WHAT: Get user details for logging
    // WHY: Log who requested access
    const { email, name, ip, userAgent } = req.body || {}

    // WHAT: Create pending permission record
    // WHY: User needs admin approval to access app
    const permission = await createAppPermission({
      userId,
      clientId,
      appName,
      autoApprove: false, // Always require approval for new users
    })

    // WHAT: Log access attempt
    // WHY: Admin can see who tried to access the app
    await logAccessAttempt({
      userId,
      clientId,
      appName,
      accessGranted: false,
      currentRole: 'none',
      ip: ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
      userAgent: userAgent || req.headers['user-agent'] || 'unknown',
      message: `User ${email || userId} requested access to ${appName}`,
    })

    logger.info('Access request created', {
      userId,
      clientId,
      appName,
      email,
    })

    return res.status(201).json({
      message: 'Access request created',
      permission: {
        userId: permission.userId,
        clientId: permission.clientId,
        appName: permission.appName,
        hasAccess: false,
        status: 'pending',
        role: 'none',
        requestedAt: permission.requestedAt,
      },
    })
  } catch (error) {
    logger.error('Error creating access request', {
      error: error.message,
      stack: error.stack,
      userId: req.query.userId,
      clientId: req.query.clientId,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create access request',
    })
  }
}
