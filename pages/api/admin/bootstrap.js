// pages/api/admin/bootstrap.js
// WHAT: One-time bootstrap endpoint to create the first admin user safely.
// WHY: Allows initializing the system when the users collection is empty, without CLI access.
// SECURITY: Will only perform insert if users collection is empty. Otherwise 403.

import { getDb } from '../../../lib/db.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const db = await getDb()
    const col = db.collection('users')

    // Allow bootstrap if there is no existing admin.
    // This supports legacy collections with other schemas/documents.
    const hasAdmin = await col.findOne({ role: 'admin' })

    const body = await parseBody(req)
    const email = (body?.email || '').toLowerCase().trim()
    const name = (body?.name || 'Owner').toString().trim()
    const password = (body?.password || '').trim()

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' })
    }
    if (!/^[a-f0-9]{32}$/.test(password)) {
      return res.status(400).json({ error: 'Password must be a 32-hex token' })
    }

    if (hasAdmin) {
      // If an admin already exists, do not allow creating another via bootstrap
      return res.status(403).json({ error: 'Already initialized' })
    }

    // If user with this email already exists, prevent duplicate
    const existingUser = await col.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    const now = new Date().toISOString()
    await col.insertOne({
      email,
      name,
      role: 'admin',
      password, // 32-hex admin token (by convention)
      createdAt: now,
      updatedAt: now,
    })

    return res.status(201).json({ success: true, message: 'Admin user created' })
  } catch (error) {
    console.error('Bootstrap error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper to parse JSON body in Next.js Pages API (without relying on bodyParser)
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch (e) { resolve({}) }
    })
    req.on('error', reject)
  })
}