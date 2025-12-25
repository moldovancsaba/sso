/**
 * Debug: Session Check
 * 
 * WHAT: Check if current request has valid session
 * WHY: Diagnose session/permission issues
 * HOW: Return session status, user info, and permission status
 * 
 * TEMPORARY: Remove after debugging
 */

import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  try {
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      return res.status(200).json({
        hasSession: false,
        message: 'No active session found',
        cookies: Object.keys(req.cookies || {}),
      })
    }
    
    // Check permission
    const db = await getDb()
    
    logger.info('Debug: Checking permission', {
      userId: user.id,
      clientId: 'sso-admin-dashboard',
    })
    
    const permission = await db.collection('appPermissions').findOne({
      userId: user.id,
      clientId: 'sso-admin-dashboard',
    })
    
    logger.info('Debug: Permission query result', {
      found: !!permission,
      permission: permission,
    })
    
    // Also try to find ANY permission for this user
    const anyPermission = await db.collection('appPermissions').findOne({
      userId: user.id,
    })
    
    logger.info('Debug: Any permission for user', {
      found: !!anyPermission,
      anyPermission: anyPermission,
    })
    
    // Check all sessions for this user
    const sessions = await db.collection('publicSessions').find({
      userId: user.id,
      expiresAt: { $gt: new Date() }
    }).toArray()
    
    return res.status(200).json({
      hasSession: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      permission: permission ? {
        hasAccess: permission.hasAccess,
        role: permission.role,
        status: permission.status,
        clientId: permission.clientId,
      } : null,
      anyPermission: anyPermission ? {
        hasAccess: anyPermission.hasAccess,
        role: anyPermission.role,
        status: anyPermission.status,
        clientId: anyPermission.clientId,
      } : null,
      sessionCount: sessions.length,
      cookies: Object.keys(req.cookies || {}),
      environment: process.env.NODE_ENV,
      database: process.env.MONGODB_DB,
    })
  } catch (error) {
    logger.error('Session check error', { error: error.message })
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    })
  }
}
