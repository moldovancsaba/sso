import { jest } from '@jest/globals'
import { Readable } from 'node:stream'
import { createHmac } from 'node:crypto'

const createCase = jest.fn()
const getCase = jest.fn()
const applyLimiter = jest.fn(async () => {})
jest.unstable_mockModule('../lib/privacy/erasureCases.mjs', () => ({
  createErasureCase: createCase,
  getErasureCase: getCase,
  ErasureCaseError: class ErasureCaseError extends Error {},
}))
jest.unstable_mockModule('../lib/apiHelpers.mjs', () => ({ applyRateLimiter: applyLimiter }))
jest.unstable_mockModule('../lib/middleware/rateLimit.mjs', () => ({ metaDeletionRateLimiter: jest.fn() }))
jest.unstable_mockModule('../lib/logger.mjs', () => ({ default: { error: jest.fn(), warn: jest.fn() } }))

const { default: callbackHandler } = await import('../pages/api/privacy/meta-data-deletion.js')
const { default: statusHandler } = await import('../pages/api/public/privacy/deletion-status.js')

const caseId = 'b44bda8b-a031-4a29-a9a5-0d0a340e7eab'
const issuedAt = Math.floor(Date.now() / 1_000)

function makeSignedRequest(userId = '1925918141394906', secret = 'test-meta-secret') {
  const encoded = Buffer.from(JSON.stringify({ algorithm: 'HMAC-SHA256', issued_at: issuedAt, user_id: userId })).toString('base64url')
  const signature = createHmac('sha256', secret).update(encoded, 'ascii').digest('base64url')
  return `${signature}.${encoded}`
}

function response() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    writableEnded: false,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; this.writableEnded = true; return this },
  }
}

function callbackRequest(signedRequest = makeSignedRequest(), contentType = 'application/x-www-form-urlencoded') {
  const body = new URLSearchParams({ signed_request: signedRequest }).toString()
  const req = Readable.from([Buffer.from(body)])
  req.method = 'POST'
  req.headers = { 'content-type': contentType, 'content-length': String(Buffer.byteLength(body)) }
  return req
}

beforeEach(() => {
  createCase.mockReset()
  getCase.mockReset()
  applyLimiter.mockClear()
  process.env.SSO_FACEBOOK_APP_ID = 'configured-app-id'
  process.env.SSO_FACEBOOK_APP_SECRET = 'test-meta-secret'
  delete process.env.SSO_FACEBOOK_APP_SECRET_PREVIOUS
  delete process.env.SSO_FACEBOOK_APP_SECRET_PREVIOUS_EXPIRES_AT
  process.env.SSO_BASE_URL = 'https://sso.example.test'
  process.env.NODE_ENV = 'test'
  createCase.mockResolvedValue({ case: { requestId: caseId }, created: true })
})

describe('Meta data deletion callback and status endpoint', () => {
  test('verifies and durably records the exact Facebook subject before acknowledging with the status URL', async () => {
    const req = callbackRequest()
    const res = response()
    await callbackHandler(req, res)

    expect(applyLimiter).toHaveBeenCalledTimes(1)
    expect(createCase).toHaveBeenCalledWith({
      body: { source: 'facebook', subjectRef: { kind: 'facebook_subject', id: '1925918141394906' } },
      idempotencyKey: `meta:configured-app-id:${issuedAt}:1925918141394906`,
      actor: { type: 'service', id: 'meta-data-deletion:configured-app-id' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      url: `https://sso.example.test/api/public/privacy/deletion-status?confirmation_code=${caseId.replaceAll('-', '')}`,
      confirmation_code: caseId.replaceAll('-', ''),
    })
    expect(JSON.stringify(res.body)).not.toContain('1925918141394906')
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  test('duplicate provider delivery returns the existing case confirmation code', async () => {
    createCase.mockResolvedValue({ case: { requestId: caseId }, created: false })
    const res = response()
    await callbackHandler(callbackRequest(), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.confirmation_code).toBe(caseId.replaceAll('-', ''))
  })

  test('bad signature, wrong content type and missing app credentials create no case', async () => {
    const bad = makeSignedRequest('1925918141394906', 'wrong-meta-secret')
    const badRes = response()
    await callbackHandler(callbackRequest(bad), badRes)
    expect(badRes.statusCode).toBe(400)
    expect(createCase).not.toHaveBeenCalled()

    const typeRes = response()
    await callbackHandler(callbackRequest(makeSignedRequest(), 'application/json'), typeRes)
    expect(typeRes.statusCode).toBe(415)
    expect(createCase).not.toHaveBeenCalled()

    delete process.env.SSO_FACEBOOK_APP_SECRET
    const configRes = response()
    await callbackHandler(callbackRequest(), configRes)
    expect(configRes.statusCode).toBe(503)
    expect(createCase).not.toHaveBeenCalled()
  })

  test('oversized requests are refused before case creation', async () => {
    const req = callbackRequest()
    req.headers['content-length'] = '9000'
    const res = response()
    await callbackHandler(req, res)
    expect(res.statusCode).toBe(413)
    expect(createCase).not.toHaveBeenCalled()
  })

  test('the public status lookup returns only the safe case summary', async () => {
    getCase.mockResolvedValue({
      requestId: caseId,
      source: 'facebook',
      state: 'partially_failed',
      receivedAt: new Date('2026-10-23T10:00:00Z'),
      dueAt: new Date('2026-11-23T10:00:00Z'),
      subjectRefEncrypted: { ciphertext: 'never-return' },
      targets: [{ target: 'camera', status: 'retryable_failure', evidenceRefHash: 'never-return' }],
    })
    const req = { method: 'GET', query: { confirmation_code: caseId.replaceAll('-', '') } }
    const res = response()
    await statusHandler(req, res)
    expect(applyLimiter).toHaveBeenCalledTimes(1)
    expect(getCase).toHaveBeenCalledWith(caseId)
    expect(res.body).toEqual({
      confirmation_code: caseId.replaceAll('-', ''),
      status: 'partially_failed',
      received_at: new Date('2026-10-23T10:00:00Z'),
      response_due_at: new Date('2026-11-23T10:00:00Z'),
      targets: [{ target: 'camera', status: 'retryable_failure' }],
    })
    expect(JSON.stringify(res.body)).not.toContain('never-return')
    expect(res.headers['Cache-Control']).toContain('no-store')
  })
})
