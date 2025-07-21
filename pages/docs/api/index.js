import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function ApiDocs() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>DoneIsBetter SSO API Reference</h1>
          <p className={styles.version}>API Version: 1.0.0</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Getting Started</h2>
            <p>
              The DoneIsBetter SSO API enables seamless authentication integration
              for your applications. This reference provides detailed information about
              all available endpoints, authentication flows, and integration patterns.
            </p>

            <div className={styles.codeBlock}>
              <pre>
                {`// Initialize the SSO client
const sso = new SSOClient('https://sso.doneisbetter.com');

// Check authentication status
const session = await sso.validateSession();
if (session.isValid) {
  console.log('User:', session.user);
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Authentication</h2>
            <h3>Endpoints</h3>
            <div className={styles.endpoint}>
              <h4>POST /api/users/register</h4>
              <p>Register or authenticate a user.</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`// Request
POST https://sso.doneisbetter.com/api/users/register
Content-Type: application/json

{
  "username": "user@example.com"
}

// Response
{
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "username": "user@example.com",
    "permissions": {
      "isAdmin": false,
      "canViewUsers": false,
      "canManageUsers": false
    }
  }
}`}
                </pre>
              </div>
            </div>

            <div className={styles.endpoint}>
              <h4>GET /api/sso/validate</h4>
              <p>Validate current session status.</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`// Request
GET https://sso.doneisbetter.com/api/sso/validate

// Response
{
  "isValid": true,
  "user": {
    "id": "user_id",
    "username": "user@example.com",
    "permissions": {
      "isAdmin": false,
      "canViewUsers": false,
      "canManageUsers": false
    }
  },
  "session": {
    "expiresAt": "2025-07-21T16:43:47Z"
  }
}`}
                </pre>
              </div>
            </div>

            <div className={styles.endpoint}>
              <h4>POST /api/users/logout</h4>
              <p>End the current session.</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`// Request
POST https://sso.doneisbetter.com/api/users/logout

// Response
{
  "message": "Logged out successfully"
}`}
                </pre>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Error Handling</h2>
            <p>The API uses standard HTTP status codes and returns detailed error messages:</p>
            <ul>
              <li><code>400</code> - Bad Request (invalid input)</li>
              <li><code>401</code> - Unauthorized (invalid or expired session)</li>
              <li><code>403</code> - Forbidden (insufficient permissions)</li>
              <li><code>404</code> - Not Found</li>
              <li><code>500</code> - Internal Server Error</li>
            </ul>

            <div className={styles.codeBlock}>
              <pre>
                {`// Error Response Example
{
  "error": "Session expired",
  "message": "Your session has expired. Please sign in again.",
  "code": "SESSION_EXPIRED"
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>CORS Configuration</h2>
            <p>
              To enable cross-origin requests, your domain must be registered with our service.
              Contact support to add your domain to the allowed origins list.
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Required Headers
Origin: your-domain.com
Content-Type: application/json

// CORS Headers in Response
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: your-domain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Client Libraries</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`// NPM Installation
npm install @doneisbetter/sso-client

// Yarn Installation
yarn add @doneisbetter/sso-client`}
              </pre>
            </div>

            <h3>Available Libraries</h3>
            <ul>
              <li>JavaScript/TypeScript (<code>@doneisbetter/sso-client</code>)</li>
              <li>Python (<code>doneisbetter-sso</code>)</li>
              <li>Go (<code>github.com/doneisbetter/sso-go</code>)</li>
              <li>Java (<code>com.doneisbetter.sso</code>)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Rate Limiting</h2>
            <p>API endpoints are rate limited to ensure service stability:</p>
            <ul>
              <li>Authentication endpoints: 10 requests per minute</li>
              <li>Session validation: 60 requests per minute</li>
              <li>User management: 30 requests per minute</li>
            </ul>
            <div className={styles.codeBlock}>
              <pre>
                {`// Rate Limit Headers
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1627399287`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Support</h2>
            <ul>
              <li>Email: <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></li>
              <li>Documentation: <a href="https://sso.doneisbetter.com/docs">https://sso.doneisbetter.com/docs</a></li>
              <li>GitHub: <a href="https://github.com/doneisbetter/sso">https://github.com/doneisbetter/sso</a></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
