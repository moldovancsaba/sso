/**
 * lib/cors.mjs — Simple CORS utility
 * WHAT: Sets cross-origin headers for explicitly allow-listed origins and supports preflight.
 * WHY: Prepare deployment for sso.doneisbetter.com and controlled cross-origin usage.
 */

/**
 * getAllowedOrigins
 * WHAT: The SSO_ALLOWED_ORIGINS allowlist, parsed, with the production default.
 * WHY: CORS and CSRF both answer "who may make authenticated cross-origin requests
 *      to us" — the default used to be duplicated here and in lib/middleware/csrf.mjs,
 *      which is two copies guaranteed to drift.
 */
export function getAllowedOrigins() {
  return (process.env.SSO_ALLOWED_ORIGINS || 'https://sso.doneisbetter.com,https://doneisbetter.com')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function runCors(req, res) {
  const allowed = getAllowedOrigins()

  const origin = req.headers.origin || ''

  // WHAT: Echo the request Origin only when it is itself on the allow-list, and send no
  //       Access-Control-Allow-Origin header at all otherwise.
  // WHY: This responder pairs that header with Access-Control-Allow-Credentials, so its value
  //      decides whether an arbitrary site may read authenticated responses from an identity
  //      provider. Two prior branches were unsafe or useless: a literal `*` entry in
  //      SSO_ALLOWED_ORIGINS reflected *any* Origin back alongside credentials, which is a
  //      total cross-origin read of every logged-in user's session data; and the
  //      `allowed[0] || '*'` fallback emitted either an origin the caller never asked for or a
  //      bare `*`, both of which browsers reject next to credentials. Omitting the header is
  //      the correct denial and has the same observable effect on the caller.
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
