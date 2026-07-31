/**
 * lib/apiHelpers.mjs — Shared utilities for API endpoints
 * WHAT: Common helper functions for password reset and email verification endpoints.
 * WHY: DRY principle; consistent error handling and IP extraction across endpoints.
 */

/**
 * getClientIp
 * WHAT: Extracts client IP from request headers.
 * WHY: Used for rate limiting, token metadata, and audit logs.
 * 
 * @param {Object} req - Next.js request object
 * @returns {string} - Client IP address
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim())
    return ips[0]
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown'
}

/**
 * getUserAgent
 * WHAT: Extracts user agent from request headers.
 * WHY: Used for token metadata and audit logs.
 * 
 * @param {Object} req - Next.js request object
 * @returns {string} - User agent string
 */
export function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown'
}

/**
 * applyRateLimiter
 * WHAT: Applies express-rate-limit middleware to Next.js API route.
 * WHY: Promisified wrapper for easier async/await usage.
 * HOW: When a request is under the limit, express-rate-limit calls next() and this resolves
 *      normally. When the limit IS exceeded, express-rate-limit calls its configured `handler`
 *      instead of next() — our handlers (lib/middleware/rateLimit.mjs) send a 429 response
 *      directly and never call next(), so without also resolving on the response's own
 *      finish/close event, this promise would hang forever on every rate-limited request even
 *      though the HTTP response was already sent. Callers MUST check res.writableEnded after
 *      awaiting this and return early if true, rather than proceeding to send a second response.
 *
 * @param {Function} limiter - express-rate-limit middleware
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @returns {Promise<void>}
 */
export function applyRateLimiter(limiter, req, res) {
  return new Promise((resolve, reject) => {
    let settled = false
    const settle = (err) => {
      if (settled) return
      settled = true
      if (err instanceof Error) reject(err)
      else resolve()
    }

    res.once('finish', () => settle())
    res.once('close', () => settle())

    limiter(req, res, settle)
  })
}
