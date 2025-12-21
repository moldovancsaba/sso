/**
 * lib/adminHelpers.mjs - Admin endpoint helper utilities
 * 
 * WHAT: Wrapper functions to apply rate limiting and authentication to admin endpoints
 * WHY: DRY principle - avoid repeating rate limiting logic across all admin endpoints
 * HOW: Higher-order functions that wrap endpoint handlers
 */

import { adminMutationRateLimiter, adminQueryRateLimiter } from './middleware/rateLimit.mjs'
import { getAdminUser } from './auth.mjs'
import { withValidation } from './validation.mjs'
import { logAdminAction } from './auditLog.mjs'

/**
 * applyRateLimiter
 * 
 * WHAT: Applies a rate limiter middleware to a request
 * WHY: Express-rate-limit expects Express-style middleware, need to promisify for Next.js
 * HOW: Wrap in promise to await completion
 */
function applyRateLimiter(rateLimiter, req, res) {
  return new Promise((resolve, reject) => {
    rateLimiter(req, res, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

/**
 * withAdminMutation
 * 
 * WHAT: Wraps admin mutation endpoints (POST/PUT/PATCH/DELETE) with rate limiting, auth, and validation
 * WHY: Protect admin mutations with strict rate limits (20 req/min) and input validation
 * HOW: Apply rate limiter, check auth, validate input, then call handler
 * 
 * @param {Function} handler - The endpoint handler function
 * @param {Object} options - Optional configuration
 * @param {boolean} options.requireSuperAdmin - Require super-admin role (default: false)
 * @param {z.ZodSchema} options.bodySchema - Zod schema for request body validation
 * @param {z.ZodSchema} options.querySchema - Zod schema for query parameter validation
 * @returns {Function} Wrapped handler
 * 
 * @example
 * export default withAdminMutation(
 *   async (req, res, admin, validated) => {
 *     // admin object contains: { userId, email, role, sessionId }
 *     // validated.body contains validated request body
 *     // Handle POST/PUT/PATCH/DELETE
 *   },
 *   {
 *     requireSuperAdmin: true,
 *     bodySchema: createAdminUserSchema
 *   }
 * )
 */
export function withAdminMutation(handler, options = {}) {
  return async (req, res) => {
    try {
      // Apply mutation rate limiter (20 req/min)
      await applyRateLimiter(adminMutationRateLimiter, req, res)
      
      // Verify admin authentication
      const admin = await getAdminUser(req)
      if (!admin) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Admin authentication required' 
        })
      }
      
      // Check super-admin requirement if specified
      if (options.requireSuperAdmin && admin.role !== 'super-admin') {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Super-admin privileges required' 
        })
      }
      
      // Attach admin to request for handler use
      req.admin = admin
      
      // Validate input if schemas provided
      const validated = {}
      if (options.bodySchema && req.body) {
        const result = options.bodySchema.safeParse(req.body)
        if (!result.success) {
          const errors = result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
          return res.status(400).json({
            error: 'Validation failed',
            message: 'Invalid request body',
            details: errors,
          })
        }
        validated.body = result.data
      }
      
      if (options.querySchema && req.query) {
        const result = options.querySchema.safeParse(req.query)
        if (!result.success) {
          const errors = result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
          return res.status(400).json({
            error: 'Validation failed',
            message: 'Invalid query parameters',
            details: errors,
          })
        }
        validated.query = result.data
      }
      
      // Call original handler with validated data
      return await handler(req, res, admin, validated)
      
    } catch (error) {
      console.error('[withAdminMutation] Error:', error)
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred processing your request' 
      })
    }
  }
}

/**
 * withAdminQuery
 * 
 * WHAT: Wraps admin query endpoints (GET) with rate limiting and auth
 * WHY: Protect admin queries with moderate rate limits (100 req/min)
 * HOW: Apply rate limiter, check auth, then call handler
 * 
 * @param {Function} handler - The endpoint handler function
 * @param {Object} options - Optional configuration
 * @param {boolean} options.requireSuperAdmin - Require super-admin role (default: false)
 * @returns {Function} Wrapped handler
 * 
 * @example
 * export default withAdminQuery(async (req, res, admin) => {
 *   // Handle GET requests
 * })
 */
export function withAdminQuery(handler, options = {}) {
  return async (req, res) => {
    try {
      // Apply query rate limiter (100 req/min)
      await applyRateLimiter(adminQueryRateLimiter, req, res)
      
      // Verify admin authentication
      const admin = await getAdminUser(req)
      if (!admin) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Admin authentication required' 
        })
      }
      
      // Check super-admin requirement if specified
      if (options.requireSuperAdmin && admin.role !== 'super-admin') {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Super-admin privileges required' 
        })
      }
      
      // Attach admin to request for handler use
      req.admin = admin
      
      // Call original handler
      return await handler(req, res, admin)
      
    } catch (error) {
      console.error('[withAdminQuery] Error:', error)
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred processing your request' 
      })
    }
  }
}

/**
 * withAdmin
 * 
 * WHAT: Generic admin endpoint wrapper that chooses rate limiter based on HTTP method
 * WHY: Single wrapper for endpoints that handle multiple HTTP methods
 * HOW: Check req.method and apply appropriate rate limiter
 * 
 * @param {Function} handler - The endpoint handler function
 * @param {Object} options - Optional configuration
 * @param {boolean} options.requireSuperAdmin - Require super-admin role (default: false)
 * @returns {Function} Wrapped handler
 * 
 * @example
 * export default withAdmin(async (req, res, admin) => {
 *   if (req.method === 'GET') { ... }
 *   else if (req.method === 'POST') { ... }
 * })
 */
export function withAdmin(handler, options = {}) {
  return async (req, res) => {
    try {
      // Choose rate limiter based on HTTP method
      const isQuery = req.method === 'GET' || req.method === 'HEAD'
      const rateLimiter = isQuery ? adminQueryRateLimiter : adminMutationRateLimiter
      
      // Apply appropriate rate limiter
      await applyRateLimiter(rateLimiter, req, res)
      
      // Verify admin authentication
      const admin = await getAdminUser(req)
      if (!admin) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Admin authentication required' 
        })
      }
      
      // Check super-admin requirement if specified
      if (options.requireSuperAdmin && admin.role !== 'super-admin') {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Super-admin privileges required' 
        })
      }
      
      // Attach admin to request for handler use
      req.admin = admin
      
      // Call original handler
      return await handler(req, res, admin)
      
    } catch (error) {
      console.error('[withAdmin] Error:', error)
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred processing your request' 
      })
    }
  }
}

/**
 * auditLog
 * 
 * WHAT: Convenience helper to log audit events from admin endpoints
 * WHY: Simplified audit logging without importing logAdminAction everywhere
 * HOW: Extracts metadata from request, calls logAdminAction
 * 
 * @param {Object} req - Request object (with admin attached)
 * @param {string} action - Action type (use AuditAction constants)
 * @param {string} resource - Resource type
 * @param {string} resourceId - Resource ID
 * @param {Object} beforeState - State before change
 * @param {Object} afterState - State after change
 * @returns {Promise<string>} - Audit log entry ID
 * 
 * @example
 * // Inside an admin endpoint handler:
 * await auditLog(req, 'user.updated', 'user', userId, oldUser, newUser)
 */
export async function auditLog(req, action, resource, resourceId, beforeState, afterState) {
  const metadata = {
    ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || req.ip,
    userAgent: req.headers['user-agent'],
  }
  
  return logAdminAction(
    req.admin,
    action,
    resource,
    resourceId,
    beforeState,
    afterState,
    metadata
  )
}
