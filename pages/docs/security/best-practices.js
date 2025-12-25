// WHAT: Security best practices documentation for OAuth 2.0 SSO integration
// WHY: Developers need comprehensive security guidance to avoid vulnerabilities
// HOW: Covers OAuth 2.0 security, token handling, CSRF protection, and app permissions

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

// WHAT: Disable SSG for this page to prevent NextRouter errors
// WHY: DocsLayout uses useRouter() which requires runtime router context
// HOW: getServerSideProps forces server-side rendering instead of static generation
export async function getServerSideProps() {
  return { props: {} }
}

export default function SecurityBestPractices() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Security Best Practices</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              This guide covers security best practices for integrating with the SSO service using OAuth 2.0.
              Following these guidelines will help protect your application and users from common security vulnerabilities.
            </p>
            <div className={styles.alert}>
              <strong>⚠️ Critical:</strong> OAuth 2.0 security depends on proper implementation.
              Violations of these practices can lead to severe security breaches.
            </div>
          </section>

          <section className={styles.section}>
            <h2>1. Never Expose Client Secret</h2>
            <p><strong>Risk Level: CRITICAL 🔴</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`// ❌ NEVER DO THIS - Exposing secret in frontend code
const CLIENT_SECRET = 'abc123secret'; // WRONG!

fetch('https://sso.doneisbetter.com/api/oauth/token', {
  body: JSON.stringify({
    client_id: 'myapp',
    client_secret: CLIENT_SECRET // DANGER: Secret exposed in browser!
  })
});

// ✅ CORRECT - Token exchange happens on backend only
// Frontend: Redirect to SSO authorization
window.location.href = \`https://sso.doneisbetter.com/api/oauth/authorize?client_id=myapp&...\`;

// Backend: Exchange code for tokens (secret stays server-side)
const tokenResponse = await fetch(
  'https://sso.doneisbetter.com/api/oauth/token',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authorizationCode,
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET // Safe: Server-side only
    })
  }
);`}
              </pre>
            </div>
            <p><strong>WHY:</strong> If <code>client_secret</code> is exposed in frontend code, anyone can impersonate your application and request tokens on behalf of any user.</p>
          </section>

          <section className={styles.section}>
            <h2>2. Always Use HTTPS</h2>
            <p><strong>Risk Level: CRITICAL 🔴</strong></p>
            <ul>
              <li>✅ All OAuth 2.0 communications MUST use HTTPS</li>
              <li>✅ Redirect URIs must be HTTPS (no HTTP allowed in production)</li>
              <li>✅ Never transmit tokens over unencrypted connections</li>
              <li>⚠️ HTTP is only acceptable in local development (e.g., <code>http://localhost:3000</code>)</li>
            </ul>
            <p><strong>WHY:</strong> Without TLS/SSL encryption, tokens and authorization codes can be intercepted by attackers (man-in-the-middle attacks).</p>
          </section>

          <section className={styles.section}>
            <h2>3. Implement CSRF Protection with State Parameter</h2>
            <p><strong>Risk Level: HIGH 🟠</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`// WHY: Prevent Cross-Site Request Forgery (CSRF) attacks

// Step 1: Generate random state before redirecting to SSO
const state = crypto.randomBytes(32).toString('hex');
sessionStorage.setItem('oauth_state', state);

const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize');
authUrl.searchParams.append('state', state);
// ... other parameters
window.location.href = authUrl.toString();

// Step 2: Validate state in callback
const receivedState = req.query.state;
const expectedState = sessionStorage.getItem('oauth_state');

if (receivedState !== expectedState) {
  throw new Error('State mismatch - possible CSRF attack!');
}

// Step 3: Clear state after successful validation
sessionStorage.removeItem('oauth_state');`}
              </pre>
            </div>
            <p><strong>WHY:</strong> The state parameter ensures the OAuth callback is responding to a request your application initiated, preventing CSRF attacks.</p>
          </section>

          <section className={styles.section}>
            <h2>4. Secure Token Storage</h2>
            <p><strong>Risk Level: CRITICAL 🔴</strong></p>
            <h3>Backend: Use HTTP-Only Cookies (Recommended)</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// ✅ SECURE - HTTP-only cookies prevent XSS attacks
res.cookie('access_token', accessToken, {
  httpOnly: true,    // Cannot be accessed by JavaScript
  secure: true,      // Only transmitted over HTTPS
  sameSite: 'lax',   // CSRF protection
  maxAge: 3600000    // 1 hour expiry
});

res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 2592000000 // 30 days expiry
});`}
              </pre>
            </div>
            <h3>Frontend: Never Store Tokens in LocalStorage</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// ❌ NEVER DO THIS - Vulnerable to XSS attacks
localStorage.setItem('access_token', token); // WRONG!
sessionStorage.setItem('access_token', token); // ALSO WRONG!

// ✅ CORRECT - Let backend manage tokens via cookies
// Frontend just makes authenticated requests:
fetch('/api/auth/session', {
  credentials: 'include' // Sends HTTP-only cookies automatically
});`}
              </pre>
            </div>
            <p><strong>WHY:</strong> Tokens stored in localStorage or sessionStorage can be stolen via XSS attacks. HTTP-only cookies are inaccessible to JavaScript.</p>
          </section>

          <section className={styles.section}>
            <h2>5. Validate and Decode ID Tokens Properly</h2>
            <p><strong>Risk Level: HIGH 🟠</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`// WHY: Ensure token integrity and extract user info safely

import jwt from 'jsonwebtoken';

// ✅ Option 1: Just decode (if you trust the SSO server)
const decoded = jwt.decode(idToken);
const { sub: userId, email, name, role, permissionStatus } = decoded;

// ✅ Option 2: Verify signature (more secure, recommended)
const publicKey = await fetchSSOPublicKey(); // From /.well-known/jwks.json
const decoded = jwt.verify(idToken, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://sso.doneisbetter.com',
  audience: process.env.SSO_CLIENT_ID
});

// ⚠️ Always check token expiration
if (decoded.exp * 1000 < Date.now()) {
  throw new Error('Token expired');
}`}
              </pre>
            </div>
            <p><strong>WHY:</strong> Verifying the ID token signature ensures it hasn't been tampered with and actually comes from the SSO server.</p>
          </section>

          <section className={styles.section}>
            <h2>6. Handle App Permission Status Securely</h2>
            <p><strong>Risk Level: MEDIUM 🟡</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`// WHY: Enforce app-level permissions to prevent unauthorized access

const { permissionStatus, role } = decoded; // From ID token

// ✅ Always check permission status before granting access
if (permissionStatus !== 'approved') {
  if (permissionStatus === 'pending') {
    return res.redirect('/access-pending');
  }
  if (permissionStatus === 'revoked') {
    return res.redirect('/access-denied');
  }
  // Unknown status - deny access
  return res.status(403).json({ error: 'Access not approved' });
}

// ✅ Check role for admin-only features
if (role === 'admin') {
  // Grant admin access
} else {
  // Regular user access only
}`}
              </pre>
            </div>
            <p><strong>WHY:</strong> A user may authenticate successfully but not have permission to access your application. Always verify <code>permissionStatus</code>.</p>
          </section>

          <section className={styles.section}>
            <h2>7. Implement Token Refresh Before Expiry</h2>
            <p><strong>Risk Level: MEDIUM 🟡</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`// WHY: Maintain session continuity without forcing re-login

// ✅ Refresh tokens proactively (e.g., 5 minutes before expiry)
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

async function ensureValidToken() {
  const decoded = jwt.decode(accessToken);
  const expiryTime = decoded.exp * 1000;
  const now = Date.now();

  if (expiryTime - now < TOKEN_REFRESH_BUFFER) {
    // Token expiring soon, refresh it
    await refreshAccessToken();
  }
}

async function refreshAccessToken() {
  const response = await fetch('/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  });

  const { access_token, id_token } = await response.json();
  // Update stored tokens
}`}
              </pre>
            </div>
            <p><strong>WHY:</strong> Access tokens expire quickly (1 hour default). Proactive refresh prevents session interruptions.</p>
          </section>

          <section className={styles.section}>
            <h2>8. Secure Redirect URI Configuration</h2>
            <p><strong>Risk Level: HIGH 🟠</strong></p>
            <ul>
              <li>✅ Register exact redirect URIs with SSO admin (no wildcards)</li>
              <li>✅ Use HTTPS for all redirect URIs in production</li>
              <li>⚠️ Avoid open redirects (validate redirect_uri parameter)</li>
              <li>⚠️ Never use dynamic redirect URIs from user input</li>
            </ul>
            <div className={styles.codeBlock}>
              <pre>
                {`// ❌ DANGEROUS - Open redirect vulnerability
const redirectUri = req.query.redirect; // User-controlled!
window.location.href = \`https://sso.doneisbetter.com/api/oauth/authorize?redirect_uri=\${redirectUri}\`;

// ✅ SAFE - Use pre-registered, hardcoded redirect URI
const ALLOWED_REDIRECT_URI = 'https://myapp.com/api/auth/callback';
window.location.href = \`https://sso.doneisbetter.com/api/oauth/authorize?redirect_uri=\${ALLOWED_REDIRECT_URI}\`;`}
              </pre>
            </div>
            <p><strong>WHY:</strong> Attackers can trick users into authorizing malicious applications by manipulating redirect URIs.</p>
          </section>

          <section className={styles.section}>
            <h2>9. Implement Rate Limiting</h2>
            <p><strong>Risk Level: MEDIUM 🟡</strong></p>
            <p>
              The SSO service implements rate limiting on all endpoints. Your application should handle rate limit errors gracefully:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`// WHY: Prevent abuse and handle rate limit responses

const response = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
  // ... request config
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After'); // seconds
  console.error(\`Rate limited. Retry after \${retryAfter} seconds.\`);
  
  // ✅ Implement exponential backoff
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  // Retry request
}`}
              </pre>
            </div>
            <p><strong>Current Rate Limits:</strong></p>
            <ul>
              <li>Public endpoints: 100 requests/minute per IP</li>
              <li>OAuth endpoints: 50 requests/minute per client_id</li>
              <li>Admin endpoints: 200 requests/minute per admin session</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>10. Logout Securely</h2>
            <p><strong>Risk Level: MEDIUM 🟡</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`// WHY: Ensure complete session termination

// Step 1: Revoke tokens with SSO server
await fetch('https://sso.doneisbetter.com/api/oauth/revoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: accessToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  })
});

// Step 2: Clear local session (cookies, etc.)
res.clearCookie('access_token');
res.clearCookie('refresh_token');
res.clearCookie('id_token');

// Step 3: Optionally redirect to SSO logout (for single logout)
window.location.href = 'https://sso.doneisbetter.com/api/public/logout';`}
              </pre>
            </div>
            <p><strong>WHY:</strong> Revoking tokens at the SSO server ensures they can't be reused even if intercepted.</p>
          </section>

          <section className={styles.section}>
            <h2>Summary Checklist</h2>
            <ul>
              <li>☑️ Never expose <code>client_secret</code> in frontend code</li>
              <li>☑️ Always use HTTPS for OAuth endpoints</li>
              <li>☑️ Implement CSRF protection with <code>state</code> parameter</li>
              <li>☑️ Store tokens in HTTP-only cookies (never localStorage)</li>
              <li>☑️ Validate ID token signatures and expiration</li>
              <li>☑️ Check <code>permissionStatus</code> before granting access</li>
              <li>☑️ Implement token refresh before expiry</li>
              <li>☑️ Use exact, pre-registered redirect URIs</li>
              <li>☑️ Handle rate limiting with exponential backoff</li>
              <li>☑️ Revoke tokens on logout</li>
            </ul>
            <div className={styles.alert}>
              <strong>🔗 Related Resources:</strong>
              <ul>
                <li><a href="/docs/authentication">OAuth 2.0 Authentication Flow</a></li>
                <li><a href="/docs/security/cors">CORS Configuration</a></li>
                <li><a href="/docs/security/permissions">App Permissions System</a></li>
                <li><a href="/docs/api/errors">Error Handling</a></li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
