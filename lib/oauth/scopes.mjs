/**
 * OAuth2 Scope Definitions and Validation
 * 
 * Defines all supported OAuth2 scopes and provides utilities for scope validation.
 * Scopes control what data and actions a client application can access.
 * 
 * Standard OIDC Scopes:
 * - openid: Required for OIDC authentication
 * - profile: User profile information (name, picture, etc.)
 * - email: User email address
 * - offline_access: Request refresh token
 * 
 * Application-Specific Scopes:
 * - Custom scopes for specific apps (e.g., read:cards for narimato)
 */

import logger from '../logger.mjs'

/**
 * Scope definitions
 * Each scope has:
 * - id: Unique scope identifier
 * - name: Human-readable name
 * - description: What the scope grants access to
 * - category: Grouping for UI display
 * - required: Whether this scope is mandatory (e.g., openid)
 */
export const SCOPE_DEFINITIONS = {
  openid: {
    id: 'openid',
    name: 'OpenID',
    description: 'Required for authentication. Provides your user ID.',
    category: 'authentication',
    required: true,
  },
  profile: {
    id: 'profile',
    name: 'Profile',
    description: 'Access to your basic profile information (name, picture).',
    category: 'user_info',
    required: false,
  },
  email: {
    id: 'email',
    name: 'Email',
    description: 'Access to your email address.',
    category: 'user_info',
    required: false,
  },
  offline_access: {
    id: 'offline_access',
    name: 'Offline Access',
    description: 'Keep you signed in across sessions (refresh token).',
    category: 'authentication',
    required: false,
  },
  // Application-specific scopes for narimato.com
  'read:cards': {
    id: 'read:cards',
    name: 'Read Cards',
    description: 'View your card collection and rankings.',
    category: 'narimato',
    required: false,
  },
  'write:cards': {
    id: 'write:cards',
    name: 'Manage Cards',
    description: 'Create, update, and delete cards in your collection.',
    category: 'narimato',
    required: false,
  },
  'read:rankings': {
    id: 'read:rankings',
    name: 'Read Rankings',
    description: 'View global and personal card rankings.',
    category: 'narimato',
    required: false,
  },
  // Application-specific scopes for cardmass
  'read:decks': {
    id: 'read:decks',
    name: 'Read Decks',
    description: 'View your card decks.',
    category: 'cardmass',
    required: false,
  },
  'write:decks': {
    id: 'write:decks',
    name: 'Manage Decks',
    description: 'Create, update, and delete your card decks.',
    category: 'cardmass',
    required: false,
  },
  // Application-specific scopes for playmass
  'read:games': {
    id: 'read:games',
    name: 'Read Games',
    description: 'View your game history and statistics.',
    category: 'playmass',
    required: false,
  },
  'write:games': {
    id: 'write:games',
    name: 'Manage Games',
    description: 'Create and update game sessions.',
    category: 'playmass',
    required: false,
  },
}

/**
 * Default scope sets for common scenarios
 */
export const DEFAULT_SCOPES = {
  // Minimum OIDC authentication
  minimal: ['openid'],
  
  // Standard OIDC with profile
  standard: ['openid', 'profile', 'email'],
  
  // Full offline access
  full: ['openid', 'profile', 'email', 'offline_access'],
  
  // Narimato full access
  narimato: ['openid', 'profile', 'email', 'offline_access', 'read:cards', 'write:cards', 'read:rankings'],
  
  // CardMass full access
  cardmass: ['openid', 'profile', 'email', 'offline_access', 'read:decks', 'write:decks'],
  
  // PlayMass full access
  playmass: ['openid', 'profile', 'email', 'offline_access', 'read:games', 'write:games'],
}

/**
 * Parse scope string into array of scope IDs
 * 
 * @param {string} scopeString - Space-separated scope string (e.g., "openid profile email")
 * @returns {string[]} - Array of scope IDs
 */
export function parseScopes(scopeString) {
  if (!scopeString || typeof scopeString !== 'string') {
    return []
  }

  return scopeString
    .split(/\s+/)
    .filter(Boolean)
    .map(s => s.trim())
}

/**
 * Format scope array into space-separated string
 * 
 * @param {string[]} scopes - Array of scope IDs
 * @returns {string} - Space-separated scope string
 */
export function formatScopes(scopes) {
  if (!Array.isArray(scopes)) {
    return ''
  }

  return scopes.filter(Boolean).join(' ')
}

/**
 * Validate scope string
 * 
 * Checks if all requested scopes are valid (defined in SCOPE_DEFINITIONS).
 * Returns validation result with details.
 * 
 * @param {string} scopeString - Space-separated scope string
 * @returns {Object} - { valid: boolean, invalid: string[], missing: string[], scopes: string[] }
 */
export function validateScopes(scopeString) {
  const requestedScopes = parseScopes(scopeString)
  const validScopes = []
  const invalidScopes = []

  for (const scope of requestedScopes) {
    if (SCOPE_DEFINITIONS[scope]) {
      validScopes.push(scope)
    } else {
      invalidScopes.push(scope)
    }
  }

  // Check if required scopes are present
  const requiredScopes = Object.values(SCOPE_DEFINITIONS)
    .filter(def => def.required)
    .map(def => def.id)

  const missingRequired = requiredScopes.filter(req => !validScopes.includes(req))

  return {
    valid: invalidScopes.length === 0 && missingRequired.length === 0,
    scopes: validScopes,
    invalid: invalidScopes,
    missing: missingRequired,
  }
}

/**
 * Ensure required scopes are included
 * 
 * Adds required scopes (e.g., 'openid') if not present.
 * 
 * @param {string} scopeString - Space-separated scope string
 * @returns {string} - Scope string with required scopes added
 */
export function ensureRequiredScopes(scopeString) {
  const scopes = parseScopes(scopeString)
  const requiredScopes = Object.values(SCOPE_DEFINITIONS)
    .filter(def => def.required)
    .map(def => def.id)

  const allScopes = [...new Set([...requiredScopes, ...scopes])]
  return formatScopes(allScopes)
}

/**
 * Filter scopes based on allowed list
 * 
 * Returns only the scopes that are in the allowed list.
 * Useful for restricting client permissions.
 * 
 * @param {string} requestedScopes - Space-separated requested scopes
 * @param {string[]} allowedScopes - Array of allowed scope IDs
 * @returns {string} - Filtered scope string
 */
export function filterScopes(requestedScopes, allowedScopes) {
  if (!allowedScopes || !Array.isArray(allowedScopes)) {
    return ''
  }

  const requested = parseScopes(requestedScopes)
  const filtered = requested.filter(scope => allowedScopes.includes(scope))

  return formatScopes(filtered)
}

/**
 * Check if one scope set includes another
 * 
 * @param {string} scopeString - Space-separated scope string to check
 * @param {string} requiredScope - Required scope (or space-separated scopes)
 * @returns {boolean} - True if scopeString includes all scopes in requiredScope
 */
export function hasScope(scopeString, requiredScope) {
  const scopes = parseScopes(scopeString)
  const required = parseScopes(requiredScope)

  return required.every(req => scopes.includes(req))
}

/**
 * Get scope definitions for display in consent UI
 * 
 * @param {string} scopeString - Space-separated scope string
 * @returns {Object[]} - Array of scope definition objects
 */
export function getScopeDetails(scopeString) {
  const scopes = parseScopes(scopeString)

  return scopes
    .map(scope => SCOPE_DEFINITIONS[scope])
    .filter(Boolean) // Remove undefined (invalid scopes)
}

/**
 * Group scopes by category for UI display
 * 
 * @param {string} scopeString - Space-separated scope string
 * @returns {Object} - Scopes grouped by category { category: [scope, ...] }
 */
export function groupScopesByCategory(scopeString) {
  const scopeDetails = getScopeDetails(scopeString)
  const grouped = {}

  for (const scope of scopeDetails) {
    const category = scope.category || 'other'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(scope)
  }

  return grouped
}

/**
 * Validate that requested scopes are allowed for a client
 * 
 * @param {string} requestedScopes - Space-separated requested scopes
 * @param {string[]} clientAllowedScopes - Array of scopes allowed for this client
 * @returns {Object} - { valid: boolean, granted: string[], denied: string[] }
 */
export function validateClientScopes(requestedScopes, clientAllowedScopes) {
  const requested = parseScopes(requestedScopes)
  const granted = []
  const denied = []

  for (const scope of requested) {
    if (clientAllowedScopes.includes(scope)) {
      granted.push(scope)
    } else {
      denied.push(scope)
      logger.warn('Scope denied for client', {
        scope,
        requestedScopes,
        clientAllowedScopes,
      })
    }
  }

  return {
    valid: denied.length === 0,
    granted,
    denied,
    grantedString: formatScopes(granted),
  }
}

/**
 * Merge user consent with requested scopes
 * 
 * If user has previously consented to certain scopes, this function
 * determines which scopes need new consent.
 * 
 * @param {string} requestedScopes - Space-separated requested scopes
 * @param {string} previouslyGrantedScopes - Space-separated previously granted scopes
 * @returns {Object} - { alreadyGranted: string[], needsConsent: string[] }
 */
export function mergeConsent(requestedScopes, previouslyGrantedScopes) {
  const requested = parseScopes(requestedScopes)
  const previouslyGranted = parseScopes(previouslyGrantedScopes)

  const alreadyGranted = requested.filter(scope => previouslyGranted.includes(scope))
  const needsConsent = requested.filter(scope => !previouslyGranted.includes(scope))

  return {
    alreadyGranted,
    needsConsent,
    requiresConsent: needsConsent.length > 0,
  }
}

/**
 * Get OIDC claims that should be included based on scopes
 * 
 * Maps scopes to OIDC standard claims.
 * 
 * @param {string} scopeString - Space-separated scope string
 * @returns {string[]} - Array of claim names
 */
export function getClaimsForScopes(scopeString) {
  const scopes = parseScopes(scopeString)
  const claims = ['sub'] // 'sub' is always included

  if (scopes.includes('profile')) {
    claims.push('name', 'picture', 'updated_at')
  }

  if (scopes.includes('email')) {
    claims.push('email', 'email_verified')
  }

  return claims
}

/**
 * Check if scopes require offline access (refresh token)
 * 
 * @param {string} scopeString - Space-separated scope string
 * @returns {boolean} - True if offline_access is requested
 */
export function requiresRefreshToken(scopeString) {
  const scopes = parseScopes(scopeString)
  return scopes.includes('offline_access')
}

/**
 * Get human-readable description of scopes for logging
 * 
 * @param {string} scopeString - Space-separated scope string
 * @returns {string} - Human-readable description
 */
export function describeScopes(scopeString) {
  const scopeDetails = getScopeDetails(scopeString)
  
  if (scopeDetails.length === 0) {
    return 'No scopes'
  }

  return scopeDetails.map(s => s.name).join(', ')
}

/**
 * Export all valid scope IDs
 */
export const ALL_SCOPE_IDS = Object.keys(SCOPE_DEFINITIONS)

/**
 * Export scope categories
 */
export const SCOPE_CATEGORIES = {
  authentication: 'Authentication',
  user_info: 'User Information',
  narimato: 'Narimato',
  cardmass: 'CardMass',
  playmass: 'PlayMass',
  other: 'Other',
}
