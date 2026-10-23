import { jest } from '@jest/globals'

const getPublicUser = jest.fn()
const createCase = jest.fn()
const applyLimiter = jest.fn(async () => {})
const validateOrigin = jest.fn(() => ({ valid: true }))
const logger = { error: jest.fn() }
jest.unstable_mockModule('../lib/publicSessions.mjs', () => ({ getPublicUserFromRequest: getPublicUser }))
jest.unstable_mockModule('../lib/privacy/erasureCases.mjs', () => ({
  createErasureCase: createCase,
  ErasureCaseError: class ErasureCaseError extends Error {},
}))
jest.unstable_mockModule('../lib/apiHelpers.mjs', () => ({ applyRateLimiter: applyLimiter }))
jest.unstable_mockModule('../lib/middleware/rateLimit.mjs', () => ({ strictRateLimiter: jest.fn() }))
jest.unstable_mockModule('../lib/middleware/csrf.mjs', () => ({ validateRequestOrigin: validateOrigin }))
jest.unstable_mockModule('../lib/logger.mjs', () => ({ default: logger }))

const { default: legacyAccountDelete } = await import('../pages/api/public/account.js')
const { default: requestErasure } = await import('../pages/api/public/privacy/erasure-request.js')

function response() {
  return {
    headers: {}, statusCode: 200, body: null, writableEnded: false,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; this.writableEnded = true; return this },
  }
}

beforeEach(() => {
  getPublicUser.mockReset()
  createCase.mockReset()
  applyLimiter.mockClear()
  validateOrigin.mockReset().mockReturnValue({ valid: true })
  logger.error.mockClear()
  getPublicUser.mockResolvedValue({ id: 'sso-account-123', email: 'private@example.test' })
  createCase.mockResolvedValue({ created: true, case: { requestId: 'b44bda8b-a031-4a29-a9a5-0d0a340e7eab', state: 'awaiting_decision' } })
})

describe('authenticated erasure entry points', () => {
  test('legacy DELETE route creates a case and never directly removes account data', async () => {
    const req = { method: 'DELETE', headers: { 'idempotency-key': 'legacy-account-delete-00001' } }
    const res = response()
    await legacyAccountDelete(req, res)
    expect(createCase).toHaveBeenCalledWith(expect.objectContaining({
      body: { source: 'participant', subjectRef: { kind: 'sso_user', id: 'sso-account-123' } },
      idempotencyKey: 'legacy-account-delete-00001',
      verifiedSessionAt: expect.any(Date),
    }))
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ success: true, requestRecorded: true, status: 'awaiting_decision' })
    expect(JSON.stringify(res.body)).not.toContain('private@example.test')
  })

  test('public request route uses only the signed-in account id, never a caller-supplied identity', async () => {
    const req = { method: 'POST', body: { subjectRef: { kind: 'sso_user', id: 'attacker-id' } }, headers: { 'idempotency-key': 'public-account-request-0001' } }
    const res = response()
    await requestErasure(req, res)
    expect(createCase).toHaveBeenCalledWith(expect.objectContaining({
      body: { source: 'participant', subjectRef: { kind: 'sso_user', id: 'sso-account-123' } },
      idempotencyKey: 'public-account-request-0001',
    }))
    expect(res.body.confirmation_code).toBe('b44bda8ba0314a29a9a50d0a340e7eab')
  })

  test('requires authentication and a same-origin request', async () => {
    getPublicUser.mockResolvedValueOnce(null)
    const unauthenticated = response()
    await requestErasure({ method: 'POST', headers: { 'idempotency-key': 'public-account-request-0002' }, body: {} }, unauthenticated)
    expect(unauthenticated.statusCode).toBe(401)
    expect(createCase).not.toHaveBeenCalled()

    validateOrigin.mockReturnValueOnce({ valid: false })
    const crossOrigin = response()
    await requestErasure({ method: 'POST', headers: {}, body: {} }, crossOrigin)
    expect(crossOrigin.statusCode).toBe(403)
    expect(createCase).not.toHaveBeenCalled()
  })
})
