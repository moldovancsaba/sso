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
        rows.push(structuredClone(document))
        return { insertedId: document.requestId }
      },
      async findOne(filter) {
        const row = rows.find((item) => matches(item, filter))
        return row ? structuredClone(row) : null
      },
      async updateOne(filter, update) {
        const row = rows.find((item) => matches(item, filter))
        if (!row) return { matchedCount: 0, modifiedCount: 0 }
        for (const [key, value] of Object.entries(update.$set || {})) writePath(row, key, value)
        for (const [key, value] of Object.entries(update.$inc || {})) {
          const current = readPath(row, key) || 0
          writePath(row, key, current + value)
        }
        for (const [key, value] of Object.entries(update.$push || {})) {
          const current = readPath(row, key) || []
          current.push(structuredClone(value))
          writePath(row, key, current)
        }
        return { matchedCount: 1, modifiedCount: 1 }
      },
    }
  },
}

jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => database,
}))

const {
  createErasureCase,
  transitionErasureCase,
  recordTargetReceipt,
  recordRetainedException,
  getErasureCase,
  resolveErasureSubjectProof,
} = await import('../lib/privacy/erasureCases.mjs')
const { generateErasureCertificate } = await import('../lib/privacy/erasureCertificate.mjs')

describe('Privacy Erasure Production Gate: Synthetic Cross-Product Drill', () => {
  beforeEach(() => {
    store.clear()
    process.env.SSO_PRIVACY_CASE_KEYRING = JSON.stringify({
      v1: '11'.repeat(32),
      v2: '22'.repeat(32),
    })
    process.env.SSO_PRIVACY_CASE_ACTIVE_KEY_VERSION = 'v1'
    process.env.SSO_PRIVACY_CASE_HMAC_KEY = '33'.repeat(32)
  })

  it('executes a complete end-to-end synthetic subject erasure drill with receipts and certificate', async () => {
    // 1. Intake: Create synthetic guest erasure request with verified inbox proof
    const { case: caseDoc } = await createErasureCase({
      body: {
        source: 'participant',
        subjectRef: {
          kind: 'verified_email',
          id: 'synthetic-drill-subject@example.test',
        },
      },
      idempotencyKey: 'drill-idempotency-key-001',
      actor: { type: 'guest', id: 'guest-drill-session' },
      verifiedEmailAt: new Date('2026-11-05T10:00:00.000Z'),
    })

    expect(caseDoc.requestId).toBeDefined()
    expect(caseDoc.state).toBe('awaiting_decision')
    expect(caseDoc.dueAt).toBeDefined()

    // 2. Admin Decision: Approve deletion
    const approvedCase = await transitionErasureCase({
      requestId: caseDoc.requestId,
      body: { action: 'approve' },
      actor: { type: 'admin', id: 'admin-operator-01' },
    })
    expect(approvedCase.state).toBe('deleting')

    // 3. Exact subject resolution proof available for resolver
    const subjectProof = await resolveErasureSubjectProof({
      requestId: caseDoc.requestId,
      actor: { type: 'service', id: 'camera-resolver' },
    })
    expect(subjectProof.subject).toEqual({
      kind: 'verified_email',
      id: 'synthetic-drill-subject@example.test',
    })
    expect(subjectProof.verifiedEmail.proof).toBe('email_control')

    // 4. Downstream Failure Injection & Recovery (Camera transient failure then success)
    await recordTargetReceipt({
      requestId: caseDoc.requestId,
      target: 'camera',
      body: {
        status: 'retryable_failure',
        reasonCode: 'technical_failure',
      },
      idempotencyKey: 'camera-attempt-0001',
      actor: { type: 'service', id: 'camera-client' },
    })

    let currentCase = await getErasureCase(caseDoc.requestId)
    expect(currentCase.state).toBe('partially_failed')

    // Retry succeeded
    await recordTargetReceipt({
      requestId: caseDoc.requestId,
      target: 'camera',
      body: {
        status: 'deleted',
        evidence: { deletedPhotoCount: 3, scrubbedRowIds: ['photo-1', 'photo-2', 'photo-3'] },
      },
      idempotencyKey: 'camera-attempt-0002',
      actor: { type: 'service', id: 'camera-client' },
    })

    // 5. Fanmass and Messmass receipts
    await recordTargetReceipt({
      requestId: caseDoc.requestId,
      target: 'fanmass',
      body: { status: 'not_found' },
      idempotencyKey: 'fanmass-attempt-0001',
      actor: { type: 'service', id: 'fanmass-client' },
    })

    await recordTargetReceipt({
      requestId: caseDoc.requestId,
      target: 'messmass',
      body: { status: 'deleted', evidence: { tombstoneCount: 3, projectionRebuilt: true } },
      idempotencyKey: 'messmass-attempt-0001',
      actor: { type: 'service', id: 'messmass-client' },
    })

    // 6. SSO local target receipt
    await recordTargetReceipt({
      requestId: caseDoc.requestId,
      target: 'sso',
      body: { status: 'deleted' },
      idempotencyKey: 'sso-local-attempt-0001',
      actor: { type: 'service', id: 'sso-local' },
    })

    // 7. Refuses completion until backup receipt is verified deleted
    currentCase = await getErasureCase(caseDoc.requestId)
    expect(currentCase.state).toBe('deleting')

    // Pre-completion PDF generation MUST fail
    expect(() => generateErasureCertificate(currentCase)).toThrow()

    // 8. Record verified backup erasure receipt
    const terminalCase = await recordTargetReceipt({
      requestId: caseDoc.requestId,
      target: 'camera_backup',
      body: {
        status: 'deleted',
        evidence: {
          provider: 'r2',
          inventoryComplete: true,
          remainingObjectCount: 0,
          deletedObjectCount: 3,
          inventorySha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          deletionReceiptSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          verifiedAt: new Date().toISOString(),
        },
      },
      idempotencyKey: 'backup-attempt-0001',
      actor: { type: 'service', id: 'camera-client' },
    })

    // 9. All 5 targets terminal -> case derived as completed
    expect(terminalCase.state).toBe('completed')

    // 10. Issue verifiable deletion certificate PDF
    const certificatePdf = generateErasureCertificate(terminalCase)
    const pdfText = certificatePdf.toString('ascii')

    expect(pdfText.startsWith('%PDF-1.4')).toBe(true)
    expect(pdfText).toContain('Personal data erasure record')
    expect(pdfText).toContain('camera_backup: deleted')
    expect(pdfText).toContain('Receipt-set SHA-256:')
    // Assert identity minimization: email is never dumped into certificate text
    expect(pdfText).not.toContain('synthetic-drill-subject@example.test')
  })

  it('handles lawful retention exceptions without false full-deletion confirmation', async () => {
    const { case: caseDoc } = await createErasureCase({
      body: {
        source: 'participant',
        subjectRef: {
          kind: 'verified_email',
          id: 'retention-exception@example.test',
        },
      },
      idempotencyKey: 'retention-drill-key-001',
      actor: { type: 'guest', id: 'guest-drill-session' },
      verifiedEmailAt: new Date('2026-11-05T10:00:00.000Z'),
    })

    await transitionErasureCase({
      requestId: caseDoc.requestId,
      body: { action: 'approve' },
      actor: { type: 'admin', id: 'admin-operator-01' },
    })

    // 4 standard targets deleted
    for (const target of ['camera', 'fanmass', 'messmass', 'sso']) {
      await recordTargetReceipt({
        requestId: caseDoc.requestId,
        target,
        body: { status: 'deleted' },
        idempotencyKey: `receipt-${target}-attempt-0001`,
        actor: { type: 'service', id: `${target}-client` },
      })
    }

    // Backup is subject to legal retention exception recorded by administrator
    const exceptionCase = await recordRetainedException({
      requestId: caseDoc.requestId,
      target: 'camera_backup',
      reasonCode: 'legal_retention',
      actor: { type: 'admin', id: 'admin-dpo-01' },
    })

    expect(exceptionCase.state).toBe('retained_exception')
    expect(exceptionCase.targets.camera_backup.status).toBe('retained_exception')

    // PDF discloses non-full deletion claim
    const pdf = generateErasureCertificate(exceptionCase)
    const pdfText = pdf.toString('ascii')
    expect(pdfText).toContain('this is not a full-deletion claim')
    expect(pdfText).toContain('camera_backup: retained_exception')
  })
})
