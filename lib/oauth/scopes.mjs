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
  roles: {
    id: 'roles',
    name: 'User Roles',
    description: 'Access to your user role information (admin, user).',
    category: 'user_info',
    required: false,
  },
  // WHAT: Machine-to-machine scope for the client_credentials grant.
  // WHY: The permission APIs (pages/api/users/[userId]/apps/[clientId]/permissions.js)
  //      gate writes on this scope, and pages/api/oauth/token.js issues it by default for
  //      client_credentials. It was never registered here, so validateScopes() rejected it
  //      as unknown on the /authorize path and it was absent from OIDC discovery.
  manage_permissions: {
    id: 'manage_permissions',
    name: 'Manage App Permissions',
    description: 'Read and write per-user app permission records for this application.',
    category: 'service',
    required: false,
    // WHAT: Only obtainable through the client_credentials grant.
    // WHY: This scope lets its bearer write permission records for *any* user of the
    //      client. A user-bound token must never carry it, or a single end user of an
    //      app could edit every other user's access. validateScopes() - which only runs
    //      on the /authorize path - rejects machine-only scopes for exactly this reason.
    machineOnly: true,
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
  // WHAT: Per-resource machine scopes for the client_credentials grant.
  // WHY: `manage_permissions` was the ONLY machineOnly scope, and it means "rewrite any
  //      user's app-permission records at SSO". A content pipeline that needs to write a
  //      provider record to classscout has nothing to do with SSO permissions, so before
  //      these existed the only obtainable machine scope was one that granted far more than
  //      any caller needed. Named `<resource>:<capability>` so a scope in an audit log says
  //      which system it acts on without a lookup - `write:cards` above does not.
  'classscout:ingest.write': {
    id: 'classscout:ingest.write',
    name: 'ClassScout Ingest (write)',
    description: 'Create and patch provider records through the ClassScout ingest API.',
    category: 'service',
    required: false,
    machineOnly: true,
  },
  'classscout:catalog.read': {
    id: 'classscout:catalog.read',
    name: 'ClassScout Catalog (read)',
    description: 'Read the ClassScout provider catalog through the ingest API.',
    category: 'service',
    required: false,
    machineOnly: true,
  },
  'management:ingest.write': {
    id: 'management:ingest.write',
    name: 'Management Ingest (write)',
    description: 'Create and patch listing records through the management ingest API.',
    category: 'service',
    required: false,
    machineOnly: true,
  },
  'management:catalog.read': {
    id: 'management:catalog.read',
    name: 'Management Catalog (read)',
    description: 'Read the management listing catalog through the ingest API.',
    category: 'service',
    required: false,
    machineOnly: true,
  },
  // WHY: the two scopes above authorize the content pipeline against management's ingest
  //      API; neither authorizes the STAFF console (Products page, admin actions) at all.
  //      A caller that needs to operate management's staff surfaces headlessly — an agent
  //      or a scheduled job, not a person at a browser — had no machine scope to request,
  //      only the human authorization_code flow through a real staff login. This is that
  //      scope. Deliberately separate from the two above: a caller holding ingest access
  //      should not thereby also be able to act as staff, and vice versa.
  'management:staff': {
    id: 'management:staff',
    name: 'Management Staff Access',
    description: 'Act as staff in the management app (console, admin actions) with no human login.',
    category: 'service',
    required: false,
    machineOnly: true,
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
 * Resource names that a machine scope can name, derived from SCOPE_DEFINITIONS.
 *
 * WHAT: the set of `<resource>` prefixes appearing on machine-only scopes written as
 *       `<resource>:<capability>`.
 * WHY: pages/api/oauth/token.js turns this into a token's `aud`. Deriving it from the scope
 *      table rather than hand-listing it means adding a resource scope above is the only edit
 *      needed - a second hand-maintained list would eventually disagree with the first.
 *      `manage_permissions` (machine-only, no colon) and `read:cards` (colon, not machine-only)
 *      are both correctly excluded: the first names no resource, the second is a user scope
 *      whose `read` prefix is a verb, not a system.
 */
export const RESOURCE_SCOPE_PREFIXES = new Set(
  Object.values(SCOPE_DEFINITIONS)
    .filter((s) => s.machineOnly && s.id.includes(':'))
    .map((s) => s.id.split(':')[0])
)

/**
 * Resolve the `aud` claim for a client_credentials token from the scopes it requested.
 *
 * WHAT: returns the single resource named by the requested scopes, or null when they name
 *       none. Returns ok:false when they name more than one.
 * WHY: `aud` must identify the resource server so it can reject a token minted for a
 *       different one (RFC 9068 s4). Two resources in one token would defeat that - the
 *       classscout token and the management token would be the same bearer string, so
 *       leaking one would leak both. One token per resource keeps blast radius to one system.
 *       Lives here rather than in the route so it is unit-testable without an HTTP harness.
 *
 * @param {string[]} scopeIds - Already-validated scopes the client asked for
 * @returns {{ok: true, audience: string|null} | {ok: false, resources: string[]}}
 */
export function resolveMachineAudience(scopeIds) {
  const resources = [...new Set(
    scopeIds
      .map((s) => s.split(':')[0])
      .filter((prefix) => RESOURCE_SCOPE_PREFIXES.has(prefix))
  )]

  if (resources.length > 1) {
    return { ok: false, resources }
  }
  return { ok: true, audience: resources[0] || null }
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
    const definition = SCOPE_DEFINITIONS[scope]

    // WHAT: Machine-only scopes are treated as invalid here.
    // WHY: This function gates the interactive /authorize flow, which always produces a
    //      user-bound token. Machine-only scopes are reachable solely through
    //      client_credentials, which validates against client.allowed_scopes instead.
    if (definition && !definition.machineOnly) {
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
  service: 'Service-to-Service',
  narimato: 'Narimato',
  cardmass: 'CardMass',
  playmass: 'PlayMass',
  other: 'Other',
}
