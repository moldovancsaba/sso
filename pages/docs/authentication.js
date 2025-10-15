// WHAT: Complete OAuth 2.0 authentication documentation
// WHY: Developers need to understand the full OAuth flow and security model
// HOW: OAuth 2.0 Authorization Code Flow with PKCE support and app permissions

import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function Authentication() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Authentication Guide</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          {/* WHAT: Overview section */}
          {/* WHY: Set expectations about OAuth 2.0 requirements */}
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              DoneIsBetter SSO implements <strong>OAuth 2.0 Authorization Code Flow</strong> with PKCE support.
              This is a standard, secure authentication protocol used by major providers (Google, GitHub, etc.).
            </p>
            <p><strong>Key Features:</strong></p>
            <ul>
              <li>Standard OAuth 2.0 - No proprietary client library needed</li>
              <li>JWT-based tokens (access_token, refresh_token, id_token)</li>
              <li>App-level permission control (pending → approved → revoked)</li>
              <li>Role-based access within apps (user vs admin)</li>
              <li>PKCE support for public clients (mobile apps, SPAs)</li>
              <li>OpenID Connect compliance (/.well-known endpoints)</li>
            </ul>
          </section>

          {/* WHAT: Complete OAuth 2.0 flow diagram */}
          {/* WHY: Visual understanding of authorization code flow */}
          <section className={styles.section}>
            <h2>OAuth 2.0 Flow Diagram</h2>
            <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', fontFamily: 'monospace', fontSize: '13px' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`┌─────────────┐                                    ┌──────────────┐
│  Your App   │                                    │  SSO Server  │
│  (Client)   │                                    │              │
└──────┬──────┘                                    └──────┬───────┘
       │                                                  │
       │ 1. Redirect to /api/oauth/authorize              │
       │    with client_id, redirect_uri, scope           │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │                                      2. User logs in
       │                                      3. Check app permissions
       │                                         - approved? → continue
       │                                         - pending? → show message
       │                                         - revoked? → deny
       │                                                  │
       │ 4. Redirect to your redirect_uri with code       │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 5. POST /api/oauth/token                         │
       │    with code, client_id, client_secret           │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │ 6. Return tokens                                 │
       │    { access_token, refresh_token, id_token }     │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 7. Use access_token for API calls               │
       │    Authorization: Bearer <access_token>          │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │ 8. Token expires after 1 hour                    │
       │                                                  │
       │ 9. POST /api/oauth/token with refresh_token      │
       ├─────────────────────────────────────────────────>│
       │                                                  │
       │ 10. Return new access_token                      │
       │<─────────────────────────────────────────────────┤
`}
              </pre>
            </div>
          </section>

          {/* WHAT: Detailed OAuth flow steps */}
          {/* WHY: Step-by-step implementation guide */}
          <section className={styles.section}>
            <h2>OAuth 2.0 Flow Steps</h2>
            
            <h3>Step 1: Authorization Request</h3>
            <p>Redirect the user to the SSO authorization endpoint:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/api/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://yourapp.com/auth/callback&response_type=code&scope=openid%20profile%20email&state=RANDOM_STATE_STRING`}
              </pre>
            </div>
            <p><strong>Required Parameters:</strong></p>
            <ul>
              <li><code>client_id</code> - Your OAuth client ID (UUID)</li>
              <li><code>redirect_uri</code> - Where SSO redirects after authentication (must be registered)</li>
              <li><code>response_type</code> - Always <code>code</code> for authorization code flow</li>
              <li><code>scope</code> - Space-separated scopes (e.g., <code>openid profile email</code>)</li>
            </ul>
            <p><strong>Optional Parameters:</strong></p>
            <ul>
              <li><code>state</code> - Random string to prevent CSRF attacks (recommended)</li>
              <li><code>code_challenge</code> - For PKCE (required for public clients)</li>
              <li><code>code_challenge_method</code> - Should be <code>S256</code></li>
            </ul>

            <h3>Step 2: User Authentication</h3>
            <p>SSO presents a login page. Users can authenticate via:</p>
            <ul>
              <li><strong>Email + Password</strong> - Traditional login</li>
              <li><strong>Magic Link</strong> - Passwordless email link (15 min expiry)</li>
              <li><strong>PIN Code</strong> - 6-digit time-based code</li>
            </ul>

            <h3>Step 3: Permission Check</h3>
            <p>After authentication, SSO checks if user has permission to access your app:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// SSO checks appPermissions collection:
{
  userId: "user-uuid",
  clientId: "your-client-id",
  status: "approved",  // Can be: approved, pending, revoked, none
  role: "admin"        // App-level role: user or admin
}`}
              </pre>
            </div>
            <p><strong>Status Outcomes:</strong></p>
            <ul>
              <li><code>approved</code> - User can access (proceed to step 4)</li>
              <li><code>pending</code> - SSO shows "Access Pending Approval" message</li>
              <li><code>revoked</code> or <code>none</code> - SSO shows "Access Denied"</li>
            </ul>
            <p style={{ background: '#e8f5e9', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
              🔒 <strong>Security Note:</strong> Only SSO admins can approve/revoke app access. 
              Apps cannot grant themselves permission. See <a href="/docs/admin-approval">Admin Approval Guide</a>.
            </p>

            <h3>Step 4: Authorization Code Redirect</h3>
            <p>If approved, SSO redirects back to your app with an authorization code:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`https://yourapp.com/auth/callback?code=AUTH_CODE&state=RANDOM_STATE_STRING`}
              </pre>
            </div>
            <p><strong>Important:</strong> Authorization codes are:</p>
            <ul>
              <li>Single-use only</li>
              <li>Expire after 10 minutes</li>
              <li>Must be exchanged server-side (never in browser)</li>
            </ul>

            <h3>Step 5: Token Exchange (Server-Side Only!)</h3>
            <p>Exchange the authorization code for tokens:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/auth/callback"
}`}
              </pre>
            </div>
            <p><strong>Response:</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}`}
              </pre>
            </div>

            <h3>Step 6: Decode ID Token</h3>
            <p>The <code>id_token</code> contains user identity and app-level role:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Decode JWT (no verification needed if received from /token directly)
const jwt = require('jsonwebtoken');
const userInfo = jwt.decode(id_token);

// userInfo payload:
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User UUID
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",  // App-level role: 'user' or 'admin'
  "iat": 1234567890,
  "exp": 1234571490,
  "iss": "https://sso.doneisbetter.com",
  "aud": "YOUR_CLIENT_ID"
}`}
              </pre>
            </div>

            <h3>Step 7: Use Access Token</h3>
            <p>Include <code>access_token</code> in API requests:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/api/public/session
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Response:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin"
}`}
              </pre>
            </div>

            <h3>Step 8: Token Refresh</h3>
            <p>Access tokens expire after 1 hour. Refresh without re-login:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}

// Response:
{
  "access_token": "new_access_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new_refresh_token"  // May rotate
}`}
              </pre>
            </div>

            <h3>Step 9: Token Revocation (Logout)</h3>
            <p>Revoke tokens when user logs out:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/oauth/revoke
Content-Type: application/json

{
  "token": "access_token_or_refresh_token",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: Security best practices */}
          {/* WHY: Prevent common OAuth vulnerabilities */}
          <section className={styles.section}>
            <h2>Security Considerations</h2>
            <ul>
              <li>
                <strong>HTTPS Only</strong>
                <p>All OAuth endpoints require HTTPS in production. HTTP only allowed in development.</p>
              </li>
              <li>
                <strong>Client Secret Protection</strong>
                <p>NEVER expose <code>client_secret</code> in browser code. Token exchange MUST happen server-side.</p>
              </li>
              <li>
                <strong>State Parameter</strong>
                <p>Always use <code>state</code> parameter to prevent CSRF attacks. Validate it matches after redirect.</p>
              </li>
              <li>
                <strong>PKCE for Public Clients</strong>
                <p>If your app is a SPA or mobile app (can't securely store client_secret), use PKCE.</p>
              </li>
              <li>
                <strong>Token Storage</strong>
                <p>Store tokens in HttpOnly cookies (backend) or secure memory (frontend - never localStorage for refresh tokens).</p>
              </li>
              <li>
                <strong>Token Expiration</strong>
                <p>Access tokens expire after 1 hour. Refresh tokens expire after 30 days of inactivity.</p>
              </li>
              <li>
                <strong>Redirect URI Validation</strong>
                <p>SSO validates redirect_uri exactly matches registered URIs. No wildcards or partial matches.</p>
              </li>
              <li>
                <strong>Permission Revocation</strong>
                <p>If SSO admin revokes app access, user's existing tokens remain valid until expiry. Implement periodic session validation.</p>
              </li>
            </ul>
          </section>

          {/* WHAT: Error handling guide */}
          {/* WHY: Help developers handle OAuth errors gracefully */}
          <section className={styles.section}>
            <h2>Error Handling</h2>
            <p>Common OAuth errors and how to handle them:</p>
            
            <h3>Authorization Errors (Step 1-3)</h3>
            <ul>
              <li>
                <code>access_pending</code> - User account exists but access not yet approved
                <p>Show: "Your access request is pending admin approval."</p>
              </li>
              <li>
                <code>access_denied</code> - User denied authorization or doesn't have permission
                <p>Show: "You don't have permission to access this application."</p>
              </li>
              <li>
                <code>invalid_client</code> - client_id not found or client suspended
                <p>Action: Check client_id, contact SSO admins</p>
              </li>
              <li>
                <code>unauthorized_client</code> - Client not allowed to use this grant type
                <p>Action: Verify OAuth client configuration</p>
              </li>
              <li>
                <code>invalid_scope</code> - Requested scope not allowed for this client
                <p>Action: Request only registered scopes</p>
              </li>
            </ul>

            <h3>Token Errors (Step 5, 8)</h3>
            <ul>
              <li>
                <code>invalid_grant</code> - Authorization code invalid, expired, or already used
                <p>Action: Start OAuth flow again from step 1</p>
              </li>
              <li>
                <code>invalid_client_secret</code> - Client credentials wrong
                <p>Action: Verify environment variables</p>
              </li>
              <li>
                <code>redirect_uri_mismatch</code> - redirect_uri doesn't match registered URI
                <p>Action: Use exact registered URI (including protocol, port)</p>
              </li>
            </ul>

            <h3>API Errors (Step 7)</h3>
            <ul>
              <li>
                <code>401 Unauthorized</code> - Access token invalid, expired, or revoked
                <p>Action: Try refresh token, then re-authenticate if that fails</p>
              </li>
              <li>
                <code>403 Forbidden</code> - User lost app permission
                <p>Action: Show "Access revoked" message, clear session</p>
              </li>
            </ul>
          </section>

          {/* WHAT: Best practices checklist */}
          {/* WHY: Ensure secure, reliable OAuth implementation */}
          <section className={styles.section}>
            <h2>Implementation Best Practices</h2>
            <ol>
              <li>✅ Always use <code>state</code> parameter to prevent CSRF</li>
              <li>✅ Exchange authorization code server-side (never in browser)</li>
              <li>✅ Store <code>client_secret</code> in environment variables, never in code</li>
              <li>✅ Implement token refresh before access token expires</li>
              <li>✅ Handle permission errors gracefully (pending/revoked states)</li>
              <li>✅ Validate <code>state</code> parameter on callback</li>
              <li>✅ Use HTTPS in production (required by SSO)</li>
              <li>✅ Clear tokens on logout (call /api/oauth/revoke)</li>
              <li>✅ Periodically validate session (detect revoked access)</li>
              <li>✅ Log OAuth errors for debugging (but never log secrets!)</li>
            </ol>
          </section>

          {/* WHAT: OpenID Connect information */}
          {/* WHY: Some developers may want to use OIDC discovery */}
          <section className={styles.section}>
            <h2>OpenID Connect Support</h2>
            <p>DoneIsBetter SSO is OpenID Connect compliant. Discovery endpoints:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Discovery document
GET https://sso.doneisbetter.com/.well-known/openid-configuration

// JWKS (public keys for token verification)
GET https://sso.doneisbetter.com/.well-known/jwks.json`}
              </pre>
            </div>
            <p>Use these endpoints to automatically configure OAuth libraries (e.g., Passport.js, NextAuth.js).</p>
          </section>

          {/* WHAT: Related documentation links */}
          {/* WHY: Guide users to complementary docs */}
          <section className={styles.section}>
            <h2>Related Documentation</h2>
            <ul>
              <li><a href="/docs/quickstart">Quick Start Guide</a> - Get started quickly</li>
              <li><a href="/docs/app-permissions">App Permissions</a> - Understanding approval workflow</li>
              <li><a href="/docs/admin-approval">Admin Approval Process</a> - How users get access</li>
              <li><a href="/docs/api">API Reference</a> - Complete endpoint docs</li>
              <li><a href="/docs/security/best-practices">Security Best Practices</a></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
