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
          <section className={styles.section} id="oauth">
            <h2>OAuth / OIDC</h2>

            <h3>GET /api/oauth/authorize</h3>
            <p>Starts the OAuth authorization-code flow.</p>
            <div className={styles.codeBlock}>
              <pre>{`GET /api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/auth/callback
  &response_type=code
  &scope=openid%20profile%20email%20offline_access
  &state=RANDOM_STATE
  &nonce=RANDOM_NONCE
  &code_challenge=PKCE_CHALLENGE
  &code_challenge_method=S256`}</pre>
            </div>
            <p>Optional parameters currently supported include <code>prompt</code>, <code>provider</code>, and <code>login_hint</code>.</p>

            <h3>POST /api/oauth/token</h3>
            <p>Exchanges an authorization code or refresh token for new tokens.</p>
            <div className={styles.codeBlock}>
              <pre>{`POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/auth/callback",
  "code_verifier": "PKCE_VERIFIER"
}`}</pre>
            </div>

            <h3>GET /api/oauth/userinfo</h3>
            <p>Returns OIDC claims for the current access token.</p>

            <h3>POST /api/oauth/revoke</h3>
            <p>Revokes a token owned by the requesting client.</p>

            <h3>GET /.well-known/openid-configuration</h3>
            <p>Returns discovery metadata for OIDC clients.</p>

            <h3>GET /.well-known/jwks.json</h3>
            <p>Returns the public signing keys used for JWT verification.</p>
          </section>

          <section className={styles.section} id="public">
            <h2>Public Authentication</h2>

            <h3>POST /api/public/register</h3>
            <p>Creates a new public user, or adds a password to an existing social-only account with the same email.</p>
            <div className={styles.codeBlock}>
              <pre>{`POST /api/public/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123",
  "name": "User Name"
}`}</pre>
            </div>

            <h3>POST /api/public/login</h3>
            <p>Authenticates a user with email and password, then sets the <code>public-session</code> cookie.</p>
            <div className={styles.codeBlock}>
              <pre>{`POST /api/public/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123"
}`}</pre>
            </div>
            <p>This endpoint is cookie-session based. It does not return OAuth tokens.</p>

            <h3>POST /api/public/request-magic-link</h3>
            <p>Requests a passwordless magic link for a verified public user account.</p>
            <div className={styles.codeBlock}>
              <pre>{`POST /api/public/request-magic-link
Content-Type: application/json

{
  "email": "user@example.com",
  "redirect_uri": "https://yourapp.com/after-login"
}`}</pre>
            </div>
            <p>Response is intentionally generic even when the account does not exist.</p>

            <h3>POST /api/public/verify-pin</h3>
            <p>Completes a PIN-gated login flow.</p>

            <h3>GET /api/public/session</h3>
            <p>Validates the <code>public-session</code> cookie and returns sanitized user information.</p>

            <h3>GET /api/sso/validate</h3>
            <p>Compatibility endpoint for shared-domain session validation.</p>
          </section>

          <section className={styles.section} id="social">
            <h2>Social Login</h2>

            <h3>GET /api/auth/google/login</h3>
            <h3>GET /api/auth/google/callback</h3>
            <h3>GET /api/auth/facebook/login</h3>
            <h3>GET /api/auth/facebook/callback</h3>

            <p>
              Social login uses the same hosted SSO flow, with canonical callback-state parsing,
              CSRF binding, and public-session creation. These callbacks can also resume an OAuth flow
              when the login originated inside <code>/api/oauth/authorize</code>.
            </p>
          </section>

          <section className={styles.section} id="permissions">
            <h2>Permission APIs</h2>

            <h3>GET /api/users/[userId]/apps/[clientId]/permissions</h3>
            <p>Reads a permission record for a user/client pair.</p>
            <p>Allowed via:</p>
            <ul>
              <li>matching user-bound access token for the same client</li>
              <li>matching client token with <code>manage_permissions</code></li>
              <li>admin session</li>
            </ul>

            <h3>PUT /api/users/[userId]/apps/[clientId]/permissions</h3>
            <p>Client-managed permission upsert. Requires a bearer token for the same client with <code>manage_permissions</code>.</p>
            <div className={styles.codeBlock}>
              <pre>{`PUT /api/users/{userId}/apps/{clientId}/permissions
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "role": "user",
  "status": "approved"
}`}</pre>
            </div>

            <h3>DELETE /api/users/[userId]/apps/[clientId]/permissions</h3>
            <p>Client-managed revoke for the same client.</p>

            <h3>POST /api/users/[userId]/apps/[clientId]/request-access</h3>
            <p>Creates a pending access request for the same token subject and same token client.</p>
            <div className={styles.codeBlock}>
              <pre>{`POST /api/users/{userId}/apps/{clientId}/request-access
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "User Name"
}`}</pre>
            </div>

            <h3>PUT /api/admin/users/[userId]/apps/[clientId]/permissions</h3>
            <p>Admin-managed permission update.</p>
            <div className={styles.codeBlock}>
              <pre>{`PUT /api/admin/users/{userId}/apps/{clientId}/permissions
Cookie: admin-session=...
Content-Type: application/json

{
  "hasAccess": true,
  "role": "admin",
  "status": "approved"
}`}</pre>
            </div>

            <h3>DELETE /api/admin/users/[userId]/apps/[clientId]/permissions</h3>
            <p>Admin-managed revoke. Returns a canonical revoked/none permission shape.</p>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
