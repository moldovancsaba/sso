// WHAT: Complete API endpoints reference for OAuth 2.0 SSO
// WHY: Developers need detailed endpoint documentation with examples
// HOW: Documents all OAuth, admin, and public endpoints with request/response samples

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function ApiEndpoints() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API Endpoints Reference</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          {/* WHAT: OAuth 2.0 Authorization Endpoints */}
          {/* WHY: Core authentication flow */}
          <section className={styles.section} id="oauth">
            <h2>OAuth 2.0 Authorization</h2>
            
            <h3>GET /api/oauth/authorize</h3>
            <p><strong>Start OAuth authorization flow</strong></p>
            <p>Redirects user to SSO login page. After authentication and permission check, redirects back with authorization code.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/auth/callback
  &response_type=code
  &scope=openid+profile+email
  &state=RANDOM_STATE_STRING

// Query Parameters:
// client_id (required) - Your OAuth client ID
// redirect_uri (required) - Registered callback URL
// response_type (required) - Must be "code"
// scope (required) - Space-separated scopes
// state (recommended) - CSRF protection token
// code_challenge (optional) - For PKCE
// code_challenge_method (optional) - Should be "S256"

// Success Response (redirect):
https://yourapp.com/auth/callback?code=AUTH_CODE&state=RANDOM_STATE_STRING

// Error Response (redirect):
https://yourapp.com/auth/callback?error=access_denied&error_description=User+denied+authorization`}
              </pre>
            </div>

            <h3>POST /api/oauth/token</h3>
            <p><strong>Exchange authorization code for tokens</strong></p>
            <p>Server-side only! Never expose client_secret in browser.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE_FROM_CALLBACK",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/auth/callback"
}

// Success Response (200 OK):
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGci...",
  "id_token": "eyJhbGci..."
}

// Error Response (400 Bad Request):
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or invalid"
}`}
              </pre>
            </div>

            <h3>POST /api/oauth/token (Refresh)</h3>
            <p><strong>Refresh access token using refresh token</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "eyJhbGci...",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}

// Success Response (200 OK):
{
  "access_token": "new_access_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new_refresh_token"  // May rotate
}`}
              </pre>
            </div>

            <h3>POST /api/oauth/revoke</h3>
            <p><strong>Revoke access or refresh token</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/oauth/revoke
Content-Type: application/json

{
  "token": "access_token_or_refresh_token",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}

// Success Response (200 OK):
{
  "success": true
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: OpenID Connect Discovery Endpoints */}
          {/* WHY: Auto-configuration for OAuth libraries */}
          <section className={styles.section} id="oidc">
            <h2>OpenID Connect Discovery</h2>
            
            <h3>GET /.well-known/openid-configuration</h3>
            <p><strong>OIDC discovery document</strong></p>
            <p>Returns metadata about the authorization server. Use this to auto-configure OAuth libraries.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/.well-known/openid-configuration

// Response (200 OK):
{
  "issuer": "https://sso.doneisbetter.com",
  "authorization_endpoint": "https://sso.doneisbetter.com/api/oauth/authorize",
  "token_endpoint": "https://sso.doneisbetter.com/api/oauth/token",
  "revocation_endpoint": "https://sso.doneisbetter.com/api/oauth/revoke",
  "jwks_uri": "https://sso.doneisbetter.com/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["HS256"],
  "scopes_supported": ["openid", "profile", "email"],
  "token_endpoint_auth_methods_supported": ["client_secret_post"],
  "code_challenge_methods_supported": ["S256"]
}`}
              </pre>
            </div>

            <h3>GET /.well-known/jwks.json</h3>
            <p><strong>JSON Web Key Set</strong></p>
            <p>Public keys for verifying JWT signatures (if using RS256).</p>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/.well-known/jwks.json

// Response (200 OK):
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-id",
      "use": "sig",
      "alg": "RS256",
      "n": "modulus",
      "e": "exponent"
    }
  ]
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: Public User API Endpoints */}
          {/* WHY: User registration and direct login */}
          <section className={styles.section} id="public">
            <h2>Public User API</h2>
            
            <h3>POST /api/public/register</h3>
            <p><strong>Register new user account</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/public/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",  // Optional, can use magic link instead
  "name": "John Doe"
}

// Success Response (201 Created):
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2025-10-15T16:22:16.000Z"
}

// Error Response (400 Bad Request):
{
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "User with this email already exists"
  }
}`}
              </pre>
            </div>

            <h3>POST /api/public/login</h3>
            <p><strong>Direct email + password login</strong></p>
            <p>Alternative to OAuth flow for simple integrations. Returns access token directly.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/public/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd",
  "clientId": "YOUR_CLIENT_ID"  // Check app permissions
}

// Success Response (200 OK):
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"  // App-level role if clientId provided
  }
}

// Error Response (401 Unauthorized):
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}`}
              </pre>
            </div>

            <h3>GET /api/public/session</h3>
            <p><strong>Validate Bearer token and get user info</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/api/public/session
Authorization: Bearer eyJhbGci...

// Success Response (200 OK):
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin"  // If accessed via OAuth with clientId
}

// Error Response (401 Unauthorized):
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token is invalid or expired"
  }
}`}
              </pre>
            </div>

            <h3>POST /api/public/magic-link</h3>
            <p><strong>Request passwordless magic link</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/public/magic-link
Content-Type: application/json

{
  "email": "user@example.com"
}

// Success Response (200 OK):
{
  "success": true,
  "message": "Magic link sent to user@example.com",
  "expiresIn": 900  // 15 minutes
}

// User receives email with link:
// https://sso.doneisbetter.com/api/admin/magic-link?t=MAGIC_TOKEN`}
              </pre>
            </div>

            <h3>POST /api/public/pin</h3>
            <p><strong>Request PIN code authentication</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/public/pin
Content-Type: application/json

{
  "email": "user@example.com"
}

// Success Response (200 OK):
{
  "success": true,
  "message": "PIN code sent to user@example.com",
  "expiresIn": 300  // 5 minutes
}

// User receives 6-digit PIN code via email`}
              </pre>
            </div>
          </section>

          {/* WHAT: Admin API Endpoints */}
          {/* WHY: Administrative operations */}
          <section className={styles.section} id="admin">
            <h2>Admin API</h2>
            <p><strong>Note:</strong> All admin endpoints require admin session cookie authentication.</p>

            <h3>POST /api/admin/login</h3>
            <p><strong>Admin authentication</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/admin/login
Content-Type: application/json

{
  "email": "admin@doneisbetter.com",
  "password": "32-hex-token-here"
}

// Success Response (200 OK):
// Sets Cookie: admin-session=...; HttpOnly; SameSite=Lax
{
  "success": true,
  "user": {
    "id": "admin-uuid",
    "email": "admin@doneisbetter.com",
    "name": "Admin Name",
    "role": "super-admin"
  }
}`}
              </pre>
            </div>

            <h3>GET /api/admin/users</h3>
            <p><strong>List all users</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/api/admin/users
Cookie: admin-session=...

// Success Response (200 OK):
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-10-15T16:22:16.000Z",
    "updatedAt": "2025-10-15T16:22:16.000Z"
  }
]`}
              </pre>
            </div>

            <h3>GET /api/admin/app-permissions/[userId]</h3>
            <p><strong>Get user's app permissions</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/api/admin/app-permissions/USER_UUID
Cookie: admin-session=...

// Success Response (200 OK):
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "apps": [
    {
      "clientId": "launchmass-client-id",
      "name": "Launchmass",
      "description": "Landing page builder",
      "role": "admin",
      "status": "approved",
      "grantedAt": "2025-10-15T14:30:00.000Z",
      "grantedBy": "admin-uuid"
    },
    {
      "clientId": "messmass-client-id",
      "name": "Messmass",
      "description": "Messaging platform",
      "role": "none",
      "status": "pending",
      "createdAt": "2025-10-15T16:00:00.000Z"
    }
  ]
}`}
              </pre>
            </div>

            <h3>POST /api/admin/app-permissions/[userId]</h3>
            <p><strong>Grant or approve app access</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/admin/app-permissions/USER_UUID
Cookie: admin-session=...
Content-Type: application/json

{
  "clientId": "launchmass-client-id",
  "role": "user",  // "user" or "admin"
  "status": "approved"
}

// Success Response (200 OK):
{
  "success": true,
  "permission": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "launchmass-client-id",
    "role": "user",
    "status": "approved",
    "grantedAt": "2025-10-15T16:22:16.000Z",
    "grantedBy": "admin-uuid"
  }
}`}
              </pre>
            </div>

            <h3>PATCH /api/admin/app-permissions/[userId]</h3>
            <p><strong>Update role (approved permissions only)</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`PATCH https://sso.doneisbetter.com/api/admin/app-permissions/USER_UUID
Cookie: admin-session=...
Content-Type: application/json

{
  "clientId": "launchmass-client-id",
  "role": "admin"  // Change from "user" to "admin"
}

// Success Response (200 OK):
{
  "success": true
}`}
              </pre>
            </div>

            <h3>DELETE /api/admin/app-permissions/[userId]</h3>
            <p><strong>Revoke app access</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`DELETE https://sso.doneisbetter.com/api/admin/app-permissions/USER_UUID
Cookie: admin-session=...
Content-Type: application/json

{
  "clientId": "launchmass-client-id"
}

// Success Response (200 OK):
{
  "success": true
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: Rate limiting reference */}
          {/* WHY: Help developers understand limits */}
          <section className={styles.section}>
            <h2>Rate Limiting</h2>
            <p>All endpoints are rate-limited. Limits vary by endpoint type:</p>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Endpoint Group</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Rate Limit</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Scope</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>OAuth authorization</td>
                  <td style={{ padding: '8px' }}>10 requests / minute</td>
                  <td style={{ padding: '8px' }}>Per IP address</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>Token exchange</td>
                  <td style={{ padding: '8px' }}>10 requests / minute</td>
                  <td style={{ padding: '8px' }}>Per client_id</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>Session validation</td>
                  <td style={{ padding: '8px' }}>60 requests / minute</td>
                  <td style={{ padding: '8px' }}>Per access token</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>User registration</td>
                  <td style={{ padding: '8px' }}>5 requests / hour</td>
                  <td style={{ padding: '8px' }}>Per IP address</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>Admin API</td>
                  <td style={{ padding: '8px' }}>30 requests / minute</td>
                  <td style={{ padding: '8px' }}>Per admin session</td>
                </tr>
              </tbody>
            </table>

            <h3>Rate Limit Headers</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Included in all responses
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1627399287  // Unix timestamp

// 429 Too Many Requests response
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Retry after 60 seconds.",
  "retry_after": 60
}`}
              </pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
