import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function ApiErrors() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API Error Reference</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>OAuth Errors</h2>
            <p>Authorization and token endpoints use standard OAuth-style error responses.</p>

            <h3><code>invalid_request</code></h3>
            <p>Missing required parameters or malformed input.</p>

            <h3><code>invalid_client</code></h3>
            <p>Unknown client, suspended client, or invalid client authentication.</p>

            <h3><code>invalid_scope</code></h3>
            <p>Requested scope is not allowed for the client.</p>

            <h3><code>invalid_grant</code></h3>
            <p>Expired, reused, or invalid authorization code or refresh token.</p>

            <h3><code>access_denied</code></h3>
            <p>User denied the flow or the authorization request could not proceed.</p>
          </section>

          <section className={styles.section}>
            <h2>Public Authentication Errors</h2>

            <h3><code>401 Invalid email or password</code></h3>
            <p>Standard password-login failure.</p>

            <h3><code>401 Password not set</code></h3>
            <p>The account exists but only has social login methods linked.</p>

            <h3><code>403 Please verify your email address before logging in</code></h3>
            <p>The public user exists but email verification is not complete.</p>

            <h3><code>401 No active session found</code></h3>
            <p>Returned by <code>GET /api/public/session</code> when the cookie is missing or invalid.</p>
          </section>

          <section className={styles.section}>
            <h2>Permission and Access Errors</h2>

            <h3><code>403 Forbidden</code></h3>
            <p>Returned when the bearer token is valid but is not authorized for the requested user/client combination.</p>

            <h3><code>404 No permission record found</code></h3>
            <p>Returned by permission reads when no record exists for the specified user/client pair.</p>

            <h3><code>404 Client not found</code></h3>
            <p>Returned when the target OAuth client does not exist.</p>

            <h3><code>400 Invalid role</code></h3>
            <p>Role must be one of <code>none</code>, <code>user</code>, <code>admin</code>.</p>

            <h3><code>400 Invalid status</code></h3>
            <p>Status must be one of <code>pending</code>, <code>approved</code>, <code>revoked</code>.</p>
          </section>

          <section className={styles.section}>
            <h2>Social Login Errors</h2>

            <h3><code>google_invalid_state</code> / <code>facebook_invalid_state</code></h3>
            <p>Callback state is missing, malformed, expired, or no longer matches the CSRF cookie.</p>

            <h3><code>google_callback_failed</code> / <code>facebook_callback_failed</code></h3>
            <p>Provider callback failed after redirect.</p>

            <h3><code>google_no_email</code> / <code>facebook_no_email</code></h3>
            <p>The provider account did not supply a usable email claim for account linking.</p>
          </section>

          <section className={styles.section}>
            <h2>Rate Limits and Retry Behavior</h2>
            <p>Some endpoints return HTTP <code>429</code> with retry guidance. Authentication clients should treat 429 responses as transient and retry later.</p>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
