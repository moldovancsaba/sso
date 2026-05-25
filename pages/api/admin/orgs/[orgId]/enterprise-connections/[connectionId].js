import { requireUnifiedAdmin } from '../../../../../../lib/auth.mjs'
import { auditLog } from '../../../../../../lib/adminHelpers.mjs'
import { AuditAction } from '../../../../../../lib/auditLog.mjs'
import {
  deleteEnterpriseConnection,
  getEnterpriseConnection,
  updateEnterpriseConnection,
} from '../../../../../../lib/enterpriseConnections.mjs'
import { getOrganizationById } from '../../../../../../lib/organizations.mjs'

export default async function handler(req, res) {
  const { orgId, connectionId } = req.query || {}
  if (!orgId || !connectionId) {
    return res.status(400).json({ error: 'Organization ID and connection ID are required' })
  }

  const admin = await requireUnifiedAdmin(req, res, {
    requireFreshAuth: req.method === 'PATCH' || req.method === 'DELETE',
  })
  if (!admin) return

  const organization = await getOrganizationById(orgId)
  if (!organization) return res.status(404).json({ error: 'Organization not found' })

  if (req.method === 'GET') {
    const connection = await getEnterpriseConnection(orgId, connectionId)
    if (!connection) return res.status(404).json({ error: 'Enterprise connection not found' })
    return res.status(200).json({ success: true, connection })
  }

  if (req.method === 'PATCH') {
    const before = await getEnterpriseConnection(orgId, connectionId)
    if (!before) return res.status(404).json({ error: 'Enterprise connection not found' })

    try {
      const connection = await updateEnterpriseConnection(orgId, connectionId, req.body || {})
      await auditLog(
        Object.assign(req, { admin }),
        AuditAction.ENTERPRISE_CONNECTION_UPDATED,
        'enterprise_connection',
        connectionId,
        before,
        connection
      )
      return res.status(200).json({ success: true, connection })
    } catch (error) {
      const duplicate = (error?.message || '').includes('E11000')
      return res.status(duplicate ? 409 : 400).json({
        error: duplicate ? 'Enterprise connection slug already exists for this organization' : error.message,
      })
    }
  }

  if (req.method === 'DELETE') {
    const before = await getEnterpriseConnection(orgId, connectionId)
    if (!before) return res.status(404).json({ error: 'Enterprise connection not found' })

    const deleted = await deleteEnterpriseConnection(orgId, connectionId)
    if (!deleted) return res.status(404).json({ error: 'Enterprise connection not found' })

    await auditLog(
      Object.assign(req, { admin }),
      AuditAction.ENTERPRISE_CONNECTION_DELETED,
      'enterprise_connection',
      connectionId,
      before,
      null
    )
    return res.status(200).json({ success: true, deleted: true })
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
