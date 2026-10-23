import { jest } from '@jest/globals'

const createCase = jest.fn()
const listCases = jest.fn()
const requireActor = jest.fn()
const sendError = jest.fn()

class ErasureCaseError extends Error {}

jest.unstable_mockModule('../lib/privacy/erasureCases.mjs', () => ({
  createErasureCase: createCase,
  listErasureCases: listCases,
  ErasureCaseError,
}))
jest.unstable_mockModule('../lib/privacy/http.mjs', () => ({
  requirePrivacyActor: requireActor,
  sendPrivacyError: sendError,
}))
jest.unstable_mockModule('../lib/logger.mjs', () => ({ default: { error: jest.fn() } }))

const { default: handler } = await import('../pages/api/internal/privacy/requests/index.js')

function response() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

beforeEach(() => {
  createCase.mockReset()
  listCases.mockReset()
  requireActor.mockReset()
  sendError.mockReset()
})

describe('private erasure case API contract', () => {
  test('POST requires an idempotency key, fresh admin or write scope, and returns the case result', async () => {
    const actor = { type: 'admin', id: 'admin-uuid' }
    const requestBody = { source: 'facebook', subjectRef: { kind: 'facebook_subject', id: '1925918141394906' } }
    const caseResult = { case: { requestId: 'request-id', state: 'received' }, created: true }
    requireActor.mockResolvedValue(actor)
    createCase.mockResolvedValue(caseResult)
    const req = { method: 'POST', headers: { 'idempotency-key': 'facebook-case-key-001' }, body: requestBody }
    const res = response()

    await handler(req, res)

    expect(requireActor).toHaveBeenCalledWith(req, res, { scope: 'sso:privacy.write', admin: true, freshAdmin: true })
    expect(createCase).toHaveBeenCalledWith({ body: requestBody, idempotencyKey: 'facebook-case-key-001', actor })
    expect(res.statusCode).toBe(201)
    expect(res.body).toEqual({ success: true, ...caseResult })
  })

  test('GET permits only the read scope or SSO admin and returns the bounded listing', async () => {
    const actor = { type: 'service', id: 'camera-service' }
    const page = { cases: [], pagination: { limit: 50, skip: 0, total: 0 } }
    requireActor.mockResolvedValue(actor)
    listCases.mockResolvedValue(page)
    const req = { method: 'GET', headers: {}, query: { state: 'received', limit: '12', skip: '3' } }
    const res = response()

    await handler(req, res)

    expect(requireActor).toHaveBeenCalledWith(req, res, { scope: 'sso:privacy.read', admin: true })
    expect(listCases).toHaveBeenCalledWith({ state: 'received', dueBefore: undefined, limit: 12, skip: 3 })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ success: true, ...page })
  })

  test('rejects unsupported methods', async () => {
    const res = response()
    await handler({ method: 'DELETE' }, res)
    expect(res.statusCode).toBe(405)
    expect(res.headers.Allow).toBe('GET, POST')
  })
})
