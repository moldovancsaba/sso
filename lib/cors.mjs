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
  
  // WHAT: Check if origin is allowed (exact match OR *.doneisbetter.com subdomain)
  // WHY: Allow all subdomains of doneisbetter.com for SSO to work across apps
  let allowOrigin = allowed[0] || '*'
  
  if (allowed.includes('*') || allowed.includes(origin)) {
    allowOrigin = origin
  } else if (origin) {
    try {
      const url = new URL(origin)
      // Allow any *.doneisbetter.com subdomain
      if (url.hostname.endsWith('.doneisbetter.com') || url.hostname === 'doneisbetter.com') {
        allowOrigin = origin
      }
    } catch (e) {
      // Invalid origin URL, use default
    }
  }

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

