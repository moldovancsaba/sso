/**
 * Contract tests for the client_credentials (machine-to-machine) token path.
 *
 * WHAT: Verifies that an access token can be issued with no user context, that a
 *       user-bound token is unaffected, and that such a token can never satisfy a
 *       user-identity check downstream.
 * WHY:  pages/api/oauth/token.js calls generateAccessToken({ userId: null, ... }).
 *       A truthy-userId guard previously made every client_credentials request throw,
 *       which the token endpoint's catch surfaced as an HTTP 500 server_error.
 */

import { jest } from '@jest/globals'
import { generateKeyPairSync } from 'crypto'

// WHAT: Real RSA keypair for this test run only.
// WHY: generateAccessToken signs with RS256 and reads its key material from env.
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

process.env.JWT_PRIVATE_KEY = privateKey
process.env.JWT_PUBLIC_KEY = publicKey

// WHAT: Stub the database so revocation lookups never touch a real cluster.
// WHY: verifyAccessToken() consults refreshTokens to check for revocation.
jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => ({
    collection() {
      return { async findOne() { return null } }
    },
  }),
}))

const { generateAccessToken, verifyAccessToken } = await import('../lib/oauth/tokens.mjs')
const { validateAccessToken, hasScope, canManagePermissionsFor } = await import(
  '../lib/oauth/middleware.mjs'
)

describe('client_credentials access tokens', () => {
  test('issues a token when userId is null', async () => {
    const result = await generateAccessToken({
      userId: null,
      clientId: 'agent-client',
      scope: 'manage_permissions',
    })

    expect(result.token).toEqual(expect.any(String))
    expect(result.jti).toEqual(expect.any(String))
  })

  test('omits the sub claim for machine tokens', async () => {
    const { token } = await generateAccessToken({
      userId: null,
      clientId: 'agent-client',
      scope: 'manage_permissions',
    })

    const decoded = await verifyAccessToken(token)

    expect(decoded.sub).toBeUndefined()
    expect(decoded.client_id).toBe('agent-client')
    expect(decoded.aud).toBe('agent-client')
    expect(decoded.scope).toBe('manage_permissions')
    expect(decoded.token_type).toBe('access_token')
  })

  test('a machine token resolves to a null userId and cannot impersonate a user', async () => {
    const { token } = await generateAccessToken({
      userId: null,
      clientId: 'agent-client',
      scope: 'manage_permissions',
    })

    const tokenData = await validateAccessToken({
      headers: { authorization: `Bearer ${token}` },
    })

    expect(tokenData.userId).toBeNull()
    expect(tokenData.clientId).toBe('agent-client')
    expect(hasScope(tokenData, 'manage_permissions')).toBe(true)
    expect(canManagePermissionsFor(tokenData, 'agent-client')).toBe(true)
    // WHAT: a machine token must not be able to manage another client's records.
    expect(canManagePermissionsFor(tokenData, 'someone-else')).toBe(false)
  })

  test('still sets sub for user-bound tokens', async () => {
    const { token } = await generateAccessToken({
      userId: 'user-uuid-123',
      clientId: 'agent-client',
      scope: 'openid profile',
    })

    const decoded = await verifyAccessToken(token)
    expect(decoded.sub).toBe('user-uuid-123')

    const tokenData = await validateAccessToken({
      headers: { authorization: `Bearer ${token}` },
    })
    expect(tokenData.userId).toBe('user-uuid-123')
  })

  test('still rejects a missing clientId or scope', async () => {
    await expect(
      generateAccessToken({ userId: null, clientId: null, scope: 'manage_permissions' })
    ).rejects.toThrow('clientId and scope are required')

    await expect(
      generateAccessToken({ userId: null, clientId: 'agent-client', scope: '' })
    ).rejects.toThrow('clientId and scope are required')
  })
})

describe('manage_permissions is machine-only', () => {
  test('is a registered scope so client_credentials and OIDC discovery can use it', async () => {
    const { SCOPE_DEFINITIONS, ALL_SCOPE_IDS } = await import('../lib/oauth/scopes.mjs')

    expect(ALL_SCOPE_IDS).toContain('manage_permissions')
    expect(SCOPE_DEFINITIONS.manage_permissions.machineOnly).toBe(true)
  })

  test('is rejected on the interactive /authorize path', async () => {
    const { validateScopes } = await import('../lib/oauth/scopes.mjs')

    // WHAT: A user-bound token must never carry manage_permissions.
    // WHY: Its bearer can write permission records for every user of the client, so a
    //      single end user consenting to it would gain control over all the others.
    const result = validateScopes('openid profile manage_permissions')

    expect(result.valid).toBe(false)
    expect(result.invalid).toContain('manage_permissions')
  })

  test('does not disturb ordinary interactive scopes', async () => {
    const { validateScopes } = await import('../lib/oauth/scopes.mjs')

    const result = validateScopes('openid profile email offline_access')

    expect(result.valid).toBe(true)
    expect(result.invalid).toHaveLength(0)
  })
})
