import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Code,
  List,
  Box,
  Anchor,
} from '@mantine/core';
import { AccentPanel, DocsPageShell, PublicShell, SimpleDataTable } from '@doneisbetter/gds-core/server'
import { createDocsVersionMeta, getDocsShellProps } from '../../../lib/docs-shell-config'
// WHAT: App permissions system documentation for OAuth 2.0 SSO integration
// WHY: Developers need to understand app-level permissions and roles
// HOW: Explains backend-derived permissionStatus, app roles, and two-level access control

const permissionStatusRows = [
  {
    status: 'approved',
    meaning: 'User has been granted access by SSO admin',
    userAction: 'Can use the application',
  },
  {
    status: 'pending',
    meaning: 'User requested access, awaiting admin approval',
    userAction: 'Show "Access Pending" message',
  },
  {
    status: 'revoked',
    meaning: 'User access was revoked by SSO admin',
    userAction: 'Show "Access Denied" message',
  },
]

export default function SecurityPermissions() {
  return (
    <PublicShell {...getDocsShellProps('/docs/security/permissions')}>
      <DocsPageShell
        eyebrow="Security"
        lead="Operational model and UI expectations for permission-aware access control."
        meta={createDocsVersionMeta('SSO Version')}
        title="App Permissions System"
      >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              The SSO service implements a two-level access control system:
            </Text>
            <List spacing="xs" type="ordered">
              <List.Item><strong>SSO-Level Permissions:</strong> Managed by SSO admins (who can access which apps)</List.Item>
              <List.Item><strong>App-Level Permissions:</strong> Managed by your application (what users can do inside your app)</List.Item>
            </List>
            <Text size="sm">
              This document focuses on <strong>SSO-level permissions</strong> that affect OAuth 2.0 authentication.
            </Text>
            <AccentPanel title="Current contract note" tone="amber" variant="soft-outline">
              <Text size="sm">
                Canonical app-permission state comes from the permission APIs. If your app exposes a <code>permissionStatus</code> field internally, that should be your own backend&apos;s derived session field, not an assumed raw ID-token claim.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">Permission Status (SSO-Level)</Title>
            <Text size="sm">Every user has a backend-derived <code>permissionStatus</code> for each application they attempt to access:</Text>
            <SimpleDataTable
              columns={[
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <code>{row.status}</code>,
                },
                {
                  key: 'meaning',
                  header: 'Meaning',
                },
                {
                  key: 'userAction',
                  header: 'User Action',
                },
              ]}
              rows={permissionStatusRows}
            />
          </Box>

          <Box>
            <Title order={2} mb="sm">App Roles (SSO-Level)</Title>
            <Text size="sm">For approved users, the SSO admin assigns an app-level role:</Text>
            <List spacing="xs">
              <List.Item><code>admin</code> - Full application access (intended for app administrators)</List.Item>
              <List.Item><code>user</code> - Standard application access (intended for regular users)</List.Item>
            </List>
            <AccentPanel title="Implementation note" tone="red" variant="soft-outline">
              <Text size="sm">
                <strong>📝 Note:</strong> These roles are <em>suggestions</em> from the SSO admin.
                {' '}Your application decides what features each role can access.
              </Text>
            </AccentPanel>
          </Box>

          <Box>
            <Title order={2} mb="sm">Deriving Permissions in Your Backend</Title>
            <Code block>
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
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Implementing Permission Checks</Title>
            <Title order={3} mb="xs">Backend Middleware (Node.js/Express)</Title>
            <Code block>
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
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Frontend Permission Handling</Title>
            <Code block>
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
      <Title order={1} mb="xs">Admin Dashboard</Title>
      {/* Admin-only content */}
    </ProtectedRoute>
  );
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Permission Status UI Examples</Title>
            <Title order={3} mb="xs">Access Pending Page</Title>
            <Code block>
              {`// pages/access-pending.js
export default function AccessPending() {
  return (
    <div>
      <Title order={1} mb="xs">⏳ Access Pending</Title>
      <Text size="sm">
        Your request to access this application is pending approval.
        An SSO administrator will review your request shortly.
      </Text>
      <Text size="sm">
        You will receive an email notification once your access is approved.
      </Text>
      <button onClick={() => window.location.href = '/logout'}>
        Sign Out
      </button>
    </div>
  );
}`}
            </Code>

            <Title order={3} mb="xs">Access Denied Page</Title>
            <Code block>
              {`// pages/access-denied.js
export default function AccessDenied() {
  return (
    <div>
      <Title order={1} mb="xs">❌ Access Denied</Title>
      <Text size="sm">
        Your access to this application has been revoked or denied.
      </Text>
      <Text size="sm">
        If you believe this is an error, please contact the SSO administrator.
      </Text>
      <button onClick={() => window.location.href = '/logout'}>
        Sign Out
      </button>
    </div>
  );
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Two-Level Access Control Architecture</Title>
            <Text size="sm">Here&apos;s how SSO-level and app-level permissions work together:</Text>
            <Code block>
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
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Summary</Title>
            <List spacing="xs">
              <List.Item>☑️ Always check backend-derived permission status before granting access</List.Item>
              <List.Item>☑️ Handle <code>pending</code> and <code>revoked</code> states gracefully</List.Item>
              <List.Item>☑️ Use <code>role</code> field to determine user&apos;s capabilities</List.Item>
              <List.Item>☑️ Implement backend middleware for permission checks</List.Item>
              <List.Item>☑️ Provide clear UI feedback for permission states</List.Item>
            </List>
            <AccentPanel title="Related Resources" tone="red" variant="soft-outline">
              <List spacing="xs">
                <List.Item><Anchor component={Link} href="/docs/app-permissions">App Permissions Guide</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/admin-approval">Admin Approval Workflow</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/authentication">OAuth 2.0 Authentication</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/security/best-practices">Security Best Practices</Anchor></List.Item>
              </List>
            </AccentPanel>
          </Box>
        
      </Stack>
      </DocsPageShell>
    </PublicShell>
  );
}
