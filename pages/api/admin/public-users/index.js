/**
 * Admin API - List Public Users
 * 
 * WHAT: Returns list of all public SSO users with filtering and sorting
 * WHY: Admins need to view and manage registered users
 */

import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { getDb } from '../../../../lib/db.mjs'
import logger from '../../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify admin authentication
    const admin = await getAdminUser(req)
    if (!admin) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { filter = 'all', sortBy = 'createdAt', sortOrder = 'desc' } = req.query

    const db = await getDb()
    
    // Build query
    const query = {}
    if (filter === 'active') {
      query.status = 'active'
    } else if (filter === 'disabled') {
      query.status = 'disabled'
    }

    // Build sort
    const sort = {}
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1

    // Fetch users (excluding password hashes)
    const users = await db.collection('publicUsers')
      .find(query, { projection: { passwordHash: 0 } })
      .sort(sort)
      .toArray()

    logger.info('Admin listed public users', {
      event: 'admin_list_public_users',
      adminId: admin.id,
      count: users.length,
      filter,
      sortBy
    })

    return res.status(200).json({
      users: users.map(user => {
        // WHAT: Determine login methods for this user
        // WHY: Show admins how each user authenticated (email, Facebook, etc.)
        const loginMethods = []
        if (user.password || user.passwordHash) {
          loginMethods.push('email')
        }
        if (user.socialProviders?.facebook) {
          loginMethods.push('facebook')
        }
        if (user.socialProviders?.google) {
          loginMethods.push('google')
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status || 'active',
          emailVerified: user.emailVerified !== false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          loginCount: user.loginCount || 0,
          loginMethods, // NEW: Show which login methods this user has
          hasFacebook: !!user.socialProviders?.facebook, // NEW: Quick Facebook check
        }
      })
    })

  } catch (error) {
    logger.error('Admin list public users error', {
      event: 'admin_list_public_users_error',
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json({
      error: 'An unexpected error occurred'
    })
  }
}
