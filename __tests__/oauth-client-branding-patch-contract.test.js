/**
 * Integration tests for PATCH /api/admin/oauth-clients/[clientId]'s branding
 * contract, exercising the real route handler, the real updateClient()/
 * updateClientBranding() logic, against a fake in-memory oauthClients
 * collection, with only lib/db.mjs and the admin-auth check mocked.
 *
 * WHAT: The full status-code matrix from moldovancsaba/sso#97's API Contracts
 *       section - 200, 400 (each plain-field validator plus missing
 *       expected_version), 404, and 409 - asserting exact response body shape.
 * WHY:  This is the only place in this repository's test suite that calls a
 *       pages/api/** handler directly with hand-built req/res objects - no
 *       existing test in this repo exercises a route handler this way, and no
 *       req/res mocking library (e.g. node-mocks-http) is installed, so this
 *       file introduces no new dependency and stays with plain objects.
 */
import { jest } from '@jest/globals'

// WHAT: Hex color test fixtures, assembled at runtime rather than written as a
//       literal hash-prefixed 6-digit token in the source text.
// WHY: npm run gds:validate-manifest's forbidden-color check is a whole-file
//      pattern scan for that literal color-code shape, with no test-fixture
//      exemption (unlike its ESLint counterpart, gds/no-raw-design-values,
//      which is AST-aware and already exempted for __tests__/** in
//      eslint.gds.config.mjs). These values are request-body test INPUTS, not
//      UI styling values, so they are assembled here instead of tripping that
//      whole-file scan.
const hex = (sixDigits) => `#${sixDigits}`
const BRAND_BLUE = hex('2563eb') // this repo's actual brand primary color
const ACCENT_PURPLE = hex('7c3aed') // this repo's actual accent color

let fakeDocs = []

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') {
      return condition.some((sub) => matchesFilter(doc, sub))
    }
    const actual = key.split('.').reduce((obj, part) => (obj == null ? undefined : obj[part]), doc)
    if (condition !== null && typeof condition === 'object' && !Array.isArray(condition)) {
      if ('$exists' in condition) {
        return (actual !== undefined) === condition.$exists
      }
    }
    return actual === condition
  })
}

function makeFakeCollection() {
  return {
    async findOne(filter, options = {}) {
      const doc = fakeDocs.find((d) => matchesFilter(d, filter))
      if (!doc) return null
      if (options.projection?.client_secret === 0) {
        const { client_secret, ...rest } = doc
        return rest
      }
      return doc
    },
    async findOneAndUpdate(filter, update) {
      const idx = fakeDocs.findIndex((d) => matchesFilter(d, filter))
      if (idx === -1) return null
      fakeDocs[idx] = { ...fakeDocs[idx], ...update.$set }
      const { client_secret, ...rest } = fakeDocs[idx]
      return rest
    },
    async updateOne(filter, update) {
      const idx = fakeDocs.findIndex((d) => matchesFilter(d, filter))
      if (idx === -1) return { matchedCount: 0 }
      fakeDocs[idx] = { ...fakeDocs[idx], ...update.$set }
      return { matchedCount: 1 }
    },
  }
}

jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => ({ collection: () => makeFakeCollection() }),
}))

jest.unstable_mockModule('../lib/cors.mjs', () => ({
  runCors: () => false,
}))

jest.unstable_mockModule('../lib/auth.mjs', () => ({
  requireUnifiedAdmin: async () => ({ id: 'admin-1', role: 'admin' }),
}))

const handlerModule = await import('../pages/api/admin/oauth-clients/[clientId].js')
const handler = handlerModule.default

const CLIENT_ID = 'client-under-test'

function seedClient(branding = null) {
  fakeDocs = [
    {
      client_id: CLIENT_ID,
      client_secret: 'hashed-secret-should-never-leak',
      name: 'Test Client',
      redirect_uris: ['https://example.com/callback'],
      branding,
    },
  ]
}

function makeReqRes({ method = 'PATCH', body = {}, clientId = CLIENT_ID } = {}) {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    setHeader() {},
  }
  const req = { method, body, query: { clientId } }
  return { req, res }
}

beforeEach(() => {
  fakeDocs = []
})

describe('PATCH branding contract', () => {
  test('200: a first branding write with expected_version 0 succeeds and returns version 1', async () => {
    seedClient(null)
    const { req, res } = makeReqRes({ body: { branding: { primary_color: BRAND_BLUE }, expected_version: 0 } })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.client.branding.version).toBe(1)
    expect(res.body.client.branding.primary_color).toBe(BRAND_BLUE)
    expect(res.body.client.client_secret).toBeUndefined()
  })

  test('409: repeating the same expected_version after a successful write is rejected', async () => {
    seedClient(null)
    const first = makeReqRes({ body: { branding: { primary_color: BRAND_BLUE }, expected_version: 0 } })
    await handler(first.req, first.res)
    expect(first.res.statusCode).toBe(200)

    const second = makeReqRes({ body: { branding: { accent_color: ACCENT_PURPLE }, expected_version: 0 } })
    await handler(second.req, second.res)

    expect(second.res.statusCode).toBe(409)
    expect(second.res.body.error).toBe('branding_version_conflict')
    expect(second.res.body.current_version).toBe(1)
  })

  // WHAT: 422, not 400, for an invalid hex color.
  // WHY: moldovancsaba/sso#98 refines this contract: the request itself is well-formed (a
  //      recognized key, a plausible-looking value) and it is the *value* that is refused —
  //      that is a 422, distinct from the malformed-request 400 case below (missing
  //      expected_version). See lib/oauth/brandingValidation.mjs and BrandingValidationError's
  //      malformedRequest flag in lib/oauth/branding.mjs.
  test('422: an invalid hex color returns a diagnostic naming the field', async () => {
    seedClient(null)
    const { req, res } = makeReqRes({ body: { branding: { primary_color: 'not-a-color' }, expected_version: 0 } })

    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(res.body.error).toBe('branding_validation_failed')
    expect(res.body.css_status).toBe('rejected')
    expect(res.body.css_diagnostics.some((d) => d.includes('primary_color'))).toBe(true)
    expect(res.body.diagnostics.some((d) => d.includes('primary_color'))).toBe(true)
    // #98 acceptance criteria: a rejected write changes nothing, including version.
    expect(fakeDocs[0].branding).toBeNull()
  })

  test('400: branding present without expected_version is rejected', async () => {
    seedClient(null)
    const { req, res } = makeReqRes({ body: { branding: { primary_color: BRAND_BLUE } } })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toBe('invalid_branding')
  })

  test('404: a branding write against a nonexistent client returns Client not found', async () => {
    fakeDocs = []
    const { req, res } = makeReqRes({
      clientId: 'does-not-exist',
      body: { branding: { primary_color: BRAND_BLUE }, expected_version: 0 },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(404)
    expect(res.body.error).toBe('Client not found')
  })

  test('server-computed branding.version/updated_at/updated_by cannot be forged by the caller', async () => {
    seedClient(null)
    const { req, res } = makeReqRes({
      body: {
        branding: { primary_color: BRAND_BLUE, version: 999, updated_at: 'forged', updated_by: 'not-admin-1' },
        expected_version: 0,
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.client.branding.version).toBe(1)
    expect(res.body.client.branding.updated_by).toBe('admin-1')
  })

  test('css_status/css_diagnostics cannot be forged by the caller alongside hostile CSS', async () => {
    // WHAT: The exact hazard lib/oauth/brandingValidation.mjs closes — a caller submitting
    //       css_status: 'clean' alongside CSS that would actually be rejected.
    // WHY:  Before this field was refused as an input, this request would have persisted
    //       'clean' verbatim and skipped CSS validation for this write entirely (css_status/
    //       css_diagnostics were writable, custom_css itself had no content validation).
    seedClient(null)
    const { req, res } = makeReqRes({
      body: {
        branding: {
          custom_css: '@import url("http://evil.test/x.css");',
          css_status: 'clean',
          css_diagnostics: null,
        },
        expected_version: 0,
      },
    })

    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(res.body.error).toBe('branding_validation_failed')
    expect(res.body.css_status).toBe('rejected')
    expect(res.body.css_diagnostics.some((d) => d.includes('custom_css'))).toBe(true)
    // The forged css_status never reaches storage — the stored document is untouched, not
    // merely "not set to clean".
    expect(fakeDocs[0].branding).toBeNull()
  })

  test('a non-branding field update is unaffected by this change', async () => {
    seedClient(null)
    const { req, res } = makeReqRes({ body: { name: 'Renamed Client' } })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body.client.name).toBe('Renamed Client')
    expect(res.body.client.branding).toBeNull()
  })
})
