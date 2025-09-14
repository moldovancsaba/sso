/**
 * pages/api/admin/orgs/[orgId]/users/index.js — Admin-only list/create org users (UUID)
 * NOTE: Duplicate of index.mjs for compatibility.
 */
import { getAdminUser } from '../../../../../../lib/auth.mjs'
import { getOrganizationById } from '../../../../../../lib/organizations.mjs'
import { createOrgUser, listOrgUsers } from '../../../../../../lib/orgUsers.mjs'

export default async function handler(req, res) {
  const admin = await getAdminUser(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  const { orgId } = req.query || {}
  if (!orgId) return res.status(400).json({ error: 'Missing orgId' })
  const org = await getOrganizationById(orgId)
  if (!org) return res.status(404).json({ error: 'Organization not found' })

  if (req.method === 'GET') {
    try {
      const users = await listOrgUsers(orgId)
      const out = users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, createdAt: u.createdAt, updatedAt: u.updatedAt }))
      return res.status(200).json({ success: true, users: out })
    } catch (error) {
      console.error('List org users error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const canWrite = admin.role === 'super-admin' || (admin.permissions || []).includes('manage-org-users')
      if (!canWrite) return res.status(403).json({ error: 'Forbidden' })
      const { email, name, role, status, password } = req.body || {}
      if (!email) return res.status(422).json({ error: 'email is required' })
      const created = await createOrgUser(orgId, { email, name, role, status, password })
      const out = { id: created.id, email: created.email, name: created.name, role: created.role, status: created.status, createdAt: created.createdAt, updatedAt: created.updatedAt }
      const resp = { success: true, user: out }
      if (password == null || password === '') resp.password = created.password
      return res.status(201).json(resp)
    } catch (error) {
      console.error('Create org user error:', error)
      const msg = (error?.message || '').includes('E11000') ? 'Duplicate email in this org' : 'Internal server error'
      return res.status(500).json({ error: msg })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
