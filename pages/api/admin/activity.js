/**
 * Admin API - Cross-App Activity Dashboard
 * 
 * WHAT: Returns filtered activity logs from appAccessLogs collection
 * WHY: Admins need visibility into user access attempts and permission changes across all apps
 * HOW: MongoDB aggregation with joins to publicUsers and oauthClients collections
 * 
 * Features: Time range filtering, event type filtering, user search, app filtering, pagination
 */

import { requireUnifiedAdmin } from '../../../lib/auth.mjs'
import { getDb } from '../../../lib/db.mjs'
import logger from '../../../lib/logger.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // WHAT: Verify admin authentication
    // WHY: Only admins should see cross-app activity data
    const admin = await getAdminUser(req)
    if (!admin) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const {
      timeRange = '7d',
      eventType = 'all',
      userId,
      clientId,
      limit = '50',
      skip = '0'
    } = req.query

    const db = await getDb()
    const logsCollection = db.collection('appAccessLogs')

    // WHAT: Build MongoDB match query based on filters
    const matchQuery = {}

    // WHAT: Time range filter
    // WHY: Most common use case - viewing recent activity
    if (timeRange && timeRange !== 'all') {
      const now = new Date()
      let startDate

      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      matchQuery.timestamp = { $gte: startDate.toISOString() }
    }

    // WHAT: Event type filter
    // WHY: Focus on specific types of events
    if (eventType && eventType !== 'all') {
      switch (eventType) {
        case 'access_attempts':
          matchQuery.eventType = 'access_attempt'
          break
        case 'permission_changes':
          matchQuery.eventType = { $in: ['access_granted', 'access_revoked', 'role_changed'] }
          break
        case 'login_events':
          matchQuery.eventType = { $in: ['login_success', 'login_failed'] }
          break
      }
    }

    // WHAT: User filter
    // WHY: View activity for specific user
    if (userId) {
      matchQuery.userId = userId
    }

    // WHAT: App/Client filter
    // WHY: View activity for specific app
    if (clientId) {
      matchQuery.clientId = clientId
    }

    const limitNum = Math.min(parseInt(limit, 10) || 50, 100)
    const skipNum = parseInt(skip, 10) || 0

    // WHAT: MongoDB aggregation pipeline with joins
    // WHY: Enrich logs with user names/emails and app names
    const aggregationPipeline = [
      { $match: matchQuery },
      
      // WHAT: Join with publicUsers collection to get user info
      // WHY: Show email and name instead of just UUID
      {
        $lookup: {
          from: 'publicUsers',
          localField: 'userId',
          foreignField: 'id',
          as: 'user'
        }
      },
      
      // WHAT: Unwind user array (convert from array to object)
      // WHY: Simplify data structure
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // WHAT: Join with oauthClients collection to get app names
      // WHY: Show app name instead of just client ID
      {
        $lookup: {
          from: 'oauthClients',
          localField: 'clientId',
          foreignField: 'client_id',
          as: 'app'
        }
      },
      
      // WHAT: Unwind app array
      {
        $unwind: {
          path: '$app',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // WHAT: Sort by timestamp descending (newest first)
      { $sort: { timestamp: -1 } },
      
      // WHAT: Pagination - skip offset
      { $skip: skipNum },
      
      // WHAT: Pagination - limit results
      { $limit: limitNum },
      
      // WHAT: Project final shape
      // WHY: Return clean, structured data to frontend
      {
        $project: {
          _id: 1,
          timestamp: 1,
          eventType: 1,
          accessGranted: 1,
          currentRole: 1,
          previousRole: 1,
          newRole: 1,
          changedBy: 1,
          message: 1,
          userId: 1,
          userEmail: { $ifNull: ['$user.email', 'Unknown'] },
          userName: { $ifNull: ['$user.name', 'Unknown'] },
          clientId: 1,
          appName: { $ifNull: ['$app.name', 'Unknown App'] },
          ip: 1,
          userAgent: 1
        }
      }
    ]

    // WHAT: Execute aggregation
    const logs = await logsCollection.aggregate(aggregationPipeline).toArray()

    // WHAT: Get total count for pagination
    // WHY: Frontend needs to know if there are more results
    const totalCount = await logsCollection.countDocuments(matchQuery)
    const hasMore = skipNum + logs.length < totalCount

    logger.info('Admin accessed activity dashboard', {
      event: 'admin_activity_dashboard',
      adminId: admin.id,
      filters: { timeRange, eventType, userId, clientId },
      resultCount: logs.length,
      timestamp: new Date().toISOString()
    })

    return res.status(200).json({
      logs,
      pagination: {
        total: totalCount,
        limit: limitNum,
        skip: skipNum,
        hasMore
      },
      filters: {
        timeRange,
        eventType,
        userId,
        clientId
      }
    })

  } catch (error) {
    logger.error('Activity dashboard error', {
      event: 'activity_dashboard_error',
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json({
      error: 'Failed to fetch activity logs',
      details: error.message
    })
  }
}
