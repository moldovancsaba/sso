import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Paper,
  Code,
  List,
  Box,
  Anchor,
  Container,
  Divider,
  Group,
} from '@mantine/core';
// WHAT: App Permissions documentation explaining permission lifecycle
// WHY: Developers need to understand how app-level permissions work in SSO
// HOW: Explains pending → approved → revoked states and role management

import DocsLayout from '../../components/DocsLayout';
import packageJson from '../../package.json';

export default function AppPermissions() {
  return (
    <DocsLayout>
      <Stack gap="xl">
        <Box>
          <Title order={1} mb="xs">App Permissions</Title>
          <Text size="sm" c="dimmed" fw={500} mb="xs">API Version: {packageJson.version}</Text>
        </Box>
        
          {/* WHAT: Overview of app permissions system */}
          {/* WHY: Set context before diving into details */}
          <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              DoneIsBetter SSO implements <strong>app-level permission control</strong> to manage which users 
              can access which applications. This is a centralized authorization layer separate from authentication.
            </Text>
            <Text size="sm"><strong>Key Concepts:</strong></Text>
            <List spacing="xs">
              <List.Item><strong>Authentication</strong> - User proves their identity (login)</List.Item>
              <List.Item><strong>Authorization</strong> - SSO decides if user can access specific app</List.Item>
              <List.Item><strong>App Permission</strong> - Per-user, per-app access control record</List.Item>
              <List.Item><strong>Permission Status</strong> - Canonical states: pending, approved, revoked</List.Item>
              <List.Item><strong>No Record</strong> - Represented operationally as no permission record and surfaced as <code>status: "none"</code> in some read APIs</List.Item>
              <List.Item><strong>App Role</strong> - User&apos;s role within app: user or admin</List.Item>
            </List>
            <Paper withBorder p="md" shadow="sm" radius="md" style={{ borderLeft: "4px solid var(--mantine-color-yellow-6)" }} bg="var(--mantine-color-yellow-light)">
              <Text size="sm">
                <strong>Important:</strong> the app-permission contract lives in permission APIs, not in the OIDC <code>id_token</code>.
              </Text>
            </Paper>
          </Box>

          {/* WHAT: Permission lifecycle diagram */}
          {/* WHY: Visual understanding of state transitions */}
          <Box>
            <Title order={2} mb="sm">Permission Lifecycle</Title>
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
          </Box>

          {/* WHAT: Detailed explanation of each status */}
          {/* WHY: Developers need to know how to handle each state */}
          <Box>
            <Title order={2} mb="sm">Permission Statuses</Title>
            
            <Title order={3} mb="xs">none (No Permission Record)</Title>
            <List spacing="xs">
              <List.Item><strong>Meaning:</strong> User has never attempted to access this app</List.Item>
              <List.Item><strong>What happens during OAuth:</strong> SSO creates a <code>pending</code> record automatically</List.Item>
              <List.Item><strong>User experience:</strong> First login attempt shows "Access Pending Approval" message</List.Item>
              <List.Item><strong>Next step:</strong> SSO admin reviews and approves/denies</List.Item>
            </List>

            <Title order={3} mb="xs">pending (Awaiting Admin Approval)</Title>
            <List spacing="xs">
              <List.Item><strong>Meaning:</strong> User requested access, waiting for SSO admin decision</List.Item>
              <List.Item><strong>Database record:</strong>
                <Code block>
              {`{
  userId: "550e8400-e29b-41d4-a716-446655440000",
  clientId: "your-app-client-id",
  status: "pending",
  role: "none",
  createdAt: "2025-10-15T12:00:00.000Z",
  updatedAt: "2025-10-15T12:00:00.000Z"
}`}
            </Code>
              </List.Item>
              <List.Item><strong>User experience:</strong> SSO shows: "Your access request is pending approval. An admin will review your request shortly."</List.Item>
              <List.Item><strong>OAuth flow:</strong> Authorization stops at permission check, no code issued</List.Item>
              <List.Item><strong>How to approve:</strong> SSO admin uses Admin Panel → Users → App Permissions → Grant Access</List.Item>
            </List>

            <Title order={3} mb="xs">approved (Access Granted)</Title>
            <List spacing="xs">
              <List.Item><strong>Meaning:</strong> User has active permission to access app</List.Item>
              <List.Item><strong>Database record:</strong>
                <Code block>
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
            </Code>
              </List.Item>
              <List.Item><strong>User experience:</strong> OAuth completes successfully, user redirected to app</List.Item>
              <List.Item><strong>Token payload:</strong> OAuth tokens establish identity, but app-permission status and app role should still be read from permission APIs when authorization matters</List.Item>
              <List.Item><strong>Duration:</strong> Indefinite until revoked or role changed</List.Item>
            </List>

            <Title order={3} mb="xs">revoked (Access Removed)</Title>
            <List spacing="xs">
              <List.Item><strong>Meaning:</strong> User previously had access but it was removed</List.Item>
              <List.Item><strong>Database record:</strong>
                <Code block>
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
            </Code>
              </List.Item>
              <List.Item><strong>User experience:</strong> SSO shows: "Your access to this application has been revoked. Contact support if you believe this is an error."</List.Item>
              <List.Item><strong>Existing tokens:</strong> Remain valid until expiry (1 hour for access tokens)</List.Item>
              <List.Item><strong>Can be re-approved:</strong> Yes, SSO admin can grant access again</List.Item>
            </List>
          </Box>

          {/* WHAT: App-level roles explanation */}
          {/* WHY: Clarify difference between SSO admin and app-level roles */}
          <Box>
            <Title order={2} mb="sm">App-Level Roles</Title>
            <Text size="sm">
              App permissions include a <code>role</code> field that defines the user's permissions <strong>within your app</strong> (not SSO itself).
            </Text>
            
            <Title order={3} mb="xs">Role: "user" (Standard Access)</Title>
            <List spacing="xs">
              <List.Item>Default role for most users</List.Item>
              <List.Item>Can access app features but not admin functions</List.Item>
              <List.Item>Your app should persist the validated permission response if it needs app-role decisions later in the request lifecycle</List.Item>
              <List.Item>Example use: Regular users in Launchmass can view/edit their own pages</List.Item>
            </List>

            <Title order={3} mb="xs">Role: "admin" (Elevated Access)</Title>
            <List spacing="xs">
              <List.Item>Granted by SSO admin for trusted users</List.Item>
              <List.Item>Can access app's administrative features</List.Item>
              <List.Item>Your app should treat this as an app-permission concept, not as a generic identity claim</List.Item>
              <List.Item>Example use: Admins in Launchmass can manage all users and organizations</List.Item>
            </List>

            <div style={{ background: '#fff3e0', border: '1px solid #f57c00', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
              <Text size="sm" style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>
                <strong>⚠️ Important Distinction:</strong><br />
                • <strong>SSO Admin</strong> - Manages SSO service itself (grants app permissions)<br />
                • <strong>App Admin</strong> - User with <code>role: "admin"</code> for a specific app (manages app features)<br />
                <br />
                These are separate! An SSO admin might not have any app permissions, 
                and an app admin might not be an SSO admin.
              </Text>
            </div>
          </Box>

          {/* WHAT: How apps should handle permissions */}
          {/* WHY: Implementation guidance for developers */}
          <Box>
            <Title order={2} mb="sm">Handling Permissions in Your App</Title>
            
            <Title order={3} mb="xs">1. During OAuth Callback</Title>
            <Text size="sm">Extract identity from the ID token after token exchange, then validate app permission separately when your app needs authorization state:</Text>
            <Code block>
              {`// After POST /api/oauth/token
const { access_token, id_token } = await tokenResponse.json();
const jwt = require('jsonwebtoken');
const userInfo = jwt.decode(id_token);

// Store in your app's session
req.session.userId = userInfo.sub;
req.session.email = userInfo.email;
req.session.userType = userInfo.user_type;

// Validate app-level permission explicitly
const permissionResponse = await fetch(
  \`https://sso.doneisbetter.com/api/users/\${userInfo.sub}/apps/\${process.env.SSO_CLIENT_ID}/permissions\`,
  {
    headers: {
      Authorization: \`Bearer \${access_token}\`
    }
  }
);

const permission = await permissionResponse.json();
req.session.appRole = permission.role;
req.session.appStatus = permission.status;`}
            </Code>

            <Title order={3} mb="xs">2. Protecting Admin Routes</Title>
            <Text size="sm">Use the validated app-permission role from your own session to guard admin-only features:</Text>
            <Code block>
              {`// Middleware for admin-only routes
function requireAppAdmin(req, res, next) {
  if (req.session.appRole !== 'admin' || req.session.appStatus !== 'approved') {
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
            </Code>

            <Title order={3} mb="xs">3. Periodic Permission Validation</Title>
            <Text size="sm">Check if user still has access (in case of revocation):</Text>
            <Code block>
              {`// Run periodically or on sensitive operations
async function validateAppAccess(req, res, next) {
  const accessToken = req.session.accessToken;
  
  // Validate permission with SSO
  const validation = await fetch(
    \`https://sso.doneisbetter.com/api/users/\${req.session.userId}/apps/\${process.env.SSO_CLIENT_ID}/permissions\`,
    {
    headers: {
      'Authorization': \`Bearer \${accessToken}\`
    }
    }
  );
  
  if (!validation.ok) {
    // Permission lookup failed, token expired, or caller is no longer authorized
    req.session.destroy();
    return res.redirect('/login');
  }

  const permission = await validation.json();
  if (permission.status !== 'approved' || permission.role === 'none') {
    req.session.destroy();
    return res.redirect('/access-pending');
  }
  
  next();
}

// Use on critical operations
app.post('/admin/delete-user', requireAppAdmin, validateAppAccess, async (req, res) => {
  // Double-check user still has admin access
});`}
            </Code>
          </Box>

          {/* WHAT: Permission management by SSO admins */}
          {/* WHY: Explain how permissions are granted/revoked */}
          <Box>
            <Title order={2} mb="sm">Managing Permissions (SSO Admins)</Title>
            <Text size="sm">
              SSO administrators manage app permissions through the Admin Panel at{' '}
              <Anchor component={Link} href="https://sso.doneisbetter.com/admin">https://sso.doneisbetter.com/admin</Anchor>
            </Text>

            <Title order={3} mb="xs">Viewing User's App Permissions</Title>
            <List spacing="xs" type="ordered">
              <List.Item>Login to SSO Admin Panel</List.Item>
              <List.Item>Navigate to Users list</List.Item>
              <List.Item>Click on a user to view details</List.Item>
              <List.Item>Scroll to "Application Access" section</List.Item>
              <List.Item>See all integrated apps and user's permission status for each</List.Item>
            </List>

            <Title order={3} mb="xs">Granting Access</Title>
            <List spacing="xs" type="ordered">
              <List.Item>In user's "Application Access" section</List.Item>
              <List.Item>Find app with status "revoked" or "pending"</List.Item>
              <List.Item>Select role: "user" or "admin"</List.Item>
              <List.Item>Click "Grant Access" or "Approve"</List.Item>
              <List.Item>User can now complete OAuth flow</List.Item>
            </List>

            <Title order={3} mb="xs">Changing Role</Title>
            <List spacing="xs" type="ordered">
              <List.Item>Find app with status "approved"</List.Item>
              <List.Item>Use role dropdown to change between "user" and "admin"</List.Item>
              <List.Item>Change applies immediately</List.Item>
              <List.Item>Note: Existing tokens still have old role until refresh</List.Item>
            </List>

            <Title order={3} mb="xs">Revoking Access</Title>
            <List spacing="xs" type="ordered">
              <List.Item>Find app with status "approved"</List.Item>
              <List.Item>Click "Revoke Access" button</List.Item>
              <List.Item>Confirm in dialog</List.Item>
              <List.Item>User's permission status set to "revoked"</List.Item>
              <List.Item>Note: Existing access tokens remain valid until expiry (max 1 hour)</List.Item>
            </List>
          </Box>

          {/* WHAT: API for programmatic access */}
          {/* WHY: Advanced use case for automation */}
          <Box>
            <Title order={2} mb="sm">App Permissions API</Title>
            <Text size="sm">
              SSO provides REST APIs for programmatic permission management. 
              <strong>Requires SSO admin authentication</strong> through the current admin session contract.
            </Text>

            <Title order={3} mb="xs">Get User's Permissions</Title>
            <Code block>
              {`GET https://sso.doneisbetter.com/api/admin/app-permissions/[userId]
Cookie: admin-session=... or public-session=...

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
            </Code>

            <Title order={3} mb="xs">Grant/Approve Access</Title>
            <Code block>
              {`POST https://sso.doneisbetter.com/api/admin/app-permissions/[userId]
Cookie: admin-session=... or public-session=...
Content-Type: application/json

{
  "clientId": "your-app-client-id",
  "role": "user",  // or "admin"
  "status": "approved"
}

// Response: 200 OK
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "clientId": "your-app-client-id",
  "appName": "Your App",
  "hasAccess": true,
  "status": "approved",
  "role": "user"
}`}
            </Code>

            <Title order={3} mb="xs">Update Role</Title>
            <Code block>
              {`PATCH https://sso.doneisbetter.com/api/admin/app-permissions/[userId]
Cookie: admin-session=... or public-session=...
Content-Type: application/json

{
  "clientId": "your-app-client-id",
  "role": "admin"  // Change from "user" to "admin"
}

// Response: 200 OK`}
            </Code>

            <Title order={3} mb="xs">Revoke Access</Title>
            <Code block>
              {`DELETE https://sso.doneisbetter.com/api/admin/app-permissions/[userId]
Cookie: admin-session=... or public-session=...
Content-Type: application/json

{
  "clientId": "your-app-client-id"
}

// Response: 200 OK`}
            </Code>
          </Box>

          {/* WHAT: Security best practices */}
          {/* WHY: Prevent permission-related vulnerabilities */}
          <Box>
            <Title order={2} mb="sm">Security Considerations</Title>
            <List spacing="xs">
              <List.Item>
                <strong>Apps Cannot Grant Self-Access</strong>
                <Text size="sm">Only SSO admins can approve app permissions. Apps cannot call permission APIs with their OAuth credentials.</Text>
              </List.Item>
              <List.Item>
                <strong>App Permission Is the Source of Truth</strong>
                <Text size="sm">Treat permission APIs as canonical for app access and app role. Do not assume the ID token alone reflects the latest app authorization state.</Text>
              </List.Item>
              <List.Item>
                <strong>Revocation Not Immediate</strong>
                <Text size="sm">Revoking access doesn't invalidate existing tokens. They expire naturally (1 hour). Implement periodic validation for critical operations.</Text>
              </List.Item>
              <List.Item>
                <strong>Validate Role Server-Side</strong>
                <Text size="sm">Don't trust client-side role checks. Always verify role from your backend session before granting admin features.</Text>
              </List.Item>
              <List.Item>
                <strong>Audit Permission Changes</strong>
                <Text size="sm">All permission grants/revokes are logged with admin identity and timestamp in SSO database.</Text>
              </List.Item>
            </List>
          </Box>

          {/* WHAT: Related documentation links */}
          {/* WHY: Guide users to complementary docs */}
          <Box>
            <Title order={2} mb="sm">Related Documentation</Title>
            <List spacing="xs">
              <List.Item><Anchor component={Link} href="/docs/admin-approval">Admin Approval Process</Anchor> - How SSO admins manage access</List.Item>
              <List.Item><Anchor component={Link} href="/docs/authentication">Authentication Guide</Anchor> - OAuth 2.0 flow details</List.Item>
              <List.Item><Anchor component={Link} href="/docs/quickstart">Quick Start Guide</Anchor> - Integration tutorial</List.Item>
              <List.Item><Anchor component={Link} href="/docs/api">API Reference</Anchor> - Complete endpoint documentation</List.Item>
            </List>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
