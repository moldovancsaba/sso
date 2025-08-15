import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function ApiErrors() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API Error Reference</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Error Response Format</h2>
            <p>
              All API errors follow a consistent format to help with error handling and debugging.
              Each error response includes an error code, message, and additional context when available.
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Additional error context (optional)
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Common Error Codes</h2>
            <h3>Authentication Errors</h3>
            <ul>
              <li>
                <code>INVALID_CREDENTIALS</code>
                <p>Provided authentication credentials are invalid.</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid username or password",
  "details": {
    "field": "password"
  }
}`}
                  </pre>
                </div>
              </li>
              <li>
                <code>SESSION_EXPIRED</code>
                <p>The user's session has expired and requires re-authentication.</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  "error": "SESSION_EXPIRED",
  "message": "Your session has expired. Please sign in again.",
  "details": {
    "expiredAt": "2025-07-21T22:00:00Z"
  }
}`}
                  </pre>
                </div>
              </li>
            </ul>

            <h3>Authorization Errors</h3>
            <ul>
              <li>
                <code>UNAUTHORIZED</code>
                <p>User is not authenticated.</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  "error": "UNAUTHORIZED",
  "message": "Authentication required to access this resource"
}`}
                  </pre>
                </div>
              </li>
              <li>
                <code>FORBIDDEN</code>
                <p>User lacks required permissions.</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions to perform this action",
  "details": {
    "requiredPermission": "canManageUsers"
  }
}`}
                  </pre>
                </div>
              </li>
            </ul>

            <h3>Validation Errors</h3>
            <ul>
              <li>
                <code>INVALID_INPUT</code>
                <p>Request contains invalid data.</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  "error": "INVALID_INPUT",
  "message": "Invalid request parameters",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}`}
                  </pre>
                </div>
              </li>
            </ul>

            <h3>Server Errors</h3>
            <ul>
              <li>
                <code>INTERNAL_ERROR</code>
                <p>Unexpected server error occurred.</p>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "details": {
    "requestId": "req_123abc",
    "timestamp": "2025-07-21T22:15:30Z"
  }
}`}
                  </pre>
                </div>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Error Handling Best Practices</h2>
            <ul>
              <li>Always check the error code rather than the message for error handling logic</li>
              <li>Implement appropriate retry logic for transient errors</li>
              <li>Log error details for debugging</li>
              <li>Provide user-friendly error messages in your UI</li>
            </ul>
            <div className={styles.codeBlock}>
              <pre>
                {`// Example error handling
try {
  await sso.validateSession();
} catch (error) {
  switch (error.code) {
    case 'SESSION_EXPIRED':
      redirectToLogin();
      break;
    case 'FORBIDDEN':
      showPermissionError();
      break;
    default:
      showGenericError();
  }
}`}
              </pre>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
