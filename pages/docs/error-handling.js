import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';

export default function ErrorHandlingDocs() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Error Handling</h1>
          <p className={styles.version}>API Version: 1.0.0</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              DoneIsBetter SSO uses standard HTTP status codes along with detailed error messages
              to help you understand and handle errors effectively. This guide covers common errors,
              how to handle them, and best practices for error management.
            </p>
          </section>

          <section className={styles.section}>
            <h2>HTTP Status Codes</h2>
            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Status Code</th>
                    <th>Description</th>
                    <th>Common Scenarios</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>400</code></td>
                    <td>Bad Request</td>
                    <td>Invalid input parameters, malformed request body</td>
                  </tr>
                  <tr>
                    <td><code>401</code></td>
                    <td>Unauthorized</td>
                    <td>Invalid or expired session, authentication required</td>
                  </tr>
                  <tr>
                    <td><code>403</code></td>
                    <td>Forbidden</td>
                    <td>Insufficient permissions, unauthorized domain</td>
                  </tr>
                  <tr>
                    <td><code>404</code></td>
                    <td>Not Found</td>
                    <td>Resource doesn't exist</td>
                  </tr>
                  <tr>
                    <td><code>429</code></td>
                    <td>Too Many Requests</td>
                    <td>Rate limit exceeded</td>
                  </tr>
                  <tr>
                    <td><code>500</code></td>
                    <td>Internal Server Error</td>
                    <td>Server-side error</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Error Response Format</h2>
            <p>All error responses follow a consistent format:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": "ERROR_TYPE",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error-specific information
  }
}`}
              </pre>
            </div>

            <h3>Common Error Types</h3>
            <ul>
              <li><code>VALIDATION_ERROR</code> - Input validation failed</li>
              <li><code>AUTH_ERROR</code> - Authentication-related errors</li>
              <li><code>PERMISSION_ERROR</code> - Permission-related errors</li>
              <li><code>RATE_LIMIT_ERROR</code> - Rate limit exceeded</li>
              <li><code>SERVER_ERROR</code> - Internal server errors</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Error Handling Examples</h2>
            
            <h3>Session Validation</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`try {
  const session = await sso.validateSession();
  if (session.isValid) {
    // Handle valid session
  }
} catch (error) {
  if (error.code === 'SESSION_EXPIRED') {
    // Redirect to login
    sso.redirectToLogin();
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
    console.error('Too many requests, please try again later');
  } else {
    // Handle other errors
    console.error('Session validation failed:', error.message);
  }
}`}
              </pre>
            </div>

            <h3>Authentication Errors</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`try {
  await sso.authenticate(username);
} catch (error) {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      showError('Invalid username or password');
      break;
    case 'ACCOUNT_LOCKED':
      showError('Account is locked. Please contact support.');
      break;
    case 'DOMAIN_NOT_ALLOWED':
      showError('Your domain is not authorized for SSO.');
      break;
    default:
      showError('Authentication failed: ' + error.message);
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Best Practices</h2>
            <ul>
              <li>
                <strong>Always handle errors:</strong> Don't let errors propagate
                to users without proper handling and messaging.
              </li>
              <li>
                <strong>Implement retry logic:</strong> For transient errors,
                implement exponential backoff retry logic.
              </li>
              <li>
                <strong>Log errors:</strong> Maintain proper error logging for
                debugging and monitoring.
              </li>
              <li>
                <strong>User-friendly messages:</strong> Transform technical error
                messages into user-friendly notifications.
              </li>
              <li>
                <strong>Session recovery:</strong> Implement graceful session
                recovery when possible.
              </li>
            </ul>

            <div className={styles.codeBlock}>
              <pre>
                {`// Example of retry logic with exponential backoff
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        // Wait with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Error Monitoring</h2>
            <p>
              DoneIsBetter SSO provides error monitoring endpoints to help you track
              and debug issues in your integration:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Enable error monitoring
sso.enableMonitoring({
  reportErrors: true,
  logLevel: 'warn',
  errorCallback: (error) => {
    // Custom error handling
    console.error('SSO Error:', error);
    analytics.trackError(error);
  }
});`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Troubleshooting Guide</h2>
            <h3>Common Issues</h3>
            <ul>
              <li>
                <strong>{"Session doesn't persist"}:</strong>
                <ul>
                  <li>Check CORS configuration</li>
                  <li>Verify cookie settings</li>
                  <li>Ensure proper domain registration</li>
                </ul>
              </li>
              <li>
                <strong>Frequent authentication errors:</strong>
                <ul>
                  <li>Verify network connectivity</li>
                  <li>Check rate limiting status</li>
                  <li>Validate domain registration</li>
                </ul>
              </li>
              <li>
                <strong>Permission issues:</strong>
                <ul>
                  <li>Verify user roles and permissions</li>
                  <li>Check domain authorization</li>
                  <li>Review access logs</li>
                </ul>
              </li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
