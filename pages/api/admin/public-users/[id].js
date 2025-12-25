/**
 * Admin API - Manage Individual Public User
 * 
 * WHAT: Update or delete specific public user
 * WHY: Admins need ability to disable/enable/delete user accounts
 */

import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { getDb } from '../../../../lib/db.mjs'
import logger from '../../../../lib/logger.mjs'

export default async function handler(req, res) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    // Verify admin authentication
    const admin = await getAdminUser(req)
    if (!admin) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const db = await getDb()

    if (req.method === 'PATCH') {
      // Update user (status only for now)
      const { status } = req.body

      if (!status || !['active', 'disabled'].includes(status)) {
        return res.status(400).json({ error: 'Valid status required (active or disabled)' })
      }

      const result = await db.collection('publicUsers').findOneAndUpdate(
        { id },
        { 
          $set: { 
            status,
            updatedAt: new Date().toISOString()
          } 
        },
        { returnDocument: 'after' }
      )

      if (!result) {
        return res.status(404).json({ error: 'User not found' })
      }

      logger.info('Admin updated public user status', {
        event: 'admin_update_public_user',
        adminId: admin.id,
        userId: id,
        newStatus: status
      })

      return res.status(200).json({
        success: true,
        message: 'User updated successfully'
      })

    } else if (req.method === 'DELETE') {
      // Delete user and all associated data
      const user = await db.collection('publicUsers').findOne({ id })
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Delete user record
      await db.collection('publicUsers').deleteOne({ id })

      // Delete all sessions
      await db.collection('publicSessions').deleteMany({ userId: id })

      // Delete all OAuth authorizations
      await db.collection('authorizationCodes').deleteMany({ userId: id })

      // Delete all access tokens
      await db.collection('accessTokens').deleteMany({ userId: id })

      // Delete all refresh tokens
      await db.collection('refreshTokens').deleteMany({ userId: id })

      // Delete any login PINs
      await db.collection('loginPins').deleteMany({ userId: id })

      // Delete any magic link tokens
      await db.collection('publicMagicTokens').deleteMany({ email: user.email })

      logger.info('Admin deleted public user', {
        event: 'admin_delete_public_user',
        adminId: admin.id,
        userId: id,
        userEmail: user.email
      })

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      })

    } else {
      res.setHeader('Allow', 'PATCH, DELETE')
      return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    logger.error('Admin manage public user error', {
      event: 'admin_manage_public_user_error',
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json({
      error: 'An unexpected error occurred'
    })
  }
}
