import { jest } from '@jest/globals'

const docs = []

jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => ({
    collection() {
      return {
        async createIndex() {},
        find(query) {
          return {
            sort() {
              return {
                async toArray() {
                  return docs.filter(doc => doc.orgId === query.orgId)
                },
              }
            },
          }
        },
        async findOne(query) {
          return docs.find(doc => doc.orgId === query.orgId && (doc.id === query.id || doc.slug === query.slug)) || null
        },
        async insertOne(doc) {
          docs.push(structuredClone(doc))
          return { insertedId: doc.id }
        },
        async updateOne(query, update) {
          const index = docs.findIndex(doc => doc.orgId === query.orgId && doc.id === query.id)
          if (index >= 0) {
            docs[index] = structuredClone(update.$set)
          }
        },
      }
    },
  }),
}))

const { createEnterpriseConnection, updateEnterpriseConnection } = await import('../lib/enterpriseConnections.mjs')

describe('enterprise connection groundwork', () => {
  beforeEach(() => {
    docs.length = 0
  })

  test('creates normalized OIDC enterprise connections', async () => {
    const connection = await createEnterpriseConnection('org-1', {
      name: 'Acme Workforce',
      type: 'oidc',
      status: 'active',
      domains: ['Acme.com', 'acme.com', 'login.acme.com'],
      claimMapping: {
        email: 'email',
        given_name: 'given_name',
        ignored: '',
      },
      scim: {
        enabled: true,
        baseUrl: 'https://scim.acme.com',
        mode: 'push',
      },
    })

    expect(connection.orgId).toBe('org-1')
    expect(connection.slug).toBe('acme-workforce')
    expect(connection.type).toBe('oidc')
    expect(connection.status).toBe('active')
    expect(connection.domains).toEqual(['acme.com', 'login.acme.com'])
    expect(connection.claimMapping).toEqual({
      email: 'email',
      given_name: 'given_name',
    })
    expect(connection.scim).toEqual({
      enabled: true,
      baseUrl: 'https://scim.acme.com',
      mode: 'push',
      bearerTokenLastRotatedAt: null,
    })
  })

  test('updates connection status and preserves existing fields', async () => {
    const created = await createEnterpriseConnection('org-2', {
      name: 'Beta',
      type: 'saml',
      status: 'draft',
    })

    const updated = await updateEnterpriseConnection('org-2', created.id, {
      status: 'disabled',
      domains: ['beta.example.com'],
    })

    expect(updated.name).toBe('Beta')
    expect(updated.type).toBe('saml')
    expect(updated.status).toBe('disabled')
    expect(updated.domains).toEqual(['beta.example.com'])
  })
})
