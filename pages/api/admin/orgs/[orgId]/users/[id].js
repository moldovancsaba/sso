/**
 * pages/api/admin/orgs/[orgId]/users/[id].js — Admin-only get/update/delete org user (UUID)
 * NOTE: Duplicate of [id].mjs for compatibility.
 */
import { getAdminUser } from '../../../../../../lib/auth.mjs'
import { getOrganizationById } from '../../../../../../lib/organizations.mjs'
import { getOrgUser, updateOrgUser, deleteOrgUser } from '../../../../../../lib/orgUsers.mjs'

export default async function handler(req, res) {
  const admin = await getAdminUser(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  const { orgId, id } = req.query || {}
  if (!orgId || !id) return res.status(400).json({ error: 'Missing orgId or id' })
  const org = await getOrganizationById(orgId)
  if (!org) return res.status(404).json({ error: 'Organization not found' })

  if (req.method === 'GET') {
    const u = await getOrgUser(orgId, id)
    if (!u) return res.status(404).json({ error: 'Not found' })
    const out = { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, createdAt: u.createdAt, updatedAt: u.updatedAt }
    return res.status(200).json({ success: true, user: out })
  }

  if (req.method === 'PATCH') {
    try {
      const patch = req.body || {}
      const canWrite = admin.role === 'super-admin' || (admin.permissions || []).includes('manage-org-users')
      if (!canWrite) return res.status(403).json({ error: 'Forbidden' })
      const { user, password } = await updateOrgUser(orgId, id, patch)
      if (!user) return res.status(404).json({ error: 'Not found' })
      const out = { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, createdAt: user.createdAt, updatedAt: user.updatedAt }
      const resp = { success: true, user: out }
      if (password) resp.password = password
      return res.status(200).json(resp)
    } catch (error) {
      console.error('Update org user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const canWrite = admin.role === 'super-admin' || (admin.permissions || []).includes('manage-org-users')
      if (!canWrite) return res.status(403).json({ error: 'Forbidden' })
      const ok = await deleteOrgUser(orgId, id)
      if (!ok) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json({ success: true, deleted: true })
    } catch (error) {
      console.error('Delete org user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
