import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getDb } from '../lib/db.mjs'

const db = await getDb()
const user = await db.collection('publicUsers').findOne({ email: 'moldovancsaba@gmail.com' })

console.log('Email:', user.email)
console.log('Has passwordHash:', !!user.passwordHash)
console.log('Password hash length:', user.passwordHash?.length)
console.log('Has Facebook:', !!user.socialProviders?.facebook)
console.log('Has Google:', !!user.socialProviders?.google)
console.log('\nFull user object:')
console.log(JSON.stringify(user, null, 2))

process.exit(0)
