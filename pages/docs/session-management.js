// WHAT: OAuth 2.0 token lifecycle and session management documentation
// WHY: Developers need to understand token types, expiry, and refresh mechanisms
// HOW: Explains access tokens, refresh tokens, ID tokens, and session validation

import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function SessionManagementDocs() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Session Management</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              The SSO service uses OAuth 2.0 tokens to manage user sessions. Understanding token types,
              lifetimes, and refresh mechanisms is essential for building secure, seamless applications.
            </p>
            <div className={styles.alert}>
              <strong>📝 Note:</strong> This guide focuses on session management from the application's perspective.
              All token operations should happen on your backend server, not in the browser.
            </div>
          </section>

          <section className={styles.section}>
            <h2>Token Types</h2>
            <p>The SSO service issues three types of tokens during OAuth 2.0 authentication:</p>

            <h3>1. Access Token</h3>
            <ul>
              <li><strong>Purpose:</strong> Used to authenticate API requests</li>
              <li><strong>Lifetime:</strong> 1 hour (3600 seconds)</li>
              <li><strong>Format:</strong> JWT (JSON Web Token)</li>
              <li><strong>Usage:</strong> Include in <code>Authorization: Bearer TOKEN</code> header</li>
              <li><strong>Storage:</strong> HTTP-only cookie (backend) or secure storage (backend)</li>
            </ul>
            <div className={styles.codeBlock}>
              <pre>
                {`// Example access token payload (decoded)
{
  "sub": "user-uuid-123",
  "iss": "https://sso.doneisbetter.com",
  "aud": "your-client-id",
  "exp": 1710000000,
  "iat": 1709996400,
  "scope": "openid profile email"
}`}
              </pre>
            </div>

            <h3>2. ID Token</h3>
            <ul>
              <li><strong>Purpose:</strong> Contains user identity and app permissions</li>
              <li><strong>Lifetime:</strong> 1 hour (3600 seconds)</li>
              <li><strong>Format:</strong> JWT (JSON Web Token)</li>
              <li><strong>Usage:</strong> Extract user info, role, and permission status</li>
              <li><strong>Storage:</strong> HTTP-only cookie (backend)</li>
            </ul>
            <div className={styles.codeBlock}>
              <pre>
                {`// Example ID token payload (decoded)
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",  // 'admin' or 'user'
  "permissionStatus": "approved",  // 'approved', 'pending', or 'revoked'
  "iss": "https://sso.doneisbetter.com",
  "aud": "your-client-id",
  "exp": 1710000000,
  "iat": 1709996400
}`}
              </pre>
            </div>

            <h3>3. Refresh Token</h3>
            <ul>
              <li><strong>Purpose:</strong> Used to obtain new access and ID tokens</li>
              <li><strong>Lifetime:</strong> 30 days (2592000 seconds)</li>
              <li><strong>Format:</strong> Opaque string (not JWT)</li>
              <li><strong>Usage:</strong> Exchange for new tokens before access token expires</li>
              <li><strong>Storage:</strong> HTTP-only cookie (backend)</li>
              <li><strong>Security:</strong> Single-use (rotated on each refresh)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Session Lifecycle</h2>
            <p>Understanding the complete session lifecycle helps you implement reliable authentication:</p>

            <h3>Phase 1: Initial Authentication</h3>
            <ol>
              <li>User clicks "Sign in with SSO"</li>
              <li>Your app redirects to SSO authorization page</li>
              <li>User authenticates with SSO</li>
              <li>SSO redirects back to your app with authorization code</li>
              <li>Your backend exchanges code for tokens (access, ID, refresh)</li>
              <li>Your backend stores tokens in HTTP-only cookies</li>
              <li>Your backend redirects user to app</li>
            </ol>

            <h3>Phase 2: Active Session</h3>
            <ul>
              <li>User makes requests to your app</li>
              <li>Your backend validates ID token for each request</li>
              <li>User info and permissions are extracted from ID token</li>
              <li>Access token is used for SSO API calls (if needed)</li>
            </ul>

            <h3>Phase 3: Token Refresh (Automatic)</h3>
            <ul>
              <li>Access token expires after 1 hour</li>
              <li>Your backend detects expiry (checks <code>exp</code> claim)</li>
              <li>Your backend uses refresh token to get new tokens</li>
              <li>Old refresh token is invalidated (single-use)</li>
              <li>New tokens are stored in cookies</li>
            </ul>

            <h3>Phase 4: Session End</h3>
            <ul>
              <li>User clicks "Sign out"</li>
              <li>Your backend revokes tokens with SSO</li>
              <li>Your backend clears cookies</li>
              <li>User is redirected to logout page</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Validating Tokens</h2>
            <p>Your backend should validate tokens on every request to ensure session integrity:</p>

            <h3>Backend Session Validation</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Node.js/Express example
import jwt from 'jsonwebtoken';

// WHY: Middleware to validate session and extract user info
export function validateSession(req, res, next) {
  const idToken = req.cookies.id_token;
  const accessToken = req.cookies.access_token;

  // Check if tokens exist
  if (!idToken || !accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Decode ID token (contains user info)
    const decoded = jwt.decode(idToken);

    // WHY: Check token expiration
    if (decoded.exp * 1000 < Date.now()) {
      // Token expired, attempt refresh
      return refreshAndRetry(req, res, next);
    }

    // WHY: Check app permission status
    if (decoded.permissionStatus !== 'approved') {
      return res.status(403).json({
        error: 'APP_ACCESS_DENIED',
        permissionStatus: decoded.permissionStatus
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      permissionStatus: decoded.permissionStatus
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Token Refresh Implementation</h2>
            <p>Implement automatic token refresh to maintain seamless user sessions:</p>

            <h3>Proactive Refresh (Recommended)</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Refresh tokens 5 minutes before expiry
const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

async function ensureValidToken(req, res, next) {
  const idToken = req.cookies.id_token;
  
  if (!idToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const decoded = jwt.decode(idToken);
  const expiresAt = decoded.exp * 1000;
  const now = Date.now();

  // WHY: Refresh proactively before expiry
  if (expiresAt - now < REFRESH_BUFFER) {
    await refreshTokens(req, res);
  }

  next();
}

async function refreshTokens(req, res) {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // WHY: Exchange refresh token for new access and ID tokens
    const response = await fetch(
      'https://sso.doneisbetter.com/api/oauth/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.SSO_CLIENT_ID,
          client_secret: process.env.SSO_CLIENT_SECRET
        })
      }
    );

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();
    const { access_token, id_token, refresh_token: newRefreshToken } = tokens;

    // WHY: Update cookies with new tokens
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600000 // 1 hour
    });
    res.cookie('id_token', id_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600000
    });
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 2592000000 // 30 days
    });

    console.log('Tokens refreshed successfully');
  } catch (error) {
    console.error('Token refresh error:', error);
    // Clear invalid tokens
    res.clearCookie('access_token');
    res.clearCookie('id_token');
    res.clearCookie('refresh_token');
    throw error;
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Session Termination</h2>
            <p>Properly terminate sessions to ensure security:</p>

            <h3>Logout Implementation</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Backend logout endpoint
export async function logout(req, res) {
  const accessToken = req.cookies.access_token;

  try {
    // WHY: Revoke tokens with SSO server
    if (accessToken) {
      await fetch('https://sso.doneisbetter.com/api/oauth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: accessToken,
          client_id: process.env.SSO_CLIENT_ID,
          client_secret: process.env.SSO_CLIENT_SECRET
        })
      });
    }
  } catch (error) {
    console.error('Token revocation failed:', error);
    // Continue with logout even if revocation fails
  }

  // WHY: Clear all session cookies
  res.clearCookie('access_token');
  res.clearCookie('id_token');
  res.clearCookie('refresh_token');

  res.json({ success: true });
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Best Practices</h2>
            <ul>
              <li>✅ <strong>Store tokens in HTTP-only cookies</strong> (never in localStorage/sessionStorage)</li>
              <li>✅ <strong>Implement proactive token refresh</strong> (5 minutes before expiry)</li>
              <li>✅ <strong>Validate tokens on every request</strong> (check expiry and permission status)</li>
              <li>✅ <strong>Use refresh tokens correctly</strong> (they're single-use and rotate on refresh)</li>
              <li>✅ <strong>Revoke tokens on logout</strong> (prevent reuse even if intercepted)</li>
              <li>✅ <strong>Handle token expiry gracefully</strong> (redirect to login or show message)</li>
              <li>✅ <strong>Monitor token operations</strong> (log refresh failures for debugging)</li>
              <li>⚠️ <strong>Never expose tokens in URLs</strong> (use cookies or headers only)</li>
              <li>⚠️ <strong>Never decode tokens in frontend</strong> (keep user info extraction server-side)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Troubleshooting</h2>
            <h3>Token expired</h3>
            <p><strong>Symptom:</strong> 401 errors, user logged out unexpectedly</p>
            <p><strong>Solution:</strong> Implement proactive token refresh (see above)</p>

            <h3>Refresh token invalid</h3>
            <p><strong>Symptom:</strong> Token refresh fails with 401 error</p>
            <p><strong>Causes:</strong></p>
            <ul>
              <li>Refresh token already used (they're single-use)</li>
              <li>Refresh token expired (30 day lifetime)</li>
              <li>User's access was revoked</li>
            </ul>
            <p><strong>Solution:</strong> Redirect user to login page</p>

            <h3>Permission status changed</h3>
            <p><strong>Symptom:</strong> User was approved but now gets 403 errors</p>
            <p><strong>Cause:</strong> SSO admin changed user's permission status</p>
            <p><strong>Solution:</strong> Check <code>permissionStatus</code> in ID token and redirect accordingly</p>

            <h3>Session not persisting</h3>
            <p><strong>Symptom:</strong> User logged out on page refresh</p>
            <p><strong>Solutions:</strong></p>
            <ul>
              <li>Verify cookies are set with correct domain and path</li>
              <li>Ensure <code>SameSite</code> and <code>Secure</code> flags are set correctly</li>
              <li>Check CORS configuration (credentials must be included)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Summary</h2>
            <ul>
              <li>☑️ Understand three token types: access, ID, and refresh</li>
              <li>☑️ Implement token validation middleware</li>
              <li>☑️ Implement proactive token refresh (5 min before expiry)</li>
              <li>☑️ Store tokens in HTTP-only cookies</li>
              <li>☑️ Revoke tokens on logout</li>
              <li>☑️ Check <code>permissionStatus</code> on every request</li>
            </ul>
            <div className={styles.alert}>
              <strong>🔗 Related Resources:</strong>
              <ul>
                <li><a href="/docs/authentication">OAuth 2.0 Authentication Flow</a></li>
                <li><a href="/docs/security/best-practices">Security Best Practices</a></li>
                <li><a href="/docs/app-permissions">App Permissions System</a></li>
                <li><a href="/docs/api/endpoints">API Reference</a></li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
