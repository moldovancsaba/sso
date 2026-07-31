import { isSafeRedirectTarget, resolveSafeRedirect } from '../lib/redirects.mjs'

const ORIGINAL_ENV = { ...process.env }

describe('isSafeRedirectTarget', () => {
  beforeEach(() => {
    process.env.SSO_ALLOWED_ORIGINS = 'https://sso.doneisbetter.com,https://doneisbetter.com'
    delete process.env.SSO_BASE_URL
    delete process.env.NEXT_PUBLIC_SSO_BASE_URL
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  test('accepts an ordinary relative path', () => {
    expect(isSafeRedirectTarget('/admin/dashboard')).toBe(true)
  })

  // The gap this fix closes: a browser resolves "//evil.com/x" as protocol-relative — i.e. an
  // external redirect to evil.com — not as a same-origin path, even though it starts with '/'.
  test('rejects a protocol-relative target', () => {
    expect(isSafeRedirectTarget('//evil.com/steal')).toBe(false)
    expect(isSafeRedirectTarget('//evil.com')).toBe(false)
  })

  test('rejects a protocol-relative target even with allowRelative explicitly true', () => {
    expect(isSafeRedirectTarget('//evil.com/steal', { allowRelative: true })).toBe(false)
  })

  test('accepts an absolute URL on an allowlisted origin', () => {
    expect(isSafeRedirectTarget('https://sso.doneisbetter.com/admin')).toBe(true)
  })

  test('rejects an absolute URL on a non-allowlisted origin', () => {
    expect(isSafeRedirectTarget('https://evil.com/phish')).toBe(false)
  })

  test('rejects a non-http(s) protocol', () => {
    expect(isSafeRedirectTarget('javascript:alert(1)')).toBe(false)
  })

  test('accepts localhost regardless of allowlist (dev convenience)', () => {
    expect(isSafeRedirectTarget('http://localhost:3000/callback')).toBe(true)
  })

  test('rejects empty/non-string targets', () => {
    expect(isSafeRedirectTarget('')).toBe(false)
    expect(isSafeRedirectTarget(null)).toBe(false)
    expect(isSafeRedirectTarget(undefined)).toBe(false)
  })
})

describe('resolveSafeRedirect', () => {
  beforeEach(() => {
    process.env.SSO_ALLOWED_ORIGINS = 'https://sso.doneisbetter.com'
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  test('returns the first safe candidate', () => {
    expect(resolveSafeRedirect(['//evil.com', undefined, '/admin'], '/')).toBe('/admin')
  })

  test('falls back when no candidate is safe', () => {
    expect(resolveSafeRedirect(['//evil.com', 'https://evil.com'], '/fallback')).toBe('/fallback')
  })
})
