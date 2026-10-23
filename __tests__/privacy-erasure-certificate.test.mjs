import { generateErasureCertificate } from '../lib/privacy/erasureCertificate.mjs'

const baseCase = {
  requestId: '0e5c7a31-166d-4125-9b17-34f5704c2f3a',
  state: 'completed',
  receivedAt: new Date('2026-10-20T10:00:00.000Z'),
  updatedAt: new Date('2026-10-23T12:00:00.000Z'),
  targets: {
    sso: { status: 'deleted', updatedAt: new Date('2026-10-23T11:00:00.000Z') },
    camera: { status: 'deleted', updatedAt: new Date('2026-10-23T11:10:00.000Z') },
    fanmass: { status: 'not_found', updatedAt: new Date('2026-10-23T11:20:00.000Z') },
    messmass: { status: 'deleted', updatedAt: new Date('2026-10-23T11:30:00.000Z') },
    camera_backup: {
      status: 'deleted',
      updatedAt: new Date('2026-10-23T11:40:00.000Z'),
      evidence: { provider: 'r2', inventorySha256: 'ab'.repeat(32), deletionReceiptSha256: 'cd'.repeat(32), remainingObjectCount: 0 },
    },
  },
}

describe('privacy erasure certificate', () => {
  it('emits a valid identity-free PDF for a terminal case', () => {
    const pdf = generateErasureCertificate(baseCase)
    const text = pdf.toString('ascii')
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('xref')
    expect(text).toContain('Personal data erasure record')
    expect(text).toContain('camera_backup: deleted')
    expect(text).toContain('Receipt-set SHA-256:')
    expect(text).not.toContain('requester@example.test')
    expect(text).not.toContain('Facebook ID')
  })

  it('does not issue a completion PDF before all targets are terminal', () => {
    try {
      generateErasureCertificate({ ...baseCase, state: 'deleting' })
      throw new Error('expected certificate generation to fail')
    } catch (error) {
      expect(error).toMatchObject({ status: 409, code: 'erasure_case_not_terminal' })
    }
  })

  it('labels an exception as not being a full deletion claim', () => {
    const pdf = generateErasureCertificate({
      ...baseCase,
      state: 'retained_exception',
      targets: { ...baseCase.targets, camera_backup: { status: 'retained_exception', reasonCode: 'legal_retention' } },
    })
    expect(pdf.toString('ascii')).toContain('this is not a full-deletion claim')
  })
})
