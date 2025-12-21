/**
 * lib/middleware/rateLimit.mjs — Rate limiting for authentication endpoints
 * WHAT: Express-rate-limit middleware configurations for various endpoint types.
 * WHY: Prevent brute force attacks, credential stuffing, and API abuse.
 */
import rateLimit from 'express-rate-limit'
import { logRateLimitExceeded } from '../logger.mjs'

/**
 * getClientIdentifier
 * WHAT: Extracts client identifier from request (IP, or fallback to user-agent).
 * WHY: Rate limit per-client; handles proxies via X-Forwarded-For.
 */
function getClientIdentifier(req) {
  // Trust X-Forwarded-For if behind proxy (Vercel, Cloudflare, etc.)
  const forwardedFor = req.headers['x-forwarded-for']
  if (forwardedFor) {
    // X-Forwarded-For can be comma-separated; take first IP
    const ips = forwardedFor.split(',').map((ip) => ip.trim())
    return ips[0]
  }
  
  // Fallback to direct connection IP
  return req.socket?.remoteAddress || req.ip || 'unknown'
}

/**
 * createRateLimitHandler
 * WHAT: Custom handler called when rate limit is exceeded.
 * WHY: Log security event and return consistent error response.
 */
function createRateLimitHandler(endpointName) {
  return (req, res) => {
    const identifier = getClientIdentifier(req)
    
    // Log rate limit exceeded event
    logRateLimitExceeded(identifier, endpointName, {
      userAgent: req.headers['user-agent'],
      path: req.path,
    })
    
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: req.rateLimit?.resetTime
        ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        : 60,
    })
  }
}

/**
 * loginRateLimiter
 * WHAT: Strict rate limiting for login endpoint.
 * WHY: Prevent brute force password/token attacks.
 * 
 * Limits: 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 5, // 5 attempts
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: getClientIdentifier,
  handler: createRateLimitHandler('login'),
  // Skip rate limiting in development with dev bypass enabled
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' && process.env.ADMIN_DEV_BYPASS === 'true'
  },
})

/**
 * apiRateLimiter
 * WHAT: General rate limiting for API endpoints.
 * WHY: Prevent API abuse and DoS attacks.
 * 
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: createRateLimitHandler('api'),
})

/**
 * strictRateLimiter
 * WHAT: Very strict rate limiting for sensitive operations.
 * WHY: Protect password resets, magic links, admin operations.
 * 
 * Limits: 3 attempts per 15 minutes per IP
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: createRateLimitHandler('strict'),
})

/**
 * validateRateLimiter
 * WHAT: Moderate rate limiting for validation endpoints.
 * WHY: Allow frequent session validation but prevent abuse.
 * 
 * Limits: 60 requests per minute per IP
 */
export const validateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: createRateLimitHandler('validate'),
})

/**
 * adminLoginRateLimiter
 * WHAT: Extra strict rate limiting for admin login endpoint.
 * WHY: Admin access is more sensitive - requires stricter protection.
 * 
 * Limits: 3 attempts per 15 minutes per IP (stricter than public login)
 */
export const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts (vs 5 for public login)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: createRateLimitHandler('admin-login'),
  // Skip rate limiting in development with dev bypass enabled
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' && process.env.ADMIN_DEV_BYPASS === 'true'
  },
})

/**
 * adminMutationRateLimiter
 * WHAT: Rate limiting for admin mutation operations (create/update/delete).
 * WHY: Prevent rapid-fire admin operations that could be abusive or accidental.
 * 
 * Limits: 20 requests per minute per IP
 */
export const adminMutationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 mutations per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: createRateLimitHandler('admin-mutation'),
})

/**
 * adminQueryRateLimiter
 * WHAT: Rate limiting for admin read operations (list/get).
 * WHY: Allow reasonable query frequency but prevent scraping/abuse.
 * 
 * Limits: 100 requests per minute per IP
 */
export const adminQueryRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 queries per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  handler: createRateLimitHandler('admin-query'),
})
