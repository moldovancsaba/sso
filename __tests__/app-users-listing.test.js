/**
 * Contract tests for a client's user listing - lib/appUsers.mjs and
 * GET /api/apps/[clientId]/users.
 *
 * WHAT: The join (consents ∪ permission records → accounts), the projection (no hash, no
 *       provider payload), search escaping, ordering, pagination; then the route's gate -
 *       machine token with manage_permissions, for its own client only.
 * WHY:  This listing hands a client every user's email. The tests pin that only the
 *       client itself can read it and that nothing beyond the DTO's fields leaves SSO.
 */
import { jest } from '@jest/globals'

function matches(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    const actual = doc[key]
    if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
      if ('$in' in condition) return condition.$in.includes(actual)
    }
    return actual === condition
  })
}

function makeDb(store) {
  return {
    collection(name) {
      const docs = store[name] || []
      return {
        find(filter) {
          const selected = docs.filter((d) => matches(d, filter))
          const cursor = {
            project(projection) {
              cursor.projection = projection
              return cursor
            },
            async toArray() {
              return selected.map((d) => {
                if (!cursor.projection) return { ...d }
                const out = {}
                for (const [path, keep] of Object.entries(cursor.projection)) {
                  if (!keep || path === '_id') continue
                  const value = path.split('.').reduce((o, p) => (o == null ? undefined : o[p]), d)
                  if (value === undefined) continue
                  const parts = path.split('.')
                  let target = out
                  for (const part of parts.slice(0, -1)) target = target[part] ??= {}
                  target[parts.at(-1)] = value
                }
                return out
              })
            },
          }
          return cursor
        },
      }
    },
  }
}

const CLIENT = 'client-a'

const store = {
  userConsents: [
    { user_id: 'u-consent-only', client_id: CLIENT, scope: 'openid email', granted_at: '2026-09-01T00:00:00.000Z', revoked_at: null },
    { user_id: 'u-both', client_id: CLIENT, scope: 'openid profile email', granted_at: '2026-08-01T00:00:00.000Z', revoked_at: null },
    { user_id: 'u-revoked', client_id: CLIENT, scope: 'openid', granted_at: '2026-07-01T00:00:00.000Z', revoked_at: '2026-07-02T00:00:00.000Z' },
    { user_id: 'u-other-client', client_id: 'client-b', scope: 'openid', granted_at: '2026-07-01T00:00:00.000Z', revoked_at: null },
    { user_id: 'u-deleted', client_id: CLIENT, scope: 'openid', granted_at: '2026-07-01T00:00:00.000Z', revoked_at: null },
  ],
  appPermissions: [
    { userId: 'u-both', clientId: CLIENT, appName: 'App A', role: 'user', status: 'approved', hasAccess: true, requestedAt: '2026-08-01T00:00:00.000Z', grantedAt: '2026-08-01T00:00:00.000Z', lastAccessedAt: '2026-09-10T00:00:00.000Z' },
    { userId: 'u-permission-only', clientId: CLIENT, appName: 'App A', role: 'none', status: 'pending', hasAccess: false, requestedAt: '2026-09-05T00:00:00.000Z' },
    { userId: 'u-admin', clientId: CLIENT, appName: 'App A', role: 'superadmin', status: 'active', hasAccess: true, requestedAt: '2026-06-01T00:00:00.000Z' },
  ],
  publicUsers: [
    { id: 'u-consent-only', email: 'first@example.com', name: 'First Person', status: 'active', emailVerified: true, createdAt: '2026-09-01T00:00:00.000Z', lastLoginAt: null, passwordHash: 'never-leaves', socialProviders: { google: { picture: 'https://img.example/first', accessToken: 'never-leaves' } } },
    { id: 'u-both', email: 'both@example.com', name: 'Both Records', status: 'active', emailVerified: false, createdAt: '2026-08-01T00:00:00.000Z', lastLoginAt: '2026-09-10T00:00:00.000Z', passwordHash: 'never-leaves' },
    { id: 'u-permission-only', email: 'pending@example.com', name: 'Pending (Regex).Name', status: 'disabled', createdAt: '2026-09-05T00:00:00.000Z', lastLoginAt: '2026-09-06T00:00:00.000Z' },
    { id: 'u-revoked', email: 'revoked@example.com', name: 'Revoked', createdAt: '2026-07-01T00:00:00.000Z' },
    { id: 'u-other-client', email: 'other@example.com', name: 'Other', createdAt: '2026-07-01T00:00:00.000Z' },
  ],
  users: [
    { id: 'u-admin', email: 'admin@example.com', name: 'Admin Account', status: 'active', createdAt: '2026-06-01T00:00:00.000Z', lastLoginAt: '2026-09-12T00:00:00.000Z', passwordHash: 'never-leaves' },
  ],
}

const { listAppUsers, escapeSearchTerm, APP_USERS_MAX_LIMIT } = await import('../lib/appUsers.mjs')

describe('listAppUsers', () => {
  test('lists the union of live consents and permission records, joined with the account', async () => {
    const result = await listAppUsers(makeDb(store), CLIENT)

    expect(result.total).toBe(4)
    expect(result.users.map((u) => u.id)).toEqual(['u-admin', 'u-both', 'u-permission-only', 'u-consent-only'])

    const consentOnly = result.users.find((u) => u.id === 'u-consent-only')
    expect(consentOnly).toEqual({
      id: 'u-consent-only',
      email: 'first@example.com',
      name: 'First Person',
      status: 'active',
      emailVerified: true,
      picture: 'https://img.example/first',
      createdAt: '2026-09-01T00:00:00.000Z',
      lastLoginAt: null,
      consent: { scope: 'openid email', grantedAt: '2026-09-01T00:00:00.000Z' },
      permission: null,
    })

    const both = result.users.find((u) => u.id === 'u-both')
    expect(both.consent.scope).toBe('openid profile email')
    expect(both.permission).toEqual({
      role: 'user',
      status: 'approved',
      hasAccess: true,
      requestedAt: '2026-08-01T00:00:00.000Z',
      grantedAt: '2026-08-01T00:00:00.000Z',
      lastAccessedAt: '2026-09-10T00:00:00.000Z',
    })

    const permissionOnly = result.users.find((u) => u.id === 'u-permission-only')
    expect(permissionOnly.consent).toBeNull()
    expect(permissionOnly.permission.status).toBe('pending')
    expect(permissionOnly.status).toBe('disabled')
  })

  test('normalizes legacy permission values and resolves admin-store accounts', async () => {
    const result = await listAppUsers(makeDb(store), CLIENT)
    const admin = result.users.find((u) => u.id === 'u-admin')
    expect(admin.email).toBe('admin@example.com')
    expect(admin.permission).toMatchObject({ role: 'admin', status: 'approved', hasAccess: true })
  })

  test('drops revoked consents, other clients and accounts that no longer exist', async () => {
    const result = await listAppUsers(makeDb(store), CLIENT)
    const ids = result.users.map((u) => u.id)
    expect(ids).not.toContain('u-revoked')
    expect(ids).not.toContain('u-other-client')
    expect(ids).not.toContain('u-deleted')
  })

  test('never carries a password hash or a provider payload', async () => {
    const result = await listAppUsers(makeDb(store), CLIENT)
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('never-leaves')
    expect(serialized).not.toContain('passwordHash')
    expect(serialized).not.toContain('accessToken')
  })

  test('searches email and name as a literal, case-insensitive substring', async () => {
    const byEmail = await listAppUsers(makeDb(store), CLIENT, { search: 'BOTH@' })
    expect(byEmail.users.map((u) => u.id)).toEqual(['u-both'])

    const byName = await listAppUsers(makeDb(store), CLIENT, { search: '(Regex).' })
    expect(byName.users.map((u) => u.id)).toEqual(['u-permission-only'])

    const asPattern = await listAppUsers(makeDb(store), CLIENT, { search: '.*' })
    expect(asPattern.total).toBe(0)
  })

  test('escapes every regex metacharacter', () => {
    expect(escapeSearchTerm('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe('a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o')
  })

  test('paginates and clamps the limit', async () => {
    const page1 = await listAppUsers(makeDb(store), CLIENT, { page: 1, limit: 3 })
    expect(page1.users).toHaveLength(3)
    expect(page1).toMatchObject({ total: 4, page: 1, pages: 2, limit: 3 })

    const page2 = await listAppUsers(makeDb(store), CLIENT, { page: '2', limit: '3' })
    expect(page2.users.map((u) => u.id)).toEqual(['u-consent-only'])

    const oversized = await listAppUsers(makeDb(store), CLIENT, { limit: 10000 })
    expect(oversized.limit).toBe(APP_USERS_MAX_LIMIT)

    const nonsense = await listAppUsers(makeDb(store), CLIENT, { page: 'x', limit: '-4' })
    expect(nonsense).toMatchObject({ page: 1, limit: 50 })
  })

  test('returns an empty page for a client nobody relates to', async () => {
    const result = await listAppUsers(makeDb(store), 'client-nobody')
    expect(result).toEqual({ users: [], total: 0, page: 1, pages: 0, limit: 50 })
  })
})

// WHAT: The route, with the token validation and the database mocked.
// WHY: The gate is the contract: the token's client must be the path's client and the
//      token must carry manage_permissions; the body shape is the listing's.
let tokenForRequest = null
jest.unstable_mockModule('../lib/oauth/middleware.mjs', () => ({
  requireOAuthToken: async (req, res, requiredScope) => {
    if (!tokenForRequest) {
      res.status(401).json({ error: 'unauthorized' })
      return null
    }
    const scopes = String(tokenForRequest.scope || '').split(' ')
    if (requiredScope && !scopes.includes(requiredScope)) {
      res.status(403).json({ error: 'insufficient_scope' })
      return null
    }
    return tokenForRequest
  },
  canManagePermissionsFor: (tokenData, targetClientId) => Boolean(tokenData?.clientId) && tokenData.clientId === targetClientId,
}))
jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => makeDb(store),
}))

const handler = (await import('../pages/api/apps/[clientId]/users.js')).default

function makeRes() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      res.headers[name] = value
    },
    status(code) {
      res.statusCode = code
      return res
    },
    json(payload) {
      res.body = payload
      return res
    },
  }
  return res
}

describe('GET /api/apps/[clientId]/users', () => {
  test('refuses a request with no token', async () => {
    tokenForRequest = null
    const res = makeRes()
    await handler({ method: 'GET', query: { clientId: CLIENT }, headers: {} }, res)
    expect(res.statusCode).toBe(401)
  })

  test('refuses a token without manage_permissions', async () => {
    tokenForRequest = { clientId: CLIENT, userId: null, scope: 'classscout:catalog.read' }
    const res = makeRes()
    await handler({ method: 'GET', query: { clientId: CLIENT }, headers: {} }, res)
    expect(res.statusCode).toBe(403)
    expect(res.body.error).toBe('insufficient_scope')
  })

  test("refuses a client asking for another client's users", async () => {
    tokenForRequest = { clientId: 'client-b', userId: null, scope: 'manage_permissions' }
    const res = makeRes()
    await handler({ method: 'GET', query: { clientId: CLIENT }, headers: {} }, res)
    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({ error: 'Forbidden', message: 'Client can only list its own users' })
  })

  test('lists its own users for a manage_permissions token', async () => {
    tokenForRequest = { clientId: CLIENT, userId: null, scope: 'manage_permissions' }
    const res = makeRes()
    await handler({ method: 'GET', query: { clientId: CLIENT, search: 'example.com', limit: '2' }, headers: {} }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ clientId: CLIENT, total: 4, page: 1, pages: 2, limit: 2 })
    expect(res.body.users).toHaveLength(2)
    expect(res.body.users[0]).toMatchObject({ id: 'u-admin', email: 'admin@example.com' })
  })

  test('answers 405 to anything but GET', async () => {
    tokenForRequest = { clientId: CLIENT, userId: null, scope: 'manage_permissions' }
    const res = makeRes()
    await handler({ method: 'POST', query: { clientId: CLIENT }, headers: {} }, res)
    expect(res.statusCode).toBe(405)
    expect(res.headers.Allow).toBe('GET')
  })
})
