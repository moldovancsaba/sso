// WHAT: App permissions system documentation for OAuth 2.0 SSO integration
// WHY: Developers need to understand app-level permissions and roles
// HOW: Explains backend-derived permissionStatus, app roles, and two-level access control

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function SecurityPermissions() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>App Permissions System</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              The SSO service implements a two-level access control system:
            </p>
            <ol>
              <li><strong>SSO-Level Permissions:</strong> Managed by SSO admins (who can access which apps)</li>
              <li><strong>App-Level Permissions:</strong> Managed by your application (what users can do inside your app)</li>
            </ol>
            <p>
              This document focuses on <strong>SSO-level permissions</strong> that affect OAuth 2.0 authentication.
            </p>
            <div className={styles.warningBox}>
              <p><strong>Current contract note:</strong> canonical app-permission state comes from the permission APIs. If your app exposes a <code>permissionStatus</code> field internally, that should be your own backend&apos;s derived session field, not an assumed raw ID-token claim.</p>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Permission Status (SSO-Level)</h2>
            <p>Every user has a backend-derived <code>permissionStatus</code> for each application they attempt to access:</p>
            <table style={{width: '100%', marginTop: '1rem', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '2px solid #333'}}>
                  <th style={{textAlign: 'left', padding: '0.5rem'}}>Status</th>
                  <th style={{textAlign: 'left', padding: '0.5rem'}}>Meaning</th>
                  <th style={{textAlign: 'left', padding: '0.5rem'}}>User Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{padding: '0.5rem'}}><code>approved</code></td>
                  <td style={{padding: '0.5rem'}}>User has been granted access by SSO admin</td>
                  <td style={{padding: '0.5rem'}}>✅ Can use the application</td>
                </tr>
                <tr>
                  <td style={{padding: '0.5rem'}}><code>pending</code></td>
                  <td style={{padding: '0.5rem'}}>User requested access, awaiting admin approval</td>
                  <td style={{padding: '0.5rem'}}>⏳ Show "Access Pending" message</td>
                </tr>
                <tr>
                  <td style={{padding: '0.5rem'}}><code>revoked</code></td>
                  <td style={{padding: '0.5rem'}}>User's access was revoked by SSO admin</td>
                  <td style={{padding: '0.5rem'}}>❌ Show "Access Denied" message</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className={styles.section}>
            <h2>App Roles (SSO-Level)</h2>
            <p>For approved users, the SSO admin assigns an app-level role:</p>
            <ul>
              <li><code>admin</code> - Full application access (intended for app administrators)</li>
              <li><code>user</code> - Standard application access (intended for regular users)</li>
            </ul>
            <div className={styles.alert}>
              <strong>📝 Note:</strong> These roles are <em>suggestions</em> from the SSO admin.
              Your application decides what features each role can access.
            </div>
          </section>

          <section className={styles.section}>
            <h2>Deriving Permissions in Your Backend</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`import jwt from 'jsonwebtoken';

// WHY: ID token contains identity claims; app permissions should come
// from your backend permission lookup for the current client
const idToken = req.cookies.id_token;
const decoded = jwt.decode(idToken);
const permission = await getPermissionForUserAndClient({
  userId: decoded.sub,
  clientId: process.env.SSO_CLIENT_ID
});

// Extract identity fields
const {
  sub: userId,             // User ID
  email,                   // User email
  name,                    // User name
  role,                    // Identity / broad role claim
  iat,                     // Issued at (timestamp)
  exp                      // Expires at (timestamp)
} = decoded;

console.log('User:', userId);
console.log('Role:', permission?.role ?? role);
console.log('Status:', permission?.status ?? 'unknown');`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Implementing Permission Checks</h2>
            <h3>Backend Middleware (Node.js/Express)</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// middleware/requireApproval.js
import jwt from 'jsonwebtoken';

export function requireApproval(req, res, next) {
  const idToken = req.cookies.id_token;

  if (!idToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.decode(idToken);
    const permission = getPermissionForUserAndClient({
      userId: decoded.sub,
      clientId: process.env.SSO_CLIENT_ID
    });

    // WHY: Check if user is approved to access this app
    if (permission?.status !== 'approved') {
      if (permission?.status === 'pending') {
        return res.status(403).json({ 
          error: 'APP_ACCESS_PENDING',
          message: 'Your access request is pending approval' 
        });
      }
      if (permission?.status === 'revoked') {
        return res.status(403).json({ 
          error: 'APP_ACCESS_REVOKED',
          message: 'Your access has been revoked' 
        });
      }
      return res.status(403).json({ error: 'APP_ACCESS_DENIED' });
    }

    // Attach user info to request
    req.user = {
      ...decoded,
      role: permission?.role ?? decoded.role,
      permissionStatus: permission?.status ?? null
    };
    next();
  } catch (error) {
    console.error('Permission check failed:', error);
    return res.status(500).json({ error: 'Permission validation failed' });
  }
}

// Usage in routes
app.get('/api/protected', requireApproval, (req, res) => {
  res.json({ message: 'You have access!', user: req.user });
});

// Require admin role
export function requireAdmin(req, res, next) {
  requireApproval(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'INSUFFICIENT_ROLE',
        message: 'Admin role required' 
      });
    }
    next();
  });
}

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  // Admin-only endpoint
});`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Frontend Permission Handling</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`// React example
import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, permission, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // WHY: Check permission status
    if (permission?.status === 'pending') {
      router.push('/access-pending');
      return;
    }

    if (permission?.status === 'revoked') {
      router.push('/access-denied');
      return;
    }

    if (permission?.status !== 'approved') {
      router.push('/access-denied');
      return;
    }

    // WHY: Check role requirement
    if (requireAdmin && user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }
  }, [user, permission, loading, requireAdmin]);

  if (loading || !user || permission?.status !== 'approved') {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}

// Usage
function AdminDashboard() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <h1>Admin Dashboard</h1>
      {/* Admin-only content */}
    </ProtectedRoute>
  );
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Permission Status UI Examples</h2>
            <h3>Access Pending Page</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// pages/access-pending.js
export default function AccessPending() {
  return (
    <div>
      <h1>⏳ Access Pending</h1>
      <p>
        Your request to access this application is pending approval.
        An SSO administrator will review your request shortly.
      </p>
      <p>
        You will receive an email notification once your access is approved.
      </p>
      <button onClick={() => window.location.href = '/logout'}>
        Sign Out
      </button>
    </div>
  );
}`}
              </pre>
            </div>

            <h3>Access Denied Page</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// pages/access-denied.js
export default function AccessDenied() {
  return (
    <div>
      <h1>❌ Access Denied</h1>
      <p>
        Your access to this application has been revoked or denied.
      </p>
      <p>
        If you believe this is an error, please contact the SSO administrator.
      </p>
      <button onClick={() => window.location.href = '/logout'}>
        Sign Out
      </button>
    </div>
  );
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Two-Level Access Control Architecture</h2>
            <p>Here's how SSO-level and app-level permissions work together:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Level 1: SSO Admin controls WHO can access the app
// -------------------------------------------------------
// SSO Admin grants user@example.com access to "myapp"
// SSO Admin assigns role: "user" or "admin"

// Level 2: Your App controls WHAT users can do inside the app
// -------------------------------------------------------
// Your app receives ID token with:
// - permissionStatus: 'approved' (derived by your backend session layer)
// - role: 'admin' (or 'user')

// Your app decides:
if (role === 'admin') {
  // Grant access to:
  // - User management
  // - Organization settings
  // - Billing
  // etc.
} else if (role === 'user') {
  // Grant access to:
  // - View pages
  // - Edit own profile
  // - etc.
}

// Your app can ALSO have internal permissions:
// - Which organizations can this user access?
// - Which pages can this user edit?
// - etc.
// (These are stored in YOUR database, not in SSO)`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Summary</h2>
            <ul>
              <li>☑️ Always check backend-derived permission status before granting access</li>
              <li>☑️ Handle <code>pending</code> and <code>revoked</code> states gracefully</li>
              <li>☑️ Use <code>role</code> field to determine user's capabilities</li>
              <li>☑️ Implement backend middleware for permission checks</li>
              <li>☑️ Provide clear UI feedback for permission states</li>
            </ul>
            <div className={styles.alert}>
              <strong>🔗 Related Resources:</strong>
              <ul>
                <li><a href="/docs/app-permissions">App Permissions Guide</a></li>
                <li><a href="/docs/admin-approval">Admin Approval Workflow</a></li>
                <li><a href="/docs/authentication">OAuth 2.0 Authentication</a></li>
                <li><a href="/docs/security/best-practices">Security Best Practices</a></li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
