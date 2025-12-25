import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config()

async function showSessions() {
  const db = await getDb()
  
  const sessions = await db.collection('publicSessions').find({}).toArray()
  
  console.log(`📊 Total sessions in database: ${sessions.length}\n`)
  
  if (sessions.length === 0) {
    console.log('❌ No sessions found!')
    console.log('\nThis means users are logging in but sessions are not being created.')
    console.log('Check that createPublicSession() is being called after login.')
  } else {
    sessions.forEach(s => {
      console.log(`Session:`)
      console.log(`  User ID: ${s.userId}`)
      console.log(`  Token hash: ${s.tokenHash.substring(0, 16)}...`)
      console.log(`  Created: ${s.createdAt}`)
      console.log(`  Expires: ${s.expiresAt}`)
      console.log('')
    })
  }
  
  process.exit(0)
}

showSessions()
