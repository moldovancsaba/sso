import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function Quickstart() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Quick Start Guide</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <div className={styles.warningBox}>
              <p>
                <strong>Recommended path:</strong> use OAuth 2.0 Authorization Code flow. Do not treat the public
                password-login endpoint as a replacement for OAuth token issuance.
              </p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>1. Register Your OAuth Client</h2>
            <p>Create an OAuth client in the SSO admin UI and store:</p>
            <div className={styles.codeBlock}>
              <pre>{`SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
SSO_REDIRECT_URI=https://yourapp.com/auth/callback`}</pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>2. Redirect to Authorization</h2>
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
            <p>Users can authenticate there with password, magic link, PIN, Google, or Facebook.</p>
          </section>

          <section className={styles.section}>
            <h2>3. Exchange the Code Server-Side</h2>
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
          </section>

          <section className={styles.section}>
            <h2>4. Use Tokens Correctly</h2>
            <ul>
              <li>Use <code>id_token</code> for identity claims.</li>
              <li>Use <code>access_token</code> for SSO API authorization.</li>
              <li>Refresh expired access tokens with <code>grant_type=refresh_token</code>.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Check App Permission State</h2>
            <p>
              Authentication alone is not enough for per-app access. Check or manage permission state with the
              relevant permission endpoints.
            </p>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
