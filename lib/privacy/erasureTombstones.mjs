/**
 * Minimal backup-replay fence for photos erased by the cross-product coordinator.
 *
 * The coordinator drops each `currentPhoto` as soon as its deletion receipts are
 * complete. This journal is independent of Camera's restorable database backup,
 * so a restore can suppress only the exact already-erased photo references.
 * It deliberately stores no subject identity, email, media URL, or image bytes.
 */
import { getDb } from '../db.mjs'

export const ERASURE_TOMBSTONE_COLLECTION = 'privacyErasureTombstones'
const PHOTO_ID = /^[0-9a-f]{24}$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_RETENTION_DAYS = 3650

export function backupRetentionDays(value = process.env.SSO_PRIVACY_BACKUP_RETENTION_DAYS) {
  if (typeof value !== 'string' || !/^\d{1,4}$/.test(value)) return null
  const days = Number(value)
  return Number.isSafeInteger(days) && days >= 1 && days <= MAX_RETENTION_DAYS ? days : null
}

function normalize(input, now = new Date(), retention = backupRetentionDays()) {
  if (!input || !UUID.test(input.requestId || '') || !PHOTO_ID.test(input.photoId || '') ||
      typeof input.submissionId !== 'string' || !input.submissionId.trim() || input.submissionId.length > 128 ||
      !Array.isArray(input.eventIds) || input.eventIds.length > 100 ||
      input.eventIds.some((id) => typeof id !== 'string' || !id.trim() || id.length > 128) ||
      !(input.partnerId === null || (typeof input.partnerId === 'string' && input.partnerId.trim() && input.partnerId.length <= 128))) {
    const error = new Error('privacy_erasure_tombstone_contract_invalid')
    error.code = 'privacy_erasure_tombstone_contract_invalid'
    throw error
  }
  const createdAt = new Date(now)
  if (!Number.isFinite(createdAt.getTime())) throw new Error('privacy_erasure_tombstone_time_invalid')
  const eventIds = [...new Set(input.eventIds.map((id) => id.trim()))].sort()
  const row = {
    requestId: input.requestId.toLowerCase(),
    photoId: input.photoId.toLowerCase(),
    submissionId: input.submissionId.trim(),
    eventIds,
    partnerId: input.partnerId?.trim() || null,
    createdAt,
    contractVersion: 'privacy.erasure.tombstone.v1',
    retentionDays: retention,
    ...(retention ? { expiresAt: new Date(createdAt.getTime() + retention * 86_400_000) } : {}),
  }
  return row
}

function sameTarget(left, right) {
  return left.requestId === right.requestId && left.photoId === right.photoId &&
    left.submissionId === right.submissionId && left.partnerId === right.partnerId &&
    JSON.stringify(left.eventIds || []) === JSON.stringify(right.eventIds || [])
}

/** Idempotently persist one exact photo tombstone before the coordinator advances. */
export async function recordPrivacyErasureTombstone(input, { db, now = () => new Date(), retentionDays: retentionOverride } = {}) {
  const database = db || await getDb()
  const retention = retentionOverride === undefined ? backupRetentionDays() : retentionOverride
  const row = normalize(input, now(), retention)
  const collection = database.collection(ERASURE_TOMBSTONE_COLLECTION)
  await Promise.all([
    collection.createIndex({ requestId: 1, photoId: 1 }, { unique: true, name: 'uniq_privacy_erasure_tombstone_case_photo' }),
    collection.createIndex({ createdAt: 1, requestId: 1, photoId: 1 }, { name: 'privacy_erasure_tombstone_export_order' }),
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'privacy_erasure_tombstone_expiry' }),
  ])
  await collection.updateOne(
    { requestId: row.requestId, photoId: row.photoId },
    { $setOnInsert: row },
    { upsert: true },
  )
  const saved = await collection.findOne({ requestId: row.requestId, photoId: row.photoId })
  if (!saved || !sameTarget(saved, row)) {
    const error = new Error('privacy_erasure_tombstone_conflict')
    error.code = 'privacy_erasure_tombstone_conflict'
    throw error
  }
  return saved
}

function decodeCursor(cursor) {
  if (!cursor) return null
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || typeof parsed.createdAt !== 'string' ||
        Number.isNaN(Date.parse(parsed.createdAt)) || !UUID.test(parsed.requestId || '') || !PHOTO_ID.test(parsed.photoId || '')) return null
    return { createdAt: new Date(parsed.createdAt), requestId: parsed.requestId, photoId: parsed.photoId }
  } catch {
    return null
  }
}

function encodeCursor(row) {
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), requestId: row.requestId, photoId: row.photoId })).toString('base64url')
}

/** Keyset-paginated, identity-minimized replay feed. Caller must authorize first. */
export async function listPrivacyErasureTombstones({ db, cursor, limit = 250, now = new Date() } = {}) {
  const database = db || await getDb()
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(500, limit)) : 250
  if (cursor && !decodeCursor(cursor)) {
    const error = new Error('privacy_tombstone_cursor_invalid')
    error.code = 'privacy_tombstone_cursor_invalid'
    throw error
  }
  const decoded = decodeCursor(cursor)
  const filter = {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    ...(decoded ? { $and: [{ $or: [
      { createdAt: { $gt: decoded.createdAt } },
      { createdAt: decoded.createdAt, requestId: { $gt: decoded.requestId } },
      { createdAt: decoded.createdAt, requestId: decoded.requestId, photoId: { $gt: decoded.photoId } },
    ] }] } : {}),
  }
  const rows = await database.collection(ERASURE_TOMBSTONE_COLLECTION)
    .find(filter, { projection: { _id: 0, requestId: 1, photoId: 1, submissionId: 1, eventIds: 1, partnerId: 1, createdAt: 1, expiresAt: 1, retentionDays: 1, contractVersion: 1 } })
    .sort({ createdAt: 1, requestId: 1, photoId: 1 })
    .limit(safeLimit + 1)
    .toArray()
  const complete = rows.length <= safeLimit
  const page = complete ? rows : rows.slice(0, safeLimit)
  return {
    version: 1,
    retentionPolicy: { configured: backupRetentionDays() !== null, days: backupRetentionDays() },
    tombstones: page,
    complete,
    nextCursor: complete || page.length === 0 ? null : encodeCursor(page[page.length - 1]),
  }
}
