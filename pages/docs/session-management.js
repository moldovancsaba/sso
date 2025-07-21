import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';

export default function SessionManagementDocs() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Session Management</h1>
          <p className={styles.version}>API Version: 1.0.0</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              DoneIsBetter SSO uses secure HTTP-only cookies for session management, providing
              robust security while maintaining a seamless user experience across your applications.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Session Lifecycle</h2>
            <h3>1. Session Creation</h3>
            <p>Sessions are created upon successful authentication and contain:</p>
            <ul>
              <li>Unique session identifier</li>
              <li>User information</li>
              <li>Permissions</li>
              <li>Expiration timestamp</li>
            </ul>

            <h3>2. Session Validation</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Validate current session
const sso = new SSOClient('https://sso.doneisbetter.com');
const session = await sso.validateSession();

if (session.isValid) {
  console.log('Session expires at:', session.session.expiresAt);
  console.log('User:', session.user);
} else {
  console.log('Session is invalid or expired');
}`}
              </pre>
            </div>

            <h3>3. Session Expiration</h3>
            <p>Sessions automatically expire after:</p>
            <ul>
              <li>30 minutes of inactivity</li>
              <li>8 hours from creation (maximum lifetime)</li>
              <li>User explicitly signs out</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Automatic Session Refresh</h2>
            <p>
              Implement automatic session refresh to maintain user sessions during active use:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`function setupSessionRefresh() {
  // Check session every 5 minutes
  setInterval(async () => {
    const sso = new SSOClient('https://sso.doneisbetter.com');
    try {
      const result = await sso.validateSession();
      if (!result.isValid) {
        // Redirect to login or handle expired session
        sso.redirectToLogin();
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
    }
  }, 5 * 60 * 1000);
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Cross-Domain Sessions</h2>
            <p>
              To enable SSO across multiple domains:
            </p>
            <ol>
              <li>Register all domains with DoneIsBetter SSO</li>
              <li>Configure CORS settings for each domain</li>
              <li>Ensure consistent cookie settings across domains</li>
            </ol>
            <div className={styles.codeBlock}>
              <pre>
                {`// Example domain registration object
{
  "domain": "your-app.com",
  "environments": {
    "development": ["localhost:3000"],
    "production": ["app.your-domain.com"]
  },
  "settings": {
    "sameSite": "None",
    "secure": true
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Security Considerations</h2>
            <ul>
              <li>All cookies are HTTP-only and secure</li>
              <li>Session IDs are cryptographically secure</li>
              <li>Sessions are invalidated upon sign-out</li>
              <li>IP binding is optional for additional security</li>
              <li>Rate limiting is applied to all session endpoints</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Best Practices</h2>
            <ul>
              <li>Implement proper error handling for session operations</li>
              <li>Use the provided client library for consistent behavior</li>
              <li>Monitor session events for security purposes</li>
              <li>Regular validation of active sessions</li>
              <li>Proper cleanup on application shutdown</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Troubleshooting</h2>
            <h3>Common Issues</h3>
            <ul>
              <li>
                <strong>Session not persisting:</strong> Check CORS and cookie settings
              </li>
              <li>
                <strong>Frequent session expiration:</strong> Verify refresh mechanism
              </li>
              <li>
                <strong>Cross-domain issues:</strong> Confirm domain registration
              </li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
