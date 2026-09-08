/**
 * lib/oauth/brandingValidation.mjs — the write-time gate for OAuth client branding.
 *
 * WHAT: `validateBranding()` judges every write that touches `custom_css`, `primary_color`
 *       or `accent_color` before any of it reaches MongoDB. It composes GDS's own
 *       `validateCreatorCss` for CSS shape/safety and adds a WCAG AA contrast check for the
 *       two brand colors.
 *
 * WHY:  A login page is the highest-trust surface in the product, and it is structurally a
 *       page that renders admin-submitted content to end users who did not submit it. This
 *       module is the only thing standing between an admin's PATCH body and a value that
 *       later renders there: CSS must already satisfy the policy `CreatorThemeBoundary`
 *       enforces at render time, and two individually well-formed hex colors can still be
 *       invisible or illegible against the theme they render on.
 *
 * PURITY: No I/O — no database, no network, no clock. `validateBranding` is a pure function
 *       of (patch, currentBranding), so the caller retains full control of persistence and
 *       this module is trivially unit-testable.
 */

import { validateCreatorCss } from '@sovereignsquad/gds-core/server'
import { mantineTheme } from '../theme/mantineTheme.js'

/** WCAG AA minimum for graphical objects and UI components (SC 1.4.11). */
export const UI_COMPONENT_THRESHOLD = 3.0

/**
 * WCAG AA minimum for normal-size text (SC 1.4.3).
 * Exported but deliberately NOT applied to primary_color/accent_color: nothing renders
 * paragraph-length text in either colour today. A rendering surface that introduces one must
 * apply this threshold itself, using the exported `contrastRatio`.
 */
export const NORMAL_TEXT_THRESHOLD = 4.5

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/**
 * resolveThemeContrastColors
 * WHAT: The two colours brand colours are judged against.
 * WHY:  Read from the composed `mantineTheme` rather than restated as literals here, so a
 *       change in GDS's theme composition cannot leave this module gating against colours
 *       the product no longer renders. This is the only function in the module that touches
 *       the theme object; `getGdsReferenceColors()` in branding.mjs delegates here so the
 *       two can never disagree about what "the theme background" means.
 */
export function resolveThemeContrastColors() {
  return { background: mantineTheme.white, text: mantineTheme.black }
}

/**
 * relativeLuminance
 * WHAT: Relative luminance of an sRGB colour, per the WCAG 2.1 supporting formula.
 * WHY:  Implemented here because GDS exposes a finished contrast *ratio* but not the
 *       luminance behind it, and the ratio it returns is rounded to two decimals — which is
 *       not safe to gate on at a threshold boundary, where a 2.996 would round up to 3.00
 *       and pass. The unrounded value is computed locally and cross-checked against GDS's
 *       in the test suite, so a divergence fails the build rather than changing behaviour
 *       silently.
 *
 * @param {string} hex - `#rrggbb`
 * @returns {number} luminance in [0, 1]
 */
export function relativeLuminance(hex) {
  if (typeof hex !== 'string' || !HEX_COLOR.test(hex)) {
    throw new TypeError(`relativeLuminance expects a 6-digit hex colour, received: ${String(hex)}`)
  }

  const channels = [1, 3, 5].map((offset) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/**
 * contrastRatio
 * WHAT: WCAG contrast ratio between two colours — 1 for identical, 21 for black on white.
 */
export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA)
  const b = relativeLuminance(hexB)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * validateCustomCss
 * WHAT: Thin adapter over GDS's `validateCreatorCss`, normalised to this module's shape.
 * WHY:  Deliberately NOT a second content policy. GDS already rejects `javascript:` URIs,
 *       `expression()`, `@import` and disallowed selectors/properties; duplicating any of
 *       that here would create a rule set that can silently diverge from the one
 *       `CreatorThemeBoundary` actually enforces at render time. Only `error` severity
 *       blocks — GDS marks advisory findings as `warning`, which must not fail a write.
 *
 * @returns {{valid: boolean, reasons: string[]}}
 */
export function validateCustomCss(cssString) {
  const issues = validateCreatorCss(cssString) || []
  const blocking = issues.filter((issue) => issue.severity === 'error')

  return {
    valid: blocking.length === 0,
    reasons: blocking.map((issue) => {
      const where = [
        issue.selector ? `selector "${issue.selector}"` : null,
        issue.property ? `property "${issue.property}"` : null,
      ].filter(Boolean).join(', ')
      return where ? `custom_css: ${issue.message} (${where})` : `custom_css: ${issue.message}`
    }),
  }
}

/**
 * checkColorContrastPair
 * WHAT: Both brand colours against both theme reference colours, at the UI-component floor.
 * WHY:  Each colour can render adjacent to either surface depending on component state
 *       (filled versus outline, default versus hover), so neither comparison is redundant.
 *
 * @returns {{ok: boolean, reasons: string[]}}
 */
export function checkColorContrastPair(primaryColorHex, accentColorHex, themeColors) {
  const reasons = []

  const checks = [
    ['primary_color', primaryColorHex, 'background', themeColors.background],
    ['accent_color', accentColorHex, 'background', themeColors.background],
    ['primary_color', primaryColorHex, 'text', themeColors.text],
    ['accent_color', accentColorHex, 'text', themeColors.text],
  ]

  for (const [field, hex, referenceKind, referenceHex] of checks) {
    // A colour left unset falls back to the GDS default, which already clears the floor —
    // there is nothing admin-supplied to judge. The *other* colour is still judged on its
    // own, which is the difference between this and a strict pair check: requiring both to
    // be present would let a single illegible colour through whenever its partner is unset.
    if (hex == null) continue

    const ratio = contrastRatio(hex, referenceHex)
    if (ratio >= UI_COMPONENT_THRESHOLD) continue

    reasons.push(
      referenceKind === 'background'
        ? `${field} ${hex} has a contrast ratio of ${ratio.toFixed(2)}:1 against the theme background ${referenceHex}; WCAG AA requires at least ${UI_COMPONENT_THRESHOLD}:1 for UI components.`
        : `${field} ${hex} has a contrast ratio of ${ratio.toFixed(2)}:1 against the theme's default text color ${referenceHex}; it must remain visually distinguishable from body text.`,
    )
  }

  return { ok: reasons.length === 0, reasons }
}

/**
 * validateBranding
 * WHAT: The single integration point. Judges only the branding keys actually present in
 *       `patch`, and returns a definitive verdict plus the values to persist.
 * WHY:  Dirty-field scoping is a correctness requirement, not an optimisation: an admin
 *       editing `welcome_text` must never be shown an error about CSS they did not touch,
 *       and an already-clean stored value must never be re-judged (and possibly re-rejected)
 *       by a rule set that changed since it was written.
 *
 * @param {Object} patch - branding keys present in the request body
 * @param {Object|null} currentBranding - the client's stored branding sub-document
 * @returns {{ok: boolean, fields: Object, httpStatus: 200|422, diagnostics: string[]}}
 */
export function validateBranding(patch, currentBranding) {
  const input = patch && typeof patch === 'object' ? patch : {}
  const current = currentBranding && typeof currentBranding === 'object' ? currentBranding : {}
  const has = (key) => Object.prototype.hasOwnProperty.call(input, key)

  const fields = {}
  const diagnostics = []

  if (has('custom_css')) {
    const raw = input.custom_css
    // An admin clearing the textarea sends "" or whitespace; that means "no custom CSS",
    // not "CSS to validate". Both collapse to the same untouched-by-the-validator outcome.
    const normalized = raw == null || String(raw).trim() === '' ? null : String(raw)

    if (normalized === null) {
      fields.custom_css = { value: null, css_status: null, css_diagnostics: null }
    } else {
      const cssResult = validateCustomCss(normalized)
      fields.custom_css = cssResult.valid
        ? { value: normalized, css_status: 'clean', css_diagnostics: null }
        : { value: normalized, css_status: 'rejected', css_diagnostics: cssResult.reasons }
      if (!cssResult.valid) diagnostics.push(...cssResult.reasons)
    }
  }

  if (has('primary_color') || has('accent_color')) {
    // Contrast is meaningless for one colour in isolation, so the check always runs against
    // the *effective* pair: the patched value where given, the stored value otherwise. That
    // also closes the bypass of changing one colour per request to dodge the gate.
    const primaryHex = has('primary_color') ? input.primary_color : (current.primary_color ?? null)
    const accentHex = has('accent_color') ? input.accent_color : (current.accent_color ?? null)

    for (const [field, hex] of [['primary_color', primaryHex], ['accent_color', accentHex]]) {
      if (!has(field)) continue
      const formatValid = hex === null || (typeof hex === 'string' && HEX_COLOR.test(hex))
      fields[field] = { value: hex, valid: formatValid }
      if (!formatValid) {
        diagnostics.push(`${field}: must be null or a 6-digit hex color starting with #`)
      }
    }

    // Only well-formed values reach the contrast check; a malformed one already produced its
    // own diagnostic above and has no luminance to compute.
    const checkable = (hex) => (typeof hex === 'string' && HEX_COLOR.test(hex) ? hex : null)
    const primaryCheckable = checkable(primaryHex)
    const accentCheckable = checkable(accentHex)

    if (primaryCheckable || accentCheckable) {
      const contrast = checkColorContrastPair(
        primaryCheckable,
        accentCheckable,
        resolveThemeContrastColors(),
      )
      if (!contrast.ok) diagnostics.push(...contrast.reasons)
    }
  }

  const ok = diagnostics.length === 0
  return { ok, fields, httpStatus: ok ? 200 : 422, diagnostics }
}
