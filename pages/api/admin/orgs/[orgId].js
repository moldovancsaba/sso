import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { auditLog } from '../../../../lib/adminHelpers.mjs'
import { AuditAction } from '../../../../lib/auditLog.mjs'
import { deleteOrganization, getOrganizationById, updateOrganization } from '../../../../lib/organizations.mjs'

export default async function handler(req, res) {
  const { orgId } = req.query || {}
  if (!orgId) return res.status(400).json({ error: 'Organization ID is required' })

  const admin = await requireUnifiedAdmin(req, res, {
    requireFreshAuth: req.method === 'PATCH' || req.method === 'DELETE',
  })
  if (!admin) return

  if (req.method === 'GET') {
    const organization = await getOrganizationById(orgId)
    if (!organization) return res.status(404).json({ error: 'Organization not found' })
    return res.status(200).json({ success: true, organization })
  }

  if (req.method === 'PATCH') {
    const before = await getOrganizationById(orgId)
    if (!before) return res.status(404).json({ error: 'Organization not found' })

    try {
      const organization = await updateOrganization(orgId, req.body || {})
      await auditLog(Object.assign(req, { admin }), AuditAction.ORG_UPDATED, 'organization', orgId, before, organization)
      return res.status(200).json({ success: true, organization })
    } catch (error) {
      const duplicate = (error?.message || '').includes('E11000')
      return res.status(duplicate ? 409 : 500).json({
        error: duplicate ? 'Organization slug or domain already exists' : 'Internal server error',
      })
    }
  }

  if (req.method === 'DELETE') {
    const before = await getOrganizationById(orgId)
    if (!before) return res.status(404).json({ error: 'Organization not found' })

    const deleted = await deleteOrganization(orgId)
    if (!deleted) return res.status(404).json({ error: 'Organization not found' })

    await auditLog(Object.assign(req, { admin }), AuditAction.ORG_DELETED, 'organization', orgId, before, null)
    return res.status(200).json({ success: true, deleted: true })
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
