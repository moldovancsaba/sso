/**
 * scripts/migrations/2025-10-04-add-email-verified-and-reset-tokens.mjs
 * WHAT: Migration script to add email verification fields and create password reset tokens collection.
 * WHY: Database schema update required for SSO v5.1.0 email and password reset features.
 * 
 * Run with: node scripts/migrations/2025-10-04-add-email-verified-and-reset-tokens.mjs
 */
import 'dotenv/config'
import { MongoClient } from 'mongodb'

/**
 * WHAT: Get MongoDB connection from environment
 * WHY: Reuse existing DB connection pattern; support both local and production
 */
const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || 'sso'

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables')
  process.exit(1)
}

/**
 * connectToDatabase
 * WHAT: Establishes connection to MongoDB.
 * WHY: Migration needs direct database access to update schema and create collections.
 */
async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  console.log('✅ Connected to MongoDB')
  return { client, db: client.db(MONGODB_DB) }
}

/**
 * addEmailVerifiedFieldsToUsers
 * WHAT: Adds emailVerified and emailVerifiedAt fields to users collection.
 * WHY: Admin users need email verification capability; existing users default to unverified.
 * 
 * @param {Db} db - MongoDB database instance
 */
async function addEmailVerifiedFieldsToUsers(db) {
  console.log('\n📧 Updating users collection...')
  const usersCol = db.collection('users')
  
  // WHAT: Count users without emailVerified field
  // WHY: Show progress; know how many documents need updating
  const count = await usersCol.countDocuments({ emailVerified: { $exists: false } })
  console.log(`   Found ${count} admin users needing email verification fields`)
  
  if (count === 0) {
    console.log('   ✓ All admin users already have email verification fields')
    return
  }

  // WHAT: Add emailVerified=false and emailVerifiedAt=null to existing users
  // WHY: Existing users haven't verified email yet; new field should default to false
  const result = await usersCol.updateMany(
    { emailVerified: { $exists: false } },
    { 
      $set: { 
        emailVerified: false,
        emailVerifiedAt: null,
        updatedAt: new Date().toISOString()
      } 
    }
  )
  
  console.log(`   ✅ Updated ${result.modifiedCount} admin users with email verification fields`)
}

/**
 * addEmailVerifiedFieldsToPublicUsers
 * WHAT: Adds emailVerified and emailVerifiedAt fields to publicUsers collection.
 * WHY: Public users need email verification; existing users default to unverified.
 * 
 * @param {Db} db - MongoDB database instance
 */
async function addEmailVerifiedFieldsToPublicUsers(db) {
  console.log('\n📧 Updating publicUsers collection...')
  const publicUsersCol = db.collection('publicUsers')
  
  const count = await publicUsersCol.countDocuments({ emailVerified: { $exists: false } })
  console.log(`   Found ${count} public users needing email verification fields`)
  
  if (count === 0) {
    console.log('   ✓ All public users already have email verification fields')
    return
  }

  const result = await publicUsersCol.updateMany(
    { emailVerified: { $exists: false } },
    { 
      $set: { 
        emailVerified: false,
        emailVerifiedAt: null,
        updatedAt: new Date().toISOString()
      } 
    }
  )
  
  console.log(`   ✅ Updated ${result.modifiedCount} public users with email verification fields`)
}

/**
 * addEmailVerifiedFieldsToOrgUsers
 * WHAT: Adds emailVerified and emailVerifiedAt fields to orgUsers collection.
 * WHY: Organization users need email verification; existing users default to unverified.
 * 
 * @param {Db} db - MongoDB database instance
 */
async function addEmailVerifiedFieldsToOrgUsers(db) {
  console.log('\n📧 Updating orgUsers collection...')
  const orgUsersCol = db.collection('orgUsers')
  
  const count = await orgUsersCol.countDocuments({ emailVerified: { $exists: false } })
  console.log(`   Found ${count} organization users needing email verification fields`)
  
  if (count === 0) {
    console.log('   ✓ All organization users already have email verification fields')
    return
  }

  const result = await orgUsersCol.updateMany(
    { emailVerified: { $exists: false } },
    { 
      $set: { 
        emailVerified: false,
        emailVerifiedAt: null,
        updatedAt: new Date().toISOString()
      } 
    }
  )
  
  console.log(`   ✅ Updated ${result.modifiedCount} organization users with email verification fields`)
}

/**
 * createOrgEmailConfigsCollection
 * WHAT: Creates orgEmailConfigs collection with indexes for per-organization email configuration.
 * WHY: Multi-tenant email system needs to store organization-specific email provider settings.
 * 
 * @param {Db} db - MongoDB database instance
 */
async function createOrgEmailConfigsCollection(db) {
  console.log('\n📧 Creating orgEmailConfigs collection...')
  
  const collections = await db.listCollections({ name: 'orgEmailConfigs' }).toArray()
  const col = db.collection('orgEmailConfigs')
  
  if (collections.length > 0) {
    console.log('   ⚠️  Collection already exists, ensuring indexes...')
  } else {
    console.log('   Creating new collection...')
  }

  // WHAT: Create all required indexes for organization email configs
  // WHY: Each index serves a specific query pattern for configuration management
  
  // Index 1: orgId (unique) - primary lookup for org-specific email config
  try {
    await col.createIndex({ orgId: 1 }, { unique: true, name: 'orgId_unique' })
    console.log('   ✓ Index: orgId (unique)')
  } catch (error) {
    if (error.code === 85) {
      console.log('   ✓ Index: orgId (unique) - already exists')
    } else {
      throw error
    }
  }

  // Index 2: createdAt - for listing configs by creation date
  try {
    await col.createIndex({ createdAt: -1 }, { name: 'createdAt_desc' })
    console.log('   ✓ Index: createdAt (descending)')
  } catch (error) {
    if (error.code === 85) {
      console.log('   ✓ Index: createdAt (descending) - already exists')
    } else {
      throw error
    }
  }

  console.log('   ✅ orgEmailConfigs collection ready')
}

/**
 * createPasswordResetTokensCollection
 * WHAT: Creates passwordResetTokens collection with all required indexes.
 * WHY: Password reset flow needs persistent token storage with TTL expiration.
 * 
 * @param {Db} db - MongoDB database instance
 */
async function createPasswordResetTokensCollection(db) {
  console.log('\n🔐 Creating passwordResetTokens collection...')
  
  const collections = await db.listCollections({ name: 'passwordResetTokens' }).toArray()
  const col = db.collection('passwordResetTokens')
  
  if (collections.length > 0) {
    console.log('   ⚠️  Collection already exists, ensuring indexes...')
  } else {
    console.log('   Creating new collection...')
  }

  // WHAT: Create all required indexes for password reset tokens
  // WHY: Each index serves a specific query pattern for security and performance
  
  // Index 1: tokenHash (unique) - primary lookup for token validation
  try {
    await col.createIndex({ tokenHash: 1 }, { unique: true, name: 'tokenHash_unique' })
    console.log('   ✓ Index: tokenHash (unique)')
  } catch (error) {
    if (error.code === 85) {
      console.log('   ✓ Index: tokenHash (unique) - already exists')
    } else {
      throw error
    }
  }

  // Index 2: jti (unique) - secondary lookup and duplicate prevention
  try {
    await col.createIndex({ jti: 1 }, { unique: true, name: 'jti_unique' })
    console.log('   ✓ Index: jti (unique)')
  } catch (error) {
    if (error.code === 85) {
      console.log('   ✓ Index: jti (unique) - already exists')
    } else {
      throw error
    }
  }

  // Index 3: email + userType - query tokens by user identity
  try {
    await col.createIndex({ email: 1, userType: 1 }, { name: 'email_userType' })
    console.log('   ✓ Index: email + userType')
  } catch (error) {
    if (error.code === 85) {
      console.log('   ✓ Index: email + userType - already exists')
    } else {
      throw error
    }
  }

  // Index 4: orgId - query tokens by organization (for org users)
  try {
    await col.createIndex({ orgId: 1 }, { name: 'orgId', sparse: true })
    console.log('   ✓ Index: orgId')
  } catch (error) {
    if (error.code === 85) {
      console.log('   ✓ Index: orgId - already exists')
    } else {
      throw error
    }
  }

  // Index 5: usedAt - query used/unused tokens
  try {
    await col.createIndex({ usedAt: 1 }, { name: 'usedAt', sparse: true })
    console.log('   ✓ Index: usedAt')
  } catch (error) {
    if (error.code === 85) {
      console.log('   ✓ Index: usedAt - already exists')
    } else {
      throw error
    }
  }

  // Index 6: TTL index on expTs - automatic cleanup of expired tokens
  // WHAT: TTL index with expireAfterSeconds=0 means delete immediately when expTs date passes
  // WHY: Automatic cleanup prevents database bloat; meets security requirement for token expiry
  try {
    await col.createIndex({ expTs: 1 }, { expireAfterSeconds: 0, name: 'expTs_ttl' })
    console.log('   ✓ Index: expTs (TTL) - automatic cleanup of expired tokens')
  } catch (error) {
    if (error.code === 85 || error.code === 86) {
      console.log('   ✓ Index: expTs (TTL) - already exists')
    } else {
      throw error
    }
  }

  console.log('   ✅ passwordResetTokens collection ready')
}

/**
 * verifyMigration
 * WHAT: Verifies that migration completed successfully.
 * WHY: Sanity check; confirm all changes were applied before continuing.
 * 
 * @param {Db} db - MongoDB database instance
 */
async function verifyMigration(db) {
  console.log('\n🔍 Verifying migration...')
  
  // WHAT: Check users collection has email verification fields
  const usersCol = db.collection('users')
  const userSample = await usersCol.findOne({})
  if (userSample && typeof userSample.emailVerified === 'boolean') {
    console.log('   ✓ users collection has emailVerified field')
  } else {
    console.log('   ⚠️  users collection may not have emailVerified field (or is empty)')
  }
  
  // WHAT: Check publicUsers collection has email verification fields
  const publicUsersCol = db.collection('publicUsers')
  const publicUserSample = await publicUsersCol.findOne({})
  if (publicUserSample && typeof publicUserSample.emailVerified === 'boolean') {
    console.log('   ✓ publicUsers collection has emailVerified field')
  } else {
    console.log('   ⚠️  publicUsers collection may not have emailVerified field (or is empty)')
  }
  
  // WHAT: Check orgUsers collection has email verification fields
  const orgUsersCol = db.collection('orgUsers')
  const orgUserSample = await orgUsersCol.findOne({})
  if (orgUserSample && typeof orgUserSample.emailVerified === 'boolean') {
    console.log('   ✓ orgUsers collection has emailVerified field')
  } else {
    console.log('   ⚠️  orgUsers collection may not have emailVerified field (or is empty)')
  }
  
  // WHAT: Check passwordResetTokens collection exists and has indexes
  const prCollections = await db.listCollections({ name: 'passwordResetTokens' }).toArray()
  if (prCollections.length > 0) {
    const col = db.collection('passwordResetTokens')
    const indexes = await col.indexes()
    console.log(`   ✓ passwordResetTokens collection exists with ${indexes.length} indexes`)
  } else {
    console.log('   ❌ passwordResetTokens collection not found')
  }
  
  // WHAT: Check orgEmailConfigs collection exists and has indexes
  const oeCollections = await db.listCollections({ name: 'orgEmailConfigs' }).toArray()
  if (oeCollections.length > 0) {
    const col = db.collection('orgEmailConfigs')
    const indexes = await col.indexes()
    console.log(`   ✓ orgEmailConfigs collection exists with ${indexes.length} indexes`)
  } else {
    console.log('   ❌ orgEmailConfigs collection not found')
  }
}

/**
 * runMigration
 * WHAT: Main migration function that orchestrates all database changes.
 * WHY: Single entry point; ensures all changes happen in correct order.
 */
async function runMigration() {
  console.log('🚀 Starting migration: 2025-10-04-add-email-verified-and-reset-tokens')
  console.log(`   Database: ${MONGODB_DB}`)
  console.log(`   Timestamp: ${new Date().toISOString()}`)
  
  let client
  
  try {
    const { client: dbClient, db } = await connectToDatabase()
    client = dbClient
    
    // WHAT: Execute all migration steps in order
    // WHY: Step-by-step approach with logging for visibility and debugging
    await addEmailVerifiedFieldsToUsers(db)
    await addEmailVerifiedFieldsToPublicUsers(db)
    await addEmailVerifiedFieldsToOrgUsers(db)
    await createOrgEmailConfigsCollection(db)
    await createPasswordResetTokensCollection(db)
    await verifyMigration(db)
    
    console.log('\n✅ Migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Configure system default email provider (SMTP or Resend) in .env')
    console.log('   2. Optionally configure per-organization email settings via admin UI')
    console.log('   3. Test password reset flow for each user type')
    console.log('   4. Test email verification flow for each user type')
    console.log('   5. Monitor logs for email sending attempts')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log('\n🔌 Disconnected from MongoDB')
    }
  }
}

// WHAT: Run migration when script is executed directly
// WHY: Allow this script to be imported without auto-executing (for future tooling)
runMigration().catch(console.error)

export { runMigration }
