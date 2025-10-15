// WHAT: Complete error reference for OAuth 2.0 SSO including app permissions
// WHY: Developers need to handle all possible error conditions
// HOW: Documents OAuth errors, app permission errors, and HTTP status codes

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function ApiErrors() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API Error Reference</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          {/* WHAT: OAuth 2.0 standard error codes */}
          {/* WHY: Developers must handle OAuth errors correctly */}
          <section className={styles.section}>
            <h2>OAuth 2.0 Error Codes</h2>
            <p>Standard OAuth 2.0 errors from RFC 6749. Returned from authorization and token endpoints.</p>
            
            <h3>Authorization Endpoint Errors</h3>
            <p>Returned as query parameters in redirect URL:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`https://yourapp.com/callback?error=ERROR_CODE&error_description=Message`}
              </pre>
            </div>

            <h4><code>access_denied</code></h4>
            <ul>
              <li><strong>Cause:</strong> User denied authorization or lacks app permission</li>
              <li><strong>HTTP:</strong> 302 redirect with error in query params</li>
              <li><strong>Action:</strong> Check permission status (pending/revoked/none), show appropriate message</li>
            </ul>

            <h4><code>invalid_client</code></h4>
            <ul>
              <li><strong>Cause:</strong> Unknown client_id or client suspended</li>
              <li><strong>Action:</strong> Verify client_id, contact SSO admins</li>
            </ul>

            <h4><code>invalid_scope</code></h4>
            <ul>
              <li><strong>Cause:</strong> Requested scope not in client's allowed_scopes</li>
              <li><strong>Action:</strong> Only request registered scopes</li>
            </ul>

            <h4><code>unauthorized_client</code></h4>
            <ul>
              <li><strong>Cause:</strong> Grant type not allowed for this client</li>
              <li><strong>Action:</strong> Verify OAuth client configuration</li>
            </ul>

            <h4><code>invalid_request</code></h4>
            <ul>
              <li><strong>Cause:</strong> Missing required parameter or malformed request</li>
              <li><strong>Action:</strong> Check client_id, redirect_uri, response_type, scope</li>
            </ul>

            <h3>Token Endpoint Errors</h3>
            <p>Returned as JSON response body:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": "ERROR_CODE",
  "error_description": "Human-readable message"
}`}
              </pre>
            </div>

            <h4><code>invalid_grant</code></h4>
            <p><strong>HTTP 400 Bad Request</strong></p>
            <ul>
              <li><strong>Cause:</strong> Authorization code expired (10 min), already used, or invalid</li>
              <li><strong>Action:</strong> Restart OAuth flow from /api/oauth/authorize</li>
            </ul>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or already used"
}`}
              </pre>
            </div>

            <h4><code>invalid_client</code></h4>
            <p><strong>HTTP 401 Unauthorized</strong></p>
            <ul>
              <li><strong>Cause:</strong> Wrong client_secret or invalid client_id</li>
              <li><strong>Action:</strong> Verify environment variables</li>
            </ul>

            <h4><code>redirect_uri_mismatch</code></h4>
            <p><strong>HTTP 400 Bad Request</strong></p>
            <ul>
              <li><strong>Cause:</strong> redirect_uri in token request differs from authorization request</li>
              <li><strong>Action:</strong> Use exact same redirect_uri in both requests</li>
            </ul>

            <h4><code>unsupported_grant_type</code></h4>
            <p><strong>HTTP 400 Bad Request</strong></p>
            <ul>
              <li><strong>Cause:</strong> Invalid grant_type value</li>
              <li><strong>Action:</strong> Use "authorization_code" or "refresh_token"</li>
            </ul>
          </section>

          {/* WHAT: App permission error codes */}
          {/* WHY: Key SSO feature with specific errors */}
          <section className={styles.section}>
            <h2>App Permission Error Codes</h2>
            <p>Errors specific to SSO app-level permission system:</p>

            <h3><code>APP_PERMISSION_DENIED</code></h3>
            <p><strong>HTTP 403 Forbidden</strong></p>
            <p>User does not have permission to access this application.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": {
    "code": "APP_PERMISSION_DENIED",
    "message": "User does not have permission to access this application",
    "status": "pending"  // or "revoked" or "none"
  }
}`}
              </pre>
            </div>
            <p><strong>Status-specific messages:</strong></p>
            <ul>
              <li><code>pending</code> - "Your access request is pending admin approval."</li>
              <li><code>revoked</code> - "Your access has been revoked. Contact support."</li>
              <li><code>none</code> - "You don't have access. Contact administrator."</li>
            </ul>

            <h3><code>APP_PERMISSION_INSUFFICIENT_ROLE</code></h3>
            <p><strong>HTTP 403 Forbidden</strong></p>
            <p>User has access but insufficient role for operation.</p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": {
    "code": "APP_PERMISSION_INSUFFICIENT_ROLE",
    "message": "Admin role required",
    "currentRole": "user",
    "requiredRole": "admin"
  }
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: Authentication errors */}
          {/* WHY: Token and session management errors */}
          <section className={styles.section}>
            <h2>Authentication Error Codes</h2>
            
            <h3><code>INVALID_TOKEN</code></h3>
            <p><strong>HTTP 401 Unauthorized</strong></p>
            <ul>
              <li><strong>Cause:</strong> Token malformed, invalid signature, or tampered</li>
              <li><strong>Action:</strong> Try refresh token, then re-authenticate</li>
            </ul>

            <h3><code>TOKEN_EXPIRED</code></h3>
            <p><strong>HTTP 401 Unauthorized</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired",
    "expiredAt": "2025-10-15T17:22:16.000Z"
  }
}`}
              </pre>
            </div>
            <ul>
              <li><strong>Cause:</strong> Access token older than 1 hour</li>
              <li><strong>Action:</strong> Use refresh token to get new access token</li>
            </ul>

            <h3><code>INVALID_CREDENTIALS</code></h3>
            <p><strong>HTTP 401 Unauthorized</strong></p>
            <ul>
              <li><strong>Cause:</strong> Wrong email or password (direct login)</li>
              <li><strong>Action:</strong> Check credentials, note: rate limited after 10 failures</li>
            </ul>

            <h3><code>UNAUTHORIZED</code></h3>
            <p><strong>HTTP 401 Unauthorized</strong></p>
            <ul>
              <li><strong>Cause:</strong> No authentication provided</li>
              <li><strong>Action:</strong> Include Authorization: Bearer header</li>
            </ul>
          </section>

          {/* WHAT: Validation errors */}
          {/* WHY: Input validation failures */}
          <section className={styles.section}>
            <h2>Validation Error Codes</h2>
            
            <h3><code>INVALID_INPUT</code></h3>
            <p><strong>HTTP 400 Bad Request</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}`}
              </pre>
            </div>

            <h3><code>EMAIL_EXISTS</code></h3>
            <p><strong>HTTP 400 Bad Request</strong></p>
            <ul>
              <li><strong>Cause:</strong> Email already registered</li>
              <li><strong>Action:</strong> User should login instead</li>
            </ul>

            <h3><code>MISSING_REQUIRED_FIELD</code></h3>
            <p><strong>HTTP 400 Bad Request</strong></p>
            <ul>
              <li><strong>Cause:</strong> Required field missing from request body</li>
              <li><strong>Action:</strong> Check API endpoint documentation for required fields</li>
            </ul>
          </section>

          {/* WHAT: Rate limiting */}
          {/* WHY: Important for retry logic */}
          <section className={styles.section}>
            <h2>Rate Limiting Errors</h2>
            
            <h3><code>rate_limit_exceeded</code></h3>
            <p><strong>HTTP 429 Too Many Requests</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Retry after 60 seconds.",
  "retry_after": 60
}`}
              </pre>
            </div>
            <ul>
              <li><strong>Action:</strong> Wait retry_after seconds, implement exponential backoff</li>
            </ul>
          </section>

          {/* WHAT: Admin API errors */}
          {/* WHY: Administrative operations have unique errors */}
          <section className={styles.section}>
            <h2>Admin API Error Codes</h2>
            
            <h3><code>ADMIN_AUTH_REQUIRED</code></h3>
            <p><strong>HTTP 401 Unauthorized</strong></p>
            <ul>
              <li><strong>Cause:</strong> Missing or invalid admin session cookie</li>
              <li><strong>Action:</strong> Redirect to /admin login</li>
            </ul>

            <h3><code>INSUFFICIENT_ADMIN_PERMISSIONS</code></h3>
            <p><strong>HTTP 403 Forbidden</strong></p>
            <ul>
              <li><strong>Cause:</strong> Operation requires super-admin, user is only admin</li>
              <li><strong>Action:</strong> Contact super-admin for this operation</li>
            </ul>

            <h3><code>USER_NOT_FOUND</code></h3>
            <p><strong>HTTP 404 Not Found</strong></p>
            <ul>
              <li><strong>Cause:</strong> User UUID doesn't exist</li>
              <li><strong>Action:</strong> Verify user ID is correct</li>
            </ul>
          </section>

          {/* WHAT: Server errors */}
          {/* WHY: Unexpected errors need handling */}
          <section className={styles.section}>
            <h2>Server Error Codes</h2>
            
            <h3><code>INTERNAL_ERROR</code></h3>
            <p><strong>HTTP 500 Internal Server Error</strong></p>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "req_abc123",
    "timestamp": "2025-10-15T16:22:16.000Z"
  }
}`}
              </pre>
            </div>
            <ul>
              <li><strong>Action:</strong> Retry with exponential backoff, contact support with requestId if persists</li>
            </ul>

            <h3><code>DATABASE_ERROR</code></h3>
            <p><strong>HTTP 500 Internal Server Error</strong></p>
            <ul>
              <li><strong>Cause:</strong> Database connection or query failed</li>
              <li><strong>Action:</strong> Usually transient, retry after delay</li>
            </ul>
          </section>

          {/* WHAT: Error handling best practices */}
          {/* WHY: Guide developers to proper error handling */}
          <section className={styles.section}>
            <h2>Error Handling Best Practices</h2>
            
            <h3>1. Check Error Code, Not Message</h3>
            <p>Always use error.code for logic (messages may change):</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// ✅ CORRECT
if (error.code === 'APP_PERMISSION_DENIED') {
  if (error.status === 'pending') {
    showPendingMessage();
  }
}

// ❌ WRONG
if (error.message.includes('permission')) {
  // Message text may change!
}`}
              </pre>
            </div>

            <h3>2. Implement Retry Logic</h3>
            <p>For transient errors (429, 500s), use exponential backoff:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        await sleep(retryAfter * 1000);
        continue;
      }
      
      if (response.status >= 500) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      
      return response;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}`}
              </pre>
            </div>

            <h3>3. Show User-Friendly Messages</h3>
            <p>Map error codes to user-friendly text:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`const ERROR_MESSAGES = {
  'APP_PERMISSION_DENIED': {
    pending: 'Your access is pending approval.',
    revoked: 'Your access was revoked.',
    none: "You don't have access."
  },
  'TOKEN_EXPIRED': 'Session expired. Please login.',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Wait and retry.',
  'INTERNAL_ERROR': 'Something went wrong.'
};

function getUserMessage(error) {
  if (error.code === 'APP_PERMISSION_DENIED') {
    return ERROR_MESSAGES[error.code][error.status];
  }
  return ERROR_MESSAGES[error.code] || 'An error occurred.';
}`}
              </pre>
            </div>

            <h3>4. Handle OAuth Errors Specially</h3>
            <p>OAuth errors come in query params OR JSON:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Authorization callback
const params = new URLSearchParams(window.location.search);
if (params.has('error')) {
  const error = params.get('error');
  if (error === 'access_denied') {
    showAccessDenied();
  }
}

// Token endpoint
const response = await fetch('/api/oauth/token', {...});
const data = await response.json();
if (!response.ok && data.error === 'invalid_grant') {
  window.location.href = '/login';  // Restart OAuth
}`}
              </pre>
            </div>

            <h3>5. Log Errors (But Not Secrets!)</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    console.error('API Error:', {
      url,
      status: response.status,
      error: data.error,
      requestId: data.error?.requestId,
      timestamp: new Date().toISOString()
      // NEVER log: passwords, tokens, secrets
    });
  }
} catch (err) {
  console.error('Network Error:', err);
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: Related documentation */}
          {/* WHY: Guide users to other docs */}
          <section className={styles.section}>
            <h2>Related Documentation</h2>
            <ul>
              <li><a href="/docs/api/endpoints">Complete Endpoint Reference</a> - All API endpoints with examples</li>
              <li><a href="/docs/api/responses">Response Formats</a> - Token structures and response schemas</li>
              <li><a href="/docs/authentication">Authentication Guide</a> - OAuth 2.0 flow details</li>
              <li><a href="/docs/app-permissions">App Permissions</a> - Permission system documentation</li>
              <li><a href="/docs/admin-approval">Admin Approval</a> - How SSO admins manage access</li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
