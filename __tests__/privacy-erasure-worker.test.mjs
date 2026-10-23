import { jest } from '@jest/globals'

const processStep = jest.fn()
jest.unstable_mockModule('../lib/privacy/erasureCoordinator.mjs', () => ({ processOneErasureStep: processStep }))
jest.unstable_mockModule('../lib/logger.mjs', () => ({ default: { error: jest.fn() } }))
const { default: handler } = await import('../pages/api/internal/privacy/process-erasure.js')

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

describe('privacy erasure worker route', () => {
  beforeEach(() => {
    delete process.env.SSO_CRON_SECRET
    delete process.env.CRON_SECRET
    processStep.mockReset().mockResolvedValue({ status: 'idle' })
  })

  it('fails closed when no cron secret is configured', async () => {
    const res = response()
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.statusCode).toBe(401)
    expect(processStep).not.toHaveBeenCalled()
  })

  it('uses the dedicated SSO worker secret and accepts the platform secret as a fallback', async () => {
    process.env.SSO_CRON_SECRET = 'dedicated-sso-secret'
    process.env.CRON_SECRET = 'platform-secret'
    const dedicated = response()
    await handler({ method: 'POST', headers: { authorization: 'Bearer dedicated-sso-secret' } }, dedicated)
    expect(dedicated.statusCode).toBe(200)
    expect(processStep).toHaveBeenCalledTimes(1)

    const platformFallback = response()
    await handler({ method: 'GET', headers: { authorization: 'Bearer platform-secret' } }, platformFallback)
    expect(platformFallback.statusCode).toBe(401)

    delete process.env.SSO_CRON_SECRET
    const platform = response()
    await handler({ method: 'GET', headers: { authorization: 'Bearer platform-secret' } }, platform)
    expect(platform.statusCode).toBe(200)
  })
})
