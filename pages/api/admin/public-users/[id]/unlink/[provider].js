/**
 * Admin API - Account Unlinking (Admin-Initiated)
 * 
 * WHAT: Allows admins to unlink Facebook, Google, or Email+Password from any user account
 * WHY: Enable admins to fix account linking issues or assist users with account management
 * HOW: DELETE endpoint with safety validation and admin audit logging
 * 
 * Security: Admin-only, same safety checks as user-initiated unlinking
 */

import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { unlinkLoginMethod, removePassword, validateUnlinking, getUserLoginMethods } from '../../../../../../lib/accountLinking.mjs'
import { getDb } from '../../../../../../lib/db.mjs'
import { logAuditEvent, AuditAction } from '../../../../../../lib/auditLog.mjs'
import logger from '../../../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Verify admin authentication
    // WHY: Only admins should be able to unlink accounts
    const admin = await getAdminUser(req)
    if (!admin) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { id: userId, provider } = req.query

    // WHAT: Validate provider parameter
    const validProviders = ['facebook', 'google', 'password']
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        details: `Provider must be one of: ${validProviders.join(', ')}`
      })
    }

    const db = await getDb()
    const usersCollection = db.collection('publicUsers')

    // WHAT: Fetch target user
    const user = await usersCollection.findOne({ id: userId })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // WHAT: Safety validation - prevent account lockout
    // WHY: Even admins cannot leave user with 0 login methods
    const validation = validateUnlinking(user, provider)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Cannot unlink',
        details: validation.error,
        remainingMethods: validation.remainingMethods
      })
    }

    const currentMethods = getUserLoginMethods(user)
    let updatedUser

    // WHAT: Call appropriate unlink function with admin ID
    // WHY: Track who initiated the unlink for audit trail
    if (provider === 'password') {
      updatedUser = await removePassword(userId, admin.id)
    } else {
      updatedUser = await unlinkLoginMethod(userId, provider, admin.id)
    }

    // WHAT: Audit log the admin-initiated unlink
    // WHY: Critical security event - track who removed what from whose account
    await logAuditEvent({
      action: provider === 'password' ? AuditAction.PASSWORD_REMOVED : AuditAction.ACCOUNT_UNLINK,
      userId: admin.id,
      userEmail: admin.email,
      userRole: admin.role,
      resource: 'public_user',
      resourceId: userId,
      beforeState: { loginMethods: currentMethods },
      afterState: { loginMethods: currentMethods.filter(m => m !== provider) },
      metadata: {
        targetUserEmail: user.email,
        provider,
        initiatedBy: admin.email,
        adminInitiated: true,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    })

    logger.info('Admin unlinked login method', {
      event: 'admin_unlink',
      adminId: admin.id,
      adminEmail: admin.email,
      userId: user.id,
      userEmail: user.email,
      provider,
      remainingMethods: validation.remainingMethods,
      timestamp: new Date().toISOString()
    })

    // WHAT: Return success with updated user info
    const updatedMethods = getUserLoginMethods(updatedUser)

    return res.status(200).json({
      success: true,
      message: `${provider === 'password' ? 'Password' : provider} successfully unlinked from ${user.email}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        loginMethods: updatedMethods
      }
    })

  } catch (error) {
    logger.error('Admin unlink error', {
      event: 'admin_unlink_error',
      adminId: req.headers['x-admin-id'],
      error: error.message,
      stack: error.stack,
      userId: req.query.id,
      provider: req.query.provider
    })

    // WHAT: Handle safety-related errors
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
