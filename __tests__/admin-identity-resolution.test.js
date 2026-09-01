import { jest } from '@jest/globals'

// WHAT: resolveAdminIdentity must accept both live session models.
// WHY: /admin/activity's page gate called getAdminUser directly, which reads only the legacy
//      `admin-session` cookie. The OAuth admin login issues `public-session` instead, so the
//      gate redirected every current admin to /admin, which re-authorized them and sent them
//      back — an endless loop. This test fails if the two models ever diverge again.

const state = { publicSession: null, adminPermission: null, adminUser: null }

jest.unstable_mockModule('../lib/publicSessions.mjs', () => ({
  getPublicSessionFromRequest: async () => state.publicSession,
  isPublicSessionBoundToRequest: () => true,
}))

jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => ({
    collection(name) {
      if (name === 'appPermissions') {
        return {
          async createIndex() {},
          async findOne() { return state.adminPermission },
        }
      }
      if (name === 'users' || name === 'adminSessions') {
        return {
          async createIndex() {},
          async findOne() { return state.adminUser },
          async updateOne() {},
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    },
  }),
}))

const { resolveAdminIdentity } = await import('../lib/auth.mjs')

const req = { headers: {} }

describe('resolveAdminIdentity', () => {
  beforeEach(() => {
    state.publicSession = null
    state.adminPermission = null
    state.adminUser = null
  })

  test('accepts an OAuth admin holding only a public session', async () => {
    state.publicSession = {
      user: { id: 'user-1', email: 'admin@example.com', name: 'Admin' },
      session: { authenticatedAt: '2026-09-01T00:00:00.000Z' },
    }
    state.adminPermission = { role: 'admin', grantedAt: '2026-01-01T00:00:00.000Z' }

    const identity = await resolveAdminIdentity(req)

    expect(identity.model).toBe('unified-public-session')
    expect(identity.user.email).toBe('admin@example.com')
    expect(identity.user.role).toBe('admin')
  })

  test('rejects a public session whose app permission is not admin', async () => {
    state.publicSession = { user: { id: 'user-2', email: 'user@example.com' }, session: {} }
    state.adminPermission = { role: 'user' }

    expect(await resolveAdminIdentity(req)).toBeNull()
  })

  test('returns null when neither session model is present', async () => {
    expect(await resolveAdminIdentity(req)).toBeNull()
  })
})
