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
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              The recommended integration path is OAuth 2.0 Authorization Code flow with OIDC claims
              and PKCE where appropriate. Public-user hosted auth and social login feed into that same
              authorization flow.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Current Authentication Methods</h2>
            <ul>
              <li>Email and password</li>
              <li>Magic links</li>
              <li>PIN verification on selected login attempts</li>
              <li>Google</li>
              <li>Facebook</li>
            </ul>
            <p>Apple Sign In and passkeys are planned backlog work and are not active today.</p>
          </section>

          <section className={styles.section}>
            <h2>OAuth Flow</h2>
            <ol className={styles.steps}>
              <li>Redirect the user to <code>/api/oauth/authorize</code>.</li>
              <li>User authenticates on the hosted SSO login surface.</li>
              <li>SSO checks or creates the user’s app-permission state.</li>
              <li>SSO redirects back with an authorization code.</li>
              <li>Your backend exchanges that code at <code>/api/oauth/token</code>.</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>Important Distinction</h2>
            <p>
              Public-auth endpoints and OAuth endpoints are not interchangeable:
            </p>
            <ul>
              <li><code>/api/public/login</code> creates a cookie-backed public session.</li>
              <li><code>/api/oauth/token</code> issues OAuth tokens.</li>
            </ul>
            <p>
              If your application needs bearer tokens, use the OAuth flow. If your shared-domain UI only
              needs hosted session validation, use the public session endpoints.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Social Login Security</h2>
            <p>
              Google and Facebook callbacks use a canonical encoded state payload tied to the signed CSRF cookie.
              After successful callback validation, the callback CSRF cookie is cleared to reduce replay value.
            </p>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
