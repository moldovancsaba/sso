/**
 * pages/api/admin/users/[id].js — Admin-only get/update/delete user
 * WHAT: Manage individual users; role updates limited to super-admins.
 * WHY: Fine-grained admin user management aligned with DB-backed sessions.
 */
import { getAdminUser } from '../../../../lib/auth.mjs'
import { deleteUser, findUserById, updateUser, updateUserPassword } from '../../../../lib/users.mjs'
import { generateMD5StylePassword } from '../../../../lib/resourcePasswords.mjs'

export default async function handler(req, res) {
  const admin = await getAdminUser(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query || {}
  if (!id) return res.status(400).json({ error: 'Missing id' })

  if (req.method === 'GET') {
    const user = await findUserById(id)
    if (!user) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json({
      success: true,
      user: {
        id: user.id || user._id?.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  }

  if (req.method === 'PATCH') {
    try {
      const { name, role, password } = req.body || {}

      // Role updates are restricted to super-admins
      if (role && admin.role !== 'super-admin') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      let updated = null
      if (typeof name === 'string' || typeof role === 'string') {
        updated = await updateUser(id, { name, role })
      }

      let newPassword = null
      if (password || password === '') {
        const token = password || generateMD5StylePassword()
        updated = await updateUserPassword(id, token)
        newPassword = token
      }

      const user = updated || (await findUserById(id))
      if (!user) return res.status(404).json({ error: 'Not found' })

      const out = {
        success: true,
        user: {
          id: user.id || user._id?.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      }
      if (newPassword) out.password = newPassword
      return res.status(200).json(out)
    } catch (error) {
      console.error('Update user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Only super-admins can delete users
      if (admin.role !== 'super-admin') {
        return res.status(403).json({ error: 'Forbidden' })
      }
      const ok = await deleteUser(id)
      if (!ok) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json({ success: true, deleted: true })
    } catch (error) {
      console.error('Delete user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return res.status(405).end(`Method ${req.method} Not Allowed`)
}

