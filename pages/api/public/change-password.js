/**
 * pages/api/public/change-password.js - Change user password
 * WHAT: Allows authenticated users to change their password
 * WHY: Users need ability to update their credentials for security
 */

import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get logged-in user
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { currentPassword, newPassword } = req.body

    // Validate input
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'Current password is required' })
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'New password is required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }

    const db = await getDb()
    
    // Fetch full user record with password hash
    const fullUser = await db.collection('publicUsers').findOne({ 
      email: user.email 
    })

    if (!fullUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, fullUser.passwordHash)

    if (!isValidPassword) {
      logger.warn('Password change failed - invalid current password', {
        event: 'change_password_invalid',
        userId: user.id,
        email: user.email
      })
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await db.collection('publicUsers').updateOne(
      { _id: fullUser._id },
      {
        $set: {
          passwordHash: newPasswordHash,
          updatedAt: new Date().toISOString()
        }
      }
    )

    logger.info('Password changed successfully', {
      event: 'password_changed',
      userId: user.id,
      email: user.email
    })

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    logger.error('Change password error', {
      event: 'change_password_error',
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json({
      error: 'An unexpected error occurred'
    })
  }
}
