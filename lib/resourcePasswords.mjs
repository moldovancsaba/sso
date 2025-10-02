/**
 * lib/resourcePasswords.mjs — Resource-specific password generation and validation
 * WHAT: Provides MD5-style random tokens, usage tracking, and shareable link helper.
 * WHY: Aligns SSO with MessMass page password model; generic across resources.
 */
import { randomBytes } from 'crypto'
import { getDb } from './db.mjs'

/**
 * generateMD5StylePassword
 * Produces a 32-character lowercase hex string that "looks like" an MD5 hash.
 */
export function generateMD5StylePassword() {
  return randomBytes(16).toString('hex')
}

/**
 * getOrCreateResourcePassword
 * Create or fetch a password for a resource.
 */
export async function getOrCreateResourcePassword(resourceId, resourceType, regenerate = false) {
  const db = await getDb()
  const collection = db.collection('resourcePasswords')

  let existing = await collection.findOne({ resourceId, resourceType })
  if (existing && !regenerate) {
    return {
      _id: existing._id?.toString(),
      resourceId: existing.resourceId,
      resourceType: existing.resourceType,
      password: existing.password,
      createdAt: existing.createdAt,
      expiresAt: existing.expiresAt,
      usageCount: existing.usageCount ?? 0,
      lastUsedAt: existing.lastUsedAt,
    }
  }

  const newDoc = {
    resourceId,
    resourceType,
    password: generateMD5StylePassword(),
    createdAt: new Date().toISOString(),
    usageCount: 0,
  }

  await collection.updateOne(
    { resourceId, resourceType },
    { $set: newDoc },
    { upsert: true }
  )

  const saved = await collection.findOne({ resourceId, resourceType })
  return {
    _id: saved._id?.toString(),
    resourceId: saved.resourceId,
    resourceType: saved.resourceType,
    password: saved.password,
    createdAt: saved.createdAt,
    expiresAt: saved.expiresAt,
    usageCount: saved.usageCount ?? 0,
    lastUsedAt: saved.lastUsedAt,
  }
}

/**
 * validateResourcePassword
 * Checks a provided password against stored token; updates usage stats.
 */
export async function validateResourcePassword(resourceId, resourceType, providedPassword) {
  const db = await getDb()
  const collection = db.collection('resourcePasswords')

  const doc = await collection.findOne({ resourceId, resourceType })
  if (!doc) return false

  const isValid = doc.password === providedPassword
  if (isValid) {
    await collection.updateOne(
      { resourceId, resourceType },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date().toISOString() },
      }
    )
  }
  return isValid
}

/**
 * validateAnyPassword
 * WHAT: Validate provided password against the resource-specific password only.
 * WHY: Admin access is validated via session at route level (bypass).
 */
export async function validateAnyPassword(resourceId, resourceType, providedPassword) {
  const isResourcePasswordValid = await validateResourcePassword(resourceId, resourceType, providedPassword)
  return { isValid: isResourcePasswordValid, isAdmin: false }
}

/**
 * generateShareableLink
 * Builds a shareable link to the resource with current password (no query injection).
 */
export async function generateShareableLink(resourceId, resourceType, baseUrl = '') {
  const resourcePassword = await getOrCreateResourcePassword(resourceId, resourceType)
  let url = baseUrl || process.env.SSO_BASE_URL || ''
  // No resource-type-specific routes enforced here; the consumer builds final URLs.
  url += url.endsWith('/') ? '' : ''
  return {
    url,
    password: resourcePassword.password,
    resourceType,
    expiresAt: resourcePassword.expiresAt,
  }
}

/**
 * cleanupExpiredPasswords
 * Removes expired entries by timestamp.
 */
export async function cleanupExpiredPasswords() {
  const db = await getDb()
  const collection = db.collection('resourcePasswords')
  const now = new Date().toISOString()
  const res = await collection.deleteMany({ expiresAt: { $exists: true, $lt: now } })
  return res.deletedCount || 0
}

/**
 * getPasswordStats
 * Aggregates basic usage metrics for observability.
 */
export async function getPasswordStats(resourceId) {
  const db = await getDb()
  const collection = db.collection('resourcePasswords')

  const filter = resourceId ? { resourceId } : {}

  const total = await collection.countDocuments(filter)
  const used = await collection.countDocuments({ ...filter, usageCount: { $gt: 0 } })
  const neverUsed = total - used

  const mostUsed = await collection.findOne(filter, { sort: { usageCount: -1 } })

  return {
    total,
    used,
    neverUsed,
    mostUsed: mostUsed
      ? {
          resourceId: mostUsed.resourceId,
          resourceType: mostUsed.resourceType,
          usageCount: mostUsed.usageCount,
          lastUsedAt: mostUsed.lastUsedAt,
        }
      : null,
  }
}

