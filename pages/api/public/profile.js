/**
 * pages/api/public/profile.js - Update user profile
 * WHAT: Allows authenticated users to update their profile information
 * WHY: Users need ability to keep their profile information current
 */

import { getPublicUserFromRequest } from '../../../lib/publicSessions.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get logged-in user
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { name } = req.body

    // Validate input
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return res.status(400).json({ error: 'Name must be a string' })
      }
      if (name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' })
      }
    }

    const db = await getDb()
    
    // Build update object
    const updateFields = {
      updatedAt: new Date().toISOString()
    }

    if (name !== undefined) {
      updateFields.name = name.trim()
    }

    // Update user profile
    const result = await db.collection('publicUsers').updateOne(
      { email: user.email },
      { $set: updateFields }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    logger.info('Profile updated successfully', {
      event: 'profile_updated',
      userId: user.id,
      email: user.email,
      fields: Object.keys(updateFields).filter(k => k !== 'updatedAt')
    })

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    logger.error('Update profile error', {
      event: 'update_profile_error',
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json({
      error: 'An unexpected error occurred'
    })
  }
}
