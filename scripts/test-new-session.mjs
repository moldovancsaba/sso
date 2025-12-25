import dotenv from 'dotenv'
import { createHash } from 'crypto'
import { getDb } from '../lib/db.mjs'

dotenv.config()

const token = '57e7a1a4140c76ebca42b295fe5df1a284c8413b912e1a3b67db724122657b0a'

async function testSession() {
  console.log('🔍 Testing NEW session token...\n')
  
  const db = await getDb()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  
  console.log('Token hash:', tokenHash.substring(0, 32) + '...\n')
  
  // Check total sessions
  const totalSessions = await db.collection('publicSessions').countDocuments()
  console.log(`📊 Total sessions in database: ${totalSessions}\n`)
  
  // Find this specific session
  const session = await db.collection('publicSessions').findOne({ tokenHash })
  
  if (!session) {
    console.log('❌ This session NOT found in database!')
    console.log('\nShowing all sessions:')
    const allSessions = await db.collection('publicSessions').find({}).toArray()
    allSessions.forEach(s => {
      console.log(`  User: ${s.userId}, Hash: ${s.tokenHash.substring(0, 16)}...`)
    })
    process.exit(1)
  }
  
  console.log('✅ Session FOUND!')
  console.log('   User ID:', session.userId)
  console.log('   Expires:', session.expiresAt)
  
  const now = new Date()
  const expiresAt = new Date(session.expiresAt)
  console.log(`   Is expired: ${now > expiresAt ? 'YES ❌' : 'NO ✅'}\n`)
  
  // Find user
  const user = await db.collection('publicUsers').findOne({ id: session.userId })
  console.log('✅ User:', user ? user.email : 'NOT FOUND ❌')
  
  // Check permission
  const permission = await db.collection('appPermissions').findOne({
    userId: session.userId,
    clientId: 'sso-admin-dashboard',
    status: 'approved',
    hasAccess: true
  })
  
  console.log('🔑 Admin permission:', permission ? `${permission.role} ✅` : 'NOT FOUND ❌')
  
  process.exit(0)
}

testSession()
