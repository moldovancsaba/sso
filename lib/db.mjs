/**
 * lib/db.mjs — MongoDB connection singleton for SSO
 * WHAT: Centralized DB singleton for all API routes.
 * WHY: Prevents connection storms and aligns with Next.js Pages Router runtime.
 *
 * IMPORTANT: Do NOT instantiate MongoClient at import-time without a URI.
 * Doing so with an empty string causes an import-time throw in serverless
 * environments (resulting in an "Empty reply from server"). We lazily
 * create the client only when getDb() is actually called and a valid
 * MONGODB_URI is present.
 */
import { MongoClient } from 'mongodb'

// We intentionally avoid reading and using MONGODB_URI at module scope to prevent
// import-time crashes if the env var is missing. We only validate inside getDb().

export async function getDb() {
  // Read envs at call time to support serverless environments and reuses
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB || 'sso'

  if (!uri) {
    // Fail fast with a clear error; callers should catch and translate to 503/500
    throw new Error('MONGODB_URI is required to connect to MongoDB')
  }

  // Avoid multiple connections across hot-reloads by caching on globalThis
  if (!globalThis._sso_mongoClientPromise) {
    // WHY: Lazily instantiate the client when we actually have a valid URI.
    // Add fast-fail timeouts so serverless functions return promptly if DB is
    // unreachable (prevents FUNCTION_INVOCATION_TIMEOUT and surfaces 503).
    const client = new MongoClient(uri, {
      // Time (ms) to discover a suitable server before failing
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
      // Time (ms) to establish the initial connection
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 5000),
      // Time (ms) for idle socket before timing out
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 5000),
    })
    globalThis._sso_mongoClientPromise = client.connect()
  }

  const client = await globalThis._sso_mongoClientPromise
  return client.db(dbName)
}

