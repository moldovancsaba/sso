import { getAdminUser } from '../../../lib/auth.mjs'
import { listUsers } from '../../../lib/users.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const admin = await getAdminUser(req)
  if (!admin) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const users = await listUsers()
    const result = users.map(u => ({
      id: u._id?.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))
    return res.status(200).json(result)
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Error connecting to database' })
  }
}
