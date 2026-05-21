import Link from 'next/link';
import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function DocsPage() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>DoneIsBetter SSO Documentation</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
          <p className={styles.subtitle}>Current runtime guide for OAuth, hosted auth, and shared-domain session validation.</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <div className={styles.warningBox}>
              <p>
                <strong>Recommended default:</strong> use OAuth 2.0 Authorization Code flow with OIDC claims.
                Public login endpoints create cookie-backed sessions, but they do not replace the OAuth token flow.
              </p>
              <p>
                <strong>Design / UI / UX SSOT:</strong> cross-project design rules now live in
                {' '}<code>/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM</code>.
                Local styling in this repo should be treated as migration-state implementation, not the long-term design source of truth.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Current Capabilities</h2>
            <ul>
              <li>OAuth 2.0 / OpenID Connect authorization server</li>
              <li>Hosted public-user authentication with password, magic link, PIN, Google, and Facebook</li>
              <li>Centralized per-app authorization through <code>appPermissions</code></li>
              <li>Cookie-based SSO for shared subdomain deployments</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Canonical Runtime Contract</h2>
            <ul>
              <li>App-permission roles: <code>none</code>, <code>user</code>, <code>admin</code></li>
              <li>App-permission statuses: <code>pending</code>, <code>approved</code>, <code>revoked</code></li>
              <li>Admin cookie: <code>admin-session</code></li>
              <li>Public cookie: <code>public-session</code></li>
              <li>Apple Sign In, passkeys, SAML, and SCIM are not implemented today</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Choose Your Integration</h2>
            <ol className={styles.steps}>
              <li>
                <h3>OAuth2 / OIDC</h3>
                <p>Use this for most apps, especially external domains, SPAs, mobile apps, and server applications.</p>
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
              </li>

              <li>
                <h3>Cookie-Based SSO</h3>
                <p>Use this only when your app shares the configured cookie domain with the SSO service.</p>
                <div className={styles.codeBlock}>
                  <pre>{`GET /api/public/session
Cookie: public-session=...`}</pre>
                </div>
              </li>

              <li>
                <h3>Permission-Aware Integrations</h3>
                <p>App access is not based on authentication alone. Check or manage the user’s permission record per client.</p>
                <div className={styles.codeBlock}>
                  <pre>{`GET /api/users/{userId}/apps/{clientId}/permissions
Authorization: Bearer ACCESS_TOKEN`}</pre>
                </div>
              </li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>Key Endpoints</h2>
            <ul>
              <li><code>GET /api/oauth/authorize</code></li>
              <li><code>POST /api/oauth/token</code></li>
              <li><code>GET /api/oauth/userinfo</code></li>
              <li><code>GET /api/public/session</code></li>
              <li><code>POST /api/public/login</code></li>
              <li><code>POST /api/public/request-magic-link</code></li>
              <li><code>POST /api/users/[userId]/apps/[clientId]/request-access</code></li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Read Next</h2>
            <ul>
              <li><Link href="/docs/quickstart">Quick Start</Link></li>
              <li><Link href="/docs/authentication">Authentication Guide</Link></li>
              <li><Link href="/docs/integration">Integration Options</Link></li>
              <li><Link href="/docs/api">API Reference</Link></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
