#!/usr/bin/env node
import 'dotenv/config'
import { getDb } from './lib/db.mjs'

const TEST_EMAIL = process.env.TEST_EMAIL || 'csaba@moldovan.pro'

async function checkUser() {
  const db = await getDb()
  const user = await db.collection('publicUsers').findOne({ email: TEST_EMAIL })
  
  if (!user) {
    console.log(`❌ User ${TEST_EMAIL} not found`)
    process.exit(1)
  }
  
  console.log('✅ User found:')
  console.log(JSON.stringify(user, null, 2))
  
  if (!user.emailVerified) {
    console.log('\n⚠️  Email is NOT verified - magic links will not be sent!')
    console.log('Updating email to verified...')
    
    await db.collection('publicUsers').updateOne(
      { _id: user._id },
      { $set: { emailVerified: true, updatedAt: new Date().toISOString() } }
    )
    
    console.log('✅ Email verified status updated')
  }
}

checkUser().catch(console.error)
