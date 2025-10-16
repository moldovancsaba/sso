// WHAT: Error handling guide for OAuth 2.0 and app permission errors
// WHY: Developers need practical error handling patterns for production apps
// HOW: Covers OAuth errors, app permission errors, and best practices

import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function ErrorHandlingDocs() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Error Handling</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              Proper error handling is critical for a robust OAuth 2.0 integration. This guide covers
              OAuth error codes, app permission errors, and best practices for graceful error recovery.
            </p>
            <div className={styles.alert}>
              <strong>📝 Note:</strong> For complete error code reference, see <a href="/docs/api/errors">API Error Codes</a>.
            </div>
          </section>

          <section className={styles.section}>
            <h2>OAuth 2.0 Error Handling</h2>
            <p>OAuth 2.0 errors occur during the authorization and token exchange flow:</p>

            <h3>Authorization Endpoint Errors</h3>
            <p>These errors appear in the redirect URI query parameters:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Example error redirect
https://yourapp.com/callback?error=access_denied&error_description=User+denied+access&state=abc123

// Handle in your callback
const params = new URLSearchParams(window.location.search);
const error = params.get('error');

if (error === 'access_denied') {
  showMessage('You declined to sign in. Please try again.');
} else if (error === 'unauthorized_client') {
  showMessage('Your application is not authorized. Contact support.');
}`}
              </pre>
            </div>

            <h3>Token Endpoint Errors</h3>
            <p>These errors occur during token exchange on your backend:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Backend token exchange error handling
try {
  const tokenResponse = await fetch(
    'https://sso.doneisbetter.com/api/oauth/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: process.env.SSO_REDIRECT_URI,
        client_id: process.env.SSO_CLIENT_ID,
        client_secret: process.env.SSO_CLIENT_SECRET
      })
    }
  );

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json();
    
    switch (error.error) {
      case 'invalid_grant':
        // Authorization code expired or already used
        console.error('Code expired. Redirect user to login again.');
        return res.redirect('/login');
      
      case 'invalid_client':
        // client_id or client_secret is wrong
        console.error('Invalid OAuth credentials. Check env vars.');
        return res.status(500).json({ error: 'Configuration error' });
      
      case 'unsupported_grant_type':
        // Wrong grant_type parameter
        console.error('Invalid grant_type. Should be authorization_code.');
        return res.status(500).json({ error: 'Configuration error' });
      
      default:
        console.error('Token exchange failed:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
  }

  const tokens = await tokenResponse.json();
  // Store tokens and proceed
} catch (error) {
  console.error('Token exchange error:', error);
  res.status(500).json({ error: 'Authentication failed' });
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>App Permission Errors</h2>
            <p>After successful authentication, check the user's permission status:</p>

            <div className={styles.codeBlock}>
              <pre>
                {`// Extract permission status from ID token
import jwt from 'jsonwebtoken';

const idToken = req.cookies.id_token;
const decoded = jwt.decode(idToken);
const { permissionStatus, role } = decoded;

// Handle different permission statuses
if (permissionStatus === 'pending') {
  return res.redirect('/access-pending');
} else if (permissionStatus === 'revoked') {
  return res.redirect('/access-denied');
} else if (permissionStatus !== 'approved') {
  return res.status(403).json({
    error: 'APP_ACCESS_DENIED',
    message: 'Access not approved',
    permissionStatus
  });
}

// Check role requirements
if (requireAdmin && role !== 'admin') {
  return res.status(403).json({
    error: 'INSUFFICIENT_ROLE',
    message: 'Admin role required'
  });
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Common Error Scenarios</h2>

            <h3>1. Token Expired</h3>
            <p><strong>Error:</strong> <code>TOKEN_EXPIRED</code> or <code>INVALID_TOKEN</code></p>
            <p><strong>Solution:</strong> Implement automatic token refresh</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Check token expiry and refresh if needed
const decoded = jwt.decode(idToken);
if (decoded.exp * 1000 < Date.now()) {
  await refreshTokens(req, res);
}`}
              </pre>
            </div>

            <h3>2. Invalid Refresh Token</h3>
            <p><strong>Error:</strong> <code>invalid_grant</code> when refreshing</p>
            <p><strong>Causes:</strong></p>
            <ul>
              <li>Refresh token already used (they're single-use)</li>
              <li>Refresh token expired (30 day lifetime)</li>
              <li>User's access was revoked</li>
            </ul>
            <p><strong>Solution:</strong> Redirect to login</p>
            <div className={styles.codeBlock}>
              <pre>
                {`try {
  await refreshTokens(req, res);
} catch (error) {
  if (error.error === 'invalid_grant') {
    // Refresh token invalid, must re-authenticate
    res.clearCookie('access_token');
    res.clearCookie('id_token');
    res.clearCookie('refresh_token');
    return res.redirect('/login');
  }
}`}
              </pre>
            </div>

            <h3>3. CORS Errors</h3>
            <p><strong>Error:</strong> Browser console shows CORS error</p>
            <p><strong>Solution:</strong> Register your origin with SSO admin</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Always include credentials in requests
fetch('https://sso.doneisbetter.com/api/public/session', {
  credentials: 'include' // Required for cookies
});`}
              </pre>
            </div>

            <h3>4. Rate Limiting</h3>
            <p><strong>Error:</strong> <code>429 Too Many Requests</code></p>
            <p><strong>Solution:</strong> Implement exponential backoff</p>
            <div className={styles.codeBlock}>
              <pre>
                {`async function retryWithBackoff(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers.get('Retry-After') || Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
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
            <h2>User-Friendly Error Messages</h2>
            <p>Transform technical errors into user-friendly messages:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`function getErrorMessage(error) {
  const messages = {
    // OAuth errors
    'access_denied': 'You declined to sign in. Please try again if this was a mistake.',
    'unauthorized_client': 'This application is not authorized. Please contact support.',
    'invalid_grant': 'Your session has expired. Please sign in again.',
    
    // App permission errors
    'APP_ACCESS_PENDING': 'Your access request is pending approval. You\\'ll receive an email when approved.',
    'APP_ACCESS_REVOKED': 'Your access has been revoked. Please contact an administrator.',
    'INSUFFICIENT_ROLE': 'You don\\'t have permission to access this feature.',
    
    // Token errors
    'TOKEN_EXPIRED': 'Your session has expired. Redirecting to login...',
    'INVALID_TOKEN': 'Invalid authentication. Please sign in again.',
    
    // Network errors
    'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
    'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.'
  };

  return messages[error.code] || 'An unexpected error occurred. Please try again.';
}

// Usage
try {
  await someOperation();
} catch (error) {
  showUserMessage(getErrorMessage(error));
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Error Logging Best Practices</h2>
            <ul>
              <li>✅ Log errors with full context (user ID, timestamp, request details)</li>
              <li>✅ Use structured logging (JSON format)</li>
              <li>✅ Include error codes and messages</li>
              <li>✅ Never log sensitive data (tokens, secrets, passwords)</li>
              <li>✅ Monitor error rates and patterns</li>
            </ul>
            <div className={styles.codeBlock}>
              <pre>
                {`// Good error logging example
function logError(error, context) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      stack: error.stack
    },
    context: {
      userId: context.user?.userId,
      path: context.req.path,
      method: context.req.method,
      ip: context.req.ip
    }
    // Never log: tokens, client_secret, passwords
  }));
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Summary</h2>
            <ul>
              <li>☑️ Handle OAuth 2.0 errors in authorization and token exchange</li>
              <li>☑️ Check <code>permissionStatus</code> after authentication</li>
              <li>☑️ Implement token refresh with error handling</li>
              <li>☑️ Provide user-friendly error messages</li>
              <li>☑️ Implement rate limiting backoff</li>
              <li>☑️ Log errors with context (but never log secrets)</li>
            </ul>
            <div className={styles.alert}>
              <strong>🔗 Related Resources:</strong>
              <ul>
                <li><a href="/docs/api/errors">Complete Error Code Reference</a></li>
                <li><a href="/docs/authentication">OAuth 2.0 Authentication Flow</a></li>
                <li><a href="/docs/session-management">Token Refresh Implementation</a></li>
                <li><a href="/docs/app-permissions">App Permissions System</a></li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
