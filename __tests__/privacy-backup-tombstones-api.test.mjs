import { jest } from '@jest/globals'

const actorResult = { type: 'service', clientId: 'camera-resolver-client', scopes: ['sso:privacy.resolve'] }
const requireActor = jest.fn()
const listTombstones = jest.fn()
const fakeDb = { collection: jest.fn() }

jest.unstable_mockModule('../lib/db.mjs', () => ({ getDb: async () => fakeDb }))
jest.unstable_mockModule('../lib/privacy/http.mjs', () => ({
  requirePrivacyActor: requireActor,
  setPrivateResponseHeaders: (res) => { res.setHeader('Cache-Control', 'private, no-store, max-age=0') },
}))
jest.unstable_mockModule('../lib/privacy/erasureTombstones.mjs', () => ({ listPrivacyErasureTombstones: listTombstones }))
jest.unstable_mockModule('../lib/logger.mjs', () => ({ default: { error: jest.fn() } }))

const { default: handler } = await import('../pages/api/internal/privacy/backup-tombstones.js')

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this },
    setHeader(name, value) { this.headers[name] = value },
    json(value) { this.body = value; return this },
  }
}

describe('privacy backup tombstone export API', () => {
  beforeEach(() => {
    process.env.SSO_PRIVACY_RESOLVER_CLIENT_ID = 'camera-resolver-client'
    requireActor.mockReset().mockResolvedValue(actorResult)
    listTombstones.mockReset().mockResolvedValue({ version: 1, retentionPolicy: { configured: false, days: null }, tombstones: [], complete: true, nextCursor: null })
  })

  it('allows only the dedicated Camera resolver or a freshly authenticated privacy admin', async () => {
    const res = response()
    await handler({ method: 'GET', query: {} }, res)
    expect(res.statusCode).toBe(200)
    expect(requireActor).toHaveBeenCalledWith(expect.anything(), res, { scope: 'sso:privacy.resolve', admin: true, freshAdmin: true })
    expect(res.headers['Cache-Control']).toContain('no-store')

    requireActor.mockResolvedValueOnce({ type: 'service', clientId: 'other-service', scopes: ['sso:privacy.resolve'] })
    const forbidden = response()
    await handler({ method: 'GET', query: {} }, forbidden)
    expect(forbidden.statusCode).toBe(403)
    expect(forbidden.body.error).toBe('privacy_resolver_not_authorized')
  })

  it('uses bounded keyset page sizes and returns only the tombstone DTO', async () => {
    listTombstones.mockResolvedValueOnce({ version: 1, retentionPolicy: { configured: true, days: 90 }, tombstones: [{ requestId: 'case', photoId: 'photo', eventIds: ['event'] }], complete: false, nextCursor: 'cursor' })
    const res = response()
    await handler({ method: 'GET', query: { limit: '50', cursor: 'opaque-cursor' } }, res)
    expect(listTombstones).toHaveBeenCalledWith({ db: fakeDb, cursor: 'opaque-cursor', limit: 50 })
    expect(res.body).toMatchObject({ success: true, version: 1, retentionPolicy: { configured: true, days: 90 }, tombstones: [{ photoId: 'photo' }], nextCursor: 'cursor' })
    expect(JSON.stringify(res.body)).not.toMatch(/email|subject|url|contact/i)
  })

  it('rejects invalid methods and page bounds without querying the ledger', async () => {
    const method = response()
    await handler({ method: 'POST', query: {} }, method)
    expect(method.statusCode).toBe(405)
    expect(method.headers.Allow).toBe('GET')

    const badLimit = response()
    await handler({ method: 'GET', query: { limit: '501' } }, badLimit)
    expect(badLimit.statusCode).toBe(400)
    expect(listTombstones).not.toHaveBeenCalled()
  })
})
