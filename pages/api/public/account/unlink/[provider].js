/**
 * Public API - Account Unlinking (User-Initiated)
 * 
 * WHAT: Allows users to unlink Facebook, Google, or Email+Password from their account
 * WHY: Users may want to remove login methods they no longer use
 * HOW: DELETE endpoint with safety validation to prevent account lockout
 * 
 * Security: User must be authenticated, cannot unlink last login method
 */

import { getPublicUserFromRequest } from '../../../../../lib/publicSessions.mjs'
import { unlinkLoginMethod, removePassword, validateUnlinking, getUserLoginMethods } from '../../../../../lib/accountLinking.mjs'
import { getDb } from '../../../../../lib/db.mjs'
import { logAuditEvent, AuditAction } from '../../../../../lib/auditLog.mjs'
import logger from '../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Verify user authentication
    // WHY: Only account owner can unlink their own login methods
    const user = await getPublicUserFromRequest(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { provider } = req.query

    // WHAT: Validate provider parameter
    // WHY: Only specific providers can be unlinked
    const validProviders = ['facebook', 'google', 'password']
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        details: `Provider must be one of: ${validProviders.join(', ')}`
      })
    }

    // WHAT: Query DB directly to get full user object WITH passwordHash
    // WHY: getPublicUserFromRequest() strips passwordHash for security,
    //      but validateUnlinking() needs it to check if Email+Password is available
    // CRITICAL: Without this, safety validation would fail and allow account lockout
    const db = await getDb()
    const fullUser = await db.collection('publicUsers').findOne({ id: user.id })
    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // WHAT: Safety validation - prevent account lockout
    // WHY: User must always have at least one login method
    const validation = validateUnlinking(fullUser, provider)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Cannot unlink',
        details: validation.error,
        remainingMethods: validation.remainingMethods
      })
    }

    const currentMethods = getUserLoginMethods(fullUser)
    let updatedUser

    // WHAT: Call appropriate unlink function based on provider type
    // WHY: Social providers and password require different unlinking logic
    if (provider === 'password') {
      updatedUser = await removePassword(user.id, 'user')
    } else {
      updatedUser = await unlinkLoginMethod(user.id, provider, 'user')
    }

    // WHAT: Audit log the self-initiated unlink
    // WHY: Track all account changes for security
    await logAuditEvent({
      action: provider === 'password' ? AuditAction.PASSWORD_REMOVED : AuditAction.ACCOUNT_UNLINK,
      userId: user.id,
      userEmail: user.email,
      userRole: 'user',
      resource: 'public_user',
      resourceId: user.id,
      beforeState: { loginMethods: currentMethods },
      afterState: { loginMethods: currentMethods.filter(m => m !== provider) },
      metadata: {
        provider,
        initiatedBy: 'user',
        selfInitiated: true,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    })

    logger.info('User unlinked login method', {
      event: 'user_unlink',
      userId: user.id,
      userEmail: user.email,
      provider,
      remainingMethods: validation.remainingMethods,
      timestamp: new Date().toISOString()
    })

    // WHAT: Return success with updated login methods
    const updatedMethods = getUserLoginMethods(updatedUser)

    return res.status(200).json({
      success: true,
      message: `${provider === 'password' ? 'Password' : provider} successfully unlinked`,
      loginMethods: updatedMethods
    })

  } catch (error) {
    logger.error('User unlink error', {
      event: 'user_unlink_error',
      error: error.message,
      stack: error.stack,
      provider: req.query.provider
    })

    // WHAT: Handle safety-related errors with clear messages
    // WHY: Help user understand why unlinking failed
    if (error.message.includes('at least one')) {
      return res.status(400).json({
        error: 'Cannot unlink',
        details: error.message
      })
    }

    if (error.message.includes('not linked')) {
      return res.status(404).json({
        error: 'Provider not linked',
        details: error.message
      })
    }

    return res.status(500).json({
      error: 'Failed to unlink login method',
      details: error.message
    })
  }
}
