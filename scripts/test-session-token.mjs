import dotenv from 'dotenv'
import { createHash } from 'crypto'
import { getDb } from '../lib/db.mjs'

dotenv.config()

const token = '6eeb0860190e166bea44ba3257af64fbef5832b1c96ec94f2b80a15c996f1450'

async function testSession() {
  console.log('🔍 Testing session token...\n')
  
  const db = await getDb()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  
  console.log('Token (first 16 chars):', token.substring(0, 16) + '...')
  console.log('Token hash:', tokenHash.substring(0, 16) + '...\n')
  
  // Find session
  const session = await db.collection('publicSessions').findOne({ tokenHash })
  
  if (!session) {
    console.log('❌ Session not found in database!')
    
    // Check if there are ANY sessions
    const allSessions = await db.collection('publicSessions').find({}).limit(5).toArray()
    console.log(`\nFound ${allSessions.length} sessions in database (showing first 5):`)
    allSessions.forEach(s => {
      console.log(`  User: ${s.userId}`)
      console.log(`  Hash: ${s.tokenHash.substring(0, 16)}...`)
      console.log(`  Expires: ${s.expiresAt}`)
      console.log('')
    })
    
    process.exit(1)
  }
  
  console.log('✅ Session found!')
  console.log('   User ID:', session.userId)
  console.log('   Created:', session.createdAt)
  console.log('   Expires:', session.expiresAt)
  console.log('   Last accessed:', session.lastAccessedAt)
  
  const now = new Date()
  const expiresAt = new Date(session.expiresAt)
  const isExpired = now > expiresAt
  
  console.log(`   Expired: ${isExpired ? 'YES ❌' : 'NO ✅'}\n`)
  
  // Find user
  const user = await db.collection('publicUsers').findOne({ id: session.userId })
  
  if (!user) {
    console.log('❌ User not found!')
    process.exit(1)
  }
  
  console.log('✅ User found!')
  console.log('   Email:', user.email)
  console.log('   Name:', user.name)
  
  // Check permission
  const permission = await db.collection('appPermissions').findOne({
    userId: user.id,
    clientId: 'sso-admin-dashboard'
  })
  
  if (!permission) {
    console.log('\n❌ No admin permission!')
  } else {
    console.log('\n✅ Admin permission found!')
    console.log('   Role:', permission.role)
    console.log('   Status:', permission.status)
    console.log('   HasAccess:', permission.hasAccess)
  }
  
  process.exit(0)
}

testSession()
