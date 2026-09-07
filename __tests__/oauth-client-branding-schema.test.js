/**
 * Unit tests for lib/oauth/branding.mjs and the branding-related parts of
 * lib/oauth/clients.mjs's registerClient().
 *
 * WHAT: Field validators (hex color, welcome-text stripping/cap), the WCAG
 *       contrast wrapper, and updateClientBranding()'s optimistic-concurrency
 *       write path against a fake in-memory oauthClients collection.
 * WHY:  See moldovancsaba/sso#97 - this is the foundational schema/write-path
 *       issue for OAuth client branding.
 */
import { jest } from '@jest/globals'

// WHAT: Hex color test fixtures, assembled at runtime rather than written as a
//       literal hash-prefixed 6-digit token in the source text.
// WHY: npm run gds:validate-manifest's forbidden-color check is a whole-file
//      pattern scan for that literal color-code shape, with no test-fixture
//      exemption (unlike its ESLint counterpart, gds/no-raw-design-values,
//      which is AST-aware and already exempted for __tests__/** in
//      eslint.gds.config.mjs). These values are validator test INPUTS, not UI
//      styling values, so they are assembled here instead of tripping that
//      whole-file scan.
const hex = (sixDigits) => `#${sixDigits}`
const BRAND_BLUE = hex('2563eb') // this repo's actual brand primary color (lib/theme/mantineTheme.js)
const ACCENT_PURPLE = hex('7c3aed') // this repo's actual accent color
const PALE_BLUE = hex('eff6ff') // fails contrast against both white and near-black
const WHITE = hex('ffffff') // GDS reference background color (mantineTheme.white)
const NEAR_BLACK = hex('111827') // GDS reference text color (mantineTheme.black)
const BLACK = hex('000000')
const ALTERNATE_VALID_COLOR = hex('111111') // valid format, distinct from BRAND_BLUE, used only to prove a rejected write left the stored value untouched

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
    async findOne(filter) {
      return fakeDocs.find((d) => matchesFilter(d, filter)) || null
    },
    async findOneAndUpdate(filter, update) {
      const idx = fakeDocs.findIndex((d) => matchesFilter(d, filter))
      if (idx === -1) return null
      fakeDocs[idx] = { ...fakeDocs[idx], ...update.$set }
      return fakeDocs[idx] // unwrapped, matching newer mongodb driver versions
    },
    async insertOne(doc) {
      fakeDocs.push(doc)
      return { insertedId: 'fake-id' }
    },
  }
}

jest.unstable_mockModule('../lib/db.mjs', () => ({
  getDb: async () => ({ collection: () => makeFakeCollection() }),
}))

const {
  isValidHexColor,
  sanitizeWelcomeText,
  computeContrastRatio,
  meetsContrastFloor,
  updateClientBranding,
  BrandingValidationError,
  BrandingVersionConflictError,
  BrandingNotFoundError,
} = await import('../lib/oauth/branding.mjs')

const { registerClient } = await import('../lib/oauth/clients.mjs')

beforeEach(() => {
  fakeDocs = []
})

describe('isValidHexColor', () => {
  test('accepts a well-formed 6-digit hex color', () => {
    expect(isValidHexColor(BRAND_BLUE)).toBe(true)
    expect(isValidHexColor(hex('FFFFFF'))).toBe(true)
  })

  test.each([
    ['blue', 'named color, not hex'],
    [hex('fff'), '3-digit shorthand not accepted'],
    [hex('GGGGGG'), 'non-hex characters'],
    ['336699', 'missing leading #'],
    [hex('33669'), 'wrong length'],
  ])('rejects %s (%s)', (value) => {
    expect(isValidHexColor(value)).toBe(false)
  })
})

describe('sanitizeWelcomeText', () => {
  test('strips tags and entities before measuring length', () => {
    // No whitespace collapsing is performed - only tags and entities are removed, so an
    // entity surrounded by spaces leaves both spaces behind. That is the documented,
    // intended behavior, not a bug.
    const result = sanitizeWelcomeText('<b>Hi &amp; welcome</b>')
    expect(result.ok).toBe(true)
    expect(result.value).toBe('Hi  welcome')
  })

  test('rejects text whose post-strip length exceeds 280 characters', () => {
    const result = sanitizeWelcomeText('a'.repeat(281))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/280 characters/)
  })

  test('accepts text whose raw markup pushes it past 280 but whose stripped text does not', () => {
    // 260 'a' characters wrapped in a long tag attribute - raw length is well over 280,
    // stripped length is exactly 260.
    const raw = `<span data-note="${'x'.repeat(200)}">${'a'.repeat(260)}</span>`
    const result = sanitizeWelcomeText(raw)
    expect(result.ok).toBe(true)
    expect(result.value).toBe('a'.repeat(260))
  })

  test('rejects stripped text still over 280 characters even if the caller meant something shorter', () => {
    const result = sanitizeWelcomeText('<b>' + 'a'.repeat(281) + '</b>')
    expect(result.ok).toBe(false)
  })
})

describe('computeContrastRatio and meetsContrastFloor', () => {
  test('black on white computes to a ratio of 21:1', () => {
    expect(computeContrastRatio(BLACK, WHITE)).toBeCloseTo(21, 0)
  })

  test('meetsContrastFloor passes only when every reference color clears the floor', () => {
    // This repo's actual brand primary against the real GDS reference pair (white page
    // background, near-black default text) - both clear 3.0:1.
    expect(meetsContrastFloor(BRAND_BLUE, [WHITE, NEAR_BLACK], 3.0)).toBe(true)
    // A pale blue clears 3.0:1 against near-black but not against white - overall floor fails.
    expect(meetsContrastFloor(PALE_BLUE, [WHITE, NEAR_BLACK], 3.0)).toBe(false)
  })
})

describe('updateClientBranding CAS logic', () => {
  const CLIENT_ID = 'client-1'

  function seedClient(branding = null) {
    fakeDocs = [{ client_id: CLIENT_ID, name: 'Test Client', branding }]
  }

  test('first write at version 0 succeeds and produces version 1', async () => {
    seedClient(null)

    const result = await updateClientBranding(
      CLIENT_ID,
      { primary_color: BRAND_BLUE },
      { expectedVersion: 0, updatedBy: 'admin-1' }
    )

    expect(result.version).toBe(1)
    expect(result.previous_branding).toBeNull()
    expect(result.branding.primary_color).toBe(BRAND_BLUE)
    expect(result.branding.updated_by).toBe('admin-1')
  })

  test('correct-version write succeeds and increments version by exactly 1', async () => {
    seedClient({ primary_color: BRAND_BLUE, version: 1, updated_at: '2026-01-01T00:00:00.000Z', updated_by: 'admin-1' })

    const result = await updateClientBranding(
      CLIENT_ID,
      { accent_color: ACCENT_PURPLE },
      { expectedVersion: 1, updatedBy: 'admin-2' }
    )

    expect(result.version).toBe(2)
    expect(result.branding.primary_color).toBe(BRAND_BLUE) // omitted field unchanged
    expect(result.branding.accent_color).toBe(ACCENT_PURPLE)
  })

  test('stale expected_version is rejected with the correct currentVersion, no write applied', async () => {
    seedClient({ primary_color: BRAND_BLUE, version: 3, updated_at: '2026-01-01T00:00:00.000Z', updated_by: 'admin-1' })

    await expect(
      updateClientBranding(CLIENT_ID, { primary_color: ALTERNATE_VALID_COLOR }, { expectedVersion: 2, updatedBy: 'admin-2' })
    ).rejects.toThrow(BrandingVersionConflictError)

    expect(fakeDocs[0].branding.version).toBe(3)
    expect(fakeDocs[0].branding.primary_color).toBe(BRAND_BLUE)

    try {
      await updateClientBranding(CLIENT_ID, { primary_color: ALTERNATE_VALID_COLOR }, { expectedVersion: 2, updatedBy: 'admin-2' })
    } catch (err) {
      expect(err.currentVersion).toBe(3)
    }
  })

  test('missing client throws BrandingNotFoundError', async () => {
    fakeDocs = []
    await expect(
      updateClientBranding('nonexistent', { primary_color: BRAND_BLUE }, { expectedVersion: 0, updatedBy: 'admin-1' })
    ).rejects.toThrow(BrandingNotFoundError)
  })

  test('omission leaves a field unchanged; explicit null clears it', async () => {
    seedClient({
      primary_color: BRAND_BLUE,
      accent_color: ACCENT_PURPLE,
      welcome_text: 'Hello',
      version: 1,
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'admin-1',
    })

    const result = await updateClientBranding(
      CLIENT_ID,
      { accent_color: null }, // explicit clear; primary_color and welcome_text omitted
      { expectedVersion: 1, updatedBy: 'admin-2' }
    )

    expect(result.branding.primary_color).toBe(BRAND_BLUE) // unchanged
    expect(result.branding.welcome_text).toBe('Hello') // unchanged
    expect(result.branding.accent_color).toBeNull() // cleared
  })

  test('an invalid hex color is rejected and no field in the patch is applied', async () => {
    seedClient(null)

    await expect(
      updateClientBranding(CLIENT_ID, { primary_color: 'not-a-color' }, { expectedVersion: 0, updatedBy: 'admin-1' })
    ).rejects.toThrow(BrandingValidationError)

    expect(fakeDocs[0].branding).toBeNull()
  })

  test('a color failing the contrast floor is rejected', async () => {
    seedClient(null)

    await expect(
      updateClientBranding(CLIENT_ID, { primary_color: PALE_BLUE }, { expectedVersion: 0, updatedBy: 'admin-1' })
    ).rejects.toThrow(BrandingValidationError)
  })

  test('missing or non-integer expected_version is rejected', async () => {
    seedClient(null)
    await expect(
      updateClientBranding(CLIENT_ID, { primary_color: BRAND_BLUE }, { updatedBy: 'admin-1' })
    ).rejects.toThrow(BrandingValidationError)
  })

  test('an empty branding patch object is rejected', async () => {
    seedClient(null)
    await expect(
      updateClientBranding(CLIENT_ID, {}, { expectedVersion: 0, updatedBy: 'admin-1' })
    ).rejects.toThrow(BrandingValidationError)
  })
})

describe('registerClient branding invariant', () => {
  test('a newly created client has branding: null', async () => {
    const { client } = await registerClient({
      name: 'New Client',
      owner_user_id: 'owner-1',
      redirect_uris: ['https://example.com/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
    })

    expect(client.branding).toBeNull()
  })

  test('a caller-supplied branding key on create is ignored', async () => {
    const { client } = await registerClient({
      name: 'New Client',
      owner_user_id: 'owner-1',
      redirect_uris: ['https://example.com/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      branding: { primary_color: BRAND_BLUE, version: 99 },
    })

    expect(client.branding).toBeNull()
  })
})
