/**
 * pages/api/admin/users/list-with-apps.js
 * 
 * WHAT: List all users with their app access information
 * WHY: SSO admin needs to see cross-app user access dashboard
 * HOW: Joins users/publicUsers with appPermissions collection
 */

import { getAdminUser } from '../../../../lib/auth.mjs'
import { getUserAppPermissions } from '../../../../lib/appPermissions.mjs'
import { getDb } from '../../../../lib/db.mjs'
import logger from '../../../../lib/logger.mjs'

export default async function handler(req, res) {
  // WHAT: Only GET method allowed
  // WHY: This is a read-only list endpoint
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Validate admin session
    // WHY: Only authenticated admins can view user list
    const adminUser = await getAdminUser(req)
    if (!adminUser) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid admin session required',
      })
    }

    // WHAT: Parse query parameters for pagination and filtering
    // WHY: Large user bases need pagination and search
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const search = req.query.search || ''
    const statusFilter = req.query.status || '' // 'active' | 'disabled'
    const isSsoSuperadmin = req.query.isSsoSuperadmin // 'true' | 'false'

    const skip = (page - 1) * limit

    // WHAT: Build query filter
    // WHY: Support searching and filtering
    const query = {}
    
    if (search) {
      // WHAT: Search by email or name
      // WHY: Admin needs to find specific users
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ]
    }

    if (statusFilter) {
      query.status = statusFilter
    }

    if (isSsoSuperadmin === 'true') {
      query.isSsoSuperadmin = true
    } else if (isSsoSuperadmin === 'false') {
      query.isSsoSuperadmin = { $ne: true }
    }

    // WHAT: Get users from both admin users and public users collections
    // WHY: Need to show all types of users in unified dashboard
    const db = await getDb()
    
    // WHAT: Get admin users (SSO admins)
    // WHY: These are the admins who manage SSO itself
    const adminUsers = await db
      .collection('users')
      .find(query)
      .project({
        id: 1,
        email: 1,
        name: 1,
        role: 1,
        status: 1,
        isSsoSuperadmin: 1,
        emailVerified: 1,
        createdAt: 1,
        lastLoginAt: 1,
      })
      .toArray()

    // WHAT: Get public users (app users who can register)
    // WHY: These are regular users who use the apps
    const publicUsers = await db
      .collection('publicUsers')
      .find(query)
      .project({
        id: 1,
        email: 1,
        name: 1,
        role: 1,
        status: 1,
        isSsoSuperadmin: 1,
        emailVerified: 1,
        createdAt: 1,
        lastLoginAt: 1,
      })
      .toArray()

    // WHAT: Combine and sort all users
    // WHY: Present unified view of all users in system
    let allUsers = [
      ...adminUsers.map(u => ({ ...u, userType: 'admin' })),
      ...publicUsers.map(u => ({ ...u, userType: 'public' })),
    ]

    // WHAT: Sort by creation date (newest first)
    // WHY: Most recent users are typically most relevant
    allUsers.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0)
      const dateB = new Date(b.createdAt || 0)
      return dateB - dateA
    })

    // WHAT: Apply pagination to combined results
    // WHY: Can't paginate before combining due to two collections
    const total = allUsers.length
    allUsers = allUsers.slice(skip, skip + limit)

    // WHAT: For each user, get their app access permissions
    // WHY: Admin dashboard shows which apps each user can access
    const usersWithAppAccess = await Promise.all(
      allUsers.map(async (user) => {
        // WHAT: Get all app permissions for this user
        // WHY: Show user's access across all apps
        const appPermissions = await getUserAppPermissions(user.id)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          userType: user.userType,
          status: user.status || 'active',
          isSsoSuperadmin: user.isSsoSuperadmin || false,
          emailVerified: user.emailVerified || false,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          appAccess: appPermissions.map(p => ({
            clientId: p.clientId,
            appName: p.appName,
            role: p.role,
            status: p.status,
            hasAccess: p.hasAccess,
            lastAccessedAt: p.lastAccessedAt,
            requestedAt: p.requestedAt,
            grantedAt: p.grantedAt,
          })),
        }
      })
    )

    logger.info('Admin users list with app access retrieved', {
      adminId: adminUser.id,
      total,
      page,
      limit,
      search,
      statusFilter,
      isSsoSuperadmin,
    })

    return res.status(200).json({
      users: usersWithAppAccess,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        search,
        status: statusFilter,
        isSsoSuperadmin,
      },
    })
  } catch (error) {
    logger.error('Error listing users with app access', {
      error: error.message,
      stack: error.stack,
    })

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve users',
    })
  }
}
