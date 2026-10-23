import { jest } from '@jest/globals'

const sendEmail = jest.fn(async () => ({ success: true }))
const issueVerification = jest.fn()
const verifyAndCreate = jest.fn()
const normalizeEmail = jest.fn((value) => typeof value === 'string' && value.includes('@') ? value.trim().toLowerCase() : null)
const applyLimiter = jest.fn(async () => {})
const logger = { warn: jest.fn(), error: jest.fn() }

jest.unstable_mockModule('../lib/email.mjs', () => ({ sendEmail }))
jest.unstable_mockModule('../lib/apiHelpers.mjs', () => ({ applyRateLimiter: applyLimiter }))
jest.unstable_mockModule('../lib/middleware/rateLimit.mjs', () => ({ strictRateLimiter: jest.fn() }))
jest.unstable_mockModule('../lib/privacy/guestErasureVerification.mjs', () => ({
  issueGuestErasureVerification: issueVerification,
  normalizeGuestErasureEmail: normalizeEmail,
  verifyGuestErasureEmailAndCreateCase: verifyAndCreate,
}))
jest.unstable_mockModule('../lib/logger.mjs', () => ({ default: logger }))

const { default: sendVerification } = await import('../pages/api/public/privacy/erasure-verification.js')
const { default: verifyToken } = await import('../pages/api/public/privacy/confirm-erasure-verification.js')

function response() {
  return {
    headers: {}, statusCode: 200, body: null, writableEnded: false,
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; this.writableEnded = true; return this },
  }
}

beforeEach(() => {
  sendEmail.mockClear()
  issueVerification.mockReset()
  verifyAndCreate.mockReset()
  normalizeEmail.mockClear()
  applyLimiter.mockClear()
  logger.warn.mockClear()
  logger.error.mockClear()
  process.env.SSO_PRIVACY_GUEST_VERIFY_BASE_URL = 'https://sso.example.test'
  process.env.NODE_ENV = 'test'
})

describe('public guest erasure email proof', () => {
  test('uses one generic response and sends an inbox-control link for a valid address', async () => {
    normalizeEmail.mockReturnValue('fan@example.test')
    issueVerification.mockResolvedValue({ token: 'a'.repeat(43) })
    const req = { method: 'POST', body: { email: 'Fan@Example.test' }, headers: {} }
    const res = response()
    await sendVerification(req, res)
    expect(applyLimiter).toHaveBeenCalledTimes(1)
    expect(issueVerification).toHaveBeenCalledWith('fan@example.test')
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'fan@example.test', category: 'privacy_erasure_email_verification' }))
    expect(res.statusCode).toBe(202)
    expect(res.body.message).toBe('If you can access that inbox, a confirmation link will be sent.')
    expect(res.headers['Cache-Control']).toContain('no-store')
  })

  test('does not reveal whether an invalid or unavailable mailbox has a case', async () => {
    normalizeEmail.mockReturnValue(null)
    const res = response()
    await sendVerification({ method: 'POST', body: { email: 'anonymous@event' }, headers: {} }, res)
    expect(res.statusCode).toBe(202)
    expect(issueVerification).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  test('consumes the one-time proof and returns only the case code and state', async () => {
    verifyAndCreate.mockResolvedValue({
      email: 'fan@example.test',
      case: { requestId: 'b44bda8b-a031-4a29-a9a5-0d0a340e7eab', state: 'awaiting_decision' },
    })
    const res = response()
    await verifyToken({ method: 'POST', body: { token: 'a'.repeat(43) }, headers: {} }, res)
    expect(verifyAndCreate).toHaveBeenCalledWith('a'.repeat(43))
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ success: true, confirmation_code: 'b44bda8ba0314a29a9a50d0a340e7eab', status: 'awaiting_decision' })
    expect(JSON.stringify(res.body)).not.toContain('fan@example.test')
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'fan@example.test', category: 'privacy_erasure_request_received' }))
  })

  test('refuses expired/invalid proof tokens without creating a case', async () => {
    verifyAndCreate.mockRejectedValue(Object.assign(new Error('verification_invalid'), { code: 'verification_invalid' }))
    const res = response()
    await verifyToken({ method: 'POST', body: { token: 'invalid' }, headers: {} }, res)
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'verification_invalid' })
  })
})
