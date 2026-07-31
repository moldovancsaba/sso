/**
 * lib/oauth/authorizationValidation.mjs
 * WHAT: Shared client / redirect_uri / PKCE / scope / internal-client-access validation
 *       for the OAuth2 authorization flow.
 * WHY: This logic used to live only in pages/api/oauth/authorize.js. The post-consent
 *      code-minting endpoint (pages/api/oauth/authorize/approve.js) trusted whatever
 *      client_id/redirect_uri/scope the browser sent it instead of re-running these
 *      checks, so a crafted request straight to that endpoint could get a real
 *      authorization code minted for an unregistered redirect_uri or a client the
 *      caller never had permission for. Centralizing it here means both endpoints
 *      enforce the same rules and can't drift apart again.
 */
import { getClient, validateRedirectUri, validateClientScopes } from './clients.mjs'
import { validateScopes, ensureRequiredScopes } from './scopes.mjs'
import { normalizePermissionRecord, permissionHasAccess } from '../appPermissions.mjs'
import { getDb } from '../db.mjs'

/**
 * validateAuthorizationRequest
 * Validates that a client exists/is active, PKCE requirements are met, redirect_uri is
 * registered to the client, and the requested scopes are valid and allowed for the client.
 *
 * @returns {Promise<{valid: boolean, redirectUriVerified: boolean, client?: Object, finalScope?: string, error?: string, error_description?: string}>}
 *   redirectUriVerified is true as soon as redirect_uri has been confirmed to belong to this
 *   client — callers can use it to decide whether it's safe to redirect errors back to the
 *   client (per OAuth 2.0 RFC 6749 §4.1.2.1, an invalid redirect_uri itself must never be
 *   used as a redirect target).
 */
export async function validateAuthorizationRequest({ client_id, redirect_uri, scope, code_challenge, code_challenge_method }) {
  const client = await getClient(client_id)
  if (!client) {
    return { valid: false, redirectUriVerified: false, error: 'invalid_client', error_description: 'Client not found' }
  }

  if (client.status !== 'active') {
    return { valid: false, redirectUriVerified: false, error: 'unauthorized_client', error_description: 'Client is suspended' }
  }

  if (client.require_pkce) {
    if (!code_challenge) {
      return { valid: false, redirectUriVerified: false, error: 'invalid_request', error_description: 'code_challenge is required (PKCE) for this client' }
    }
    if (!['S256', 'plain'].includes(code_challenge_method)) {
      return { valid: false, redirectUriVerified: false, error: 'invalid_request', error_description: 'code_challenge_method must be S256 or plain' }
    }
  } else if (code_challenge && !['S256', 'plain'].includes(code_challenge_method)) {
    return { valid: false, redirectUriVerified: false, error: 'invalid_request', error_description: 'code_challenge_method must be S256 or plain' }
  }

  const isValidRedirect = await validateRedirectUri(client_id, redirect_uri)
  if (!isValidRedirect) {
    return { valid: false, redirectUriVerified: false, error: 'invalid_request', error_description: 'Invalid redirect_uri' }
  }

  // redirect_uri is now confirmed to belong to this client — safe to use for error redirects.
  const scopeValidation = validateScopes(scope)
  if (!scopeValidation.valid) {
    return {
      valid: false,
      redirectUriVerified: true,
      client,
      error: 'invalid_scope',
      error_description: `Invalid scopes: ${scopeValidation.invalid.join(', ')}`,
    }
  }

  const finalScope = ensureRequiredScopes(scope)

  const isValidForClient = await validateClientScopes(client_id, finalScope)
  if (!isValidForClient) {
    return {
      valid: false,
      redirectUriVerified: true,
      client,
      error: 'invalid_scope',
      error_description: 'One or more scopes not allowed for this client',
    }
  }

  return { valid: true, redirectUriVerified: true, client, finalScope }
}

/**
 * checkInternalClientAccess
 * Internal clients (e.g. the SSO admin dashboard) require an explicit approved
 * appPermissions grant, not just user consent.
 *
 * @returns {Promise<{allowed: boolean, permission?: Object, error?: string, error_description?: string}>}
 */
export async function checkInternalClientAccess(client, userId) {
  if (!client.internal) {
    return { allowed: true }
  }

  const db = await getDb()
  const permission = normalizePermissionRecord(
    await db.collection('appPermissions').findOne({
      userId,
      clientId: client.client_id,
    })
  )

  if (!permission || !permissionHasAccess(permission.status, permission.role, permission.hasAccess)) {
    return { allowed: false, error: 'access_denied', error_description: 'Admin access not granted' }
  }

  return { allowed: true, permission }
}
