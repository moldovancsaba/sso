/**
 * Contract tests for machine-token audience resolution.
 *
 * WHAT: Verifies that a client_credentials token's `aud` names the RESOURCE it is for,
 *       that a token can never span two resources, and that user-scope tokens are unchanged.
 * WHY:  `aud` was hard-wired to the calling client's own id, so a resource server had no
 *       standards-conformant way to reject a token minted for a different service - every
 *       token OpenClaw obtains read `aud: <openclaw-client-id>` whether it was meant for
 *       classscout or for salesleadgenerator (RFC 9068 s4).
 */

import { generateKeyPairSync } from 'crypto'
import {
  RESOURCE_SCOPE_PREFIXES,
  resolveMachineAudience,
  SCOPE_DEFINITIONS,
} from '../lib/oauth/scopes.mjs'

describe('RESOURCE_SCOPE_PREFIXES', () => {
  test('is derived from the scope table, not hand-listed', () => {
    expect(RESOURCE_SCOPE_PREFIXES.has('classscout')).toBe(true)
    expect(RESOURCE_SCOPE_PREFIXES.has('management')).toBe(true)
  })

  test('excludes manage_permissions, which is machine-only but names no resource', () => {
    expect(SCOPE_DEFINITIONS.manage_permissions.machineOnly).toBe(true)
    expect(RESOURCE_SCOPE_PREFIXES.has('manage_permissions')).toBe(false)
  })

  test('excludes user scopes whose prefix is a verb, not a system', () => {
    // read:cards is a narimato user scope - `read` must never become an audience.
    expect(RESOURCE_SCOPE_PREFIXES.has('read')).toBe(false)
    expect(RESOURCE_SCOPE_PREFIXES.has('write')).toBe(false)
  })

  test('every resource scope is machineOnly', () => {
    // A user-consentable resource scope would let one end user mint a token aimed at a
    // whole backend service, which is the escalation machineOnly exists to prevent.
    for (const def of Object.values(SCOPE_DEFINITIONS)) {
      if (def.id.includes(':') && RESOURCE_SCOPE_PREFIXES.has(def.id.split(':')[0])) {
        expect(def.machineOnly).toBe(true)
      }
    }
  })
})

describe('resolveMachineAudience', () => {
  test('names the resource its scopes name', () => {
    expect(resolveMachineAudience(['classscout:ingest.write'])).toEqual({
      ok: true,
      audience: 'classscout',
    })
  })

  test('collapses several scopes on one resource to that one audience', () => {
    expect(resolveMachineAudience(['classscout:ingest.write', 'classscout:catalog.read'])).toEqual({
      ok: true,
      audience: 'classscout',
    })
  })

  test('refuses a token spanning two resources', () => {
    const result = resolveMachineAudience(['classscout:ingest.write', 'management:ingest.write'])

    expect(result.ok).toBe(false)
    expect(result.resources.sort()).toEqual(['classscout', 'management'])
  })

  test('returns no audience for scopes that name no resource', () => {
    // manage_permissions keeps the previous behaviour: aud falls back to the client id.
    expect(resolveMachineAudience(['manage_permissions'])).toEqual({ ok: true, audience: null })
  })

  test('ignores user scopes when deriving the resource', () => {
    expect(resolveMachineAudience(['read:cards', 'classscout:ingest.write'])).toEqual({
      ok: true,
      audience: 'classscout',
    })
  })

  test('an empty scope list names no resource', () => {
    expect(resolveMachineAudience([])).toEqual({ ok: true, audience: null })
  })
})

describe('generateAccessToken audience claim', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })

  process.env.JWT_PRIVATE_KEY = privateKey
  process.env.JWT_PUBLIC_KEY = publicKey

  test('stamps the resource as aud while client_id stays the caller', async () => {
    const { generateAccessToken } = await import('../lib/oauth/tokens.mjs')
    const jwt = (await import('jsonwebtoken')).default

    const { token } = await generateAccessToken({
      userId: null,
      clientId: 'openclaw-worker',
      scope: 'classscout:ingest.write',
      audience: 'classscout',
    })

    const decoded = jwt.decode(token)

    // The resource server checks aud; the caller is still identifiable via client_id.
    expect(decoded.aud).toBe('classscout')
    expect(decoded.client_id).toBe('openclaw-worker')
    expect(decoded.sub).toBeUndefined()
  })

  test('falls back to the client id when no audience is given', async () => {
    const { generateAccessToken } = await import('../lib/oauth/tokens.mjs')
    const jwt = (await import('jsonwebtoken')).default

    const { token } = await generateAccessToken({
      userId: null,
      clientId: 'agent-client',
      scope: 'manage_permissions',
    })

    expect(jwt.decode(token).aud).toBe('agent-client')
  })
})
