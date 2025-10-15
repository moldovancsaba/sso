// WHAT: API response formats including OAuth token structures
// WHY: Developers need to understand token payloads and response schemas
// HOW: Documents JWT structures, OAuth responses, and HTTP status codes

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function ApiResponses() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>API Response Formats</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          {/* WHAT: OAuth token response structures */}
          {/* WHY: Most important responses for developers */}
          <section className={styles.section}>
            <h2>OAuth 2.0 Token Response</h2>
            <p>Response from <code>POST /api/oauth/token</code> endpoint:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Success Response (200 OK)
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQw...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQw...",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQw..."
}

// Field descriptions:
// access_token - JWT for API authentication (1 hour expiry)
// token_type - Always "Bearer"
// expires_in - Seconds until access_token expires
// refresh_token - JWT for refreshing access token (30 days)
// id_token - JWT containing user identity and role`}
              </pre>
            </div>
          </section>

          {/* WHAT: JWT token structures */}
          {/* WHY: Developers need to decode and understand tokens */}
          <section className={styles.section}>
            <h2>JWT Token Structures</h2>
            
            <h3>Access Token Payload</h3>
            <p>Decoded JWT structure for <code>access_token</code>:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User UUID
  "iss": "https://sso.doneisbetter.com",            // Issuer
  "aud": "your-client-id",                          // Audience (your app)
  "exp": 1734274936,                                 // Expiration (Unix timestamp)
  "iat": 1734271336,                                 // Issued at (Unix timestamp)
  "jti": "token-unique-id"                           // JWT ID (for revocation)
}

// Usage:
Authorization: Bearer <access_token>

// Validation:
// - Check exp > current time
// - Verify iss matches expected issuer
// - Verify aud matches your client_id`}
              </pre>
            </div>

            <h3>ID Token Payload</h3>
            <p>Decoded JWT structure for <code>id_token</code> (contains user info + app role):</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User UUID
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",                                   // App-level role: 'user' or 'admin'
  "iss": "https://sso.doneisbetter.com",
  "aud": "your-client-id",
  "exp": 1734274936,
  "iat": 1734271336
}

// Usage:
// Decode (no verification needed if from /token endpoint)
const jwt = require('jsonwebtoken');
const userInfo = jwt.decode(id_token);
console.log(userInfo.email, userInfo.role);

// Store in your app's session
req.session.userId = userInfo.sub;
req.session.email = userInfo.email;
req.session.role = userInfo.role;  // Use for authorization`}
              </pre>
            </div>

            <h3>Refresh Token Payload</h3>
            <p>Decoded JWT structure for <code>refresh_token</code>:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Opaque to clients - treat as string, don't decode
// Internal structure (for reference only):
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "client_id": "your-client-id",
  "iss": "https://sso.doneisbetter.com",
  "exp": 1736863336,  // 30 days from issuance
  "iat": 1734271336,
  "jti": "refresh-token-unique-id"
}

// Usage:
// POST /api/oauth/token with grant_type=refresh_token
// Returns new access_token (and may rotate refresh_token)`}
              </pre>
            </div>
          </section>

          {/* WHAT: Standard API response formats */}
          {/* WHY: Non-OAuth endpoints use different format */}
          <section className={styles.section}>
            <h2>Standard API Response Format</h2>
            <p>Public and admin API endpoints return JSON in this format:</p>
            
            <h3>Success Response</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Example: POST /api/public/register
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2025-10-15T16:22:16.000Z"
}

// Example: GET /api/admin/users
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-10-15T16:22:16.000Z",
    "updatedAt": "2025-10-15T16:22:16.000Z"
  }
]`}
              </pre>
            </div>

            <h3>Error Response</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Standard error format
{
  "error": {
    "code": "APP_PERMISSION_DENIED",
    "message": "User does not have permission to access this application",
    "status": "pending"  // Additional context (optional)
  }
}

// OAuth error format (different!)
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or already used"
}`}
              </pre>
            </div>
          </section>

          {/* WHAT: HTTP status codes reference */}
          {/* WHY: Developers need to handle different statuses */}
          <section className={styles.section}>
            <h2>HTTP Status Codes</h2>
            <p>The API uses standard HTTP status codes to indicate the result of requests:</p>
            <ul>
              <li>
                <code>200 OK</code>
                <p>Request successful. Response body contains requested data.</p>
              </li>
              <li>
                <code>201 Created</code>
                <p>Resource successfully created (e.g., user registration).</p>
              </li>
              <li>
                <code>302 Found</code>
                <p>Redirect (used in OAuth authorization endpoint).</p>
              </li>
              <li>
                <code>400 Bad Request</code>
                <p>Invalid request parameters, malformed JSON, or validation errors.</p>
              </li>
              <li>
                <code>401 Unauthorized</code>
                <p>Authentication required or invalid/expired token.</p>
              </li>
              <li>
                <code>403 Forbidden</code>
                <p>Valid authentication but insufficient permissions (e.g., app permission denied).</p>
              </li>
              <li>
                <code>404 Not Found</code>
                <p>Requested resource does not exist.</p>
              </li>
              <li>
                <code>429 Too Many Requests</code>
                <p>Rate limit exceeded. Check <code>Retry-After</code> header.</p>
              </li>
              <li>
                <code>500 Internal Server Error</code>
                <p>Unexpected server error occurred.</p>
              </li>
            </ul>
          </section>

          {/* WHAT: Response headers documentation */}
          {/* WHY: Important metadata in headers */}
          <section className={styles.section}>
            <h2>Response Headers</h2>
            <p>Important information is conveyed through response headers:</p>
            <ul>
              <li>
                <code>Content-Type: application/json</code>
                <p>All API responses are JSON (except OAuth redirects).</p>
              </li>
              <li>
                <code>X-RateLimit-Limit: 60</code>
                <p>Maximum requests allowed in current time window.</p>
              </li>
              <li>
                <code>X-RateLimit-Remaining: 58</code>
                <p>Remaining requests in current time window.</p>
              </li>
              <li>
                <code>X-RateLimit-Reset: 1627399287</code>
                <p>Unix timestamp when rate limit resets.</p>
              </li>
              <li>
                <code>Retry-After: 60</code>
                <p>Seconds to wait before retrying (429 responses).</p>
              </li>
              <li>
                <code>Set-Cookie: admin-session=...; HttpOnly; SameSite=Lax</code>
                <p>Admin session cookie (admin login endpoint only).</p>
              </li>
              <li>
                <code>Access-Control-Allow-Origin: https://yourapp.com</code>
                <p>CORS header indicating allowed origin.</p>
              </li>
              <li>
                <code>Access-Control-Allow-Credentials: true</code>
                <p>Indicates cookies are allowed in cross-origin requests.</p>
              </li>
            </ul>
          </section>

          {/* WHAT: App permission response examples */}
          {/* WHY: Key feature needing clear documentation */}
          <section className={styles.section}>
            <h2>App Permission Responses</h2>
            <p>Special response format for app permission management:</p>
            
            <h3>GET /api/admin/app-permissions/[userId]</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "apps": [
    {
      "clientId": "launchmass-client-id",
      "name": "Launchmass",
      "description": "Landing page builder",
      "role": "admin",       // Current role: 'none', 'user', or 'admin'
      "status": "approved",  // 'pending', 'approved', 'revoked', 'none'
      "grantedAt": "2025-10-15T14:30:00.000Z",
      "grantedBy": "admin-user-uuid",
      "createdAt": "2025-10-15T12:00:00.000Z",
      "updatedAt": "2025-10-15T14:30:00.000Z"
    },
    {
      "clientId": "messmass-client-id",
      "name": "Messmass",
      "description": "Messaging platform",
      "role": "none",
      "status": "pending",
      "createdAt": "2025-10-15T16:00:00.000Z",
      "updatedAt": "2025-10-15T16:00:00.000Z"
    }
  ]
}`}
              </pre>
            </div>

            <h3>Permission Status Meanings</h3>
            <ul>
              <li><code>none</code> - No permission record exists (never requested)</li>
              <li><code>pending</code> - User requested access, awaiting admin approval</li>
              <li><code>approved</code> - User has active access with assigned role</li>
              <li><code>revoked</code> - Access was granted but has been revoked</li>
            </ul>
          </section>

          {/* WHAT: Timestamp format */}
          {/* WHY: Consistency across all endpoints */}
          <section className={styles.section}>
            <h2>Timestamp Format</h2>
            <p>All timestamps in API responses use <strong>ISO 8601 UTC with milliseconds</strong>:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Format: YYYY-MM-DDTHH:MM:SS.sssZ
"createdAt": "2025-10-15T16:22:16.000Z"
"updatedAt": "2025-10-15T16:22:16.000Z"
"grantedAt": "2025-10-15T14:30:00.000Z"

// Parsing in JavaScript:
const date = new Date("2025-10-15T16:22:16.000Z");
console.log(date.toLocaleString());  // Local time

// Parsing in other languages:
// Python: datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
// Go: time.Parse(time.RFC3339Nano, timestamp)
// Java: Instant.parse(timestamp)`}
              </pre>
            </div>
          </section>

          {/* WHAT: Related documentation */}
          {/* WHY: Guide users to other relevant docs */}
          <section className={styles.section}>
            <h2>Related Documentation</h2>
            <ul>
              <li><a href="/docs/api/endpoints">Complete Endpoint Reference</a> - All API endpoints</li>
              <li><a href="/docs/api/errors">Error Reference</a> - All error codes and handling</li>
              <li><a href="/docs/authentication">Authentication Guide</a> - OAuth 2.0 flow details</li>
              <li><a href="/docs/app-permissions">App Permissions</a> - Permission system</li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
