/**
 * lib/sessions.mjs — Server-side session management with MongoDB
 * WHAT: Creates, validates, and revokes admin sessions with database persistence.
 * WHY: Enables server-side session revocation; stolen tokens can be invalidated immediately.
 */
import { randomBytes, createHash } from 'crypto'
import { getDb } from './db.mjs'
import { logSessionCreated, logSessionRevoked } from './logger.mjs'

/**
 * getSessionsCollection
 * WHAT: Returns MongoDB collection for active sessions with indexes.
 * WHY: Centralized collection access; ensures indexes for fast lookups.
 */
export async function getSessionsCollection() {
  const db = await getDb()
  const col = db.collection('adminSessions')
  
  try {
    // Index on tokenHash for fast validation
    await col.createIndex({ tokenHash: 1 }, { unique: true })
  } catch {}
  
  try {
    // Index on userId for querying user sessions
    await col.createIndex({ userId: 1 })
  } catch {}
  
  try {
    // TTL index for automatic cleanup of expired sessions
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  } catch {}
  
  return col
}

/**
 * hashToken
 * WHAT: Creates SHA-256 hash of session token for storage.
 * WHY: Don't store raw tokens in DB; if DB compromised, attacker can't reuse tokens.
 */
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * generateSessionToken
 * WHAT: Generates cryptographically random 64-character hex token.
 * WHY: Session identifier with high entropy (256 bits) resistant to brute force.
 */
export function generateSessionToken() {
  return randomBytes(32).toString('hex')
}

/**
 * createSession
 * WHAT: Creates a new session in MongoDB and returns token + metadata.
 * WHY: Server-side session tracking enables revocation and audit logging.
 * 
 * @param {string} userId - UUID of authenticated user
 * @param {string} email - User email (for logging)
 * @param {string} role - User role (admin, super-admin)
 * @param {number} maxAgeSeconds - Session lifetime in seconds (default 7 days)
 * @param {object} metadata - Additional session metadata (IP, user-agent, etc.)
 * @returns {Promise<{token: string, sessionId: string, expiresAt: string}>}
 */
export async function createSession(userId, email, role, maxAgeSeconds = 7 * 24 * 60 * 60, metadata = {}) {
  const col = await getSessionsCollection()
  
  const token = generateSessionToken()
  const tokenHash = hashToken(token)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000)
  
  const session = {
    tokenHash,
    userId,
    email,
    role,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastAccessedAt: now.toISOString(),
    ip: metadata.ip || null,
    userAgent: metadata.userAgent || null,
    revokedAt: null,
    revokeReason: null,
  }
  
  const result = await col.insertOne(session)
  const sessionId = result.insertedId.toString()
  
  // Log session creation for audit trail
  logSessionCreated(userId, sessionId, expiresAt.toISOString(), metadata)
  
  return {
    token,
    sessionId,
    expiresAt: expiresAt.toISOString(),
  }
}

/**
 * validateSession
 * WHAT: Validates session token against MongoDB; checks expiration and revocation.
 * WHY: Server-side validation prevents stolen/revoked tokens from being used.
 * 
 * @param {string} token - Raw session token from cookie
 * @returns {Promise<{valid: boolean, session?: object, reason?: string}>}
 */
export async function validateSession(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'invalid_token' }
  }
  
  const col = await getSessionsCollection()
  const tokenHash = hashToken(token)
  
  const session = await col.findOne({ tokenHash })
  
  if (!session) {
    return { valid: false, reason: 'session_not_found' }
  }
  
  // Check if session was revoked
  if (session.revokedAt) {
    return { valid: false, reason: 'session_revoked', session }
  }
  
  // Check expiration
  const now = new Date()
  const expiresAt = new Date(session.expiresAt)
  if (now > expiresAt) {
    return { valid: false, reason: 'session_expired', session }
  }
  
  // Update last accessed timestamp (fire-and-forget)
  col.updateOne(
    { tokenHash },
    { $set: { lastAccessedAt: now.toISOString() } }
  ).catch(() => {})
  
  return { valid: true, session }
}

/**
 * revokeSession
 * WHAT: Marks session as revoked in MongoDB (soft delete).
 * WHY: Immediate invalidation without waiting for expiration; audit trail preserved.
 * 
 * @param {string} token - Raw session token to revoke
 * @param {string} reason - Reason for revocation (e.g., 'logout', 'admin_revoked')
 * @returns {Promise<boolean>} - True if session was revoked
 */
export async function revokeSession(token, reason = 'logout') {
  if (!token) return false
  
  const col = await getSessionsCollection()
  const tokenHash = hashToken(token)
  
  const session = await col.findOne({ tokenHash })
  if (!session) return false
  
  const now = new Date().toISOString()
  await col.updateOne(
    { tokenHash },
    {
      $set: {
        revokedAt: now,
        revokeReason: reason,
      },
    }
  )
  
  // Log revocation for audit trail
  logSessionRevoked(session.userId, session._id.toString(), reason, {
    email: session.email,
  })
  
  return true
}

/**
 * revokeUserSessions
 * WHAT: Revokes all active sessions for a specific user.
 * WHY: Force logout from all devices (e.g., password change, account compromise).
 * 
 * @param {string} userId - UUID of user whose sessions to revoke
 * @param {string} reason - Reason for mass revocation
 * @returns {Promise<number>} - Number of sessions revoked
 */
export async function revokeUserSessions(userId, reason = 'admin_action') {
  const col = await getSessionsCollection()
  
  const now = new Date().toISOString()
  const result = await col.updateMany(
    { userId, revokedAt: null },
    {
      $set: {
        revokedAt: now,
        revokeReason: reason,
      },
    }
  )
  
  return result.modifiedCount
}

/**
 * cleanupExpiredSessions
 * WHAT: Deletes expired and old revoked sessions from MongoDB.
 * WHY: Prevent session collection from growing indefinitely; TTL index handles most cleanup.
 * 
 * NOTE: MongoDB TTL index handles expired sessions automatically. This is for manual cleanup
 * of old revoked sessions that haven't expired yet (retention policy).
 * 
 * @param {number} retentionDays - Keep revoked sessions for N days (default 30)
 * @returns {Promise<number>} - Number of sessions deleted
 */
export async function cleanupExpiredSessions(retentionDays = 30) {
  const col = await getSessionsCollection()
  
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  
  const result = await col.deleteMany({
    revokedAt: { $ne: null, $lt: cutoff.toISOString() },
  })
  
  return result.deletedCount
}

/**
 * getUserActiveSessions
 * WHAT: Retrieves all active (non-revoked, non-expired) sessions for a user.
 * WHY: Allow users to see active sessions and revoke specific devices.
 * 
 * @param {string} userId - UUID of user
 * @returns {Promise<Array>} - List of active sessions with metadata
 */
export async function getUserActiveSessions(userId) {
  const col = await getSessionsCollection()
  const now = new Date().toISOString()
  
  const sessions = await col
    .find({
      userId,
      revokedAt: null,
      expiresAt: { $gt: now },
    })
    .sort({ createdAt: -1 })
    .toArray()
  
  // Don't expose tokenHash, but include useful metadata
  return sessions.map((s) => ({
    sessionId: s._id.toString(),
    createdAt: s.createdAt,
    lastAccessedAt: s.lastAccessedAt,
    expiresAt: s.expiresAt,
    ip: s.ip,
    userAgent: s.userAgent,
  }))
}
