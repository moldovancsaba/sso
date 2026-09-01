import { jest } from '@jest/globals'
import { logoutAdmin, revokeAllSessions } from '../lib/adminAuthFlow.js'

// WHAT: logoutAdmin must revoke both session models, not just the legacy one.
// WHY: The OAuth admin login issues only a `public-session` cookie. When logout called
//      `DELETE /api/admin/login` alone it cleared `admin-session` — a cookie the admin
//      never had — and the admin stayed signed in with no visible failure.

const ORIGINAL_FETCH = global.fetch
const ORIGINAL_WINDOW = global.window

function calledPaths(fetchMock) {
  return fetchMock.mock.calls.map(([input, init]) => `${init.method} ${input}`).sort()
}

describe('revokeAllSessions', () => {
  afterEach(() => { global.fetch = ORIGINAL_FETCH })

  test('hits both session models, not just one', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true })

    await revokeAllSessions()

    expect(calledPaths(global.fetch)).toEqual([
      'DELETE /api/admin/login',
      'POST /api/public/logout',
    ])
  })

  test('never calls the removed /api/users/logout tombstone', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true })

    await revokeAllSessions()

    const targets = global.fetch.mock.calls.map(([input]) => input)
    expect(targets).not.toContain('/api/users/logout')
    expect(targets).not.toContain('/api/auth/logout')
  })
})

describe('logoutAdmin', () => {
  beforeEach(() => {
    global.window = { location: { href: '/admin/dashboard' } }
  })

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH
    global.window = ORIGINAL_WINDOW
  })

  test('revokes both the public session and the legacy admin session', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true })

    await logoutAdmin()

    expect(calledPaths(global.fetch)).toEqual([
      'DELETE /api/admin/login',
      'POST /api/public/logout',
    ])
    for (const [, init] of global.fetch.mock.calls) {
      expect(init.credentials).toBe('include')
    }
    expect(global.window.location.href).toBe('/admin')
  })

  test('still completes when only one endpoint is reachable', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ status: 200, ok: true })
      .mockRejectedValueOnce(new Error('network down'))

    await expect(logoutAdmin()).resolves.toBeUndefined()
    expect(global.window.location.href).toBe('/admin')
  })

  test('reports failure only when nothing could be revoked', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))

    await expect(logoutAdmin()).rejects.toThrow('Logout failed')
    expect(global.window.location.href).toBe('/admin/dashboard')
  })
})
