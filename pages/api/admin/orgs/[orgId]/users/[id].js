import { requireUnifiedAdmin } from '../../../../../../lib/auth.mjs'
import { auditLog } from '../../../../../../lib/adminHelpers.mjs'
import { AuditAction } from '../../../../../../lib/auditLog.mjs'
import { getOrganizationById } from '../../../../../../lib/organizations.mjs'
import { deleteOrgUser, getOrgUser, updateOrgUser } from '../../../../../../lib/orgUsers.mjs'

export default async function handler(req, res) {
  const { orgId, id } = req.query || {}
  if (!orgId || !id) return res.status(400).json({ error: 'Organization ID and user ID are required' })

  const admin = await requireUnifiedAdmin(req, res, {
    requireFreshAuth: req.method === 'PATCH' || req.method === 'DELETE',
  })
  if (!admin) return

  const organization = await getOrganizationById(orgId)
  if (!organization) return res.status(404).json({ error: 'Organization not found' })

  if (req.method === 'GET') {
    const user = await getOrgUser(orgId, id)
    if (!user) return res.status(404).json({ error: 'Organization user not found' })
    return res.status(200).json({ success: true, user })
  }

  if (req.method === 'PATCH') {
    const before = await getOrgUser(orgId, id)
    if (!before) return res.status(404).json({ error: 'Organization user not found' })

    const result = await updateOrgUser(orgId, id, req.body || {})
    if (!result?.user) return res.status(404).json({ error: 'Organization user not found' })

    await auditLog(Object.assign(req, { admin }), AuditAction.ORG_USER_UPDATED, 'org_user', id, before, result.user)
    return res.status(200).json({
      success: true,
      user: result.user,
      ...(result.password ? { password: result.password } : {}),
    })
  }

  if (req.method === 'DELETE') {
    const before = await getOrgUser(orgId, id)
    if (!before) return res.status(404).json({ error: 'Organization user not found' })

    const deleted = await deleteOrgUser(orgId, id)
    if (!deleted) return res.status(404).json({ error: 'Organization user not found' })

    await auditLog(Object.assign(req, { admin }), AuditAction.ORG_USER_DELETED, 'org_user', id, before, null)
    return res.status(200).json({ success: true, deleted: true })
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
