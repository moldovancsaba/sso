/**
 * pages/api/admin/orgs/[id].js — Admin-only get/update/delete organization (UUID)
 * NOTE: Duplicate of [id].mjs for Pages Router compatibility.
 */
import { getAdminUser } from '../../../../lib/auth.mjs'
import { getOrganizationById, updateOrganization, deleteOrganization } from '../../../../lib/organizations.mjs'

export default async function handler(req, res) {
  const admin = await getAdminUser(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query || {}
  if (!id) return res.status(400).json({ error: 'Missing id' })

  if (req.method === 'GET') {
    const org = await getOrganizationById(id)
    if (!org) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({ success: true, organization: org })
  }

  if (req.method === 'PATCH') {
    try {
      const patch = req.body || {}
      const updated = await updateOrganization(id, patch)
      if (!updated) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json({ success: true, organization: updated })
    } catch (error) {
      console.error('Update org error:', error)
      const msg = (error?.message || '').includes('E11000') ? 'Duplicate slug or domain' : 'Internal server error'
      return res.status(500).json({ error: msg })
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (admin.role !== 'super-admin') return res.status(403).json({ error: 'Forbidden' })
      const ok = await deleteOrganization(id)
      if (!ok) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json({ success: true, deleted: true })
    } catch (error) {
      console.error('Delete org error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
