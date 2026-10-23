import { jest } from '@jest/globals'

const createCase = jest.fn()
const listCases = jest.fn()
const getCase = jest.fn()
const resolveSubjectProof = jest.fn()
const publicCase = jest.fn((caseDoc) => ({ requestId: caseDoc.requestId, state: caseDoc.state }))
const requireActor = jest.fn()
const sendError = jest.fn()

class ErasureCaseError extends Error {}

jest.unstable_mockModule('../lib/privacy/erasureCases.mjs', () => ({
  createErasureCase: createCase,
  listErasureCases: listCases,
  getErasureCase: getCase,
  resolveErasureSubjectProof: resolveSubjectProof,
  toPublicCase: publicCase,
  ErasureCaseError,
}))
jest.unstable_mockModule('../lib/privacy/http.mjs', () => ({
  requirePrivacyActor: requireActor,
  sendPrivacyError: sendError,
}))
jest.unstable_mockModule('../lib/logger.mjs', () => ({ default: { error: jest.fn() } }))

const { default: handler } = await import('../pages/api/internal/privacy/requests/index.js')
const { default: detailHandler } = await import('../pages/api/internal/privacy/requests/[requestId].js')

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
  getCase.mockReset()
  resolveSubjectProof.mockReset()
  publicCase.mockClear()
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

  test('releases the versioned subject proof only to the configured resolver with the resolve scope', async () => {
    const actor = { type: 'service', id: 'camera-resolver', clientId: 'camera-resolver', scopes: ['sso:privacy.resolve'] }
    const caseDoc = { requestId: '4a3d3c54-89ab-4a09-8def-0a1b2c3d4e5f', state: 'deleting' }
    const proof = { version: 1, caseId: caseDoc.requestId, subject: { kind: 'sso_user', id: 'sso-user-1' } }
    process.env.SSO_PRIVACY_RESOLVER_CLIENT_ID = 'camera-resolver'
    requireActor.mockResolvedValue(actor)
    getCase.mockResolvedValue(caseDoc)
    resolveSubjectProof.mockResolvedValue(proof)
    const req = { method: 'GET', headers: { authorization: 'Bearer opaque' }, query: { requestId: caseDoc.requestId, includeSubject: 'true' } }
    const res = response()

    await detailHandler(req, res)

    expect(requireActor).toHaveBeenCalledWith(req, res, { scope: ['sso:privacy.read', 'sso:privacy.resolve'], admin: true })
    expect(resolveSubjectProof).toHaveBeenCalledWith({ requestId: caseDoc.requestId, actor })
    expect(res.body).toEqual({ success: true, case: { requestId: caseDoc.requestId, state: 'deleting', subjectProof: proof } })
  })

  test('does not return identity proof to an unconfigured client or admin session', async () => {
    process.env.SSO_PRIVACY_RESOLVER_CLIENT_ID = 'camera-resolver'
    requireActor.mockResolvedValue({ type: 'service', id: 'other-client', clientId: 'other-client', scopes: ['sso:privacy.resolve'] })
    getCase.mockResolvedValue({ requestId: '4a3d3c54-89ab-4a09-8def-0a1b2c3d4e5f', state: 'deleting' })
    const req = { method: 'GET', headers: { authorization: 'Bearer opaque' }, query: { requestId: '4a3d3c54-89ab-4a09-8def-0a1b2c3d4e5f', includeSubject: 'true' } }
    const res = response()

    await detailHandler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({ error: 'privacy_resolver_not_authorized' })
    expect(resolveSubjectProof).not.toHaveBeenCalled()
  })
})
