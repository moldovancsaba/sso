import { jest } from '@jest/globals'
import {
  buildAdminLoginUrl,
  decodeAdminLoginState,
  encodeAdminLoginState,
  fetchAdminJson,
  sanitizeAdminRedirectPath,
} from '../lib/adminAuthFlow.js'

function mockFetchOnce(status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  })
}

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

describe('fetchAdminJson error message extraction', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  // This is the exact bug: routes that return {error: 'Internal server error', message: '<real
  // reason>'} used to have the real reason discarded because a string `error` field was always
  // preferred outright, regardless of how generic it was.
  test('prefers a real message over a generic error placeholder', async () => {
    mockFetchOnce(500, { error: 'Internal server error', message: 'Redirect URI must use HTTPS in production' })

    await expect(fetchAdminJson('/api/whatever')).rejects.toThrow(
      'Redirect URI must use HTTPS in production'
    )
  })

  test('still prefers a specific error string when it is not a generic placeholder', async () => {
    mockFetchOnce(400, { error: 'At least one redirect URI is required' })

    await expect(fetchAdminJson('/api/whatever')).rejects.toThrow(
      'At least one redirect URI is required'
    )
  })

  test('still reads nested error.message (requireAdmin/requireUnifiedAdmin shape)', async () => {
    mockFetchOnce(403, { error: { code: 'FORBIDDEN', message: 'Request origin not allowed' } })

    await expect(fetchAdminJson('/api/whatever', {}, { redirectOnAuthFailure: false })).rejects.toThrow(
      'Request origin not allowed'
    )
  })

  test('falls back to error_description when present', async () => {
    mockFetchOnce(400, { error: 'invalid_request', error_description: 'client_id is required' })

    // 'invalid_request' isn't in the generic-placeholder set, so it still wins here — this
    // documents current behavior for OAuth-shaped error bodies rather than asserting a
    // preference between two already-informative fields.
    await expect(fetchAdminJson('/api/whatever')).rejects.toThrow('invalid_request')
  })

  test('falls back to the generic message when nothing more specific exists', async () => {
    mockFetchOnce(500, { error: 'Internal server error' })

    await expect(fetchAdminJson('/api/whatever')).rejects.toThrow('Internal server error')
  })

  test('falls back to a status-based message when the body is empty', async () => {
    mockFetchOnce(500, null)

    await expect(fetchAdminJson('/api/whatever')).rejects.toThrow('Request failed: 500')
  })
})
