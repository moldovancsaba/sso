/**
 * lib/cors.mjs — Simple CORS utility
 * WHAT: Sets permissive headers for configured origins and supports preflight.
 * WHY: Prepare deployment for sso.doneisbetter.com and controlled cross-origin usage.
 */
export function runCors(req, res) {
  const allowed = (process.env.SSO_ALLOWED_ORIGINS || 'https://sso.doneisbetter.com,https://doneisbetter.com')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const origin = req.headers.origin || ''
  const allowOrigin = allowed.includes('*') || allowed.includes(origin) ? origin : allowed[0] || '*'

  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

