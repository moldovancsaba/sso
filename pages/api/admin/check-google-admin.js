/**
 * Diagnostic endpoint to check if Google admin user exists
 * 
 * GET /api/admin/check-google-admin?email=moldovancsaba@gmail.com
 */

import { findUserByEmail } from '../../../lib/users.mjs'
import { getDb } from '../../../lib/db.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.query
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter required' })
    }

    // Check using findUserByEmail
    const user = await findUserByEmail(email)
    
    // Also check raw database
    const db = await getDb()
    const usersCollection = db.collection('users')
    const allUsers = await usersCollection.find({}).toArray()
    
    return res.status(200).json({
      email: email,
      emailLowercase: email.toLowerCase(),
      foundViaHelper: !!user,
      userDetails: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        hasPassword: !!user.password
      } : null,
      totalAdminUsers: allUsers.length,
      allAdminEmails: allUsers.map(u => u.email),
      databaseName: db.databaseName,
      mongoUri: process.env.MONGODB_URI ? 'configured' : 'missing',
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    })
  }
}
