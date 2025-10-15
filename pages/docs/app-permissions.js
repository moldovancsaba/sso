// WHAT: App Permissions documentation explaining permission lifecycle
// WHY: Developers need to understand how app-level permissions work in SSO
// HOW: Explains pending → approved → revoked states and role management

import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function AppPermissions() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>App Permissions</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          {/* WHAT: Overview of app permissions system */}
          {/* WHY: Set context before diving into details */}
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              DoneIsBetter SSO implements <strong>app-level permission control</strong> to manage which users 
              can access which applications. This is a centralized authorization layer separate from authentication.
            </p>
            <p><strong>Key Concepts:</strong></p>
            <ul>
              <li><strong>Authentication</strong> - User proves their identity (login)</li>
              <li><strong>Authorization</strong> - SSO decides if user can access specific app</li>
              <li><strong>App Permission</strong> - Per-user, per-app access control record</li>
              <li><strong>Permission Status</strong> - Current state: none, pending, approved, or revoked</li>
              <li><strong>App Role</strong> - User's role within app: user or admin</li>
            </ul>
          </section>

          {/* WHAT: Permission lifecycle diagram */}
          {/* WHY: Visual understanding of state transitions */}
          <section className={styles.section}>
            <h2>Permission Lifecycle</h2>
            <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre' }}>
{`           ┌──────────┐
           │   none   │  Initial state - no permission record exists
           └────┬─────┘
                │
                │ User attempts OAuth login
                ↓
           ┌──────────┐
           │ pending  │  Auto-created on first login attempt
           └────┬─────┘  Status: User waiting for admin approval
                │
                │ SSO Admin grants access
                ↓
           ┌──────────┐
           │ approved │  Status: User can access app
           └────┬─────┘  Role: 'user' or 'admin'
                │
                │ SSO Admin revokes access
                ↓
           ┌──────────┐
           │ revoked  │  Status: Access denied
           └──────────┘  Can be re-approved later`}
              </pre>
            </div>
          </section>

          {/* WHAT: Detailed explanation of each status */}
          {/* WHY: Developers need to know how to handle each state */}
          <section className={styles.section}>
            <h2>Permission Statuses</h2>
            
            <h3>none (No Permission Record)</h3>
            <ul>
              <li><strong>Meaning:</strong> User has never attempted to access this app</li>
              <li><strong>What happens during OAuth:</strong> SSO creates a <code>pending</code> record automatically</li>
              <li><strong>User experience:</strong> First login attempt shows "Access Pending Approval" message</li>
              <li><strong>Next step:</strong> SSO admin reviews and approves/denies</li>
            </ul>

            <h3>pending (Awaiting Admin Approval)</h3>
            <ul>
              <li><strong>Meaning:</strong> User requested access, waiting for SSO admin decision</li>
              <li><strong>Database record:</strong>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  userId: "550e8400-e29b-41d4-a716-446655440000",
  clientId: "your-app-client-id",
  status: "pending",
  role: "none",
  createdAt: "2025-10-15T12:00:00.000Z",
  updatedAt: "2025-10-15T12:00:00.000Z"
}`}
                  </pre>
                </div>
              </li>
              <li><strong>User experience:</strong> SSO shows: "Your access request is pending approval. An admin will review your request shortly."</li>
              <li><strong>OAuth flow:</strong> Authorization stops at permission check, no code issued</li>
              <li><strong>How to approve:</strong> SSO admin uses Admin Panel → Users → App Permissions → Grant Access</li>
            </ul>

            <h3>approved (Access Granted)</h3>
            <ul>
              <li><strong>Meaning:</strong> User has active permission to access app</li>
              <li><strong>Database record:</strong>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  userId: "550e8400-e29b-41d4-a716-446655440000",
  clientId: "your-app-client-id",
  status: "approved",
  role: "admin",  // or "user"
  grantedAt: "2025-10-15T14:30:00.000Z",
  grantedBy: "admin-user-uuid",
  createdAt: "2025-10-15T12:00:00.000Z",
  updatedAt: "2025-10-15T14:30:00.000Z"
}`}
                  </pre>
                </div>
              </li>
              <li><strong>User experience:</strong> OAuth completes successfully, user redirected to app</li>
              <li><strong>Token payload:</strong> ID token includes <code>role</code> field from permission record</li>
              <li><strong>Duration:</strong> Indefinite until revoked or role changed</li>
            </ul>

            <h3>revoked (Access Removed)</h3>
            <ul>
              <li><strong>Meaning:</strong> User previously had access but it was removed</li>
              <li><strong>Database record:</strong>
                <div className={styles.codeBlock}>
                  <pre>
                    {`{
  userId: "550e8400-e29b-41d4-a716-446655440000",
  clientId: "your-app-client-id",
  status: "revoked",
  role: "none",  // Cleared when revoked
  revokedAt: "2025-10-15T16:00:00.000Z",
  revokedBy: "admin-user-uuid",
  createdAt: "2025-10-15T12:00:00.000Z",
  updatedAt: "2025-10-15T16:00:00.000Z"
}`}
                  </pre>
                </div>
              </li>
              <li><strong>User experience:</strong> SSO shows: "Your access to this application has been revoked. Contact support if you believe this is an error."</li>
              <li><strong>Existing tokens:</strong> Remain valid until expiry (1 hour for access tokens)</li>
              <li><strong>Can be re-approved:</strong> Yes, SSO admin can grant access again</li>
            </ul>
          </section>

          {/* WHAT: App-level roles explanation */}
          {/* WHY: Clarify difference between SSO admin and app-level roles */}
          <section className={styles.section}>
            <h2>App-Level Roles</h2>
            <p>
              App permissions include a <code>role</code> field that defines the user's permissions <strong>within your app</strong> (not SSO itself).
            </p>
            
            <h3>Role: "user" (Standard Access)</h3>
            <ul>
              <li>Default role for most users</li>
              <li>Can access app features but not admin functions</li>
              <li>Your app receives <code>role: "user"</code> in ID token payload</li>
              <li>Example use: Regular users in Launchmass can view/edit their own pages</li>
            </ul>

            <h3>Role: "admin" (Elevated Access)</h3>
            <ul>
              <li>Granted by SSO admin for trusted users</li>
              <li>Can access app's administrative features</li>
              <li>Your app receives <code>role: "admin"</code> in ID token payload</li>
              <li>Example use: Admins in Launchmass can manage all users and organizations</li>
            </ul>

            <div style={{ background: '#fff3e0', border: '1px solid #f57c00', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>
                <strong>⚠️ Important Distinction:</strong><br />
                • <strong>SSO Admin</strong> - Manages SSO service itself (grants app permissions)<br />
                • <strong>App Admin</strong> - User with <code>role: "admin"</code> for a specific app (manages app features)<br />
                <br />
                These are separate! An SSO admin might not have any app permissions, 
                and an app admin might not be an SSO admin.
              </p>
            </div>
          </section>

          {/* WHAT: How apps should handle permissions */}
          {/* WHY: Implementation guidance for developers */}
          <section className={styles.section}>
            <h2>Handling Permissions in Your App</h2>
            
            <h3>1. During OAuth Callback</h3>
            <p>Extract role from ID token after token exchange:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// After POST /api/oauth/token
const { id_token } = await tokenResponse.json();
const jwt = require('jsonwebtoken');
const userInfo = jwt.decode(id_token);

// Store in your app's session
req.session.userId = userInfo.sub;
req.session.email = userInfo.email;
req.session.role = userInfo.role;  // "user" or "admin"

// Route user based on role
if (userInfo.role === 'admin') {
  res.redirect('/admin/dashboard');
} else {
  res.redirect('/dashboard');
}`}
              </pre>
            </div>

            <h3>2. Protecting Admin Routes</h3>
            <p>Use role from session to guard admin-only features:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Middleware for admin-only routes
function requireAppAdmin(req, res, next) {
  if (req.session.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }
  next();
}

// Use on admin routes
app.get('/admin/users', requireAppAdmin, (req, res) => {
  // Only app admins can access
});`}
              </pre>
            </div>

            <h3>3. Periodic Permission Validation</h3>
            <p>Check if user still has access (in case of revocation):</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Run periodically or on sensitive operations
async function validateAppAccess(req, res, next) {
  const accessToken = req.session.accessToken;
  
  // Validate with SSO
  const validation = await fetch('https://sso.doneisbetter.com/api/public/session', {
    headers: {
      'Authorization': \`Bearer \${accessToken}\`
    }
  });
  
  if (!validation.ok) {
    // Permission revoked or token expired
    req.session.destroy();
    return res.redirect('/login');
  }
  
  next();
}

// Use on critical operations
app.post('/admin/delete-user', requireAppAdmin, validateAppAccess, async (req, res) => {
  // Double-check user still has admin access
});`}
              </pre>
            </div>
          </section>

          {/* WHAT: Permission management by SSO admins */}
          {/* WHY: Explain how permissions are granted/revoked */}
          <section className={styles.section}>
            <h2>Managing Permissions (SSO Admins)</h2>
            <p>
              SSO administrators manage app permissions through the Admin Panel at{' '}
              <a href="https://sso.doneisbetter.com/admin">https://sso.doneisbetter.com/admin</a>
            </p>

            <h3>Viewing User's App Permissions</h3>
            <ol>
              <li>Login to SSO Admin Panel</li>
              <li>Navigate to Users list</li>
              <li>Click on a user to view details</li>
              <li>Scroll to "Application Access" section</li>
              <li>See all integrated apps and user's permission status for each</li>
            </ol>

            <h3>Granting Access</h3>
            <ol>
              <li>In user's "Application Access" section</li>
              <li>Find app with status "revoked" or "pending"</li>
              <li>Select role: "user" or "admin"</li>
              <li>Click "Grant Access" or "Approve"</li>
              <li>User can now complete OAuth flow</li>
            </ol>

            <h3>Changing Role</h3>
            <ol>
              <li>Find app with status "approved"</li>
              <li>Use role dropdown to change between "user" and "admin"</li>
              <li>Change applies immediately</li>
              <li>Note: Existing tokens still have old role until refresh</li>
            </ol>

            <h3>Revoking Access</h3>
            <ol>
              <li>Find app with status "approved"</li>
              <li>Click "Revoke Access" button</li>
              <li>Confirm in dialog</li>
              <li>User's permission status set to "revoked"</li>
              <li>Note: Existing access tokens remain valid until expiry (max 1 hour)</li>
            </ol>
          </section>

          {/* WHAT: API for programmatic access */}
          {/* WHY: Advanced use case for automation */}
          <section className={styles.section}>
            <h2>App Permissions API</h2>
            <p>
              SSO provides REST APIs for programmatic permission management. 
              <strong>Requires SSO admin authentication</strong> (admin session cookie).
            </p>

            <h3>Get User's Permissions</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`GET https://sso.doneisbetter.com/api/admin/app-permissions/[userId]
Cookie: admin-session=...

// Response:
{
  userId: "550e8400-e29b-41d4-a716-446655440000",
  apps: [
    {
      clientId: "launchmass-client-id",
      name: "Launchmass",
      description: "Landing page builder",
      role: "admin",
      status: "approved",
      grantedAt: "2025-10-15T14:30:00.000Z",
      grantedBy: "admin-uuid"
    },
    {
      clientId: "messmass-client-id",
      name: "Messmass",
      description: "Messaging platform",
      role: "none",
      status: "pending",
      createdAt: "2025-10-15T16:00:00.000Z"
    }
  ]
}`}
              </pre>
            </div>

            <h3>Grant/Approve Access</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`POST https://sso.doneisbetter.com/api/admin/app-permissions/[userId]
Cookie: admin-session=...
Content-Type: application/json

{
  "clientId": "your-app-client-id",
  "role": "user",  // or "admin"
  "status": "approved"
}

// Response: 200 OK
{
  success: true,
  permission: { ...updated permission record... }
}`}
              </pre>
            </div>

            <h3>Update Role</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`PATCH https://sso.doneisbetter.com/api/admin/app-permissions/[userId]
Cookie: admin-session=...
Content-Type: application/json

{
  "clientId": "your-app-client-id",
  "role": "admin"  // Change from "user" to "admin"
}

// Response: 200 OK`}
              </pre>
            </div>

            <h3>Revoke Access</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`DELETE https://sso.doneisbetter.com/api/admin/app-permissions/[userId]
Cookie: admin-session=...
Content-Type: application/json

{
  "clientId": "your-app-client-id"
}

// Response: 200 OK`}
              </pre>
            </div>
          </section>

          {/* WHAT: Security best practices */}
          {/* WHY: Prevent permission-related vulnerabilities */}
          <section className={styles.section}>
            <h2>Security Considerations</h2>
            <ul>
              <li>
                <strong>Apps Cannot Grant Self-Access</strong>
                <p>Only SSO admins can approve app permissions. Apps cannot call permission APIs with their OAuth credentials.</p>
              </li>
              <li>
                <strong>Token Role is Snapshot</strong>
                <p>Role in ID token is captured at token issuance. If admin changes role, user needs to refresh token to see new role.</p>
              </li>
              <li>
                <strong>Revocation Not Immediate</strong>
                <p>Revoking access doesn't invalidate existing tokens. They expire naturally (1 hour). Implement periodic validation for critical operations.</p>
              </li>
              <li>
                <strong>Validate Role Server-Side</strong>
                <p>Don't trust client-side role checks. Always verify role from your backend session before granting admin features.</p>
              </li>
              <li>
                <strong>Audit Permission Changes</strong>
                <p>All permission grants/revokes are logged with admin identity and timestamp in SSO database.</p>
              </li>
            </ul>
          </section>

          {/* WHAT: Related documentation links */}
          {/* WHY: Guide users to complementary docs */}
          <section className={styles.section}>
            <h2>Related Documentation</h2>
            <ul>
              <li><a href="/docs/admin-approval">Admin Approval Process</a> - How SSO admins manage access</li>
              <li><a href="/docs/authentication">Authentication Guide</a> - OAuth 2.0 flow details</li>
              <li><a href="/docs/quickstart">Quick Start Guide</a> - Integration tutorial</li>
              <li><a href="/docs/api">API Reference</a> - Complete endpoint documentation</li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
