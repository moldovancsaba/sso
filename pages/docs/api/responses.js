import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function ApiResponses() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API Response Format</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Standard Response Format</h2>
            <p>
              All API responses follow a consistent format to ensure predictable data handling.
              The response structure varies based on whether the request was successful or resulted in an error.
            </p>

            <h3>Success Response</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "success": true,
  "data": {
    // Response data specific to the endpoint
  },
  "timestamp": "2025-07-22T06:36:38Z"
}`}
              </pre>
            </div>

            <h3>Error Response</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context (if available)
    }
  },
  "timestamp": "2025-07-22T06:36:38Z"
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>HTTP Status Codes</h2>
            <p>The API uses standard HTTP status codes to indicate the result of requests:</p>
            <ul>
              <li>
                <code>200 OK</code>
                <p>The request was successful</p>
              </li>
              <li>
                <code>201 Created</code>
                <p>A new resource was successfully created</p>
              </li>
              <li>
                <code>400 Bad Request</code>
                <p>The request was malformed or contained invalid parameters</p>
              </li>
              <li>
                <code>401 Unauthorized</code>
                <p>Authentication is required or the provided credentials are invalid</p>
              </li>
              <li>
                <code>403 Forbidden</code>
                <p>The authenticated user lacks necessary permissions</p>
              </li>
              <li>
                <code>404 Not Found</code>
                <p>The requested resource does not exist</p>
              </li>
              <li>
                <code>500 Internal Server Error</code>
                <p>An unexpected server error occurred</p>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Response Headers</h2>
            <p>Important information is also conveyed through response headers:</p>
            <ul>
              <li>
                <code>X-Request-ID</code>
                <p>Unique identifier for the request, useful for debugging</p>
              </li>
              <li>
                <code>X-Session-Expires</code>
                <p>ISO 8601 timestamp indicating when the current session will expire</p>
              </li>
              <li>
                <code>X-Rate-Limit-Remaining</code>
                <p>Number of remaining requests allowed in the current time window</p>
              </li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
