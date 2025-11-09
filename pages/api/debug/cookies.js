/**
 * Debug endpoint to check cookie configuration
 * TEMPORARY - for diagnosing admin session issues in production
 */

export default async function handler(req, res) {
  // Return all environment-related cookie config
  const config = {
    nodeEnv: process.env.NODE_ENV,
    ssoCookieDomain: process.env.SSO_COOKIE_DOMAIN || 'NOT_SET',
    adminSessionCookie: process.env.ADMIN_SESSION_COOKIE || 'admin-session',
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      cookie: req.headers.cookie ? 'present' : 'absent',
    },
    cookies: {}
  }
  
  // Parse cookies
  const raw = req.headers?.cookie || ''
  const parts = raw.split(';').map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq > 0) {
      const k = part.slice(0, eq)
      const v = part.slice(eq + 1)
      config.cookies[k] = v.substring(0, 20) + '...' // Don't leak full values
    }
  }
  
  return res.status(200).json(config)
}
