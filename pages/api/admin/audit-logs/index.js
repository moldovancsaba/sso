/**
 * pages/api/admin/audit-logs/index.js — Query audit logs
 * WHAT: Admin endpoint to retrieve and filter audit log entries
 * WHY: Provides visibility into all admin actions and changes
 * HOW: Uses getAuditLogs with pagination and filtering
 */
import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { getAuditLogs, getAuditStats } from '../../../../lib/auditLog.mjs'

export default async function handler(req, res) {
  const admin = await getAdminUser(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    try {
      const {
        action,
        resource,
        resourceId,
        actorUserId,
        status,
        startDate,
        endDate,
        limit = '50',
        skip = '0',
        stats,
      } = req.query || {}

      // If stats requested, return aggregated data
      if (stats === 'true') {
        const statsData = await getAuditStats({
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        })
        return res.status(200).json({ success: true, stats: statsData })
      }

      // Build filter object
      const filter = {}
      if (action) filter.action = action
      if (resource) filter.resource = resource
      if (resourceId) filter.resourceId = resourceId
      if (actorUserId) filter.actorUserId = actorUserId
      if (status) filter.status = status
      if (startDate) filter.startDate = new Date(startDate)
      if (endDate) filter.endDate = new Date(endDate)

      // Get audit logs with pagination
      const logs = await getAuditLogs({
        ...filter,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
      })

      return res.status(200).json({
        success: true,
        logs,
        pagination: {
          limit: parseInt(limit, 10),
          skip: parseInt(skip, 10),
        },
      })
    } catch (error) {
      console.error('Get audit logs error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', 'GET')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
