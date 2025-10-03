/**
 * Debug endpoint to check cookie configuration
 * DELETE THIS FILE after debugging!
 */

export default function handler(req, res) {
  const info = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    SSO_COOKIE_DOMAIN: process.env.SSO_COOKIE_DOMAIN,
    hasSSO_COOKIE_DOMAIN: !!process.env.SSO_COOKIE_DOMAIN,
    isProduction: process.env.NODE_ENV === 'production',
    isVercel: process.env.VERCEL === '1',
    computedDomain: process.env.SSO_COOKIE_DOMAIN || (process.env.VERCEL ? '.doneisbetter.com' : 'localhost'),
    cookiesReceived: req.headers.cookie || 'none',
  }
  
  res.status(200).json(info)
}
