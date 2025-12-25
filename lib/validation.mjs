/**
 * lib/validation.mjs - Centralized input validation
 * 
 * WHAT: Reusable validation schemas and utilities using Zod
 * WHY: Prevent injection attacks, data corruption, and invalid inputs
 * HOW: Define schemas for common data types, provide validation wrappers
 */

import { z } from 'zod'

/**
 * Common validation schemas
 * WHAT: Reusable Zod schemas for common data types
 * WHY: DRY principle - define once, use everywhere
 */

// Email validation (strict RFC 5322)
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim()
  .max(255, 'Email must be less than 255 characters')

// UUID validation (v4 format)
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')
  .trim()

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(255, 'Password must be less than 255 characters')

// Admin token validation (32-character hex string, MD5-style)
export const adminTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{32}$/i, 'Invalid token format (must be 32-character hex string)')
  .toLowerCase()

// Name validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(255, 'Name must be less than 255 characters')
  .trim()
  .regex(/^[a-zA-Z0-9\s\-_'.]+$/, 'Name contains invalid characters')

// Role validation
export const roleSchema = z.enum(['admin', 'super-admin'], {
  errorMap: () => ({ message: 'Role must be "admin" or "super-admin"' }),
})

// Public user role validation
// WHAT: Four-tier role system for granular access control
// WHY: Prevent accidental privilege escalation, align with industry standards
// guest: Can only register, no app access
// user: Basic app rights (defined per client)
// admin: Full app management
// owner: System owner, immutable role
export const publicRoleSchema = z.enum(['guest', 'user', 'admin', 'owner'], {
  errorMap: () => ({ message: 'Role must be "guest", "user", "admin", or "owner"' }),
})

// Status validation
export const statusSchema = z.enum(['active', 'suspended', 'disabled', 'pending'], {
  errorMap: () => ({ message: 'Invalid status value' }),
})

// Permission status validation
export const permissionStatusSchema = z.enum(['pending', 'approved', 'revoked'], {
  errorMap: () => ({ message: 'Status must be "pending", "approved", or "revoked"' }),
})

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL must be less than 2048 characters')

// Redirect URL validation (relative or same-origin only)
export const redirectUrlSchema = z
  .string()
  .refine(
    (url) => {
      // Allow relative URLs (starting with /)
      if (url.startsWith('/') && !url.startsWith('//')) {
        return true
      }
      
      // Allow same-origin URLs
      try {
        const parsed = new URL(url)
        const allowedOrigins = (process.env.SSO_ALLOWED_ORIGINS || '').split(',')
        return allowedOrigins.some(origin => parsed.origin === origin.trim())
      } catch {
        return false
      }
    },
    { message: 'Redirect URL must be relative or same-origin' }
  )

// OAuth scope validation
export const scopeSchema = z
  .string()
  .regex(/^[a-z_]+( [a-z_]+)*$/, 'Invalid scope format')
  .max(255)

// Client ID validation (UUID or custom format)
export const clientIdSchema = z.union([
  uuidSchema,
  z.string().regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid client ID format'),
])

// ISO 8601 timestamp validation
export const timestampSchema = z
  .string()
  .datetime({ message: 'Invalid ISO 8601 timestamp' })

/**
 * Admin login validation schema
 */
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.union([passwordSchema, adminTokenSchema]),
})

/**
 * Admin user creation schema
 */
export const createAdminUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: roleSchema,
  password: adminTokenSchema,
})

/**
 * Admin user update schema
 */
export const updateAdminUserSchema = z.object({
  name: nameSchema.optional(),
  role: roleSchema.optional(),
  password: adminTokenSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
)

/**
 * Public user registration schema
 */
export const publicRegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
})

/**
 * Public user login schema
 */
export const publicLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

/**
 * OAuth authorization request schema
 */
export const oauthAuthorizeSchema = z.object({
  response_type: z.enum(['code']),
  client_id: clientIdSchema,
  redirect_uri: urlSchema,
  scope: scopeSchema,
  state: z.string().max(500),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['S256']).optional(),
})

/**
 * Permission update schema
 */
export const updatePermissionSchema = z.object({
  role: publicRoleSchema,
  status: permissionStatusSchema,
  grantedBy: z.string().optional(),
})

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * withValidation
 * 
 * WHAT: Higher-order function that wraps endpoint handlers with validation
 * WHY: Automatically validate request body/query before calling handler
 * HOW: Parse input with Zod schema, return 400 if invalid, else call handler
 * 
 * @param {Function} handler - The endpoint handler function
 * @param {Object} schemas - Validation schemas
 * @param {z.ZodSchema} schemas.body - Schema for request body (POST/PUT/PATCH)
 * @param {z.ZodSchema} schemas.query - Schema for query parameters (GET)
 * @returns {Function} Wrapped handler
 * 
 * @example
 * export default withValidation(
 *   async (req, res, validated) => {
 *     // validated.body contains validated request body
 *     // validated.query contains validated query params
 *   },
 *   {
 *     body: createAdminUserSchema,
 *     query: paginationSchema
 *   }
 * )
 */
export function withValidation(handler, schemas = {}) {
  return async (req, res) => {
    const validated = {}
    
    try {
      // Validate request body if schema provided
      if (schemas.body && req.body) {
        const result = schemas.body.safeParse(req.body)
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
      
      // Validate query parameters if schema provided
      if (schemas.query && req.query) {
        const result = schemas.query.safeParse(req.query)
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
      return await handler(req, res, validated)
      
    } catch (error) {
      console.error('[withValidation] Error:', error)
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Validation failed unexpectedly',
      })
    }
  }
}

/**
 * validateInput
 * 
 * WHAT: Validates input against a schema (for manual validation)
 * WHY: Sometimes need to validate mid-handler, not just at entry point
 * HOW: Parse with schema, throw on error or return validated data
 * 
 * @param {any} input - Data to validate
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {any} Validated data
 * @throws {Error} If validation fails
 * 
 * @example
 * const email = validateInput(req.body.email, emailSchema)
 */
export function validateInput(input, schema) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }
  return result.data
}

/**
 * sanitizeHtml
 * 
 * WHAT: Removes potentially dangerous HTML tags and attributes
 * WHY: Prevent XSS attacks when displaying user-generated content
 * HOW: Simple regex-based sanitization (for basic use; use DOMPurify for complex cases)
 * 
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return ''
  
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove <iframe> tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers (onclick, onerror, etc.)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
}

/**
 * sanitizeFilename
 * 
 * WHAT: Removes dangerous characters from filenames
 * WHY: Prevent directory traversal and command injection
 * HOW: Allow only alphanumeric, dash, underscore, dot
 * 
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return ''
  
  return filename
    .replace(/[^a-zA-Z0-9\-_.]/g, '_') // Replace unsafe chars with underscore
    .replace(/\.{2,}/g, '.') // Prevent directory traversal (..)
    .replace(/^\.+/, '') // Remove leading dots
    .slice(0, 255) // Limit length
}

/**
 * Role Hierarchy Helper Functions
 * WHAT: Utilities for managing role-based access control
 * WHY: Prevent accidental privilege escalation and protect owner accounts
 */

/**
 * isOwnerRole
 * WHAT: Check if a role is 'owner'
 * WHY: Owner role is immutable and requires special protection
 * 
 * @param {string} role - Role to check
 * @returns {boolean} True if role is 'owner'
 */
export function isOwnerRole(role) {
  return role === 'owner'
}

/**
 * canChangeRole
 * WHAT: Validates if an actor can change a target user's role
 * WHY: Prevent unauthorized role changes and protect owner accounts
 * 
 * @param {string} actorRole - Role of the person making the change
 * @param {string} currentRole - Current role of target user
 * @param {string} newRole - Proposed new role
 * @returns {{ allowed: boolean, reason?: string }} Validation result
 */
export function canChangeRole(actorRole, currentRole, newRole) {
  // WHAT: Owner role cannot be changed
  // WHY: Prevents accidental or malicious removal of system owners
  if (currentRole === 'owner' && newRole !== 'owner') {
    return {
      allowed: false,
      reason: 'Owner role cannot be changed. Owner accounts are immutable for security.'
    }
  }
  
  // WHAT: Only owners can create other owners
  // WHY: Prevents privilege escalation by non-owners
  if (newRole === 'owner' && actorRole !== 'owner') {
    return {
      allowed: false,
      reason: 'Only owners can create other owner accounts.'
    }
  }
  
  // WHAT: Only owners can modify owner accounts
  // WHY: Prevents unauthorized changes to owner accounts
  if (currentRole === 'owner' && actorRole !== 'owner') {
    return {
      allowed: false,
      reason: 'Only owners can modify owner accounts.'
    }
  }
  
  return { allowed: true }
}

/**
 * getRoleHierarchyLevel
 * WHAT: Returns numeric level for role comparison
 * WHY: Enables hierarchical role checks (e.g., admin > user)
 * 
 * @param {string} role - Role to get level for
 * @returns {number} Hierarchy level (higher = more privileged)
 */
export function getRoleHierarchyLevel(role) {
  const levels = {
    guest: 0,
    user: 1,
    admin: 2,
    owner: 3
  }
  return levels[role] ?? 0
}

/**
 * isRoleHigherOrEqual
 * WHAT: Check if one role has equal or higher privileges than another
 * WHY: Used for authorization checks (e.g., can admin manage user?)
 * 
 * @param {string} role - Role to check
 * @param {string} requiredRole - Minimum required role
 * @returns {boolean} True if role has sufficient privileges
 */
export function isRoleHigherOrEqual(role, requiredRole) {
  return getRoleHierarchyLevel(role) >= getRoleHierarchyLevel(requiredRole)
}
