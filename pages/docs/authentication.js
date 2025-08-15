import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';

export default function Authentication() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Authentication Guide</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              The SSO service uses token-based authentication with secure session management.
              All authentication tokens are cryptographically signed and include expiration timestamps.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Authentication Flow</h2>
            <ol>
              <li>
                <strong>User Registration</strong>
                <p>New users must first register with their email and password:</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`// Register a new user
const response = await fetch('/api/users/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword',
    name: 'John Doe'
  })
});`}
                  </pre>
                </div>
              </li>
              
              <li>
                <strong>User Login</strong>
                <p>Registered users can authenticate to receive a session token:</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`// Login and receive session token
const response = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword'
  })
});

const { sessionToken } = await response.json();`}
                  </pre>
                </div>
              </li>

              <li>
                <strong>Using Session Token</strong>
                <p>Include the session token in subsequent API requests:</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`// Make authenticated requests
const response = await fetch('/api/users/profile', {
  headers: {
    'Authorization': \`Bearer \${sessionToken}\`
  }
});`}
                  </pre>
                </div>
              </li>

              <li>
                <strong>Session Validation</strong>
                <p>Validate session status and expiration:</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`// Check session validity
const response = await fetch('/api/sso/validate', {
  headers: {
    'Authorization': \`Bearer \${sessionToken}\`
  }
});

// Check X-Session-Expires header for expiration
const expiresAt = response.headers.get('X-Session-Expires');`}
                  </pre>
                </div>
              </li>

              <li>
                <strong>Logout</strong>
                <p>End the session when finished:</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`// Logout and invalidate session
await fetch('/api/users/logout', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${sessionToken}\`
  }
});`}
                  </pre>
                </div>
              </li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>Security Considerations</h2>
            <ul>
              <li>All authentication requests must use HTTPS</li>
              <li>Session tokens expire after 24 hours of inactivity</li>
              <li>Failed login attempts are rate-limited</li>
              <li>Passwords must meet minimum complexity requirements</li>
              <li>Session tokens are automatically rotated for security</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Error Handling</h2>
            <p>Common authentication errors and how to handle them:</p>
            <ul>
              <li>
                <code>INVALID_CREDENTIALS</code>
                <p>Username or password is incorrect</p>
              </li>
              <li>
                <code>SESSION_EXPIRED</code>
                <p>Session token has expired - user needs to login again</p>
              </li>
              <li>
                <code>INVALID_TOKEN</code>
                <p>Session token is malformed or has been tampered with</p>
              </li>
              <li>
                <code>RATE_LIMIT_EXCEEDED</code>
                <p>Too many failed authentication attempts</p>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Best Practices</h2>
            <ul>
              <li>Store session tokens securely (e.g., in HttpOnly cookies)</li>
              <li>Implement proper CORS policies for cross-origin requests</li>
              <li>Always validate session status before accessing protected resources</li>
              <li>Clear session data on logout</li>
              <li>Handle authentication errors gracefully in the UI</li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
