import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function ApiDocs() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>SSO API Reference</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              The SSO API combines OAuth 2.0 / OpenID Connect endpoints, public-user authentication,
              session-validation endpoints, and permission-management APIs.
            </p>
            <div className={styles.warningBox}>
              <p>
                <strong>Current contract:</strong> OAuth token issuance happens through <code>/api/oauth/*</code>.
                Public login endpoints set a cookie-backed session and do not replace the OAuth token flow.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>API Areas</h2>

            <h3>OAuth / OIDC</h3>
            <ul>
              <li><code>GET /api/oauth/authorize</code> - start authorization-code flow</li>
              <li><code>POST /api/oauth/token</code> - exchange code or refresh token</li>
              <li><code>GET /api/oauth/userinfo</code> - get user claims from access token</li>
              <li><code>POST /api/oauth/revoke</code> - revoke token</li>
              <li><code>GET /api/oauth/logout</code> - logout from the hosted SSO session</li>
              <li><code>GET /.well-known/openid-configuration</code> - OIDC discovery document</li>
              <li><code>GET /.well-known/jwks.json</code> - JWKS for token verification</li>
            </ul>

            <h3>Public Authentication</h3>
            <ul>
              <li><code>POST /api/public/register</code> - create account or add password to a social-only account</li>
              <li><code>POST /api/public/login</code> - password login, sets <code>public-session</code></li>
              <li><code>POST /api/public/request-magic-link</code> - request email magic link</li>
              <li><code>GET /api/public/magic-login</code> - consume magic-link token</li>
              <li><code>POST /api/public/verify-pin</code> - complete a PIN-gated login</li>
              <li><code>GET /api/public/session</code> - validate public session cookie</li>
            </ul>

            <h3>Social Login</h3>
            <ul>
              <li><code>GET /api/auth/google/login</code></li>
              <li><code>GET /api/auth/google/callback</code></li>
              <li><code>GET /api/auth/facebook/login</code></li>
              <li><code>GET /api/auth/facebook/callback</code></li>
            </ul>

            <h3>Permission APIs</h3>
            <ul>
              <li><code>GET /api/users/[userId]/apps/[clientId]/permissions</code> - read a permission record</li>
              <li><code>PUT /api/users/[userId]/apps/[clientId]/permissions</code> - app-managed permission update</li>
              <li><code>DELETE /api/users/[userId]/apps/[clientId]/permissions</code> - app-managed revoke</li>
              <li><code>POST /api/users/[userId]/apps/[clientId]/request-access</code> - create pending access request</li>
              <li><code>PUT /api/admin/users/[userId]/apps/[clientId]/permissions</code> - admin-managed permission update</li>
              <li><code>DELETE /api/admin/users/[userId]/apps/[clientId]/permissions</code> - admin-managed revoke</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Important Behavior</h2>
            <ul>
              <li>Canonical permission roles are <code>none</code>, <code>user</code>, and <code>admin</code>.</li>
              <li>Canonical permission statuses are <code>pending</code>, <code>approved</code>, and <code>revoked</code>.</li>
              <li>Public session validation is cookie-based.</li>
              <li>OAuth-protected permission writes require a client token with <code>manage_permissions</code>.</li>
              <li>Access-request creation requires a user-bound token whose subject and client both match the request target.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>See Also</h2>
            <ul>
              <li><a href="/docs/api/endpoints">Endpoint reference</a></li>
              <li><a href="/docs/api/responses">Response formats</a></li>
              <li><a href="/docs/api/errors">Error reference</a></li>
              <li><a href="/docs/authentication">Authentication guide</a></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
