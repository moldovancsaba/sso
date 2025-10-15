// WHAT: Quick Start Guide for integrating OAuth 2.0 SSO
// WHY: Developers need step-by-step instructions to integrate with our SSO service
// HOW: OAuth 2.0 Authorization Code Flow with server-side token exchange

import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function Quickstart() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Quick Start Guide</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          {/* WHAT: Warning banner about OAuth 2.0 requirement */}
          {/* WHY: Prevent developers from looking for deprecated client library */}
          <section className={styles.section}>
            <div style={{ background: '#fff3e0', border: '1px solid #f57c00', borderRadius: '8px', padding: '16px', marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>
                <strong>⚠️ OAuth 2.0 Authorization Code Flow Required</strong><br />
                This SSO uses standard OAuth 2.0. No client library needed - implement OAuth flow in your backend.
              </p>
            </div>
          </section>

          {/* WHAT: Step 1 - Register your application */}
          {/* WHY: Apps need client credentials to use OAuth */}
          <section className={styles.section}>
            <h2>1. Register Your Application</h2>
            <p>
              Contact SSO administrators at <a href="mailto:sso@doneisbetter.com">sso@doneisbetter.com</a> to register your application.
            </p>
            <p><strong>Required Information:</strong></p>
            <ul>
              <li>Application name (e.g., "Launchmass", "Messmass")</li>
              <li>Application description</li>
              <li>Redirect URIs (development and production)</li>
              <li>Required scopes (e.g., <code>openid profile email</code>)</li>
            </ul>
            <p>You will receive:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "client_id": "your-client-uuid",
  "client_secret": "your-secret-uuid"
}`}
              </pre>
            </div>
            <p style={{ color: '#d32f2f', fontSize: '14px' }}>
              <strong>⚠️ Store client_secret securely!</strong> It will only be shown once.
            </p>
          </section>

          {/* WHAT: Step 2 - Implement OAuth login redirect */}
          {/* WHY: Users must authenticate at SSO before accessing your app */}
          <section className={styles.section}>
            <h2>2. Redirect Users to SSO Login</h2>
            <p>
              When users click "Login", redirect them to the SSO authorization endpoint:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`// In your frontend (any framework)
function handleLogin() {
  const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize');
  authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
  authUrl.searchParams.set('redirect_uri', 'https://yourapp.com/auth/callback');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  
  // Redirect user to SSO
  window.location.href = authUrl.toString();
}`}
              </pre>
            </div>
            <p><strong>Parameters:</strong></p>
            <ul>
              <li><code>client_id</code> - Your OAuth client ID (from step 1)</li>
              <li><code>redirect_uri</code> - Where SSO redirects after login (must match registered URI)</li>
              <li><code>response_type</code> - Always <code>code</code> for authorization code flow</li>
              <li><code>scope</code> - Requested scopes (space-separated)</li>
            </ul>
          </section>

          {/* WHAT: Step 3 - Handle OAuth callback */}
          {/* WHY: Need to exchange authorization code for tokens on backend */}
          <section className={styles.section}>
            <h2>3. Handle OAuth Callback (Backend)</h2>
            <p>
              After user authenticates, SSO redirects to your <code>redirect_uri</code> with an authorization code:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`https://yourapp.com/auth/callback?code=AUTHORIZATION_CODE`}
              </pre>
            </div>
            <p>
              <strong>Exchange the code for tokens</strong> (server-side only!):
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Node.js / Express example
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  // WHAT: Exchange authorization code for tokens
  // WHY: Code is single-use and short-lived, need long-lived tokens
  const tokenResponse = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET,
      redirect_uri: 'https://yourapp.com/auth/callback'
    })
  });
  
  const tokens = await tokenResponse.json();
  // tokens = { access_token, refresh_token, id_token, expires_in }
  
  // WHAT: Decode ID token to get user info
  // WHY: ID token contains user identity and app-level role
  const jwt = require('jsonwebtoken');
  const userInfo = jwt.decode(tokens.id_token);
  // userInfo = { sub, email, name, role: 'user'|'admin' }
  
  // WHAT: Create your app's session
  // WHY: Store user identity and tokens for future API calls
  req.session.userId = userInfo.sub;
  req.session.email = userInfo.email;
  req.session.role = userInfo.role;
  req.session.accessToken = tokens.access_token;
  req.session.refreshToken = tokens.refresh_token;
  
  // Redirect to your app
  res.redirect('/dashboard');
});`}
              </pre>
            </div>
          </section>

          {/* WHAT: Step 4 - Validate sessions */}
          {/* WHY: Need to check if user still has access before showing content */}
          <section className={styles.section}>
            <h2>4. Validate User Sessions</h2>
            <p>
              Before serving protected content, validate the user's session:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Middleware to protect routes
async function requireAuth(req, res, next) {
  const accessToken = req.session.accessToken;
  
  if (!accessToken) {
    return res.redirect('/login');
  }
  
  // WHAT: Validate access token with SSO
  // WHY: Ensure user still has approved access (not revoked)
  const validation = await fetch('https://sso.doneisbetter.com/api/public/session', {
    headers: {
      'Authorization': \`Bearer \${accessToken}\`
    }
  });
  
  if (!validation.ok) {
    // Token invalid or expired - try refresh
    const refreshed = await refreshAccessToken(req.session.refreshToken);
    if (!refreshed) {
      return res.redirect('/login');
    }
    req.session.accessToken = refreshed.access_token;
  }
  
  next();
}

// Use middleware
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { user: req.session });
});`}
              </pre>
            </div>
          </section>

          {/* WHAT: Step 5 - Token refresh */}
          {/* WHY: Access tokens expire, need to refresh without re-login */}
          <section className={styles.section}>
            <h2>5. Refresh Access Tokens</h2>
            <p>
              Access tokens expire after 1 hour. Use refresh tokens to get new ones:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET
    })
  });
  
  if (!response.ok) {
    return null; // Refresh token invalid or expired
  }
  
  return await response.json();
  // Returns { access_token, refresh_token, expires_in }
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: Step 6 - Logout */}
          {/* WHY: Users need to end their session securely */}
          <section className={styles.section}>
            <h2>6. Implement Logout</h2>
            <p>
              Revoke tokens and clear session:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`app.post('/logout', async (req, res) => {
  const accessToken = req.session.accessToken;
  
  // WHAT: Revoke token at SSO
  // WHY: Prevent token reuse after logout
  await fetch('https://sso.doneisbetter.com/api/oauth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: accessToken,
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET
    })
  });
  
  // Clear your app's session
  req.session.destroy();
  res.redirect('/login');
});`}
              </pre>
            </div>
          </section>

          {/* WHAT: Next steps section */}
          {/* WHY: Guide users to deeper documentation */}
          <section className={styles.section}>
            <h2>Next Steps</h2>
            <p>
              You now have basic OAuth 2.0 integration! Continue with:
            </p>
            <ul>
              <li><a href="/docs/authentication">Authentication Guide</a> - Deep dive into OAuth flow</li>
              <li><a href="/docs/app-permissions">App Permissions</a> - Understanding approval workflow</li>
              <li><a href="/docs/admin-approval">Admin Approval</a> - How users get access</li>
              <li><a href="/docs/api">API Reference</a> - Complete endpoint documentation</li>
              <li><a href="/docs/security/best-practices">Security Best Practices</a></li>
            </ul>
          </section>

          {/* WHAT: Common issues section */}
          {/* WHY: Help developers troubleshoot integration problems */}
          <section className={styles.section}>
            <h2>Common Issues</h2>
            <ul>
              <li>
                <strong>"Access Pending Approval"</strong>
                <p>User registered but SSO admin hasn't approved access yet. Check <a href="/docs/admin-approval">Admin Approval Guide</a>.</p>
              </li>
              <li>
                <strong>"Redirect URI Mismatch"</strong>
                <p>The redirect_uri parameter must exactly match a registered URI. Check with SSO admins.</p>
              </li>
              <li>
                <strong>"Invalid Client Credentials"</strong>
                <p>client_id or client_secret is wrong. Verify environment variables.</p>
              </li>
              <li>
                <strong>Token expired errors</strong>
                <p>Implement token refresh (step 5) to handle expiration gracefully.</p>
              </li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
