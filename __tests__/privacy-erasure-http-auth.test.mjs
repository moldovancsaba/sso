import { jest } from '@jest/globals'

const auth = jest.fn()
const validate = jest.fn()
jest.unstable_mockModule('../lib/auth.mjs', () => ({ requireUnifiedAdmin: auth }))
jest.unstable_mockModule('../lib/oauth/middleware.mjs', () => ({
  validateAccessToken: validate,
  hasScope: (token, scope) => Boolean(token?.scope?.split(' ').includes(scope)),
}))
const { requirePrivacyActor, requirePrivacyAdmin, assertTargetClient } = await import('../lib/privacy/http.mjs')

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
  auth.mockReset()
  validate.mockReset()
  delete process.env.SSO_PRIVACY_TARGET_CLIENTS
})

describe('private erasure endpoint authentication', () => {
  test('requires a userless machine token for the SSO audience with its narrow scope', async () => {
    validate.mockResolvedValue({
      userId: null,
      clientId: 'camera-service',
      audience: 'sso',
      scope: 'sso:privacy.write',
    })
    const res = response()
    const actor = await requirePrivacyActor({ headers: { authorization: 'Bearer token' } }, res, { scope: 'sso:privacy.write' })
    expect(actor).toMatchObject({ type: 'service', id: 'camera-service' })
    expect(res.headers['Cache-Control']).toBe('private, no-store, max-age=0')
  })

  test.each([
    [{ userId: 'user-uuid', clientId: 'camera-service', audience: 'sso', scope: 'sso:privacy.write' }, 'service token'],
    [{ userId: null, clientId: 'camera-service', audience: 'camera', scope: 'sso:privacy.write' }, 'SSO resource'],
    [{ userId: null, clientId: 'camera-service', audience: 'sso', scope: 'sso:privacy.read' }, 'One of these scopes'],
  ])('rejects an incorrectly bound token', async (token, expectedError) => {
    validate.mockResolvedValue(token)
    const res = response()
    await requirePrivacyActor({ headers: { authorization: 'Bearer token' } }, res, { scope: 'sso:privacy.write' })
    expect(res.statusCode).toBe(403)
    expect(res.body.error_description).toContain(expectedError)
  })

  test('admin decision endpoints require fresh, request-bound admin authentication', async () => {
    auth.mockResolvedValue({ id: 'admin-uuid', role: 'admin' })
    const res = response()
    const actor = await requirePrivacyAdmin({ headers: {} }, res)
    expect(actor).toEqual({ type: 'admin', id: 'admin-uuid', role: 'admin' })
    expect(auth).toHaveBeenCalledWith(expect.any(Object), res, { requireFreshAuth: true, requireBoundSession: true })
  })

  test('target receipts bind each service client to its own named target', () => {
    process.env.SSO_PRIVACY_TARGET_CLIENTS = JSON.stringify({ camera: 'camera-service', fanmass: 'fanmass-service' })
    const res = response()
    expect(assertTargetClient({ clientId: 'camera-service' }, 'camera', res)).toBe(true)
    expect(assertTargetClient({ clientId: 'camera-service' }, 'fanmass', res)).toBe(false)
    expect(res.statusCode).toBe(403)
  })
})
