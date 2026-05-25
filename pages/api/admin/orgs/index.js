import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { auditLog } from '../../../../lib/adminHelpers.mjs'
import { AuditAction } from '../../../../lib/auditLog.mjs'
import { createOrganization, listOrganizations } from '../../../../lib/organizations.mjs'

export default async function handler(req, res) {
  const admin = await requireUnifiedAdmin(req, res, {
    requireFreshAuth: req.method === 'POST',
  })
  if (!admin) return

  if (req.method === 'GET') {
    const organizations = await listOrganizations()
    return res.status(200).json({ success: true, organizations })
  }

  if (req.method === 'POST') {
    const { name, slug, domains, status, plan } = req.body || {}
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Organization name is required' })
    }

    try {
      const organization = await createOrganization({ name, slug, domains, status, plan })
      await auditLog(Object.assign(req, { admin }), AuditAction.ORG_CREATED, 'organization', organization.id, null, organization)
      return res.status(201).json({ success: true, organization })
    } catch (error) {
      const duplicate = (error?.message || '').includes('E11000')
      return res.status(duplicate ? 409 : 500).json({
        error: duplicate ? 'Organization slug or domain already exists' : 'Internal server error',
      })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
