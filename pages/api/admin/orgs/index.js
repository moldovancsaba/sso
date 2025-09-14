/**
 * pages/api/admin/orgs/index.js — Admin-only list/create organizations (UUID)
 * NOTE: Duplicate of index.mjs for Next.js Pages Router compatibility.
 */
import { getAdminUser } from '../../../../lib/auth.mjs'
import { createOrganization, listOrganizations } from '../../../../lib/organizations.mjs'

export default async function handler(req, res) {
  const admin = await getAdminUser(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    try {
      const orgs = await listOrganizations()
      const result = orgs.map(o => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        domains: o.domains,
        status: o.status,
        plan: o.plan,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      }))
      return res.status(200).json({ success: true, organizations: result })
    } catch (error) {
      console.error('List orgs error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      if (admin.role !== 'super-admin') return res.status(403).json({ error: 'Forbidden' })
      const { name, slug, domains, status, plan } = req.body || {}
      if (!name) return res.status(422).json({ error: 'name is required' })
      const org = await createOrganization({ name, slug, domains, status, plan })
      return res.status(201).json({
        success: true,
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          domains: org.domains,
          status: org.status,
          plan: org.plan,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        }
      })
    } catch (error) {
      console.error('Create org error:', error)
      const msg = (error?.message || '').includes('E11000') ? 'Duplicate slug or domain' : 'Internal server error'
      return res.status(500).json({ error: msg })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}
