/**
 * Diagnostic endpoint to check if Google admin user exists
 * 
 * GET /api/admin/check-google-admin?email=moldovancsaba@gmail.com
 */

import { MongoClient } from 'mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    
    const { email } = req.query
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter required' })
    }

    // Connect to both databases to see what's where
    const ssoDb = client.db('sso')
    const ssoDbUsers = await ssoDb.collection('users').find({}).toArray()
    const userInSso = await ssoDb.collection('users').findOne({ email: email.toLowerCase() })
    
    const ssoDatabaseDb = client.db('sso_database')
    const ssoDatabaseUsers = await ssoDatabaseDb.collection('users').find({}).toArray()
    const userInSsoDatabase = await ssoDatabaseDb.collection('users').findOne({ email: email.toLowerCase() })
    
    // Check what getDb() would use
    const configuredDbName = process.env.MONGODB_DB || 'sso'
    
    return res.status(200).json({
      email: email,
      emailLowercase: email.toLowerCase(),
      configuredDbName,
      ssoDatabase: {
        name: 'sso',
        userFound: !!userInSso,
        totalUsers: ssoDbUsers.length,
        allEmails: ssoDbUsers.map(u => u.email),
        userDetails: userInSso ? {
          id: userInSso.id,
          email: userInSso.email,
          role: userInSso.role,
        } : null,
      },
      ssoDatabaseDatabase: {
        name: 'sso_database',
        userFound: !!userInSsoDatabase,
        totalUsers: ssoDatabaseUsers.length,
        allEmails: ssoDatabaseUsers.map(u => u.email),
        userDetails: userInSsoDatabase ? {
          id: userInSsoDatabase.id,
          email: userInSsoDatabase.email,
          role: userInSsoDatabase.role,
        } : null,
      },
    })
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
    })
  } finally {
    await client.close()
  }
}
