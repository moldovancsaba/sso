/**
 * Contract tests for redirect_uris validation in registerClient().
 *
 * WHAT: Verifies a machine-only client registers without redirect URIs, while a
 *       redirect-based client still cannot.
 * WHY:  client_credentials has no browser leg (RFC 6749 s4.4). Requiring a redirect URI
 *       for every client made machine clients unregisterable, and the only workaround
 *       was inserting a fake URI that would then be a live redirect target.
 */

import { jest } from '@jest/globals'

const inserted = []

jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => ({
    collection() {
      return {
        async insertOne(doc) {
          inserted.push(doc)
          return { insertedId: 'test-id' }
        },
      }
    },
  }),
}))

const { registerClient } = await import('../lib/oauth/clients.mjs')

const base = {
  name: 'machine-client',
  owner_user_id: 'owner-uuid',
  allowed_scopes: ['manage_permissions'],
}

describe('registerClient redirect_uris validation', () => {
  test('registers a client_credentials-only client with no redirect URIs', async () => {
    const { client, client_secret } = await registerClient({
      ...base,
      redirect_uris: [],
      grant_types: ['client_credentials'],
    })

    expect(client.redirect_uris).toEqual([])
    expect(client.grant_types).toEqual(['client_credentials'])
    expect(client_secret).toEqual(expect.any(String))
  })

  test('still rejects an authorization_code client with no redirect URIs', async () => {
    await expect(
      registerClient({
        ...base,
        name: 'browser-client',
        redirect_uris: [],
        grant_types: ['authorization_code', 'refresh_token'],
      })
    ).rejects.toThrow('At least one redirect URI is required')
  })

  test('rejects a client with no owner', async () => {
    await expect(
      registerClient({ ...base, owner_user_id: undefined, grant_types: ['client_credentials'] })
    ).rejects.toThrow('Owner user ID is required')
  })
})
