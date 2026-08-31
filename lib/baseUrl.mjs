/**
 * lib/baseUrl.mjs — Canonical base URL for this deployment
 * WHAT: Single source of truth for building absolute URLs to this service
 *       (email links, OIDC issuer, CSP connect-src, shareable links).
 * WHY: Before this existed, every call site invented its own fallback and they
 *      disagreed: email builders fell back to http://localhost:3000 (so a production
 *      deployment without SSO_BASE_URL emailed localhost links), while the CSP and
 *      JWT issuer fell back to the production domain. One function, one order:
 *      explicit config wins, previews get their own host, production gets the
 *      production domain, development gets the port `npm run dev` actually uses.
 */

const PRODUCTION_URL = 'https://sso.doneisbetter.com'
const DEV_URL = 'http://localhost:5500' // `npm run dev` runs `next dev -p 5500`

export function getBaseUrl() {
  const configured = (process.env.SSO_BASE_URL || '').trim().replace(/\/+$/, '')
  if (configured) return configured

  // WHAT: Vercel preview deployments use their own generated host.
  // WHY: NODE_ENV is 'production' on previews too; without this branch every
  //      link generated on a preview would point at the production domain.
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return process.env.NODE_ENV === 'production' ? PRODUCTION_URL : DEV_URL
}
