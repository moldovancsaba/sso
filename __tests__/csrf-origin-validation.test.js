import { validateRequestOrigin } from '../lib/middleware/csrf.mjs'

const ORIGINAL_ENV = { ...process.env }

function req(overrides = {}) {
  return {
    method: 'POST',
    headers: {},
    ...overrides,
  }
}

describe('validateRequestOrigin', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production'
    process.env.SSO_ALLOWED_ORIGINS = 'https://sso.doneisbetter.com,https://doneisbetter.com,https://cardmass.doneisbetter.com'
    delete process.env.ADMIN_DEV_BYPASS
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  test('allows safe methods regardless of origin', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const result = validateRequestOrigin(req({ method, headers: { origin: 'https://attacker.example.com' } }))
      expect(result.valid).toBe(true)
    }
  })

  test('allows a mutating request whose Origin is on the allowlist', () => {
    const result = validateRequestOrigin(req({ headers: { origin: 'https://sso.doneisbetter.com' } }))
    expect(result.valid).toBe(true)
  })

  test('allows an allowlisted subdomain making a cross-subdomain mutating request', () => {
    const result = validateRequestOrigin(req({ headers: { origin: 'https://cardmass.doneisbetter.com' } }))
    expect(result.valid).toBe(true)
  })

  // The core CSRF-defense case: a page on an attacker's origin submits a form or fetch()
  // to a mutating endpoint. The victim's cookies ride along automatically, but the browser
  // still stamps the real Origin — which is exactly what this check catches.
  test('rejects a mutating request from an untrusted Origin', () => {
    const result = validateRequestOrigin(req({ headers: { origin: 'https://attacker.example.com' } }))
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('untrusted_origin')
  })

  test('falls back to Referer origin when Origin header is absent', () => {
    const allowed = validateRequestOrigin(
      req({ headers: { referer: 'https://sso.doneisbetter.com/admin/users?tab=1' } })
    )
    expect(allowed.valid).toBe(true)

    const rejected = validateRequestOrigin(
      req({ headers: { referer: 'https://attacker.example.com/evil-form.html' } })
    )
    expect(rejected.valid).toBe(false)
  })

  test('allows a request with neither Origin nor Referer (non-browser / server-to-server caller)', () => {
    const result = validateRequestOrigin(req({ headers: {} }))
    expect(result.valid).toBe(true)
  })

  test('respects the ADMIN_DEV_BYPASS escape hatch outside production only', () => {
    process.env.NODE_ENV = 'development'
    process.env.ADMIN_DEV_BYPASS = 'true'
    const result = validateRequestOrigin(req({ headers: { origin: 'https://attacker.example.com' } }))
    expect(result.valid).toBe(true)
  })

  test('ignores ADMIN_DEV_BYPASS in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.ADMIN_DEV_BYPASS = 'true'
    const result = validateRequestOrigin(req({ headers: { origin: 'https://attacker.example.com' } }))
    expect(result.valid).toBe(false)
  })

  test('allows localhost origins outside production for dev convenience', () => {
    process.env.NODE_ENV = 'development'
    const result = validateRequestOrigin(req({ headers: { origin: 'http://localhost:3000' } }))
    expect(result.valid).toBe(true)
  })

  test('does not give localhost a free pass in production', () => {
    process.env.NODE_ENV = 'production'
    const result = validateRequestOrigin(req({ headers: { origin: 'http://localhost:3000' } }))
    expect(result.valid).toBe(false)
  })
})
