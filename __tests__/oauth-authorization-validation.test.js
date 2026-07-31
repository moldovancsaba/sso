import { jest } from '@jest/globals'

const clients = []
const appPermissions = []

jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => ({
    collection(name) {
      if (name === 'oauthClients') {
        return {
          async findOne(query) {
            return clients.find((c) => c.client_id === query.client_id) || null
          },
        }
      }
      if (name === 'appPermissions') {
        return {
          async findOne(query) {
            return (
              appPermissions.find((p) => p.userId === query.userId && p.clientId === query.clientId) || null
            )
          },
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    },
  }),
}))

const { validateAuthorizationRequest, checkInternalClientAccess } = await import(
  '../lib/oauth/authorizationValidation.mjs'
)

function makeClient(overrides = {}) {
  return {
    client_id: 'real-client',
    status: 'active',
    require_pkce: false,
    redirect_uris: ['https://real-app.example.com/callback'],
    allowed_scopes: ['openid', 'profile', 'email'],
    internal: false,
    ...overrides,
  }
}

describe('validateAuthorizationRequest', () => {
  beforeEach(() => {
    clients.length = 0
    appPermissions.length = 0
  })

  // This is the exact gap that let /api/oauth/authorize/approve mint a real code for an
  // attacker-controlled redirect_uri: a real, active client_id paired with a redirect_uri
  // that was never registered to it.
  test('rejects a redirect_uri that is not registered to the client', async () => {
    clients.push(makeClient())

    const result = await validateAuthorizationRequest({
      client_id: 'real-client',
      redirect_uri: 'https://attacker.example.com/steal',
      scope: 'openid',
    })

    expect(result.valid).toBe(false)
    expect(result.redirectUriVerified).toBe(false)
    expect(result.error).toBe('invalid_request')
  })

  test('rejects a client_id that does not exist', async () => {
    const result = await validateAuthorizationRequest({
      client_id: 'nonexistent-client',
      redirect_uri: 'https://anything.example.com',
      scope: 'openid',
    })

    expect(result.valid).toBe(false)
    expect(result.redirectUriVerified).toBe(false)
    expect(result.error).toBe('invalid_client')
  })

  test('rejects a suspended client even with a registered redirect_uri', async () => {
    clients.push(makeClient({ status: 'suspended' }))

    const result = await validateAuthorizationRequest({
      client_id: 'real-client',
      redirect_uri: 'https://real-app.example.com/callback',
      scope: 'openid',
    })

    expect(result.valid).toBe(false)
    expect(result.error).toBe('unauthorized_client')
  })

  test('rejects a scope the client is not allowed to request', async () => {
    clients.push(makeClient({ allowed_scopes: ['openid'] }))

    const result = await validateAuthorizationRequest({
      client_id: 'real-client',
      redirect_uri: 'https://real-app.example.com/callback',
      scope: 'openid write:cards',
    })

    expect(result.valid).toBe(false)
    expect(result.redirectUriVerified).toBe(true)
    expect(result.error).toBe('invalid_scope')
  })

  test('requires code_challenge for a PKCE-required client', async () => {
    clients.push(makeClient({ require_pkce: true }))

    const result = await validateAuthorizationRequest({
      client_id: 'real-client',
      redirect_uri: 'https://real-app.example.com/callback',
      scope: 'openid',
    })

    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid_request')
    expect(result.error_description).toMatch(/code_challenge/)
  })

  test('accepts a legitimate request for a registered client/redirect_uri/scope', async () => {
    clients.push(makeClient())

    const result = await validateAuthorizationRequest({
      client_id: 'real-client',
      redirect_uri: 'https://real-app.example.com/callback',
      scope: 'openid profile',
    })

    expect(result.valid).toBe(true)
    expect(result.redirectUriVerified).toBe(true)
    expect(result.finalScope.split(' ')).toEqual(expect.arrayContaining(['openid', 'profile']))
  })
})

describe('checkInternalClientAccess', () => {
  beforeEach(() => {
    appPermissions.length = 0
  })

  test('allows any authenticated user for a non-internal client', async () => {
    const result = await checkInternalClientAccess({ client_id: 'public-client', internal: false }, 'some-user')
    expect(result.allowed).toBe(true)
  })

  // Without this check, POSTing straight to /api/oauth/authorize/approve with
  // client_id: 'sso-admin-dashboard' would mint a real code for that client for any
  // authenticated user, regardless of whether they'd ever been granted admin access.
  test('denies an internal client when the user has no permission record', async () => {
    const result = await checkInternalClientAccess(
      { client_id: 'sso-admin-dashboard', internal: true },
      'some-user'
    )
    expect(result.allowed).toBe(false)
    expect(result.error).toBe('access_denied')
  })

  test('denies an internal client when the permission is not approved', async () => {
    appPermissions.push({
      userId: 'some-user',
      clientId: 'sso-admin-dashboard',
      role: 'admin',
      status: 'pending',
      hasAccess: true,
    })
    const result = await checkInternalClientAccess(
      { client_id: 'sso-admin-dashboard', internal: true },
      'some-user'
    )
    expect(result.allowed).toBe(false)
  })

  test('allows an internal client when permission is approved with admin role', async () => {
    appPermissions.push({
      userId: 'some-user',
      clientId: 'sso-admin-dashboard',
      role: 'admin',
      status: 'approved',
      hasAccess: true,
    })
    const result = await checkInternalClientAccess(
      { client_id: 'sso-admin-dashboard', internal: true },
      'some-user'
    )
    expect(result.allowed).toBe(true)
  })
})
