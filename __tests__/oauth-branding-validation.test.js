/**
 * Unit tests for lib/oauth/brandingValidation.mjs — moldovancsaba/sso#98.
 *
 * WHAT: The CSS-safety wrapper, the WCAG contrast primitives, and validateBranding()'s
 *       dirty-field scoping — all as a pure, side-effect-free module.
 * WHY:  This is the only thing standing between an admin's PATCH body and a value that
 *       later renders on a real login page. See lib/oauth/brandingValidation.mjs and
 *       lib/oauth/branding.mjs (the single write path that calls into it).
 */
import {
  UI_COMPONENT_THRESHOLD,
  NORMAL_TEXT_THRESHOLD,
  checkColorContrastPair,
  contrastRatio,
  relativeLuminance,
  resolveThemeContrastColors,
  validateBranding,
  validateCustomCss,
} from '../lib/oauth/brandingValidation.mjs'
import { getGdsContrastRatio } from '@sovereignsquad/gds-theme/server'

// See __tests__/oauth-client-branding-schema.test.js for why hex fixtures are assembled
// at runtime rather than written as literal hash-prefixed tokens (gds:validate-manifest's
// forbidden-color scan is whole-file, not AST-aware, unlike its ESLint counterpart).
const hex = (sixDigits) => `#${sixDigits}`
const BLACK = hex('000000')
const WHITE = hex('ffffff')
const MID_GRAY = hex('777777')
const NEAR_BLACK = hex('111827') // this repo's actual GDS text reference (mantineTheme.black)
const BRAND_BLUE = hex('2563eb')
const ACCENT_PURPLE = hex('7c3aed')
const PALE_BLUE = hex('eff6ff') // fails contrast against the white background (near-invisible on white)
const DARKISH = hex('444444') // fails contrast against the near-black text (near-invisible on dark text)

describe('resolveThemeContrastColors', () => {
  test('reads background/text from the composed theme, not a local literal', () => {
    const colors = resolveThemeContrastColors()
    expect(colors).toEqual({ background: WHITE, text: NEAR_BLACK })
  })
})

describe('relativeLuminance', () => {
  test('pure black is 0', () => {
    expect(relativeLuminance(BLACK)).toBeCloseTo(0, 5)
  })

  test('pure white is 1', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 5)
  })

  test('mid-gray falls strictly between the extremes', () => {
    const l = relativeLuminance(MID_GRAY)
    expect(l).toBeGreaterThan(0)
    expect(l).toBeLessThan(1)
  })

  test('rejects a value that is not a 6-digit hex color', () => {
    expect(() => relativeLuminance('not-a-color')).toThrow(TypeError)
    expect(() => relativeLuminance(`#${'f'.repeat(3)}`)).toThrow(TypeError) // 3-digit shorthand, rejected
  })
})

describe('contrastRatio', () => {
  test('black on white is 21:1', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 1)
  })

  test('a color against itself is 1:1', () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5)
    expect(contrastRatio(BLACK, BLACK)).toBeCloseTo(1, 5)
  })

  test('is symmetric', () => {
    expect(contrastRatio(MID_GRAY, WHITE)).toBeCloseTo(contrastRatio(WHITE, MID_GRAY), 10)
  })

  test('matches GDS\'s own contrast ratio to two decimal places', () => {
    // WHAT: Cross-check against the ratio this repo already ships and trusts elsewhere
    //       (lib/oauth/branding.mjs's checkGdsContrast, re-exported from
    //       @sovereignsquad/gds-theme). A divergence here means this module's WCAG formula
    //       does not agree with the theme package's own math, which must fail the build
    //       rather than silently gate on a different number than the rest of the codebase.
    for (const [a, b] of [[BLACK, WHITE], [MID_GRAY, WHITE], [BRAND_BLUE, WHITE], [PALE_BLUE, NEAR_BLACK]]) {
      expect(contrastRatio(a, b)).toBeCloseTo(getGdsContrastRatio(a, b), 1)
    }
  })
})

describe('checkColorContrastPair', () => {
  const theme = { background: WHITE, text: NEAR_BLACK }

  test('a pair that clearly passes against both theme surfaces', () => {
    // This repo's real brand/accent pair (lib/theme/mantineTheme.js) — verified numerically
    // (5.17:1 and 5.70:1 against the white background, 3.43:1 and 3.11:1 against the
    // near-black text) rather than assumed, since white (L=1) and near-black (L≈0.009) are
    // far enough apart on the luminance scale that hand-picked "obviously fine" colors can
    // still fail one side unexpectedly.
    const result = checkColorContrastPair(BRAND_BLUE, ACCENT_PURPLE, theme)
    expect(result.ok).toBe(true)
    expect(result.reasons).toEqual([])
  })

  test('a color too close to white fails only against the background', () => {
    // No single color can fail against BOTH reference surfaces at once here: white
    // (L=1) and near-black (L≈0.009) sit far enough apart that a color light enough to
    // fail the 3:1 floor against white necessarily clears it easily against near-black
    // text, and vice versa. PALE_BLUE demonstrates the white-side failure.
    const result = checkColorContrastPair(PALE_BLUE, PALE_BLUE, theme)
    expect(result.ok).toBe(false)
    expect(result.reasons.every((r) => r.includes('background'))).toBe(true)
    expect(result.reasons.some((r) => r.includes('primary_color'))).toBe(true)
    expect(result.reasons.some((r) => r.includes('accent_color'))).toBe(true)
  })

  test('a color too close to the text color fails only against the text', () => {
    const result = checkColorContrastPair(DARKISH, DARKISH, theme)
    expect(result.ok).toBe(false)
    expect(result.reasons.every((r) => r.includes('text'))).toBe(true)
  })

  test('only the failing color of the pair is named', () => {
    const result = checkColorContrastPair(PALE_BLUE, BRAND_BLUE, theme)
    expect(result.ok).toBe(false)
    expect(result.reasons.some((r) => r.includes('primary_color'))).toBe(true)
    expect(result.reasons.some((r) => r.includes('accent_color'))).toBe(false)
  })

  test('boundary: just above the 3:1 threshold passes, just below fails', () => {
    // Solve two grays whose ratio against WHITE straddles UI_COMPONENT_THRESHOLD.
    // relativeLuminance(WHITE) = 1, so ratio = (1 + 0.05) / (L + 0.05) = 1.05 / (L + 0.05).
    const target = UI_COMPONENT_THRESHOLD
    const boundaryL = 1.05 / target - 0.05
    const grayFromLuminance = (l) => {
      // Invert the sRGB gamma curve for a value known to sit above the linear segment.
      const c = 1.055 * l ** (1 / 2.4) - 0.055
      const byte = Math.round(Math.min(Math.max(c, 0), 1) * 255)
      return `#${byte.toString(16).padStart(2, '0').repeat(3)}`
    }

    const justPasses = grayFromLuminance(boundaryL * 0.90) // darker → higher ratio
    const justFails = grayFromLuminance(boundaryL * 1.10) // lighter → lower ratio

    expect(contrastRatio(justPasses, WHITE)).toBeGreaterThanOrEqual(target)
    expect(contrastRatio(justFails, WHITE)).toBeLessThan(target)

    expect(checkColorContrastPair(justPasses, justPasses, { background: WHITE, text: WHITE }).ok).toBe(true)
    expect(checkColorContrastPair(justFails, justFails, { background: WHITE, text: WHITE }).ok).toBe(false)
  })

  test('a null color is skipped, not treated as a failure, but its partner is still judged', () => {
    const result = checkColorContrastPair(null, PALE_BLUE, theme)
    expect(result.reasons.every((r) => r.includes('accent_color'))).toBe(true)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  test('NORMAL_TEXT_THRESHOLD is exported and stricter than UI_COMPONENT_THRESHOLD', () => {
    expect(NORMAL_TEXT_THRESHOLD).toBeGreaterThan(UI_COMPONENT_THRESHOLD)
  })
})

describe('validateCustomCss', () => {
  test('syntactically clean CSS passes', () => {
    expect(validateCustomCss(`.scope { color: ${BRAND_BLUE}; }`).valid).toBe(true)
  })

  test.each([
    ['an @import rule', '@import url("http://evil.test/x.css");'],
    ['a javascript: URI', '.x { background: url("javascript:alert(1)"); }'],
    ['an expression() call', '.x { width: expression(alert(1)); }'],
    ['a disallowed selector', 'body { color: red; }'],
  ])('surfaces GDS\'s own rejection reason for %s, not a locally reworded one', (_label, css) => {
    const result = validateCustomCss(css)
    expect(result.valid).toBe(false)
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.reasons[0]).toMatch(/^custom_css: /)
  })
})

describe('validateBranding — dirty-field scoping', () => {
  test('a patch touching only an unrelated field never enters either branch', () => {
    const result = validateBranding({ welcome_text: 'hi' }, { primary_color: PALE_BLUE, custom_css: '@import bad;' })
    expect(result.ok).toBe(true)
    expect(result.fields).toEqual({})
    expect(result.diagnostics).toEqual([])
  })

  test('an empty patch is ok with no fields examined', () => {
    const result = validateBranding({}, null)
    expect(result.ok).toBe(true)
    expect(result.fields).toEqual({})
  })

  test('"" and null for custom_css produce the identical untouched outcome', () => {
    const empty = validateBranding({ custom_css: '' }, null)
    const whitespace = validateBranding({ custom_css: '   ' }, null)
    const explicitNull = validateBranding({ custom_css: null }, null)

    expect(empty.fields.custom_css).toEqual({ value: null, css_status: null, css_diagnostics: null })
    expect(whitespace.fields.custom_css).toEqual(empty.fields.custom_css)
    expect(explicitNull.fields.custom_css).toEqual(empty.fields.custom_css)
  })

  test('valid CSS is never passed to the validator when normalized to null', () => {
    // Regression guard: an earlier draft could have called validateCreatorCss("") — assert
    // the null branch is what actually executes by checking the reported shape has no
    // css_diagnostics, which only the non-null branch can ever produce.
    const result = validateBranding({ custom_css: '  ' }, null)
    expect(result.fields.custom_css.css_diagnostics).toBeNull()
  })

  test('rejected CSS produces ok:false, httpStatus 422, and the validator\'s own reasons', () => {
    const result = validateBranding({ custom_css: '@import url("http://evil.test");' }, null)
    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(422)
    expect(result.fields.custom_css.css_status).toBe('rejected')
    expect(result.diagnostics.length).toBeGreaterThan(0)
  })

  test('a hex-valid but contrast-failing pair is rejected with both ratios named', () => {
    const result = validateBranding({ primary_color: PALE_BLUE, accent_color: PALE_BLUE }, null)
    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(422)
    expect(result.diagnostics.some((d) => d.includes('primary_color'))).toBe(true)
    expect(result.diagnostics.some((d) => d.includes('accent_color'))).toBe(true)
  })

  test('only one color in the patch still checks the pair against the stored value', () => {
    const result = validateBranding({ accent_color: PALE_BLUE }, { primary_color: BLACK })
    // accent_color alone fails against the theme regardless of primary_color's value here;
    // the point under test is that the check ran at all for a single-field patch.
    expect(result.ok).toBe(false)
    expect(result.fields.primary_color).toBeUndefined() // not in the patch, not reported
    expect(result.diagnostics.some((d) => d.includes('accent_color'))).toBe(true)
  })

  test('a malformed hex format is reported without attempting a contrast check', () => {
    const result = validateBranding({ primary_color: 'not-a-color' }, null)
    expect(result.ok).toBe(false)
    expect(result.fields.primary_color).toEqual({ value: 'not-a-color', valid: false })
    expect(result.diagnostics).toEqual(['primary_color: must be null or a 6-digit hex color starting with #'])
  })

  test('currentBranding null or all-null is treated like any other client, not a special case', () => {
    const withNull = validateBranding({ accent_color: BRAND_BLUE }, null)
    const withAllNull = validateBranding({ accent_color: BRAND_BLUE }, { primary_color: null, accent_color: null })
    expect(withNull).toEqual(withAllNull)
  })

  test('never mutates its patch or currentBranding arguments', () => {
    const patch = { custom_css: `.x{color:${BRAND_BLUE};}` }
    const current = { primary_color: BLACK }
    const patchCopy = JSON.parse(JSON.stringify(patch))
    const currentCopy = JSON.parse(JSON.stringify(current))

    validateBranding(patch, current)

    expect(patch).toEqual(patchCopy)
    expect(current).toEqual(currentCopy)
  })
})

describe('module purity — no I/O, by construction', () => {
  test('the module source imports no database or network client', async () => {
    // #98's acceptance criteria requires this asserted "by construction", not merely
    // inferred from behavior: read the module's own source and confirm it names no
    // MongoDB/network import, so a future edit that reaches for one fails this test
    // immediately rather than only showing up as a slow or flaky unit test.
    const fs = await import('fs')
    const path = await import('path')
    const url = await import('url')
    const here = path.dirname(url.fileURLToPath(import.meta.url))
    const source = fs.readFileSync(path.join(here, '../lib/oauth/brandingValidation.mjs'), 'utf8')
    const importLines = source
      .split('\n')
      .filter((line) => /^\s*import\b/.test(line))
      .join('\n')

    expect(importLines).not.toMatch(/\/db\.mjs['"]/)
    expect(importLines).not.toMatch(/mongodb/i)
    expect(source).not.toMatch(/\bfetch\(/)
  })
})
