import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';

export default function ApiDocs() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>DoneIsBetter SSO API Reference</h1>
          <p className={styles.version}>API Version: 5.1.0</p>
          <p className={styles.lastUpdated}>Last updated: 2025-10-04T06:52:00.000Z</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Getting Started</h2>
            <p>
              The DoneIsBetter SSO API provides cookie-based authentication for *.doneisbetter.com subdomains.
              This reference shows the actual working endpoints used in production (launchmass integration).
            </p>
            <p>
              <strong>⚠️ Critical:</strong> Use <code>printf</code> (NOT <code>echo</code>) for environment variables to avoid trailing newlines!
            </p>

            <div className={styles.codeBlock}>
              <pre>
                {`// Server-side validation (Next.js getServerSideProps)
export async function getServerSideProps(context) {
  const resp = await fetch(
    \`\${process.env.SSO_SERVER_URL}/api/public/validate\`,
    {
      headers: { cookie: context.req.headers.cookie || '' },
      cache: 'no-store',
    }
  );
  const { isValid, user } = await resp.json();
  // Redirect if not valid...
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Public User Authentication (Cookie-Based)</h2>
            <h3>Endpoints</h3>
            <div className={styles.endpoint}>
              <h4>POST /api/public/register</h4>
              <p>Register a new public user. Sets <code>user-session</code> cookie with <code>Domain=.doneisbetter.com</code></p>
              <div className={styles.codeBlock}>
                <pre>
                  {`// Request
POST https://sso.doneisbetter.com/api/public/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password",
  "name": "User Name"
}

// Response (200 OK)
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "status": "active"
  }
}

// Cookie Set
Set-Cookie: user-session=token; Domain=.doneisbetter.com; HttpOnly; Secure`}
                </pre>
              </div>
            </div>

            <div className={styles.endpoint}>
              <h4>POST /api/public/login</h4>
              <p>Login existing user. Sets session cookie.</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`// Request
POST https://sso.doneisbetter.com/api/public/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}

// Response (200 OK)
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "User Name"
  }
}`}
                </pre>
              </div>
            </div>

            <div className={styles.endpoint}>
              <h4>GET /api/public/validate</h4>
              <p>Validate public user session. Forward cookies from your app to this endpoint.</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`// Request (from your server-side code)
GET https://sso.doneisbetter.com/api/public/validate
Cookie: user-session=token-here

// Response (Valid Session)
{
  "isValid": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "status": "active"
  }
}

// Response (Invalid Session)
{
  "isValid": false,
  "message": "No active session found"
}`}
                </pre>
              </div>
            </div>

            <div className={styles.endpoint}>
              <h4>POST /api/public/logout</h4>
              <p>End the current session. Clears the user-session cookie.</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`// Request
POST https://sso.doneisbetter.com/api/public/logout
Cookie: user-session=token-here

// Response (200 OK)
{
  "success": true,
  "message": "Logged out successfully"
}

// Cookie Cleared
Set-Cookie: user-session=; Max-Age=0`}
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
