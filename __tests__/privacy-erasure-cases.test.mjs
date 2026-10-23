import { jest } from '@jest/globals'

const store = new Map()

function readPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object)
}

function writePath(object, path, value) {
  const parts = path.split('.')
  const leaf = parts.pop()
  const parent = parts.reduce((node, key) => {
    node[key] ||= {}
    return node[key]
  }, object)
  parent[leaf] = structuredClone(value)
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = readPath(document, key)
    if (expected && typeof expected === 'object' && '$lte' in expected) return new Date(actual) <= expected.$lte
    return actual === expected
  })
}

const database = {
  collection(name) {
    const rows = store.get(name) || []
    store.set(name, rows)
    return {
      async createIndex() {},
      async insertOne(document) {
        if (name === 'privacyErasureCases' && rows.some((row) => row.source === document.source && row.idempotencyKeyHash === document.idempotencyKeyHash)) {
          const error = new Error('duplicate key')
          error.code = 11000
          throw error
        }
        rows.push(structuredClone(document))
        return { insertedId: document.requestId }
      },
      async findOne(filter) {
        const row = rows.find((item) => matches(item, filter))
        return row ? structuredClone(row) : null
      },
      async updateOne(filter, update) {
        const row = rows.find((item) => matches(item, filter))
        if (!row) return { modifiedCount: 0 }
        for (const [key, value] of Object.entries(update.$set || {})) writePath(row, key, value)
        for (const [key, value] of Object.entries(update.$inc || {})) writePath(row, key, (readPath(row, key) || 0) + value)
        for (const [key, config] of Object.entries(update.$push || {})) {
          const values = config.$each || [config]
          const existing = readPath(row, key) || []
          existing.push(...structuredClone(values))
          if (Number.isInteger(config.$slice)) existing.splice(0, Math.max(0, existing.length + config.$slice))
          writePath(row, key, existing)
        }
        return { modifiedCount: 1 }
      },
      find(filter, options = {}) {
        let result = rows.filter((item) => matches(item, filter)).map((item) => {
          const copy = structuredClone(item)
          for (const field of Object.keys(options.projection || {})) {
            if (options.projection[field] === 0) delete copy[field]
          }
          return copy
        })
        const cursor = {
          sort(order) {
            const [[key, direction]] = Object.entries(order)
            result.sort((a, b) => (new Date(readPath(a, key)) - new Date(readPath(b, key))) * direction)
            return cursor
          },
          skip(count) { result = result.slice(count); return cursor },
          limit(count) { result = result.slice(0, count); return cursor },
          async toArray() { return result },
        }
        return cursor
      },
      async countDocuments(filter) { return rows.filter((item) => matches(item, filter)).length },
    }
  },
}

jest.unstable_mockModule('../lib/db.mjs', () => ({ getDb: async () => database }))
const erasure = await import('../lib/privacy/erasureCases.mjs')

const targets = ['sso', 'camera', 'fanmass', 'messmass']
const actor = { type: 'admin', id: 'admin-uuid' }

beforeEach(() => {
  store.clear()
  process.env.SSO_PRIVACY_CASE_KEYRING = JSON.stringify({
    v1: '11'.repeat(32),
    v2: '22'.repeat(32),
  })
  process.env.SSO_PRIVACY_CASE_ACTIVE_KEY_VERSION = 'v1'
  process.env.SSO_PRIVACY_CASE_HMAC_KEY = '33'.repeat(32)
})

describe('erasure case identity envelope', () => {
  test('encrypts subject references at rest and supports retained key versions', () => {
    const subject = { kind: 'facebook_subject', id: '1925918141394906' }
    const envelope = erasure.encryptSubjectRef(subject)
    expect(envelope.algorithm).toBe('A256GCM')
    expect(envelope.keyVersion).toBe('v1')
    expect(JSON.stringify(envelope)).not.toContain(subject.id)
    expect(erasure.decryptSubjectRef(envelope)).toEqual(subject)

    process.env.SSO_PRIVACY_CASE_ACTIVE_KEY_VERSION = 'v2'
    expect(erasure.decryptSubjectRef(envelope)).toEqual(subject)
  })

  test('fails closed if the keyring is absent or a stored key version was removed', () => {
    const envelope = erasure.encryptSubjectRef({ kind: 'camera_photo', id: 'photo-123' })
    process.env.SSO_PRIVACY_CASE_KEYRING = '{}'
    expect(() => erasure.decryptSubjectRef(envelope)).toThrow('key needed for resolution is unavailable')
    delete process.env.SSO_PRIVACY_CASE_ACTIVE_KEY_VERSION
    expect(() => erasure.encryptSubjectRef({ kind: 'camera_photo', id: 'photo-456' })).toThrow('active privacy case encryption key')
  })
})

describe('request deadlines and input contracts', () => {
  test('adds calendar months without rolling month-end into the next month', () => {
    expect(erasure.addCalendarMonths(new Date('2026-01-31T12:00:00.000Z'), 1).toISOString())
      .toBe('2026-02-28T12:00:00.000Z')
    expect(erasure.addCalendarMonths(new Date('2024-01-31T12:00:00.000Z'), 1).toISOString())
      .toBe('2024-02-29T12:00:00.000Z')
  })

  test('allows only one recorded deadline extension with notice during the initial month', async () => {
    const created = await erasure.createErasureCase({
      body: { source: 'admin', subjectRef: { kind: 'sso_user', id: 'user-uuid-10' }, targets },
      idempotencyKey: 'extension-case-0001',
      actor,
    })
    const noticeAt = new Date(created.case.receivedAt.getTime() + 10 * 24 * 60 * 60 * 1000)
    const extended = await erasure.transitionErasureCase({
      requestId: created.case.requestId,
      body: { action: 'extend', reasonCode: 'technical_failure', noticeAt: noticeAt.toISOString() },
      actor,
    })
    expect(extended.dueAt.toISOString()).toBe(erasure.addCalendarMonths(created.case.receivedAt, 3).toISOString())
    await expect(erasure.transitionErasureCase({
      requestId: created.case.requestId,
      body: { action: 'extend', reasonCode: 'technical_failure', noticeAt: noticeAt.toISOString() },
      actor,
    })).rejects.toMatchObject({ code: 'extension_already_used', status: 409 })
  })

  test('requires an opaque subject, idempotency key, and exactly all product targets', () => {
    const valid = {
      source: 'facebook',
      subjectRef: { kind: 'facebook_subject', id: '1925918141394906' },
      targets,
    }
    expect(() => erasure.validateCreateRequest(valid, 'request-key-0000001')).not.toThrow()
    expect(() => erasure.validateCreateRequest(valid, 'short')).toThrow('Idempotency-Key')
    expect(() => erasure.validateCreateRequest({ ...valid, subjectRef: { kind: 'sso_user', id: 'person@example.com' } }, 'request-key-0000001'))
      .toThrow('opaque identifier')
    expect(() => erasure.validateCreateRequest({ ...valid, targets: ['sso'] }, 'request-key-0000001'))
      .toThrow('All four product targets')
  })
})

describe('durable erasure ledger contract', () => {
  test('is idempotent, stores only encrypted identity, and returns a safe case DTO', async () => {
    const body = { source: 'facebook', subjectRef: { kind: 'facebook_subject', id: '1925918141394906' }, targets }
    const first = await erasure.createErasureCase({ body, idempotencyKey: 'facebook-request-0001', actor })
    const replay = await erasure.createErasureCase({ body, idempotencyKey: 'facebook-request-0001', actor })
    const stored = store.get('privacyErasureCases')[0]

    expect(first.created).toBe(true)
    expect(replay.created).toBe(false)
    expect(first.case.requestId).toBe(replay.case.requestId)
    expect(first.case.state).toBe('received')
    expect(first.case.targets).toEqual(expect.objectContaining({ camera: expect.objectContaining({ status: 'pending', required: true }) }))
    expect(stored.subjectRefEncrypted.ciphertext).not.toContain('1925918141394906')
    expect(JSON.stringify(stored)).not.toContain('1925918141394906')
    expect(first.case).not.toHaveProperty('subjectRefEncrypted')
    expect(first.case).not.toHaveProperty('idempotencyKeyHash')
    expect(first.case.dueAt.toISOString()).toBe(erasure.addCalendarMonths(first.case.receivedAt, 1).toISOString())
  })

  test('refuses idempotency-key reuse for a different subject', async () => {
    const base = { source: 'admin', targets }
    await erasure.createErasureCase({ body: { ...base, subjectRef: { kind: 'sso_user', id: 'user-uuid-1' } }, idempotencyKey: 'admin-request-0001', actor })
    await expect(erasure.createErasureCase({ body: { ...base, subjectRef: { kind: 'sso_user', id: 'user-uuid-2' } }, idempotencyKey: 'admin-request-0001', actor }))
      .rejects.toMatchObject({ code: 'idempotency_conflict', status: 409 })
  })

  test('requires verification and an explicit decision before subject resolution and deletion receipts', async () => {
    const created = await erasure.createErasureCase({
      body: { source: 'participant', subjectRef: { kind: 'camera_photo', id: 'photo-123' }, targets },
      idempotencyKey: 'participant-request-01',
      actor,
    })
    await expect(erasure.resolveErasureSubject({ requestId: created.case.requestId, actor }))
      .rejects.toMatchObject({ code: 'case_not_approved', status: 409 })
    await expect(erasure.recordTargetReceipt({
      requestId: created.case.requestId,
      target: 'camera',
      body: { status: 'deleted' },
      idempotencyKey: 'camera-receipt-0001',
      actor: { type: 'service', id: 'camera-client' },
    })).rejects.toMatchObject({ code: 'case_not_deleting', status: 409 })

    let current = await erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'verify', method: 'authenticated_session' }, actor })
    expect(current.state).toBe('resolving')
    current = await erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'ready_for_decision' }, actor })
    expect(current.state).toBe('awaiting_decision')
    await expect(erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'approve' }, actor }))
      .resolves.toMatchObject({ state: 'deleting', decision: { outcome: 'approved' } })
    await expect(erasure.resolveErasureSubject({ requestId: created.case.requestId, actor: { type: 'service', id: 'privacy-coordinator' } }))
      .resolves.toEqual({ kind: 'camera_photo', id: 'photo-123' })
    expect(store.get('privacyErasureAudit')).toHaveLength(1)
    expect(JSON.stringify(store.get('privacyErasureAudit'))).not.toContain('photo-123')
  })

  test('target receipts are idempotent, retryable, auditable, and complete only after all targets are terminal', async () => {
    const created = await erasure.createErasureCase({
      body: { source: 'admin', subjectRef: { kind: 'sso_user', id: 'user-uuid-77' }, targets },
      idempotencyKey: 'admin-request-0077',
      actor,
    })
    await erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'verify', method: 'email_control' }, actor })
    await erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'ready_for_decision' }, actor })
    await erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'approve' }, actor })

    const service = { type: 'service', id: 'camera-client' }
    let result = await erasure.recordTargetReceipt({ requestId: created.case.requestId, target: 'camera', body: { status: 'retryable_failure', reasonCode: 'technical_failure' }, idempotencyKey: 'camera-op-000001', actor: service })
    expect(result.state).toBe('partially_failed')
    expect(result.state).not.toBe('completed')
    await expect(erasure.recordTargetReceipt({ requestId: created.case.requestId, target: 'camera', body: { status: 'deleted' }, idempotencyKey: 'camera-op-000001', actor: service }))
      .rejects.toMatchObject({ code: 'idempotency_conflict', status: 409 })
    const replay = await erasure.recordTargetReceipt({ requestId: created.case.requestId, target: 'camera', body: { status: 'retryable_failure', reasonCode: 'technical_failure' }, idempotencyKey: 'camera-op-000001', actor: service })
    expect(replay.targets.camera.attempts).toBe(1)
    result = await erasure.recordTargetReceipt({ requestId: created.case.requestId, target: 'camera', body: { status: 'deleted' }, idempotencyKey: 'camera-op-000002', actor: service })
    expect(result.state).toBe('deleting')

    for (const target of ['sso', 'fanmass', 'messmass']) {
      result = await erasure.recordTargetReceipt({ requestId: created.case.requestId, target, body: { status: 'not_found' }, idempotencyKey: `${target}-operation-000001`, actor: { type: 'service', id: `${target}-client` } })
    }
    expect(result.state).toBe('completed')
    expect(Object.values(result.targets).every((receipt) => ['deleted', 'not_found'].includes(receipt.status))).toBe(true)
    const listing = await erasure.listErasureCases({ state: 'completed', limit: 10, skip: 0 })
    expect(listing.pagination.total).toBe(1)
    expect(listing.cases[0]).not.toHaveProperty('subjectRefEncrypted')
    expect(listing.cases[0]).not.toHaveProperty('operations')
  })

  test('completion exceptions require an administrator and a reason code', async () => {
    const created = await erasure.createErasureCase({ body: { source: 'admin', subjectRef: { kind: 'sso_user', id: 'user-uuid-88' }, targets }, idempotencyKey: 'admin-request-0088', actor })
    await erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'verify', method: 'manual_document_check' }, actor })
    await erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'ready_for_decision' }, actor })
    await erasure.transitionErasureCase({ requestId: created.case.requestId, body: { action: 'approve' }, actor })
    await expect(erasure.recordTargetReceipt({ requestId: created.case.requestId, target: 'camera', body: { status: 'retained_exception', reasonCode: 'legal_retention' }, idempotencyKey: 'exception-op-0001', actor: { type: 'service', id: 'camera-client' } }))
      .rejects.toMatchObject({ code: 'admin_decision_required', status: 403 })
    const updated = await erasure.recordRetainedException({ requestId: created.case.requestId, target: 'camera', reasonCode: 'legal_retention', actor })
    expect(updated.targets.camera.status).toBe('retained_exception')
    expect(updated.targets.camera.reasonCode).toBe('legal_retention')
    expect(updated.state).toBe('deleting')
  })
})
