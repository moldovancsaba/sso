// WHAT: CORS configuration documentation for SSO OAuth 2.0 integration
// WHY: Developers need to understand CORS setup for cross-origin SSO requests
// HOW: Explains SSO CORS policy, registration process, and client-side configuration

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function SecurityCORS() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>CORS Configuration</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              Cross-Origin Resource Sharing (CORS) allows your application to make secure requests to the SSO service
              from a different origin (domain). This is essential for OAuth 2.0 flows and API interactions.
            </p>
            <div className={styles.alert}>
              <strong>⚠️ Important:</strong> Your application's origin must be registered with the SSO admin
              before CORS requests will be allowed.
            </div>
          </section>

          <section className={styles.section}>
            <h2>SSO CORS Policy</h2>
            <p>The SSO service implements the following CORS policy:</p>
            <ul>
              <li>✅ <strong>Allowed Origins:</strong> Only pre-registered origins (no wildcards)</li>
              <li>✅ <strong>Credentials:</strong> Cookies are allowed (<code>Access-Control-Allow-Credentials: true</code>)</li>
              <li>✅ <strong>Methods:</strong> GET, POST, PUT, PATCH, DELETE, OPTIONS</li>
              <li>✅ <strong>Headers:</strong> Content-Type, Authorization, X-Requested-With</li>
              <li>⚠️ <strong>Preflight Caching:</strong> 24 hours (<code>Access-Control-Max-Age: 86400</code>)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Registering Your Origin</h2>
            <p>To enable CORS for your application, contact the SSO administrator to register your origin(s):</p>
            <ol>
              <li>Determine your application's origin(s) (e.g., <code>https://myapp.com</code>)</li>
              <li>Contact SSO admin via email: <code>sso@doneisbetter.com</code></li>
              <li>Provide the following information:
                <ul>
                  <li>Your application name</li>
                  <li>Origin URL(s) (must be HTTPS in production)</li>
                  <li>OAuth <code>client_id</code> (if already issued)</li>
                  <li>Redirect URI(s) for OAuth callback</li>
                </ul>
              </li>
              <li>Wait for admin approval (typically within 24 hours)</li>
            </ol>
            <div className={styles.alert}>
              <strong>📝 Note:</strong> For local development, <code>http://localhost</code> origins (any port) are automatically allowed.
            </div>
          </section>

          <section className={styles.section}>
            <h2>CORS Headers in SSO Responses</h2>
            <p>When your origin is registered, the SSO service will include these headers in responses:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Example SSO Response Headers
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Vary: Origin

// If origin is NOT registered:
HTTP/1.1 403 Forbidden
{ "error": "Origin not allowed" }`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Client-Side CORS Configuration</h2>
            <h3>Fetch API (Recommended)</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// WHY: Include credentials (cookies) in cross-origin requests

const response = await fetch('https://sso.doneisbetter.com/api/public/session', {
  method: 'GET',
  credentials: 'include', // REQUIRED: Sends HTTP-only cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();`}
              </pre>
            </div>

            <h3>Axios</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`import axios from 'axios';

// Global configuration
axios.defaults.withCredentials = true;

// Per-request configuration
const response = await axios.get(
  'https://sso.doneisbetter.com/api/public/session',
  { withCredentials: true }
);`}
              </pre>
            </div>

            <h3>XMLHttpRequest (Legacy)</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`const xhr = new XMLHttpRequest();
xhr.withCredentials = true; // REQUIRED for cookies
xhr.open('GET', 'https://sso.doneisbetter.com/api/public/session');
xhr.send();`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Backend CORS Configuration (Your App)</h2>
            <p>If your backend needs to call SSO APIs, no CORS configuration is needed—server-to-server requests bypass CORS entirely.</p>
            <p>However, if your frontend calls <em>your</em> backend, which then calls SSO, configure CORS on your backend:</p>

            <h3>Express.js</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`const cors = require('cors');

app.use(cors({
  origin: 'https://yourfrontend.com', // Your frontend origin
  credentials: true // Allow cookies
}));`}
              </pre>
            </div>

            <h3>Next.js API Routes</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// pages/api/auth/[...].js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://yourfrontend.com');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle actual request
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Common CORS Errors</h2>
            <h3>Error: "Origin not allowed"</h3>
            <p><strong>Cause:</strong> Your origin is not registered with the SSO service.</p>
            <p><strong>Solution:</strong> Contact SSO admin to register your origin.</p>

            <h3>Error: "Credentials flag not set"</h3>
            <p><strong>Cause:</strong> You're not sending <code>credentials: 'include'</code> in requests.</p>
            <p><strong>Solution:</strong> Add <code>credentials: 'include'</code> to fetch calls or <code>withCredentials: true</code> to Axios.</p>

            <h3>Error: "Preflight request failed"</h3>
            <p><strong>Cause:</strong> OPTIONS preflight request is being blocked.</p>
            <p><strong>Solution:</strong> Ensure your origin is registered and you're using HTTPS (not HTTP) in production.</p>
          </section>

          <section className={styles.section}>
            <h2>Testing CORS Configuration</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`// Test if your origin is allowed
fetch('https://sso.doneisbetter.com/api/health', {
  method: 'GET',
  credentials: 'include'
})
  .then(response => {
    console.log('CORS OK:', response.ok);
    console.log('Headers:', response.headers.get('Access-Control-Allow-Origin'));
  })
  .catch(error => {
    console.error('CORS Error:', error);
  });`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Summary</h2>
            <ul>
              <li>☑️ Contact SSO admin to register your origin</li>
              <li>☑️ Always use <code>credentials: 'include'</code> for API requests</li>
              <li>☑️ Use HTTPS in production (HTTP only for localhost development)</li>
              <li>☑️ Test CORS configuration before going live</li>
            </ul>
            <div className={styles.alert}>
              <strong>🔗 Related Resources:</strong>
              <ul>
                <li><a href="/docs/quickstart">Quick Start Guide</a></li>
                <li><a href="/docs/security/best-practices">Security Best Practices</a></li>
                <li><a href="/docs/api/endpoints">API Reference</a></li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
