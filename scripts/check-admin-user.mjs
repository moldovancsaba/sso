import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config()

async function checkAdmin() {
  try {
    const db = await getDb()
    const usersCollection = db.collection('users')
    
    // Check with exact email
    const user1 = await usersCollection.findOne({ email: 'moldovancsaba@gmail.com' })
    console.log('Search for moldovancsaba@gmail.com:', user1 ? 'FOUND' : 'NOT FOUND')
    if (user1) {
      console.log('User details:', {
        id: user1.id,
        email: user1.email,
        role: user1.role,
        hasPassword: !!user1.password
      })
    }
    
    // List all admin users
    console.log('\nAll admin users:')
    const allUsers = await usersCollection.find({}).toArray()
    allUsers.forEach(u => {
      console.log(`- ${u.email} (${u.role}) id=${u.id}`)
    })
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    process.exit(0)
  }
}

checkAdmin()
