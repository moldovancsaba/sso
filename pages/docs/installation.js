// WHAT: Integration guide for developers adding SSO to their applications
// WHY: Developers need clear steps to integrate OAuth 2.0 SSO into their apps
// HOW: Provides step-by-step setup, environment configuration, and verification

import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function Installation() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Integration Guide</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              This guide walks you through integrating the SSO service into your application using OAuth 2.0.
              Follow these steps to enable secure authentication for your users.
            </p>
            <div className={styles.alert}>
              <strong>⚠️ Important:</strong> This guide is for application developers integrating with the SSO service,
              not for deploying the SSO service itself.
            </div>
          </section>

          <section className={styles.section}>
            <h2>Prerequisites</h2>
            <ul>
              <li>Node.js 18.x or higher (for backend token exchange)</li>
              <li>A web application (React, Vue, vanilla JS, etc.)</li>
              <li>HTTPS-enabled domain (required for production)</li>
              <li>Email access to contact SSO admin</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Step 1: Register Your Application</h2>
            <p>Before you can integrate, you must register your application with the SSO admin:</p>
            <ol>
              <li>Contact SSO admin: <code>sso@doneisbetter.com</code></li>
              <li>Provide the following information:
                <ul>
                  <li><strong>Application Name:</strong> e.g., "MyApp Production"</li>
                  <li><strong>Redirect URIs:</strong> e.g., <code>https://myapp.com/api/auth/callback</code></li>
                  <li><strong>Allowed Origins:</strong> e.g., <code>https://myapp.com</code></li>
                  <li><strong>Application Description:</strong> Brief description of your app</li>
                </ul>
              </li>
              <li>Wait for approval (typically within 24 hours)</li>
              <li>Receive your <code>client_id</code> and <code>client_secret</code></li>
            </ol>
            <div className={styles.alert}>
              <strong>📝 Note:</strong> For local development, use <code>http://localhost:PORT/api/auth/callback</code> as your redirect URI.
              Localhost origins are automatically allowed.
            </div>
          </section>

          <section className={styles.section}>
            <h2>Step 2: Install Dependencies</h2>
            <p>Install required packages for OAuth 2.0 token handling:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`# For Node.js/Express backend
npm install jsonwebtoken

# Optional: For making HTTP requests
npm install node-fetch  # or axios

# For Next.js projects (already includes fetch)
npm install jsonwebtoken`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Step 3: Configure Environment Variables</h2>
            <p>Create a <code>.env</code> file in your project root (backend only):</p>
            <div className={styles.codeBlock}>
              <pre>
                {`# .env (Backend - NEVER commit this file!)

# OAuth 2.0 Credentials (from SSO admin)
SSO_CLIENT_ID=your_client_id_here
SSO_CLIENT_SECRET=your_client_secret_here
SSO_REDIRECT_URI=https://yourapp.com/api/auth/callback

# SSO Service Configuration
SSO_BASE_URL=https://sso.doneisbetter.com

# Session Configuration
SESSION_SECRET=your_random_secret_here
NODE_ENV=production

# Development override (optional)
# SSO_REDIRECT_URI=http://localhost:3000/api/auth/callback`}
              </pre>
            </div>
            <h3>Generate Session Secret</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`# Generate a secure random secret
openssl rand -base64 32`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Step 4: Implement OAuth 2.0 Flow</h2>
            <p>Follow the implementation guide for your framework:</p>
            <ul>
              <li><a href="/docs/examples/react">React Integration Example</a></li>
              <li><a href="/docs/examples/vue">Vue.js Integration Example</a></li>
              <li><a href="/docs/examples/vanilla">Vanilla JS Integration Example</a></li>
            </ul>
            <p>Or implement manually by following the <a href="/docs/authentication">OAuth 2.0 Authentication Flow</a> guide.</p>
          </section>

          <section className={styles.section}>
            <h2>Step 5: Test Your Integration</h2>
            <h3>Development Testing</h3>
            <ol>
              <li>Start your application: <code>npm run dev</code></li>
              <li>Navigate to your login page</li>
              <li>Click "Sign in with SSO"</li>
              <li>You should be redirected to <code>https://sso.doneisbetter.com</code></li>
              <li>Login with test credentials (provided by SSO admin)</li>
              <li>Verify you're redirected back to your app</li>
              <li>Check that user info is displayed correctly</li>
            </ol>

            <h3>Verify Token Exchange</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Add logging to your OAuth callback handler
console.log('Authorization code received:', code);
console.log('Tokens received:', { access_token, id_token, refresh_token });

// Decode ID token to verify user info
const decoded = jwt.decode(id_token);
console.log('User info:', decoded);
console.log('Permission status:', decoded.permissionStatus);`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Step 6: Request Production Access</h2>
            <p>Once testing is complete, request production access approval:</p>
            <ol>
              <li>Test your application thoroughly in development</li>
              <li>Login and verify OAuth flow works correctly</li>
              <li>Test token refresh and logout</li>
              <li>Contact SSO admin to register your production domain</li>
              <li>Update environment variables with production values</li>
              <li>Deploy your application</li>
              <li>Request SSO admin to grant you "approved" permission status</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>Common Integration Issues</h2>
            <h3>Redirect URI Mismatch</h3>
            <p><strong>Error:</strong> <code>redirect_uri_mismatch</code></p>
            <p><strong>Solution:</strong> Ensure your <code>SSO_REDIRECT_URI</code> exactly matches what you registered with SSO admin (including protocol and path).</p>

            <h3>Origin Not Allowed</h3>
            <p><strong>Error:</strong> CORS error in browser console</p>
            <p><strong>Solution:</strong> Contact SSO admin to register your origin. See <a href="/docs/security/cors">CORS Configuration</a>.</p>

            <h3>Invalid Client</h3>
            <p><strong>Error:</strong> <code>invalid_client</code></p>
            <p><strong>Solution:</strong> Verify your <code>client_id</code> and <code>client_secret</code> are correct.</p>

            <h3>Token Exchange Fails</h3>
            <p><strong>Error:</strong> 401 from token endpoint</p>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Ensure token exchange happens on backend (not frontend)</li>
              <li>Verify <code>client_secret</code> is not exposed in browser</li>
              <li>Check authorization code is used within 10 minutes</li>
              <li>Confirm code hasn't been used already (single-use)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Next Steps</h2>
            <ul>
              <li>✅ Review <a href="/docs/security/best-practices">Security Best Practices</a></li>
              <li>✅ Implement <a href="/docs/session-management">Token Refresh</a> for seamless sessions</li>
              <li>✅ Handle <a href="/docs/app-permissions">App Permission Status</a> (pending/approved/revoked)</li>
              <li>✅ Set up <a href="/docs/error-handling">Error Handling</a> for production</li>
              <li>✅ Review <a href="/docs/api/endpoints">API Reference</a> for additional endpoints</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Support</h2>
            <p>Need help with integration?</p>
            <ul>
              <li>Email: <code>sso@doneisbetter.com</code></li>
              <li>Documentation: <a href="/docs">SSO Documentation</a></li>
              <li>API Reference: <a href="/docs/api">API Docs</a></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
