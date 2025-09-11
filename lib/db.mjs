/**
 * lib/db.mjs — MongoDB connection singleton for SSO
 * WHAT: Centralized DB singleton for all API routes.
 * WHY: Prevents connection storms and aligns with Next.js Pages Router runtime.
 */
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'sso'

if (!uri) {
  // We fail fast at call time if someone forgot to set MONGODB_URI
  console.warn('[lib/db] MONGODB_URI is not set. getDb() will throw if called.')
}

let client
let clientPromise

// Avoid multiple connections across hot-reloads by caching on globalThis
if (!globalThis._sso_mongoClientPromise) {
  client = new MongoClient(uri || '', {})
  globalThis._sso_mongoClientPromise = uri
    ? client.connect()
    : Promise.reject(new Error('MONGODB_URI is required'))
}

clientPromise = globalThis._sso_mongoClientPromise

export async function getDb() {
  if (!uri) throw new Error('MONGODB_URI is required to connect to MongoDB')
  const c = await clientPromise
  return c.db(dbName)
}

