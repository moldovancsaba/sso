import {
  buildAdminLoginUrl,
  decodeAdminLoginState,
  encodeAdminLoginState,
  sanitizeAdminRedirectPath,
} from '../lib/adminAuthFlow.js'

describe('admin auth flow helpers', () => {
  test('keeps safe in-app admin redirect paths', () => {
    expect(sanitizeAdminRedirectPath('/admin/users?filter=disabled')).toBe('/admin/users?filter=disabled')
  })

  test('falls back for unsafe redirect paths', () => {
    expect(sanitizeAdminRedirectPath('https://example.com')).toBe('/admin/dashboard')
    expect(sanitizeAdminRedirectPath('//evil.example.com/admin')).toBe('/admin/dashboard')
    expect(sanitizeAdminRedirectPath('/admin/callback')).toBe('/admin/dashboard')
    expect(sanitizeAdminRedirectPath('/docs')).toBe('/admin/dashboard')
  })

  test('round-trips encoded login state', () => {
    const state = encodeAdminLoginState({
      nonce: 'nonce-123',
      redirectPath: '/admin/oauth-clients?create=true',
    })

    expect(decodeAdminLoginState(state)).toEqual({
      nonce: 'nonce-123',
      redirectPath: '/admin/oauth-clients?create=true',
    })
  })

  test('builds reauth login url with redirect target', () => {
    expect(buildAdminLoginUrl('/admin/users?filter=disabled', { reauth: true })).toBe(
      '/admin?redirect=%2Fadmin%2Fusers%3Ffilter%3Ddisabled&reauth=1'
    )
  })
})
