/**
 * pages/api/admin/users/index.js — Admin-only list/create users
 * WHAT: Admin CRUD endpoint for users collection.
 * WHY: Manage admin accounts with roles and passwords (32-hex tokens).
 */
import { requireUnifiedAdmin } from '../../../../lib/auth.mjs'
import { createUser, listUsers } from '../../../../lib/users.mjs'
import { generateMD5StylePassword } from '../../../../lib/resourcePasswords.mjs'
import { auditLog } from '../../../../lib/adminHelpers.mjs'
import { AuditAction } from '../../../../lib/auditLog.mjs'

export default async function handler(req, res) {
  const admin = await requireUnifiedAdmin(req, res)
  if (!admin) return // requireUnifiedAdmin already sent error response

  if (req.method === 'GET') {
    try {
      const users = await listUsers()
      // Sanitize IDs for client
      const result = users.map(u => ({
        id: u.id || u._id?.toString(),
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }))
      return res.status(200).json({ success: true, users: result })
    } catch (error) {
      console.error('List users error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      // Only admins can create users
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const { email, name, role, password } = req.body || {}
      if (!email || !name) {
        return res.status(400).json({ error: 'email and name are required' })
      }

      const token = password || generateMD5StylePassword()
      const user = await createUser({ email, name, role: role || 'admin', password: token })

      // Audit log user creation (sanitize password from state)
      await auditLog(
        Object.assign(req, { admin }),
        AuditAction.USER_CREATED,
        'user',
        user.id || user._id?.toString(),
        null, // no before state for creation
        { email: user.email, name: user.name, role: user.role } // exclude password
      )

      return res.status(201).json({
        success: true,
        user: {
          id: user.id || user._id?.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        // IMPORTANT: Return token on creation so admin can distribute it.
        password: token,
      })
    } catch (error) {
      console.error('Create user error:', error)
      const msg = (error?.message || '').includes('E11000') ? 'Email already exists' : 'Internal server error'
      return res.status(500).json({ error: msg })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}

