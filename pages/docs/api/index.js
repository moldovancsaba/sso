// WHAT: API Reference landing page for OAuth 2.0 SSO
// WHY: Developers need comprehensive API documentation for integration
// HOW: Documents OAuth 2.0 endpoints, token structures, and error codes

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function ApiDocs() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>DoneIsBetter SSO API Reference</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>

        <main className={styles.main}>
          {/* WHAT: API overview and warning */}
          {/* WHY: Set expectations about OAuth 2.0 */}
          <section className={styles.section}>
            <h2>Getting Started</h2>
            <div style={{ background: '#fff3e0', border: '1px solid #f57c00', borderRadius: '8px', padding: '16px', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>
                <strong>⚠️ OAuth 2.0 API</strong><br />
                This SSO uses standard OAuth 2.0 Authorization Code Flow. No proprietary client library required.
              </p>
            </div>
            <p>
              The DoneIsBetter SSO API is a fully OAuth 2.0 compliant authorization server.
              This reference provides complete documentation for all endpoints, token structures,
              and integration patterns.
            </p>

            <h3>Quick Start Example</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Step 1: Redirect user to authorization endpoint
window.location.href = 
  'https://sso.doneisbetter.com/api/oauth/authorize' +
  '?client_id=YOUR_CLIENT_ID' +
  '&redirect_uri=https://yourapp.com/auth/callback' +
  '&response_type=code' +
  '&scope=openid profile email';

// Step 2: Exchange authorization code for tokens (server-side)
const response = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: process.env.SSO_CLIENT_ID,
    client_secret: process.env.SSO_CLIENT_SECRET,
    redirect_uri: 'https://yourapp.com/auth/callback'
  })
});

const { access_token, id_token } = await response.json();`}
              </pre>
            </div>
          </section>

          {/* WHAT: Main endpoint categories */}
          {/* WHY: Quick reference to all API groups */}
          <section className={styles.section}>
            <h2>API Endpoint Categories</h2>
            
            <h3>OAuth 2.0 Authorization</h3>
            <p>Standard OAuth 2.0 endpoints for authentication and token management:</p>
            <ul>
              <li><code>GET /api/oauth/authorize</code> - Start OAuth flow, get authorization code</li>
              <li><code>POST /api/oauth/token</code> - Exchange code for access/refresh tokens</li>
              <li><code>POST /api/oauth/revoke</code> - Revoke access or refresh token</li>
            </ul>
            <p><a href="/docs/api/endpoints#oauth">View OAuth endpoints →</a></p>

            <h3>OpenID Connect Discovery</h3>
            <p>Standard OIDC discovery endpoints:</p>
            <ul>
              <li><code>GET /.well-known/openid-configuration</code> - OIDC discovery document</li>
              <li><code>GET /.well-known/jwks.json</code> - JSON Web Key Set for token verification</li>
            </ul>
            <p><a href="/docs/api/endpoints#oidc">View OIDC endpoints →</a></p>

            <h3>Public User API</h3>
            <p>User registration, login, and session management:</p>
            <ul>
              <li><code>POST /api/public/register</code> - Register new user account</li>
              <li><code>POST /api/public/login</code> - Direct login (email + password)</li>
              <li><code>GET /api/public/session</code> - Validate Bearer token session</li>
              <li><code>POST /api/public/magic-link</code> - Request passwordless magic link</li>
              <li><code>POST /api/public/pin</code> - Request PIN code authentication</li>
            </ul>
            <p><a href="/docs/api/endpoints#public">View public endpoints →</a></p>

            <h3>Admin API</h3>
            <p>Administrative endpoints (requires SSO admin authentication):</p>
            <ul>
              <li><code>POST /api/admin/login</code> - Admin authentication</li>
              <li><code>GET /api/admin/users</code> - List all users</li>
              <li><code>GET /api/admin/app-permissions/[userId]</code> - Get user's app permissions</li>
              <li><code>POST /api/admin/app-permissions/[userId]</code> - Grant app access</li>
              <li><code>DELETE /api/admin/app-permissions/[userId]</code> - Revoke app access</li>
            </ul>
            <p><a href="/docs/api/endpoints#admin">View admin endpoints →</a></p>
          </section>

          {/* WHAT: Token structure reference */}
          {/* WHY: Developers need to understand token payloads */}
          <section className={styles.section}>
            <h2>Token Structures</h2>
            <p>SSO issues three types of tokens:</p>
            
            <h3>Access Token (JWT)</h3>
            <p>Used for API authentication. Include in <code>Authorization: Bearer</code> header.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Decoded payload:
{
  "sub": "user-uuid",
  "iss": "https://sso.doneisbetter.com",
  "aud": "your-client-id",
  "exp": 1234571490,
  "iat": 1234567890
}

// Expiry: 1 hour
// Usage: Authorization: Bearer <access_token>`}
              </pre>
            </div>

            <h3>ID Token (JWT)</h3>
            <p>Contains user identity and app-level role. Decode to get user info.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Decoded payload:
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",  // App-level role: 'user' or 'admin'
  "iss": "https://sso.doneisbetter.com",
  "aud": "your-client-id",
  "exp": 1234571490,
  "iat": 1234567890
}

// Received once during token exchange
// No expiry checks needed (snapshot at issuance)`}
              </pre>
            </div>

            <h3>Refresh Token (JWT)</h3>
            <p>Used to obtain new access tokens without re-authentication.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Opaque to clients, don't decode
// Expiry: 30 days of inactivity
// Usage: POST /api/oauth/token with grant_type=refresh_token`}
              </pre>
            </div>
            <p><a href="/docs/api/responses">View complete response formats →</a></p>
          </section>

          {/* WHAT: Error handling overview */}
          {/* WHY: Guide developers to handle errors correctly */}
          <section className={styles.section}>
            <h2>Error Handling</h2>
            <p>The API uses standard HTTP status codes and OAuth 2.0 error codes:</p>
            
            <h3>HTTP Status Codes</h3>
            <ul>
              <li><code>200 OK</code> - Request successful</li>
              <li><code>400 Bad Request</code> - Invalid parameters or request body</li>
              <li><code>401 Unauthorized</code> - Invalid or expired token, authentication required</li>
              <li><code>403 Forbidden</code> - Valid auth but insufficient permissions</li>
              <li><code>404 Not Found</code> - Resource doesn't exist</li>
              <li><code>500 Internal Server Error</code> - Server error</li>
            </ul>

            <h3>OAuth 2.0 Error Response</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Authorization endpoint errors (query params)
https://yourapp.com/callback?error=access_denied&error_description=User+denied+authorization

// Token endpoint errors (JSON)
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or already used"
}

// API endpoint errors (JSON)
{
  "error": {
    "code": "APP_PERMISSION_DENIED",
    "message": "User does not have permission to access this application",
    "status": "pending"
  }
}`}
              </pre>
            </div>
            <p><a href="/docs/api/errors">View complete error reference →</a></p>
          </section>

          {/* WHAT: CORS configuration */}
          {/* WHY: Critical for cross-origin OAuth flows */}
          <section className={styles.section}>
            <h2>CORS Configuration</h2>
            <p>
              OAuth authorization and token endpoints require proper CORS configuration.
              Your OAuth client's redirect URIs are automatically whitelisted.
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Browser automatically includes:
Origin: https://yourapp.com

// SSO responds with:
Access-Control-Allow-Origin: https://yourapp.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization`}
              </pre>
            </div>
            <p><strong>Note:</strong> Token exchange MUST happen server-side (no CORS issues).</p>
          </section>

          {/* WHAT: OAuth library recommendations */}
          {/* WHY: Help developers choose appropriate OAuth libraries */}
          <section className={styles.section}>
            <h2>OAuth 2.0 Libraries</h2>
            <p>
              Use standard OAuth 2.0 libraries for your platform. No proprietary client library needed.
            </p>

            <h3>Recommended Libraries</h3>
            <ul>
              <li>
                <strong>Node.js</strong>
                <ul>
                  <li><code>passport-oauth2</code> - Passport.js OAuth 2.0 strategy</li>
                  <li><code>next-auth</code> - NextAuth.js with custom OAuth provider</li>
                  <li><code>simple-oauth2</code> - Lightweight OAuth 2.0 client</li>
                </ul>
              </li>
              <li>
                <strong>Python</strong>
                <ul>
                  <li><code>authlib</code> - Comprehensive OAuth library</li>
                  <li><code>requests-oauthlib</code> - OAuth for requests library</li>
                </ul>
              </li>
              <li>
                <strong>Go</strong>
                <ul>
                  <li><code>golang.org/x/oauth2</code> - Official Go OAuth 2.0 package</li>
                </ul>
              </li>
              <li>
                <strong>Java</strong>
                <ul>
                  <li><code>spring-security-oauth2</code> - Spring Security OAuth</li>
                </ul>
              </li>
            </ul>

            <h3>OpenID Connect Discovery</h3>
            <p>Configure libraries using OIDC discovery endpoint:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Discovery URL
https://sso.doneisbetter.com/.well-known/openid-configuration

// Auto-configures all OAuth endpoints, JWKS URL, supported scopes, etc.`}
              </pre>
            </div>
          </section>

          {/* WHAT: Rate limiting information */}
          {/* WHY: Developers need to handle rate limits */}
          <section className={styles.section}>
            <h2>Rate Limiting</h2>
            <p>API endpoints are rate limited to ensure service stability:</p>
            <ul>
              <li><strong>OAuth endpoints:</strong> 10 requests per minute per IP</li>
              <li><strong>Token validation:</strong> 60 requests per minute per token</li>
              <li><strong>Admin API:</strong> 30 requests per minute per admin session</li>
              <li><strong>Public registration:</strong> 5 requests per hour per IP</li>
            </ul>
            <div className={styles.codeBlock}>
              <pre>
                {`// Rate limit headers in response
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1627399287  // Unix timestamp

// 429 Too Many Requests response
{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Retry after 60 seconds.",
  "retry_after": 60
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: Related documentation links */}
          {/* WHY: Guide users to specific docs */}
          <section className={styles.section}>
            <h2>Related Documentation</h2>
            <ul>
              <li><a href="/docs/api/endpoints">Complete Endpoint Reference</a> - All API endpoints with examples</li>
              <li><a href="/docs/api/responses">Response Formats</a> - Token structures and response schemas</li>
              <li><a href="/docs/api/errors">Error Reference</a> - All error codes and handling</li>
              <li><a href="/docs/quickstart">Quick Start Guide</a> - Integration tutorial</li>
              <li><a href="/docs/authentication">Authentication Guide</a> - OAuth 2.0 flow details</li>
              <li><a href="/docs/app-permissions">App Permissions</a> - Permission system</li>
            </ul>
          </section>

          {/* WHAT: Support information */}
          {/* WHY: Help developers get assistance */}
          <section className={styles.section}>
            <h2>Support</h2>
            <ul>
              <li>Email: <a href="mailto:sso@doneisbetter.com">sso@doneisbetter.com</a></li>
              <li>Documentation: <a href="https://sso.doneisbetter.com/docs">https://sso.doneisbetter.com/docs</a></li>
              <li>Admin Panel: <a href="https://sso.doneisbetter.com/admin">https://sso.doneisbetter.com/admin</a></li>
              <li>GitHub: <a href="https://github.com/moldovancsaba/sso">https://github.com/moldovancsaba/sso</a></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
