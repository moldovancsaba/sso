import { requireUnifiedAdmin } from '../../../../../../lib/auth.mjs'
import { auditLog } from '../../../../../../lib/adminHelpers.mjs'
import { AuditAction } from '../../../../../../lib/auditLog.mjs'
import { createEnterpriseConnection, listEnterpriseConnections } from '../../../../../../lib/enterpriseConnections.mjs'
import { getOrganizationById } from '../../../../../../lib/organizations.mjs'

export default async function handler(req, res) {
  const { orgId } = req.query || {}
  if (!orgId) return res.status(400).json({ error: 'Organization ID is required' })

  const admin = await requireUnifiedAdmin(req, res, {
    requireFreshAuth: req.method === 'POST',
  })
  if (!admin) return

  const organization = await getOrganizationById(orgId)
  if (!organization) return res.status(404).json({ error: 'Organization not found' })

  if (req.method === 'GET') {
    const connections = await listEnterpriseConnections(orgId)
    return res.status(200).json({ success: true, connections })
  }

  if (req.method === 'POST') {
    try {
      const connection = await createEnterpriseConnection(orgId, req.body || {})
      await auditLog(
        Object.assign(req, { admin }),
        AuditAction.ENTERPRISE_CONNECTION_CREATED,
        'enterprise_connection',
        connection.id,
        null,
        connection
      )
      return res.status(201).json({ success: true, connection })
    } catch (error) {
      const duplicate = (error?.message || '').includes('E11000')
      return res.status(duplicate ? 409 : 400).json({
        error: duplicate ? 'Enterprise connection slug already exists for this organization' : error.message,
      })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
