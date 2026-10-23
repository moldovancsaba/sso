import { createHmac, randomBytes } from 'node:crypto'
import { getDb } from '../db.mjs'
import { createErasureCase, decryptSubjectRef, encryptSubjectRef, getErasureCase } from './erasureCases.mjs'

const COLLECTION = 'privacyErasureEmailVerifications'
const TOKEN_TTL_MS = 30 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function key() {
  const value = process.env.SSO_PRIVACY_CASE_HMAC_KEY
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/i.test(value)) throw new Error('privacy_hmac_key_unavailable')
  return Buffer.from(value, 'hex')
}

function hmac(domain, value) {
  return createHmac('sha256', key()).update(`${domain}\0${value}`).digest('hex')
}

export function normalizeGuestErasureEmail(value) {
  if (typeof value !== 'string' || value.length > 254) return null
  const email = value.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email) || ['anonymous@event', 'anonymous@event.com', 'admin@upload'].includes(email)) return null
  return email
}

/** Store only an HMACed email and an encrypted proof subject; return raw token once for mail delivery. */
export async function issueGuestErasureVerification(emailValue, { now = new Date() } = {}) {
  const email = normalizeGuestErasureEmail(emailValue)
  if (!email) throw Object.assign(new Error('invalid_email'), { code: 'invalid_email' })
  const db = await getDb()
  const collection = db.collection(COLLECTION)
  await Promise.all([
    collection.createIndex({ tokenHash: 1 }, { unique: true, name: 'uniq_privacy_email_token_hash' }),
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'privacy_email_verification_ttl' }),
    collection.createIndex({ emailHash: 1, createdAt: -1 }, { name: 'privacy_email_verification_rate' }),
  ])
  const emailHash = hmac('guest-email-rate', email)
  const recent = await collection.countDocuments({ emailHash, createdAt: { $gt: new Date(now.getTime() - 60 * 60 * 1000) } })
  if (recent >= 3) throw Object.assign(new Error('verification_rate_limited'), { code: 'verification_rate_limited' })
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hmac('guest-email-token', token)
  await collection.insertOne({
    tokenHash,
    emailHash,
    subjectEncrypted: encryptSubjectRef({ kind: 'verified_email', id: email }),
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
  })
  return { token }
}

/** Consume an inbox proof once and create an idempotent case with email_control verification. */
export async function verifyGuestErasureEmailAndCreateCase(tokenValue, { now = new Date() } = {}) {
  if (typeof tokenValue !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(tokenValue)) {
    throw Object.assign(new Error('verification_invalid'), { code: 'verification_invalid' })
  }
  const tokenHash = hmac('guest-email-token', tokenValue)
  const db = await getDb()
  const collection = db.collection(COLLECTION)
  const existing = await collection.findOne({ tokenHash })
  if (existing?.caseId && existing.status === 'consumed') {
    const existingCase = await getErasureCase(existing.caseId)
    const existingSubject = existing.subjectEncrypted ? decryptSubjectRef(existing.subjectEncrypted) : null
    if (existingCase && existingSubject?.kind === 'verified_email') {
      return { case: existingCase, created: false, email: existingSubject.id }
    }
  }
  if (!existing || existing.status !== 'pending' || !(existing.expiresAt instanceof Date) || existing.expiresAt <= now) {
    throw Object.assign(new Error('verification_invalid'), { code: 'verification_invalid' })
  }
  const subjectRef = decryptSubjectRef(existing.subjectEncrypted)
  const normalized = normalizeGuestErasureEmail(subjectRef?.id)
  if (subjectRef?.kind !== 'verified_email' || !normalized) {
    throw Object.assign(new Error('verification_invalid'), { code: 'verification_invalid' })
  }
  const request = await createErasureCase({
    body: { source: 'participant', subjectRef: { kind: 'verified_email', id: normalized } },
    idempotencyKey: `guest-email-${tokenHash}`,
    actor: { type: 'participant', id: 'verified_email' },
    verifiedEmailAt: now,
  })
  const consumed = await collection.updateOne(
    { tokenHash, status: 'pending', expiresAt: { $gt: now } },
    // Keep only the encrypted subject until the short challenge TTL expires so a
    // retry after a lost HTTP response can resend the receipt without retaining
    // plaintext email or permitting a second case.
    { $set: { status: 'consumed', caseId: request.case.requestId, consumedAt: now }, $unset: { emailHash: '' } },
  )
  if (consumed.modifiedCount !== 1) {
    const current = await collection.findOne({ tokenHash })
    if (current?.caseId !== request.case.requestId) throw Object.assign(new Error('verification_invalid'), { code: 'verification_invalid' })
  }
  return { ...request, email: normalized }
}
