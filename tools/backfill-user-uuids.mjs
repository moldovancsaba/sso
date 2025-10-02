#!/usr/bin/env node
/**
 * tools/backfill-user-uuids.mjs — One-time utility to assign UUIDs to legacy users.
 * WHAT: Adds a UUID 'id' to any user document missing it; ensures id index exists.
 * WHY: Migrate to UUIDs as primary identifiers without changing Mongo _id.
 * HOW: Safe to re-run; updates only docs missing 'id'.
 */
import { MongoClient } from 'mongodb'
import { randomUUID } from 'crypto'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'sso'

if (!uri) {
  console.error('[backfill-user-uuids] MONGODB_URI is required')
  process.exit(1)
}

function nowIso() {
  return new Date().toISOString()
}

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)
  const col = db.collection('users')

  // Ensure indexes (id unique sparse)
  try {
    await col.createIndex({ id: 1 }, { unique: true, sparse: true })
  } catch {}

  const cursor = col.find({ $or: [{ id: { $exists: false } }, { id: null }] })
  let updated = 0
  while (await cursor.hasNext()) {
    const doc = await cursor.next()
    const id = randomUUID()
    await col.updateOne(
      { _id: doc._id },
      { $set: { id, updatedAt: nowIso() } }
    )
    updated++
  }

  console.log(`[backfill-user-uuids] Completed. Updated: ${updated}`)
  await client.close()
}

main().catch((err) => {
  console.error('[backfill-user-uuids] Error:', err)
  process.exit(1)
})
