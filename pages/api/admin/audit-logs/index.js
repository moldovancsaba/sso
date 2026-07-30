/**
 * pages/api/admin/audit-logs/index.js — Query audit logs
 * WHAT: Admin endpoint to retrieve and filter audit log entries
 * WHY: Provides visibility into all admin actions and changes
 * HOW: Uses getAuditLogs with pagination and filtering
 */
import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { getAuditLogs, getAuditStats } from '../../../../lib/auditLog.mjs'

export default async function handler(req, res) {
  const admin = await requireUnifiedAdmin(req, res)
  if (!admin) return // requireUnifiedAdmin already sent error response

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

      // WHAT: Build filter object, requiring each value to actually be a string
      // WHY: req.query values are strings in normal use, but a repeated query param
      //      (?action=a&action=b) parses to an array — guarding against that (and any other
      //      non-string shape) before it reaches a Mongo filter is cheap defense in depth.
      const filter = {}
      if (typeof action === 'string' && action) filter.action = action
      if (typeof resource === 'string' && resource) filter.resource = resource
      if (typeof resourceId === 'string' && resourceId) filter.resourceId = resourceId
      if (typeof actorUserId === 'string' && actorUserId) filter.actorUserId = actorUserId
      if (typeof status === 'string' && status) filter.status = status
      if (typeof startDate === 'string' && startDate) filter.startDate = new Date(startDate)
      if (typeof endDate === 'string' && endDate) filter.endDate = new Date(endDate)

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
