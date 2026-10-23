/**
 * SSO-owned record and transition rules for cross-product erasure requests.
 *
 * Identity references are encrypted at rest and never included in ordinary case DTOs.
 * Product systems own their records and report target receipts back to this ledger.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { getDb } from '../db.mjs'

export const ERASURE_CASE_STATES = Object.freeze([
  'received', 'verification_required', 'resolving', 'awaiting_decision', 'deleting',
  'partially_failed', 'completed', 'rejected', 'retained_exception',
])

// The backup receipt is a separate required gate; primary deletion must not be
// represented as complete while an independently restorable image copy remains.
export const ERASURE_TARGETS = Object.freeze(['sso', 'camera', 'fanmass', 'messmass', 'camera_backup'])
export const ERASURE_RECEIPT_STATUSES = Object.freeze([
  'pending', 'deleted', 'not_found', 'retryable_failure', 'permanent_failure', 'retained_exception',
])

const TERMINAL_STATES = new Set(['completed', 'rejected', 'retained_exception'])
const TERMINAL_RECEIPTS = new Set(['deleted', 'not_found', 'retained_exception'])
const REASON_CODES = new Set([
  'identity_unverified', 'duplicate_request', 'not_applicable', 'legal_retention',
  'technical_failure', 'other_approved',
])
const VERIFICATION_METHODS = new Set(['authenticated_session', 'email_control', 'facebook_callback', 'manual_document_check'])
const COLLECTIONS = Object.freeze({ cases: 'privacyErasureCases', audit: 'privacyErasureAudit' })

export class ErasureCaseError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ErasureCaseError'
    this.status = status
    this.code = code
  }
}

function keyring() {
  let parsed
  try {
    parsed = JSON.parse(process.env.SSO_PRIVACY_CASE_KEYRING || '')
  } catch {
    parsed = null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
      Object.keys(parsed).some((version) => !/^v[1-9][0-9]*$/.test(version) || !/^[0-9a-f]{64}$/i.test(parsed[version]))) {
    throw new ErasureCaseError(503, 'privacy_encryption_unavailable', 'Privacy case encryption is not configured')
  }
  return parsed
}

function activeEncryptionKey() {
  const keys = keyring()
  const version = process.env.SSO_PRIVACY_CASE_ACTIVE_KEY_VERSION
  if (typeof version !== 'string' || !keys[version]) {
    throw new ErasureCaseError(503, 'privacy_encryption_unavailable', 'The active privacy case encryption key is not configured')
  }
  return { version, key: Buffer.from(keys[version], 'hex') }
}

function hmac(value, domain) {
  const secret = process.env.SSO_PRIVACY_CASE_HMAC_KEY
  if (typeof secret !== 'string' || !/^[0-9a-f]{64}$/i.test(secret)) {
    throw new ErasureCaseError(503, 'privacy_encryption_unavailable', 'Privacy case key material is not configured')
  }
  return createHmac('sha256', Buffer.from(secret, 'hex')).update(`${domain}\0${value}`).digest('hex')
}

export function encryptSubjectRef(subjectRef) {
  const { version, key } = activeEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(subjectRef), 'utf8'),
    cipher.final(),
  ])
  return {
    algorithm: 'A256GCM',
    keyVersion: version,
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  }
}

export function decryptSubjectRef(envelope) {
  if (!envelope || envelope.algorithm !== 'A256GCM' || !/^v[1-9][0-9]*$/.test(envelope.keyVersion || '')) {
    throw new ErasureCaseError(500, 'invalid_subject_envelope', 'The case identity reference cannot be resolved')
  }
  try {
    const versionKey = keyring()[envelope.keyVersion]
    if (!versionKey) throw new ErasureCaseError(503, 'privacy_encryption_key_unavailable', 'The case identity key needed for resolution is unavailable')
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(versionKey, 'hex'), Buffer.from(envelope.iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64url'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
    return JSON.parse(plaintext)
  } catch (error) {
    if (error instanceof ErasureCaseError) throw error
    throw new ErasureCaseError(500, 'subject_decryption_failed', 'The case identity reference cannot be resolved')
  }
}

export function addCalendarMonths(date, months) {
  const source = new Date(date)
  if (Number.isNaN(source.getTime()) || !Number.isInteger(months)) {
    throw new ErasureCaseError(400, 'invalid_date', 'A valid request date is required')
  }
  const day = source.getUTCDate()
  const result = new Date(Date.UTC(
    source.getUTCFullYear(),
    source.getUTCMonth() + months,
    1,
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds(),
  ))
  const finalDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, finalDay))
  return result
}

function validateString(value, field, min = 1, max = 200) {
  if (typeof value !== 'string' || value.length < min || value.length > max || value.trim() !== value) {
    throw new ErasureCaseError(400, 'invalid_request', `${field} is invalid`)
  }
  return value
}

export function validateCreateRequest(body, idempotencyKey) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ErasureCaseError(400, 'invalid_request', 'A JSON request body is required')
  }
  validateString(idempotencyKey, 'Idempotency-Key', 16, 128)
  const allowedSources = new Set(['participant', 'facebook', 'admin', 'camera'])
  if (!allowedSources.has(body.source)) throw new ErasureCaseError(400, 'invalid_source', 'The request source is invalid')
  const subjectRef = body.subjectRef
  if (!subjectRef || typeof subjectRef !== 'object' || Array.isArray(subjectRef)) {
    throw new ErasureCaseError(400, 'invalid_subject_reference', 'A subject reference is required')
  }
  const kinds = new Set(['sso_user', 'facebook_subject', 'camera_photo', 'verified_email'])
  if (!kinds.has(subjectRef.kind)) throw new ErasureCaseError(400, 'invalid_subject_reference', 'The subject reference kind is invalid')
  validateString(subjectRef.id, 'subjectRef.id', 3, 200)
  if ((subjectRef.kind !== 'verified_email' && subjectRef.id.includes('@')) || /\s/.test(subjectRef.id)) {
    throw new ErasureCaseError(400, 'invalid_subject_reference', 'The subject reference must be an opaque identifier')
  }
  if (subjectRef.kind === 'verified_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subjectRef.id)) {
    throw new ErasureCaseError(400, 'invalid_subject_reference', 'The verified email reference is invalid')
  }
  const canonicalSubject = { kind: subjectRef.kind, id: subjectRef.id }
  const targets = Array.isArray(body.targets) ? body.targets : [...ERASURE_TARGETS]
  if (targets.length !== ERASURE_TARGETS.length || new Set(targets).size !== ERASURE_TARGETS.length ||
      targets.some((target) => !ERASURE_TARGETS.includes(target))) {
    throw new ErasureCaseError(400, 'invalid_targets', 'All five erasure targets must be included exactly once')
  }
  return {
    source: body.source,
    subjectRef: canonicalSubject,
    targets: [...targets].sort(),
    idempotencyKeyHash: hmac(idempotencyKey, 'case-idempotency'),
    requestFingerprint: hmac(JSON.stringify({ source: body.source, subjectRef: canonicalSubject, targets: [...targets].sort() }), 'case-request'),
  }
}

export function toPublicCase(caseDoc, { includeSubject = false } = {}) {
  if (!caseDoc) return null
  const privateFields = new Set(['subjectRefEncrypted', 'idempotencyKeyHash', 'requestFingerprint', 'operations'])
  const dto = Object.fromEntries(Object.entries(caseDoc).filter(([key]) => !privateFields.has(key)))
  if (dto.coordinator && typeof dto.coordinator === 'object') {
    dto.coordinator = { ...dto.coordinator }
    delete dto.coordinator.ssoSubjectProofEncrypted
  }
  if (includeSubject && caseDoc.subjectRefEncrypted) dto.subjectRef = decryptSubjectRef(caseDoc.subjectRefEncrypted)
  return dto
}

export function validateDecisionAction(caseDoc, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ErasureCaseError(400, 'invalid_request', 'A JSON request body is required')
  }
  const action = body.action
  const now = new Date()
  if (action === 'request_verification' && caseDoc.state === 'received') {
    return { state: 'verification_required', event: { action, at: now } }
  }
  if (action === 'verify' && ['received', 'verification_required'].includes(caseDoc.state)) {
    if (!VERIFICATION_METHODS.has(body.method)) {
      throw new ErasureCaseError(400, 'verification_method_required', 'A supported verification method is required')
    }
    const evidenceRefHash = body.evidenceRef ? hmac(validateString(body.evidenceRef, 'evidenceRef', 1, 200), 'evidence-ref') : null
    return {
      state: 'resolving',
      set: { verification: { method: body.method, evidenceRefHash, verifiedAt: now } },
      event: { action, method: body.method, at: now },
    }
  }
  if (action === 'ready_for_decision' && caseDoc.state === 'resolving') {
    return { state: 'awaiting_decision', event: { action, at: now } }
  }
  if (action === 'approve' && caseDoc.state === 'awaiting_decision') {
    return { state: 'deleting', set: { decision: { outcome: 'approved', decidedAt: now } }, event: { action, at: now } }
  }
  if (action === 'reject' && ['received', 'verification_required', 'resolving', 'awaiting_decision'].includes(caseDoc.state)) {
    if (!REASON_CODES.has(body.reasonCode)) throw new ErasureCaseError(400, 'reason_code_required', 'A supported rejection reason code is required')
    return {
      state: 'rejected',
      set: { decision: { outcome: 'rejected', reasonCode: body.reasonCode, decidedAt: now } },
      event: { action, reasonCode: body.reasonCode, at: now },
    }
  }
  if (action === 'extend' && !TERMINAL_STATES.has(caseDoc.state)) {
    if (caseDoc.extension) throw new ErasureCaseError(409, 'extension_already_used', 'This case already has an approved response extension')
    if (!REASON_CODES.has(body.reasonCode)) throw new ErasureCaseError(400, 'reason_code_required', 'A supported extension reason code is required')
    const noticeAt = new Date(body.noticeAt)
    if (Number.isNaN(noticeAt.getTime()) || noticeAt < caseDoc.receivedAt || noticeAt > caseDoc.dueAt) {
      throw new ErasureCaseError(400, 'invalid_extension_notice', 'The extension notice must be dated within the original response period')
    }
    return {
      state: caseDoc.state,
      set: { dueAt: addCalendarMonths(caseDoc.receivedAt, 3), extension: { reasonCode: body.reasonCode, noticeAt, extendedAt: now } },
      event: { action, reasonCode: body.reasonCode, noticeAt, at: now },
    }
  }
  throw new ErasureCaseError(409, 'invalid_state_transition', 'That action is not valid for the current case state')
}

function initialTargetReceipts(targets) {
  return Object.fromEntries(targets.map((target) => [target, {
    status: 'pending',
    required: true,
    attempts: 0,
    updatedAt: null,
    reasonCode: null,
  }]))
}

function deriveDeletionState(targets) {
  const receipts = Object.values(targets)
  if (receipts.some(({ status }) => status === 'retryable_failure' || status === 'permanent_failure')) return 'partially_failed'
  const backupReceipt = targets.camera_backup
  const backupVerified = backupReceipt?.status === 'deleted' || backupReceipt?.status === 'retained_exception'
  if (receipts.every(({ status }) => TERMINAL_RECEIPTS.has(status)) && backupVerified) {
    return receipts.some(({ status }) => status === 'retained_exception') ? 'retained_exception' : 'completed'
  }
  return 'deleting'
}

async function collections() {
  const db = await getDb()
  const cases = db.collection(COLLECTIONS.cases)
  const audit = db.collection(COLLECTIONS.audit)
  await Promise.all([
    cases.createIndex({ requestId: 1 }, { unique: true, name: 'uniq_privacy_request_id' }),
    cases.createIndex({ source: 1, idempotencyKeyHash: 1 }, { unique: true, name: 'uniq_privacy_source_idempotency' }),
    cases.createIndex({ state: 1, dueAt: 1, createdAt: 1 }, { name: 'privacy_case_queue' }),
    audit.createIndex({ requestId: 1, occurredAt: -1 }, { name: 'privacy_audit_case_time' }),
    db.collection('publicUsers').createIndex({ 'socialProviders.facebook.id': 1 }, { sparse: true, name: 'publicUsers_facebook_id_sparse' }),
  ])
  return { db, cases, audit }
}

export async function createErasureCase({ body, idempotencyKey, actor, verifiedEmailAt = null, verifiedSessionAt = null }) {
  const input = validateCreateRequest(body, idempotencyKey)
  const { cases } = await collections()
  const now = new Date()
  const requestId = randomUUID()
  const verifiedGuest = input.subjectRef.kind === 'verified_email' && verifiedEmailAt instanceof Date && Number.isFinite(verifiedEmailAt.getTime())
  const verifiedSession = input.subjectRef.kind === 'sso_user' && verifiedSessionAt instanceof Date && Number.isFinite(verifiedSessionAt.getTime())
  const verifiedAt = verifiedGuest ? verifiedEmailAt : verifiedSession ? verifiedSessionAt : null
  const verificationMethod = verifiedGuest ? 'email_control' : verifiedSession ? 'authenticated_session' : null
  const document = {
    requestId,
    contractVersion: 'privacy.erasure.case.v1',
    source: input.source,
    idempotencyKeyHash: input.idempotencyKeyHash,
    requestFingerprint: input.requestFingerprint,
    subjectRefEncrypted: encryptSubjectRef(input.subjectRef),
    state: verifiedAt ? 'awaiting_decision' : 'received',
    revision: 1,
    receivedAt: now,
    dueAt: addCalendarMonths(now, 1),
    extension: null,
    verification: verifiedAt ? {
      method: verificationMethod,
      verifiedAt,
      evidenceRefHash: hmac(`${requestId}:${verifiedAt.toISOString()}`, verifiedGuest ? 'guest-email-proof' : 'authenticated-session-proof'),
    } : null,
    decision: null,
    targets: initialTargetReceipts(input.targets),
    createdAt: now,
    updatedAt: now,
    history: [
      { action: 'received', actorType: actor.type, actorId: actor.id, at: now },
      ...(verifiedAt ? [
        { action: 'verify', method: verificationMethod, actorType: 'participant', actorId: verifiedGuest ? 'verified_email' : 'sso_user', at: verifiedAt },
        { action: 'ready_for_decision', actorType: 'system', actorId: verifiedGuest ? 'email_verification' : 'authenticated_session', at: now },
      ] : []),
    ],
  }
  try {
    await cases.insertOne(document)
    return { case: toPublicCase(document), created: true }
  } catch (error) {
    if (error?.code !== 11000) throw error
    const existing = await cases.findOne({ source: input.source, idempotencyKeyHash: input.idempotencyKeyHash })
    if (!existing) throw error
    if (existing.requestFingerprint !== input.requestFingerprint) {
      throw new ErasureCaseError(409, 'idempotency_conflict', 'The idempotency key was already used for a different request')
    }
    return { case: toPublicCase(existing), created: false }
  }
}

export async function getErasureCase(requestId) {
  validateRequestId(requestId)
  const { cases } = await collections()
  return cases.findOne({ requestId })
}

export function validateRequestId(requestId) {
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new ErasureCaseError(400, 'invalid_request_id', 'A valid request id is required')
  }
  return requestId
}

export async function transitionErasureCase({ requestId, body, actor }) {
  validateRequestId(requestId)
  const { cases } = await collections()
  const current = await cases.findOne({ requestId })
  if (!current) throw new ErasureCaseError(404, 'case_not_found', 'The erasure request was not found')
  const transition = validateDecisionAction(current, body)
  const now = new Date()
  const set = { ...(transition.set || {}), state: transition.state, updatedAt: now }
  const event = { ...transition.event, actorType: actor.type, actorId: actor.id }
  const updated = await cases.updateOne(
    { requestId, revision: current.revision, state: current.state },
    { $set: set, $inc: { revision: 1 }, $push: { history: event } },
  )
  if (updated.modifiedCount !== 1) throw new ErasureCaseError(409, 'case_changed', 'The case changed while this action was being saved; reload and retry')
  return toPublicCase(await cases.findOne({ requestId }))
}

export async function resolveErasureSubject({ requestId, actor }) {
  validateRequestId(requestId)
  const { cases, audit } = await collections()
  const caseDoc = await cases.findOne({ requestId })
  if (!caseDoc) throw new ErasureCaseError(404, 'case_not_found', 'The erasure request was not found')
  if (!['deleting', 'partially_failed'].includes(caseDoc.state) || caseDoc.decision?.outcome !== 'approved' || !caseDoc.verification?.verifiedAt) {
    throw new ErasureCaseError(409, 'case_not_approved', 'Identity resolution requires a verified and approved case')
  }
  const subjectRef = decryptSubjectRef(caseDoc.subjectRefEncrypted)
  await audit.insertOne({
    requestId,
    action: 'subject_resolved',
    actorType: actor.type,
    actorId: actor.id,
    occurredAt: new Date(),
  })
  return subjectRef
}

/**
 * Resolve the case's verified subject to the minimum proof a product needs to
 * find its own records. A Facebook provider ID is consumed inside SSO and is
 * never returned to a product. E-mail is returned only when the SSO account
 * explicitly records it as verified.
 */
export async function resolveErasureSubjectProof({ requestId, actor }) {
  validateRequestId(requestId)
  const { db, cases, audit } = await collections()
  const caseDoc = await cases.findOne({ requestId })
  if (!caseDoc) throw new ErasureCaseError(404, 'case_not_found', 'The erasure request was not found')
  if (!['deleting', 'partially_failed'].includes(caseDoc.state) || caseDoc.decision?.outcome !== 'approved' || !caseDoc.verification?.verifiedAt) {
    throw new ErasureCaseError(409, 'case_not_approved', 'Identity resolution requires a verified and approved case')
  }

  const subjectRef = decryptSubjectRef(caseDoc.subjectRefEncrypted)
  let subject
  let verifiedEmail
  if (subjectRef.kind === 'camera_photo') {
    subject = { kind: 'camera_photo', id: subjectRef.id }
  } else if (subjectRef.kind === 'verified_email') {
    if (caseDoc.verification?.method !== 'email_control' || !caseDoc.verification?.verifiedAt) {
      throw new ErasureCaseError(409, 'subject_email_unverified', 'The guest email control proof is missing')
    }
    const value = subjectRef.id.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new ErasureCaseError(409, 'subject_email_invalid', 'The verified email reference is invalid')
    }
    subject = { kind: 'verified_email', id: value }
    verifiedEmail = {
      value,
      proof: 'email_control',
      verifiedAt: new Date(caseDoc.verification.verifiedAt).toISOString(),
    }
  } else {
    const users = db.collection('publicUsers')
    let account
    if (subjectRef.kind === 'sso_user') {
      account = await users.findOne({ id: subjectRef.id }, { projection: { id: 1, email: 1, emailVerified: 1, emailVerifiedAt: 1, _id: 0 } })
      if (!account) throw new ErasureCaseError(409, 'subject_account_not_found', 'The verified account could not be resolved')
    } else if (subjectRef.kind === 'facebook_subject') {
      const matches = await users.find({ 'socialProviders.facebook.id': subjectRef.id }, { projection: { id: 1, email: 1, emailVerified: 1, emailVerifiedAt: 1, _id: 0 } }).limit(2).toArray()
      if (matches.length !== 1) {
        throw new ErasureCaseError(409, matches.length ? 'subject_mapping_ambiguous' : 'subject_account_not_found', 'The verified provider account could not be resolved uniquely')
      }
      account = matches[0]
    } else {
      throw new ErasureCaseError(409, 'subject_kind_unsupported', 'The verified subject type cannot be resolved to a product account')
    }

    if (typeof account.id !== 'string' || !account.id.trim()) {
      throw new ErasureCaseError(409, 'subject_account_invalid', 'The verified account mapping is incomplete')
    }
    subject = { kind: 'sso_user', id: account.id }
    if (account.emailVerified === true && typeof account.email === 'string') {
      const value = account.email.trim().toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        verifiedEmail = {
          value,
          proof: 'sso_account_email_verified',
          verifiedAt: typeof account.emailVerifiedAt === 'string' && Number.isFinite(Date.parse(account.emailVerifiedAt))
            ? new Date(account.emailVerifiedAt).toISOString()
            : null,
        }
      }
    }
  }

  await audit.insertOne({
    requestId,
    action: 'subject_proof_resolved',
    actorType: actor.type,
    actorId: actor.id,
    subjectKind: subject.kind,
    emailProofIncluded: Boolean(verifiedEmail),
    occurredAt: new Date(),
  })

  return {
    version: 1,
    caseId: requestId,
    subject,
    ...(verifiedEmail ? { verifiedEmail } : {}),
  }
}

export async function recordTargetReceipt({ requestId, target, body, idempotencyKey, actor }) {
  validateRequestId(requestId)
  if (!ERASURE_TARGETS.includes(target)) throw new ErasureCaseError(404, 'target_not_found', 'The erasure target was not found')
  if (!body || typeof body !== 'object' || Array.isArray(body) || !ERASURE_RECEIPT_STATUSES.includes(body.status)) {
    throw new ErasureCaseError(400, 'invalid_receipt', 'A supported target receipt status is required')
  }
  if (body.reasonCode !== undefined && !REASON_CODES.has(body.reasonCode)) {
    throw new ErasureCaseError(400, 'invalid_reason_code', 'A supported reason code is required')
  }
  if (['retryable_failure', 'permanent_failure'].includes(body.status) && !body.reasonCode) {
    throw new ErasureCaseError(400, 'reason_code_required', 'A failure reason code is required for unsuccessful target receipts')
  }
  if (body.status === 'retained_exception') throw new ErasureCaseError(403, 'admin_decision_required', 'A retained exception requires an administrator decision')
  if (target === 'camera_backup' && body.status === 'not_found') {
    throw new ErasureCaseError(409, 'backup_evidence_required', 'The backup target requires verified deletion evidence or an administrator-approved retention exception')
  }
  let evidence = null
  if (target === 'camera_backup' && body.status === 'deleted') {
    const input = body.evidence
    const isoDate = typeof input?.verifiedAt === 'string' && Number.isFinite(Date.parse(input.verifiedAt))
      && new Date(input.verifiedAt).toISOString() === input.verifiedAt
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || typeof input.provider !== 'string' || !/^[a-z][a-z0-9_-]{1,31}$/.test(input.provider)
      || input.inventoryComplete !== true || input.remainingObjectCount !== 0
      || !Number.isSafeInteger(input.deletedObjectCount) || input.deletedObjectCount < 0
      || !/^[a-f0-9]{64}$/i.test(input.inventorySha256 || '')
      || !/^[a-f0-9]{64}$/i.test(input.deletionReceiptSha256 || '')
      || !isoDate) {
      throw new ErasureCaseError(409, 'backup_evidence_required', 'A complete provider inventory, zero remaining objects, deletion receipt digest, and verification timestamp are required')
    }
    // Store only a compact proof summary. Paths, object keys, and signed URLs
    // are prohibited from the central case ledger.
    evidence = {
      provider: input.provider,
      inventoryComplete: true,
      remainingObjectCount: 0,
      deletedObjectCount: input.deletedObjectCount,
      inventorySha256: input.inventorySha256.toLowerCase(),
      deletionReceiptSha256: input.deletionReceiptSha256.toLowerCase(),
      verifiedAt: input.verifiedAt,
    }
  }
  validateString(idempotencyKey, 'Idempotency-Key', 16, 128)
  const operationHash = hmac(idempotencyKey, `target-operation:${target}`)
  const fingerprint = hmac(JSON.stringify({ status: body.status, reasonCode: body.reasonCode || null, evidence }), 'target-receipt')
  const { cases } = await collections()
  const current = await cases.findOne({ requestId })
  if (!current) throw new ErasureCaseError(404, 'case_not_found', 'The erasure request was not found')
  if (!['deleting', 'partially_failed'].includes(current.state)) {
    throw new ErasureCaseError(409, 'case_not_deleting', 'Target receipts require an approved case in deletion')
  }
  const previousOperation = current.operations?.find((op) => op.operationHash === operationHash)
  if (previousOperation) {
    if (previousOperation.fingerprint !== fingerprint) throw new ErasureCaseError(409, 'idempotency_conflict', 'The idempotency key was reused for a different receipt')
    return toPublicCase(current)
  }
  const prior = current.targets[target]
  if (!prior || TERMINAL_RECEIPTS.has(prior.status)) {
    throw new ErasureCaseError(409, 'target_already_terminal', 'A terminal target receipt cannot be overwritten')
  }
  if ((current.operations?.length || 0) >= 1000) {
    throw new ErasureCaseError(409, 'receipt_limit_reached', 'The target receipt retry limit requires administrator review')
  }
  const now = new Date()
  const nextTargets = { ...current.targets, [target]: {
    ...prior,
    status: body.status,
    attempts: prior.attempts + (body.status === 'pending' ? 0 : 1),
    updatedAt: now,
    reasonCode: body.reasonCode || null,
    ...(evidence ? { evidence } : {}),
  } }
  const nextState = deriveDeletionState(nextTargets)
  const event = { action: 'target_receipt', target, status: body.status, actorType: actor.type, actorId: actor.id, at: now }
  const result = await cases.updateOne(
    { requestId, revision: current.revision, state: current.state },
    {
      $set: { [`targets.${target}`]: nextTargets[target], state: nextState, updatedAt: now },
      $inc: { revision: 1 },
      $push: {
        history: event,
        operations: { $each: [{ operationHash, fingerprint, at: now }] },
      },
    },
  )
  if (result.modifiedCount !== 1) throw new ErasureCaseError(409, 'case_changed', 'The case changed while this receipt was being saved; retry with the same idempotency key')
  return toPublicCase(await cases.findOne({ requestId }))
}

export async function recordRetainedException({ requestId, target, reasonCode, actor }) {
  validateRequestId(requestId)
  if (!ERASURE_TARGETS.includes(target)) throw new ErasureCaseError(404, 'target_not_found', 'The erasure target was not found')
  if (!REASON_CODES.has(reasonCode)) throw new ErasureCaseError(400, 'reason_code_required', 'A supported exception reason code is required')
  const { cases } = await collections()
  const current = await cases.findOne({ requestId })
  if (!current) throw new ErasureCaseError(404, 'case_not_found', 'The erasure request was not found')
  if (!['deleting', 'partially_failed'].includes(current.state) || TERMINAL_RECEIPTS.has(current.targets?.[target]?.status)) {
    throw new ErasureCaseError(409, 'invalid_exception_transition', 'This target cannot be marked as a retained exception')
  }
  const now = new Date()
  const receipt = { ...current.targets[target], status: 'retained_exception', reasonCode, updatedAt: now, reviewedBy: actor.id }
  const targets = { ...current.targets, [target]: receipt }
  const state = deriveDeletionState(targets)
  const event = { action: 'retained_exception', target, reasonCode, actorType: actor.type, actorId: actor.id, at: now }
  const result = await cases.updateOne(
    { requestId, revision: current.revision, state: current.state },
    {
      $set: { [`targets.${target}`]: receipt, state, updatedAt: now },
      $inc: { revision: 1 },
      $push: { history: event },
    },
  )
  if (result.modifiedCount !== 1) throw new ErasureCaseError(409, 'case_changed', 'The case changed while the exception was being saved; reload and retry')
  return toPublicCase(await cases.findOne({ requestId }))
}

export async function resumeErasureCoordinator({ requestId, reasonCode, actor }) {
  validateRequestId(requestId)
  if (!REASON_CODES.has(reasonCode)) throw new ErasureCaseError(400, 'reason_code_required', 'A supported resume reason code is required')
  const { cases } = await collections()
  const current = await cases.findOne({ requestId })
  if (!current) throw new ErasureCaseError(404, 'case_not_found', 'The erasure request was not found')
  if (!['deleting', 'partially_failed'].includes(current.state) || current.decision?.outcome !== 'approved') {
    throw new ErasureCaseError(409, 'case_not_resumable', 'Only an approved, non-terminal erasure case can be resumed')
  }
  if (current.coordinator?.blocked !== true) throw new ErasureCaseError(409, 'coordinator_not_blocked', 'The coordinator is not waiting for administrator review')
  const now = new Date()
  const event = { action: 'coordinator_resumed', reasonCode, actorType: actor.type, actorId: actor.id, at: now }
  const result = await cases.updateOne(
    { requestId, revision: current.revision, state: current.state, 'coordinator.blocked': true },
    {
      $set: { 'coordinator.blocked': false, 'coordinator.status': 'queued', 'coordinator.nextAttemptAt': now, 'coordinator.lastErrorCode': null, updatedAt: now },
      $inc: { revision: 1 },
      $push: { history: event },
    },
  )
  if (result.modifiedCount !== 1) throw new ErasureCaseError(409, 'case_changed', 'The case changed while it was being resumed; reload and retry')
  return toPublicCase(await cases.findOne({ requestId }))
}

export async function listErasureCases({ state, dueBefore, limit = 50, skip = 0 } = {}) {
  const filter = {}
  if (state !== undefined) {
    if (!ERASURE_CASE_STATES.includes(state)) throw new ErasureCaseError(400, 'invalid_state', 'The case state filter is invalid')
    filter.state = state
  }
  if (dueBefore !== undefined) {
    const parsed = new Date(dueBefore)
    if (Number.isNaN(parsed.getTime())) throw new ErasureCaseError(400, 'invalid_due_date', 'The due date filter is invalid')
    filter.dueAt = { $lte: parsed }
  }
  const safeLimit = Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 50))
  const safeSkip = Math.max(0, Math.min(10000, Number.isInteger(skip) ? skip : 0))
  const { cases } = await collections()
  const [rows, total] = await Promise.all([
    cases.find(filter, { projection: { subjectRefEncrypted: 0, idempotencyKeyHash: 0, requestFingerprint: 0, operations: 0 } })
      .sort({ dueAt: 1, createdAt: 1 }).skip(safeSkip).limit(safeLimit).toArray(),
    cases.countDocuments(filter),
  ])
  return { cases: rows.map((row) => toPublicCase(row)), pagination: { limit: safeLimit, skip: safeSkip, total } }
}

