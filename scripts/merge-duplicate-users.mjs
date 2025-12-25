import dotenv from 'dotenv'
import { getDb } from '../lib/db.mjs'

dotenv.config()

async function mergeDuplicateUsers() {
  console.log('🔄 Merging duplicate users by email...\n')
  
  const db = await getDb()
  const publicUsersCollection = db.collection('publicUsers')
  const appPermissionsCollection = db.collection('appPermissions')
  
  // Find all emails with multiple users
  const duplicates = await publicUsersCollection.aggregate([
    {
      $group: {
        _id: '$email',
        count: { $sum: 1 },
        users: { $push: { id: '$id', createdAt: '$createdAt', socialProviders: '$socialProviders' } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray()
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate users found')
    process.exit(0)
  }
  
  console.log(`📊 Found ${duplicates.length} emails with duplicates\n`)
  
  for (const dup of duplicates) {
    console.log(`\n📧 Email: ${dup._id}`)
    console.log(`   Duplicate accounts: ${dup.count}`)
    
    // Keep the OLDEST user (first created)
    const sortedUsers = dup.users.sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    )
    
    const keepUserId = sortedUsers[0].id
    const deleteUserIds = sortedUsers.slice(1).map(u => u.id)
    
    console.log(`   ✓ Keeping user: ${keepUserId} (oldest)`)
    console.log(`   ✗ Merging from: ${deleteUserIds.join(', ')}`)
    
    // Update all appPermissions to point to kept user
    for (const oldUserId of deleteUserIds) {
      const result = await appPermissionsCollection.updateMany(
        { userId: oldUserId },
        { $set: { userId: keepUserId } }
      )
      console.log(`     → Moved ${result.modifiedCount} permissions from ${oldUserId}`)
    }
    
    // Delete duplicate user accounts
    const deleteResult = await publicUsersCollection.deleteMany({
      id: { $in: deleteUserIds }
    })
    console.log(`     → Deleted ${deleteResult.deletedCount} duplicate accounts`)
  }
  
  console.log('\n✅ Merge completed!')
  process.exit(0)
}

mergeDuplicateUsers()
