/**
 * OpenID Connect Discovery Endpoint
 * 
 * GET /.well-known/openid-configuration
 * 
 * This endpoint exposes metadata about the OAuth2/OIDC server,
 * allowing clients to auto-discover endpoints and capabilities.
 * 
 * This is a standard OIDC endpoint that clients can use to configure
 * themselves automatically without hardcoding URLs.
 * 
 * Spec: https://openid.net/specs/openid-connect-discovery-1_0.html
 */

import { runCors } from '../../../lib/cors.mjs'

export default async function handler(req, res) {
  // Apply CORS
  if (runCors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get base URL from environment or request
  const baseUrl = process.env.SSO_BASE_URL || 
                  process.env.JWT_ISSUER || 
                  `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`

  // OIDC Discovery Document
  const discoveryDocument = {
    // Issuer identifier (must match JWT iss claim)
    issuer: baseUrl,

    // OAuth2/OIDC Endpoints
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    userinfo_endpoint: `${baseUrl}/api/oauth/userinfo`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    
    // Token management endpoints
    revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
    introspection_endpoint: `${baseUrl}/api/oauth/introspect`,

    // Supported response types
    response_types_supported: [
      'code', // Authorization Code Flow
    ],

    // Supported grant types
    grant_types_supported: [
      'authorization_code',
      'refresh_token',
    ],

    // Supported subject types
    subject_types_supported: [
      'public', // Subject identifier is the same for all clients
    ],

    // Supported signing algorithms for ID tokens
    id_token_signing_alg_values_supported: [
      'RS256', // RSA signature with SHA-256
    ],

    // Supported scopes
    scopes_supported: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'read:cards',
      'write:cards',
      'read:rankings',
      'read:decks',
      'write:decks',
      'read:games',
      'write:games',
    ],

    // Supported claims in ID tokens
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'name',
      'email',
      'email_verified',
      'updated_at',
    ],

    // Supported authentication methods at token endpoint
    token_endpoint_auth_methods_supported: [
      'client_secret_post', // Client credentials in POST body
      'client_secret_basic', // Client credentials in Authorization header
    ],

    // PKCE support
    code_challenge_methods_supported: [
      'S256', // SHA-256 (recommended)
      'plain', // Plain text (not recommended but supported)
    ],

    // Response modes supported
    response_modes_supported: [
      'query', // Parameters in query string
    ],

    // Token endpoint authentication signing algorithms
    token_endpoint_auth_signing_alg_values_supported: [
      'RS256',
    ],

    // Service documentation URL
    service_documentation: `${baseUrl}/docs`,

    // UI locales supported
    ui_locales_supported: [
      'en-US',
    ],

    // Claims parameter supported
    claims_parameter_supported: false,

    // Request parameter supported
    request_parameter_supported: false,

    // Request URI parameter supported
    request_uri_parameter_supported: false,

    // Require request URI registration
    require_request_uri_registration: false,

    // Prompt values supported
    prompt_values_supported: [
      'none',    // No UI, return error if interaction required
      'login',   // Force re-authentication even if user has session
      'consent', // Force consent screen even if already granted
      'select_account', // Prompt user to select account (treated as consent)
    ],
  }

  // Set cache headers (discovery documents can be cached)
  res.setHeader('Cache-Control', 'public, max-age=3600') // 1 hour
  res.setHeader('Content-Type', 'application/json')

  return res.status(200).json(discoveryDocument)
}
