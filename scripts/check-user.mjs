#!/usr/bin/env node
/**
 * Check if user exists in SSO database
 */

import { getDb } from '../lib/db.mjs'

const userId = process.argv[2] || '5143beb1-9bb6-47e7-a099-e9eeb2d89e93'

async function main() {
  try {
    const db = await getDb()
    
    console.log('🔍 Looking for user:', userId)
    
    const user = await db.collection('users').findOne({ id: userId })
    
    if (!user) {
      console.log('❌ User NOT found in database')
      console.log('\nSearching by email instead...')
      
      const userByEmail = await db.collection('users').findOne({ email: 'moldovancsaba@gmail.com' })
      
      if (userByEmail) {
        console.log('✅ Found user by email:')
        console.log('   ID:', userByEmail.id)
        console.log('   Email:', userByEmail.email)
        console.log('   Name:', userByEmail.name)
        console.log('   Role:', userByEmail.role)
        console.log('\n⚠️  ID MISMATCH!')
        console.log('   Expected:', userId)
        console.log('   Actual:', userByEmail.id)
      } else {
        console.log('❌ User not found by email either')
        console.log('\nListing all users:')
        const allUsers = await db.collection('users').find({}).limit(10).toArray()
        allUsers.forEach(u => {
          console.log(`   - ${u.email} (${u.id})`)
        })
      }
    } else {
      console.log('✅ User found:')
      console.log('   ID:', user.id)
      console.log('   Email:', user.email)
      console.log('   Name:', user.name)
      console.log('   Role:', user.role)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
