/**
 * lib/oauth/branding.mjs — OAuth client branding: validation and the single
 * versioned write path onto oauthClients.branding.
 *
 * WHAT: Field validators for the branding sub-document (hex color format, WCAG
 *       contrast, welcome-text length/tag-stripping) plus updateClientBranding(),
 *       the one function that ever writes oauthClients.branding, using optimistic
 *       concurrency (expected_version) so concurrent admin edits cannot silently
 *       clobber one another.
 * WHY:  Isolated from lib/oauth/clients.mjs's flat allowedFields loop because a
 *       nested, partially-updatable, versioned sub-document needs different merge
 *       semantics (omission = unchanged, explicit null = clear) than a flat
 *       whole-value $set. Exported as a stable, single import surface so later
 *       work (CSS validation, the upload pipeline, and the history/revert
 *       collection) has exactly one write path to call instead of reaching into
 *       updateClient()'s internals.
 *
 * Trust boundary: logo_asset_id and custom_css are accepted here as already
 * validated by their own pipelines (asset upload content-checks; CSS-safety
 * validation) before ever reaching this module. This module performs only
 * structural checks on them (string-or-null; enum membership for css_status;
 * array-of-strings-or-null for css_diagnostics) — it never inspects their
 * content. See the PATCH route handler for the admin-role gate that is the only
 * control preventing a caller from bypassing those upstream pipelines by hand.
 */
import { getDb } from '../db.mjs'
import { checkGdsContrast, getGdsContrastRatio } from '@sovereignsquad/gds-theme/server'
import { mantineTheme } from '../theme/mantineTheme.js'
import { resolveThemeContrastColors, validateBranding, UI_COMPONENT_THRESHOLD } from './brandingValidation.mjs'

export const DEFAULT_BRANDING = {
  logo_asset_id: null,
  primary_color: null,
  accent_color: null,
  welcome_text: null,
  custom_css: null,
  css_status: null,
  css_diagnostics: null,
}

const PLAIN_FIELDS = Object.keys(DEFAULT_BRANDING)
const WELCOME_TEXT_MAX_LENGTH = 280

// WHAT: Both brand-accent fields are gated at the same floor against both
//       reference colors.
// WHY:  Finalized decision names two WCAG thresholds (4.5:1 normal text, 3:1
//       large text/UI components) without saying which applies here.
//       primary_color/accent_color are used only as decorative/interactive brand
//       accents (buttons, borders, links) — never as small body text, since
//       welcome_text always renders in the pre-existing GDS default text color —
//       so the large-text/UI-component floor is the correct one. If a future
//       change ever uses either color as small body text, that decision must
//       come back through this constant and tighten it for that specific case.
// Re-pointed at the shared constant so the floor is stated exactly once in the codebase.
const CONTRAST_FLOOR = UI_COMPONENT_THRESHOLD

export class BrandingValidationError extends Error {
  /**
   * @param {string[]} diagnostics
   * @param {Object} [options]
   * @param {boolean} [options.malformedRequest] - true when the request itself is
   *   ill-shaped (missing expected_version, an empty patch) rather than a submitted value
   *   being refused. The PATCH handler maps this to 400; a value rejection maps to 422 with
   *   css_status/css_diagnostics for the admin UI. See pages/api/admin/oauth-clients/[clientId].js.
   */
  constructor(diagnostics, { malformedRequest = false } = {}) {
    super('Branding validation failed')
    this.name = 'BrandingValidationError'
    this.diagnostics = diagnostics
    this.malformedRequest = malformedRequest
  }
}

export class BrandingVersionConflictError extends Error {
  constructor(currentVersion) {
    super('Branding version conflict')
    this.name = 'BrandingVersionConflictError'
    this.currentVersion = currentVersion
  }
}

export class BrandingNotFoundError extends Error {
  constructor() {
    super('Client not found')
    this.name = 'BrandingNotFoundError'
  }
}

/**
 * isValidHexColor
 * WHAT: Structural check only — 6-digit hex with a leading #.
 * WHY: Also a security control, not only a data-quality one: a strict format
 *      keeps a crafted string (e.g. "red; background-image:url(javascript:...)")
 *      from ever reaching a future inline-style interpolation of these values.
 */
export function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

/**
 * sanitizeWelcomeText
 * WHAT: Strips HTML tags and named/numeric entities, then caps the result at
 *       280 characters.
 * WHY: Defense in depth only — the render path must still HTML-escape this
 *      value at output time regardless; this is not a substitute for output
 *      encoding. The cap applies to the post-strip plain text, not the raw
 *      input, so markup-heavy input can still fit even when its raw length
 *      exceeds 280, and stripped text that is still too long is rejected
 *      rather than silently truncated.
 */
export function sanitizeWelcomeText(value) {
  const withoutTags = value.replace(/<[^>]*>/g, '')
  const withoutEntities = withoutTags.replace(/&#x?[0-9a-fA-F]+;|&[a-zA-Z][a-zA-Z0-9]*;/g, '')
  const stripped = withoutEntities.trim()
  if (stripped.length > WELCOME_TEXT_MAX_LENGTH) {
    return { ok: false, error: `welcome_text exceeds ${WELCOME_TEXT_MAX_LENGTH} characters after stripping markup` }
  }
  return { ok: true, value: stripped }
}

/**
 * computeContrastRatio
 * WHAT: Thin wrapper over @sovereignsquad/gds-theme's getGdsContrastRatio.
 * WHY: Reuses the design system's own tested WCAG luminance/ratio math instead
 *      of a second, hand-rolled implementation — GDS already publishes and
 *      tests this exact function for its own token-contrast gating.
 */
export function computeContrastRatio(hexA, hexB) {
  return getGdsContrastRatio(hexA, hexB)
}

/**
 * meetsContrastFloor
 * WHAT: True only if hex clears the given ratio against every reference color.
 */
export function meetsContrastFloor(hex, referenceHexes, floor) {
  return referenceHexes.every((ref) => computeContrastRatio(hex, ref) >= floor)
}

/**
 * getGdsReferenceColors
 * WHAT: The background/text colors admin-supplied brand colors are contrast-
 *       checked against.
 * WHY: mantineTheme.white and mantineTheme.black are the two Mantine-standard
 *      tokens this theme actually resolves to (confirmed at runtime against the
 *      installed @sovereignsquad/gds-theme version — Mantine's own light-mode
 *      page-canvas and default body-text tokens respectively) rather than
 *      assumed from type definitions alone, since the resolved theme shape is
 *      not vendored into this repository for static inspection. Run
 *      `node -e "import('./lib/theme/mantineTheme.js').then(({mantineTheme}) => console.log(mantineTheme.white, mantineTheme.black))"`
 *      to see the current resolved values.
 */
export function getGdsReferenceColors() {
  // Delegates so brandingValidation.mjs stays the single place that reads the theme; a
  // second literal here could silently gate against a colour the product stopped rendering.
  const { background, text } = resolveThemeContrastColors()
  return [background, text]
}

function validateField(key, value) {
  switch (key) {
    case 'primary_color':
    case 'accent_color':
      if (!isValidHexColor(value)) {
        return { ok: false, error: `${key} must be a 6-digit hex color starting with #` }
      }
      return { ok: true, value }
    case 'welcome_text': {
      if (typeof value !== 'string') {
        return { ok: false, error: 'welcome_text must be a string or null' }
      }
      return sanitizeWelcomeText(value)
    }
    case 'logo_asset_id':
    case 'custom_css':
      if (typeof value !== 'string') {
        return { ok: false, error: `${key} must be a string or null` }
      }
      return { ok: true, value }
    case 'css_status':
    case 'css_diagnostics':
      // WHAT: Refused as inputs.
      // WHY: These are the *verdict* validateBranding() reaches about custom_css, computed
      //      below from the CSS itself. Accepting them from the request body let a caller
      //      PATCH `css_status: 'clean'` alongside hostile CSS and self-certify it, which
      //      is precisely the gate this field exists to record.
      return { ok: false, error: `${key} is server-computed and cannot be set directly` }
    default:
      return { ok: false, error: `${key} is not a recognized branding field` }
  }
}

/**
 * updateClientBranding
 * WHAT: The single function that ever writes oauthClients.branding. Validates,
 *       merges with omission-vs-explicit-null semantics, atomically
 *       compare-and-swaps on branding.version, and returns a before/after
 *       snapshot pair.
 * WHY: One write path means one place that enforces validation and
 *      concurrency, so a future revert operation (over this same function)
 *      can never bypass either.
 *
 * @param {string} clientId
 * @param {Object} brandingPatch - subset of the seven plain branding fields;
 *   omitting a key leaves it unchanged, an explicit null clears it.
 * @param {Object} options
 * @param {number} options.expectedVersion - must equal the currently stored
 *   version (0 for a client that has never had branding set) or the write is
 *   rejected with BrandingVersionConflictError.
 * @param {string} options.updatedBy - authenticated admin user id; never
 *   sourced from caller-supplied branding input.
 * @param {Object} [options.existingClient] - pre-fetched client document, to
 *   avoid a duplicate findOne when the caller (updateClient()) already fetched
 *   it in the same request. If omitted, this function fetches it itself so it
 *   remains independently callable (e.g. by a future revert operation).
 * @returns {Promise<{client_id: string, previous_branding: Object|null, branding: Object, version: number}>}
 */
export async function updateClientBranding(clientId, brandingPatch, { expectedVersion, updatedBy, existingClient: providedExisting } = {}) {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    throw new BrandingValidationError([
      'expected_version is required and must be a non-negative integer when branding is included in the request body',
    ], { malformedRequest: true })
  }
  if (brandingPatch === null || typeof brandingPatch !== 'object' || Array.isArray(brandingPatch) || Object.keys(brandingPatch).length === 0) {
    throw new BrandingValidationError(['branding must be an object with at least one field to change'], { malformedRequest: true })
  }

  const db = await getDb()
  const existingClient = providedExisting || (await db.collection('oauthClients').findOne({ client_id: clientId }))
  if (!existingClient) {
    throw new BrandingNotFoundError()
  }

  const currentBranding = existingClient.branding || DEFAULT_BRANDING
  const currentVersion = existingClient.branding?.version ?? 0

  if (expectedVersion !== currentVersion) {
    throw new BrandingVersionConflictError(currentVersion)
  }

  const merged = { ...currentBranding }
  const diagnostics = []

  for (const key of PLAIN_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(brandingPatch, key)) {
      continue // omission means unchanged
    }
    const value = brandingPatch[key]
    if (value === null) {
      merged[key] = null // explicit null means clear this field
      continue
    }
    const result = validateField(key, value)
    if (!result.ok) {
      diagnostics.push(result.error)
      continue
    }
    merged[key] = result.value
  }

  // WHAT: CSS safety and colour contrast, judged together by the one gate.
  // WHY: validateBranding() scopes itself to the keys actually submitted, so a patch that
  //      touches only welcome_text never re-judges stored CSS or colours. It resolves the
  //      colour pair from patched-or-stored values, so changing one colour still gets
  //      checked against the other. See lib/oauth/brandingValidation.mjs.
  const verdict = validateBranding(brandingPatch, existingClient.branding ?? null)
  diagnostics.push(...verdict.diagnostics)

  if (diagnostics.length > 0) {
    throw new BrandingValidationError(diagnostics)
  }

  // The CSS verdict is the only source of css_status/css_diagnostics. Absent from the patch
  // means the stored values carry over untouched.
  if (verdict.fields.custom_css) {
    merged.custom_css = verdict.fields.custom_css.value
    merged.css_status = verdict.fields.custom_css.css_status
    merged.css_diagnostics = verdict.fields.custom_css.css_diagnostics
  }

  merged.version = currentVersion + 1
  merged.updated_at = new Date().toISOString()
  merged.updated_by = updatedBy

  const orConditions = [{ 'branding.version': currentVersion }]
  if (currentVersion === 0) {
    orConditions.push({ branding: null }, { branding: { $exists: false } })
  }

  const result = await db.collection('oauthClients').findOneAndUpdate(
    { client_id: clientId, $or: orConditions },
    { $set: { branding: merged, updated_at: merged.updated_at } },
    { returnDocument: 'after', projection: { client_secret: 0 } }
  )

  // WHAT: Driver-version-tolerant unwrap.
  // WHY: Matches the existing defensive pattern in regenerateClientSecret() -
  //      some mongodb driver versions return the document directly, others
  //      wrap it in `.value`.
  const updated = result?.value || result

  if (!updated) {
    const latest = await db.collection('oauthClients').findOne({ client_id: clientId })
    if (!latest) {
      throw new BrandingNotFoundError()
    }
    throw new BrandingVersionConflictError(latest.branding?.version ?? 0)
  }

  return {
    client_id: clientId,
    previous_branding: existingClient.branding ?? null,
    branding: updated.branding,
    version: merged.version,
  }
}

// Re-exported for callers that want the raw GDS contrast check (e.g. a future
// admin UI live-preview) without re-deriving reference colors themselves.
export { checkGdsContrast }
