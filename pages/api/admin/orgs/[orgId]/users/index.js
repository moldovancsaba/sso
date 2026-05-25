import { requireUnifiedAdmin } from '../../../../../../lib/auth.mjs'
import { auditLog } from '../../../../../../lib/adminHelpers.mjs'
import { AuditAction } from '../../../../../../lib/auditLog.mjs'
import { getOrganizationById } from '../../../../../../lib/organizations.mjs'
import { createOrgUser, listOrgUsers } from '../../../../../../lib/orgUsers.mjs'

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
    const users = await listOrgUsers(orgId)
    return res.status(200).json({ success: true, users })
  }

  if (req.method === 'POST') {
    const { email, name, role, status, password } = req.body || {}
    if (!email || !name) {
      return res.status(400).json({ error: 'email and name are required' })
    }

    try {
      const { password: generatedPassword, ...user } = await createOrgUser(orgId, {
        email,
        name,
        role,
        status,
        password,
      })

      await auditLog(Object.assign(req, { admin }), AuditAction.ORG_USER_CREATED, 'org_user', user.id, null, user)
      return res.status(201).json({
        success: true,
        user,
        password: password || generatedPassword,
      })
    } catch (error) {
      const duplicate = (error?.message || '').includes('E11000')
      return res.status(duplicate ? 409 : 500).json({
        error: duplicate ? 'Organization user already exists for this email' : 'Internal server error',
      })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
