// scripts/bootstrap-admin.mjs
// WHAT: One-time bootstrap to create or update the first super-admin user in MongoDB Atlas.
// HOW: Run with NEW_ADMIN_TOKEN env var (32-hex). MONGODB_URI is loaded from .env.local or env.
// SECURITY: Does not print secrets. Idempotent via upsert.

import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

// Load local env (ignored by git); env vars present in the environment override
dotenv.config({ path: '.env.local' })

const MONGODB_URI = (process.env.MONGODB_URI || '').trim()
const MONGODB_DB = (process.env.MONGODB_DB || 'sso').trim()
const NEW_ADMIN_TOKEN = (process.env.NEW_ADMIN_TOKEN || '').trim()

async function main() {
  if (!MONGODB_URI) {
    console.error('ERR: Missing MONGODB_URI')
    process.exit(2)
  }
  if (!/^[a-f0-9]{32}$/.test(NEW_ADMIN_TOKEN)) {
    console.error('ERR: Missing or invalid NEW_ADMIN_TOKEN (must be 32-hex)')
    process.exit(3)
  }

  const client = new MongoClient(MONGODB_URI, {})
  try {
    await client.connect()
    const db = client.db(MONGODB_DB)
    const col = db.collection('users')

    // Ensure unique index on email
    try {
      await col.createIndex({ email: 1 }, { unique: true })
    } catch {}

    const now = new Date().toISOString()
    const email = 'sso@doneisbetter.com'

    await col.updateOne(
      { email: email.toLowerCase() },
      {
        $setOnInsert: {
          email: email.toLowerCase(),
          name: 'Owner',
          role: 'super-admin',
          createdAt: now,
        },
        $set: {
          password: NEW_ADMIN_TOKEN, // by convention: 32-hex token
          updatedAt: now,
        },
      },
      { upsert: true }
    )

    // Do not print token or URI
    console.log('BOOTSTRAP_OK')
    process.exit(0)
  } catch (err) {
    console.error('ERR: Bootstrap failed:', err?.message || err)
    process.exit(1)
  } finally {
    try { await client.close() } catch {}
  }
}

main()