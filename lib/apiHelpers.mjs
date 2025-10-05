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
 * 
 * @param {Function} limiter - express-rate-limit middleware
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @returns {Promise<void>}
 */
export function applyRateLimiter(limiter, req, res) {
  return new Promise((resolve, reject) => {
    limiter(req, res, (result) => {
      if (result instanceof Error) {
        reject(result)
      } else {
        resolve(result)
      }
    })
  })
}
