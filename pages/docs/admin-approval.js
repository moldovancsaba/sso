/* eslint-disable react/no-unescaped-entities */
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
import { AccentPanel } from '@doneisbetter/gds-core/server'
// WHAT: Admin Approval Process documentation for SSO administrators
// WHY: SSO admins need guidance on managing user access to apps
// HOW: Step-by-step workflows for granting/revoking app permissions

import DocsLayout from '../../components/DocsLayout';

export default function AdminApproval() {
  return (
    <DocsLayout
      eyebrow="Operations"
      lead="Administrative workflow for approving, revoking, and auditing application access."
      title="Admin Approval Process"
    >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              As an <strong>SSO Administrator</strong>, you control which users can access which applications 
              in the DoneIsBetter ecosystem. This is a critical security responsibility that ensures only 
              authorized users can access sensitive applications.
            </Text>
            <Text size="sm"><strong>Your Responsibilities:</strong></Text>
            <List spacing="xs">
              <List.Item>Review and approve/deny user access requests</List.Item>
              <List.Item>Assign app-level roles (user vs admin)</List.Item>
              <List.Item>Monitor active permissions across all apps</List.Item>
              <List.Item>Revoke access when needed (security incidents, role changes)</List.Item>
              <List.Item>Maintain audit trail of permission changes</List.Item>
            </List>
        </Box>

          {/* WHAT: Access the admin panel */}
          {/* WHY: First step for any admin task */}
          <Box>
            <Title order={2} mb="sm">Accessing the Admin Panel</Title>
            
            <Title order={3} mb="xs">Login</Title>
            <List spacing="xs" type="ordered">
              <List.Item>Navigate to <Anchor component={Link} href="https://sso.doneisbetter.com/admin" target="_blank">https://sso.doneisbetter.com/admin</Anchor></List.Item>
              <List.Item>Enter your SSO admin email and 32-hex password token</List.Item>
              <List.Item>Alternatively, request a magic link if configured</List.Item>
              <List.Item>Session lasts 7 days with automatic extension</List.Item>
            </List>

            <Title order={3} mb="xs">Admin Panel Layout</Title>
            <List spacing="xs">
              <List.Item><strong>Users Tab</strong> - Manage user accounts and app permissions (primary focus)</List.Item>
              <List.Item><strong>OAuth Clients Tab</strong> - View registered applications</List.Item>
              <List.Item><strong>Settings</strong> - Admin account settings and logout</List.Item>
            </List>
          </Box>

          {/* WHAT: User approval workflow */}
          {/* WHY: Most common task for SSO admins */}
          <Box>
            <Title order={2} mb="sm">Approving User Access</Title>
            
            <Title order={3} mb="xs">When Users Need Approval</Title>
            <Text size="sm">Users need approval in these scenarios:</Text>
            <List spacing="xs">
              <List.Item><strong>First-time access</strong> - User tries to login to app for the first time</List.Item>
              <List.Item><strong>After revocation</strong> - User's access was previously revoked, they're requesting again</List.Item>
              <List.Item><strong>New app registration</strong> - App is newly registered, all users need approval</List.Item>
            </List>

            <Title order={3} mb="xs">Step-by-Step Approval Process</Title>
            
            <h4>1. Identify Pending Requests</h4>
            <Text size="sm">Navigate to Admin Panel → Users tab:</Text>
            <Code block>
              {`Users List:
┌─────────────────────────────────────────────────┐
│ Name          │ Email              │ Actions   │
├─────────────────────────────────────────────────┤
│ John Doe      │ john@example.com   │ [View]    │ ← Click here
│ Jane Smith    │ jane@example.com   │ [View]    │
│ ...           │ ...                │ ...       │
└─────────────────────────────────────────────────┘`}
            </Code>

            <h4>2. View User Details</h4>
            <Text size="sm">Click "View" on a user to see their profile and app permissions:</Text>
            <Code block>
              {`User Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User Information
  Name: John Doe
  Email: john@example.com
  ID: 550e8400-e29b-41d4-a716-446655440000

Application Access
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─ Launchmass ────────────────────────┐
│ Landing page builder                │
│                                     │
│ Status: PENDING ⏳                  │ ← Needs approval!
│                                     │
│ Role: [Select ▼] [Grant Access]    │
└─────────────────────────────────────┘

┌─ Messmass ──────────────────────────┐
│ Messaging platform                  │
│                                     │
│ Status: APPROVED ✓                  │
│ Current Role: user                  │
│                                     │
│ Role: [user ▼] [Revoke Access]     │
└─────────────────────────────────────┘`}
            </Code>

            <h4>3. Select Appropriate Role</h4>
            <Text size="sm">Before granting access, choose the right role:</Text>
            <List spacing="xs">
              <List.Item>
                <strong>user</strong> (Default)
                <List spacing="xs">
                  <List.Item>Standard app access</List.Item>
                  <List.Item>Cannot access admin features</List.Item>
                  <List.Item>Best for: Regular users, team members</List.Item>
                </List>
              </List.Item>
              <List.Item>
                <strong>admin</strong> (Elevated)
                <List spacing="xs">
                  <List.Item>Full app access including admin panel</List.Item>
                  <List.Item>Can manage app-specific users and settings</List.Item>
                  <List.Item>Best for: Trusted administrators, app owners</List.Item>
                </List>
              </List.Item>
            </List>

            <h4>4. Grant Access</h4>
            <List spacing="xs" type="ordered">
              <List.Item>Click the role dropdown next to "Grant Access"</List.Item>
              <List.Item>Select "user" or "admin"</List.Item>
              <List.Item>Click "Grant Access" button</List.Item>
              <List.Item>Success message appears: "Access granted successfully"</List.Item>
              <List.Item>Status changes to "APPROVED ✓"</List.Item>
            </List>

            <h4>5. Notify User (Optional)</h4>
            <Text size="sm">
              SSO doesn't automatically email users. Consider:
            </Text>
            <List spacing="xs">
              <List.Item>Sending manual notification: "Your access to [App] has been approved"</List.Item>
              <List.Item>Instructing user to try logging in again</List.Item>
              <List.Item>Setting up Slack/Discord notifications for your team</List.Item>
            </List>
          </Box>

          {/* WHAT: Role management */}
          {/* WHY: Admins need to change roles as users' responsibilities change */}
          <Box>
            <Title order={2} mb="sm">Managing User Roles</Title>
            
            <Title order={3} mb="xs">Changing an Existing Role</Title>
            <Text size="sm">If a user's responsibilities change:</Text>
            <List spacing="xs" type="ordered">
              <List.Item>Navigate to User Details → Application Access</List.Item>
              <List.Item>Find app with status "APPROVED"</List.Item>
              <List.Item>Click role dropdown (shows current role)</List.Item>
              <List.Item>Select new role: "user" or "admin"</List.Item>
              <List.Item>Change applies immediately</List.Item>
            </List>
            
            <AccentPanel title="Token Lag" tone="amber" variant="soft-outline">
              <Text size="sm">
                Role changes don't affect existing access tokens until they expire or refresh (max 1 hour). 
                For immediate effect, consider revoking and re-granting access.
              </Text>
            </AccentPanel>

            <Title order={3} mb="xs">Common Role Change Scenarios</Title>
            <List spacing="xs">
              <List.Item>
                <strong>Promotion: user → admin</strong>
                <Text size="sm">User is now managing app features, needs admin panel access</Text>
              </List.Item>
              <List.Item>
                <strong>Demotion: admin → user</strong>
                <Text size="sm">User no longer needs administrative privileges, reduce access</Text>
              </List.Item>
            </List>
          </Box>

          {/* WHAT: Revoking access */}
          {/* WHY: Security incidents, offboarding, policy violations */}
          <Box>
            <Title order={2} mb="sm">Revoking User Access</Title>
            
            <Title order={3} mb="xs">When to Revoke Access</Title>
            <List spacing="xs">
              <List.Item><strong>User leaves organization</strong> - Offboarding process</List.Item>
              <List.Item><strong>Security incident</strong> - Compromised account</List.Item>
              <List.Item><strong>Policy violation</strong> - Terms of service breach</List.Item>
              <List.Item><strong>Role change</strong> - User no longer needs app access</List.Item>
              <List.Item><strong>Temporary suspension</strong> - Pending investigation</List.Item>
            </List>

            <Title order={3} mb="xs">Revocation Process</Title>
            <List spacing="xs" type="ordered">
              <List.Item>Navigate to User Details → Application Access</List.Item>
              <List.Item>Find app with status "APPROVED"</List.Item>
              <List.Item>Click "Revoke Access" button</List.Item>
              <List.Item>Confirm in dialog: "Are you sure you want to revoke access?"</List.Item>
              <List.Item>Success message: "Access revoked successfully"</List.Item>
              <List.Item>Status changes to "REVOKED ❌"</List.Item>
            </List>

            <Title order={3} mb="xs">What Happens After Revocation</Title>
            <List spacing="xs">
              <List.Item><strong>Immediate:</strong> User cannot complete new OAuth flows</List.Item>
              <List.Item><strong>Existing tokens:</strong> Remain valid until expiry (max 1 hour)</List.Item>
              <List.Item><strong>Next login attempt:</strong> Shows "Access Denied" message</List.Item>
              <List.Item><strong>Database record:</strong> Kept with status "revoked" (audit trail)</List.Item>
              <List.Item><strong>Re-approval:</strong> Can grant access again later if needed</List.Item>
            </List>

            <AccentPanel title="Token Delay" tone="red" variant="soft-outline">
              <Text size="sm">
                Revoked users can still use existing access tokens for up to 1 hour. 
                For immediate lockout, contact app administrators to implement server-side session validation.
              </Text>
            </AccentPanel>
          </Box>

          {/* WHAT: Bulk operations */}
          {/* WHY: Manage multiple users efficiently */}
          <Box>
            <Title order={2} mb="sm">Batch Operations</Title>
            
            <Title order={3} mb="xs">Current Limitations</Title>
            <Text size="sm">
              The admin panel currently requires one-by-one permission management. 
              For bulk operations, contact development team to:
            </Text>
            <List spacing="xs">
              <List.Item>Build batch approval UI</List.Item>
              <List.Item>Use API scripts for bulk grants/revokes</List.Item>
              <List.Item>Export/import permission lists</List.Item>
            </List>

            <Title order={3} mb="xs">API-Based Bulk Operations</Title>
            <Text size="sm">For administrators comfortable with APIs:</Text>
            <Code block>
              {`// Bulk approve script example
const users = ['user-uuid-1', 'user-uuid-2', 'user-uuid-3'];
const clientId = 'launchmass-client-id';

for (const userId of users) {
  await fetch(\`https://sso.doneisbetter.com/api/admin/app-permissions/\${userId}\`, {
    method: 'POST',
    credentials: 'include', // Admin session cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: clientId,
      role: 'user',
      status: 'approved'
    })
  });
  console.log(\`Approved \${userId}\`);
}`}
            </Code>
          </Box>

          {/* WHAT: Monitoring and audit */}
          {/* WHY: Track permission changes for security/compliance */}
          <Box>
            <Title order={2} mb="sm">Monitoring & Audit Trail</Title>
            
            <Title order={3} mb="xs">Permission Metadata</Title>
            <Text size="sm">Every permission record includes audit fields:</Text>
            <List spacing="xs">
              <List.Item><code>createdAt</code> - When permission was first requested (ISO 8601 UTC)</List.Item>
              <List.Item><code>updatedAt</code> - Last modification timestamp</List.Item>
              <List.Item><code>grantedAt</code> - When approval was granted</List.Item>
              <List.Item><code>grantedBy</code> - Admin user ID who granted access</List.Item>
              <List.Item><code>revokedAt</code> - When access was revoked (if applicable)</List.Item>
              <List.Item><code>revokedBy</code> - Admin user ID who revoked access</List.Item>
            </List>

            <Title order={3} mb="xs">Viewing Audit Information</Title>
            <Text size="sm">Currently, audit fields are stored in MongoDB but not shown in UI. To view:</Text>
            <List spacing="xs" type="ordered">
              <List.Item>Connect to MongoDB Atlas</List.Item>
              <List.Item>Query <code>appPermissions</code> collection</List.Item>
              <List.Item>Filter by <code>userId</code> or <code>clientId</code></List.Item>
              <List.Item>Examine audit fields</List.Item>
            </List>

            <Title order={3} mb="xs">Future Audit Features</Title>
            <Text size="sm">Planned enhancements:</Text>
            <List spacing="xs">
              <List.Item>Permission change history log in UI</List.Item>
              <List.Item>Export audit reports (CSV/PDF)</List.Item>
              <List.Item>Email notifications for permission changes</List.Item>
              <List.Item>Slack/Discord integration for real-time alerts</List.Item>
            </List>
          </Box>

          {/* WHAT: Best practices */}
          {/* WHY: Guide admins to secure, efficient workflows */}
          <Box>
            <Title order={2} mb="sm">Best Practices</Title>
            
            <Title order={3} mb="xs">Security</Title>
            <List spacing="xs">
              <List.Item>✅ <strong>Default to "user" role</strong> - Only grant "admin" when truly needed</List.Item>
              <List.Item>✅ <strong>Review pending requests daily</strong> - Don't leave users waiting unnecessarily</List.Item>
              <List.Item>✅ <strong>Verify user identity</strong> - Confirm via email/Slack before approving</List.Item>
              <List.Item>✅ <strong>Document approval decisions</strong> - Keep notes on why access was granted</List.Item>
              <List.Item>✅ <strong>Regular access reviews</strong> - Quarterly audit of who has what access</List.Item>
              <List.Item>✅ <strong>Revoke on departure</strong> - Part of offboarding checklist</List.Item>
              <List.Item>❌ <strong>Don't share admin credentials</strong> - Each admin should have own account</List.Item>
            </List>

            <Title order={3} mb="xs">Workflow Efficiency</Title>
            <List spacing="xs">
              <List.Item>📋 <strong>Check pending requests daily</strong> - Morning routine</List.Item>
              <List.Item>📋 <strong>Batch similar requests</strong> - Approve all "user" roles together</List.Item>
              <List.Item>📋 <strong>Set approval criteria</strong> - Define who auto-qualifies (e.g., company email domain)</List.Item>
              <List.Item>📋 <strong>Communicate expectations</strong> - Tell users typical approval time (e.g., "within 24 hours")</List.Item>
              <List.Item>📋 <strong>Delegate when possible</strong> - Multiple SSO admins for coverage</List.Item>
            </List>

            <Title order={3} mb="xs">Communication</Title>
            <List spacing="xs">
              <List.Item>💬 <strong>Notify users of approval</strong> - Manual email or Slack message</List.Item>
              <List.Item>💬 <strong>Explain rejections</strong> - If denying, tell user why and next steps</List.Item>
              <List.Item>💬 <strong>Announce new apps</strong> - When registering new app, notify team</List.Item>
              <List.Item>💬 <strong>Coordinate with app admins</strong> - They manage org-level access, you manage SSO-level</List.Item>
            </List>
          </Box>

          {/* WHAT: Troubleshooting */}
          {/* WHY: Help admins solve common issues */}
          <Box>
            <Title order={2} mb="sm">Troubleshooting</Title>
            
            <Title order={3} mb="xs">User Says "Access Pending" But I Already Approved</Title>
            <Text size="sm"><strong>Possible Causes:</strong></Text>
            <List spacing="xs">
              <List.Item>User hasn't tried logging in again after approval</List.Item>
              <List.Item>Wrong app - Check which app they're trying to access</List.Item>
              <List.Item>Wrong user - Verify email matches SSO account</List.Item>
              <List.Item>Cache issue - Have user clear browser cache/try incognito</List.Item>
            </List>
            <Text size="sm"><strong>Resolution:</strong></Text>
            <List spacing="xs" type="ordered">
              <List.Item>Navigate to user details in admin panel</List.Item>
              <List.Item>Verify status shows "APPROVED" for correct app</List.Item>
              <List.Item>Have user logout and login again</List.Item>
              <List.Item>Check browser console for OAuth errors</List.Item>
            </List>

            <Title order={3} mb="xs">I Changed Role But User Still Has Old Permissions</Title>
            <Text size="sm"><strong>Cause:</strong> Existing access tokens cached old role (max 1 hour)</Text>
            <Text size="sm"><strong>Resolution:</strong></Text>
            <List spacing="xs">
              <List.Item><strong>Wait:</strong> Token expires within 1 hour, new role applies automatically</List.Item>
              <List.Item><strong>Force refresh:</strong> Revoke access, wait 5 seconds, re-grant with new role</List.Item>
              <List.Item><strong>User action:</strong> Have user logout and login again (forces token refresh)</List.Item>
            </List>

            <Title order={3} mb="xs">User Can't Login After Revocation</Title>
            <Text size="sm"><strong>Expected Behavior:</strong> If you revoked access, user should see "Access Denied"</Text>
            <Text size="sm"><strong>If they need access back:</strong></Text>
            <List spacing="xs" type="ordered">
              <List.Item>Navigate to user details</List.Item>
              <List.Item>Find app with status "REVOKED"</List.Item>
              <List.Item>Select role and click "Grant Access" (same as first-time approval)</List.Item>
              <List.Item>User can now login again</List.Item>
            </List>

            <Title order={3} mb="xs">Don't See Any Pending Requests</Title>
            <Text size="sm"><strong>Possible Reasons:</strong></Text>
            <List spacing="xs">
              <List.Item>No users have attempted login recently</List.Item>
              <List.Item>All existing requests already approved</List.Item>
              <List.Item>Users are trying to login to different SSO instance (check environment)</List.Item>
            </List>
            <Text size="sm"><strong>To Generate Test Request:</strong></Text>
            <List spacing="xs" type="ordered">
              <List.Item>Open incognito browser</List.Item>
              <List.Item>Navigate to your app (e.g., https://launchmass.doneisbetter.com)</List.Item>
              <List.Item>Click "Login with SSO"</List.Item>
              <List.Item>Register new test account</List.Item>
              <List.Item>Complete OAuth flow - Should create pending request</List.Item>
              <List.Item>Check admin panel for new pending entry</List.Item>
            </List>
          </Box>

          {/* WHAT: Admin roles and delegation */}
          {/* WHY: Multiple admins need coordination */}
          <Box>
            <Title order={2} mb="sm">Multiple Admins & Delegation</Title>
            
            <Title order={3} mb="xs">SSO Admin Roles</Title>
            <Text size="sm">SSO currently uses a single canonical admin role:</Text>
            <List spacing="xs">
              <List.Item>
                <strong>admin</strong> - Can manage users and app permissions
              </List.Item>
            </List>

            <Title order={3} mb="xs">Creating New Admins</Title>
            <List spacing="xs" type="ordered">
              <List.Item>Login to admin panel as an admin</List.Item>
              <List.Item>Navigate to Users tab</List.Item>
              <List.Item>Click "Create Admin User"</List.Item>
              <List.Item>Enter email, name, and assign role <code>admin</code></List.Item>
              <List.Item>System generates 32-hex password token</List.Item>
              <List.Item><strong>Copy and securely share token</strong> (shown only once!)</List.Item>
              <List.Item>New admin can login at https://sso.doneisbetter.com/admin</List.Item>
            </List>

            <Title order={3} mb="xs">Delegation Best Practices</Title>
            <List spacing="xs">
              <List.Item>Assign primary admin for each app (e.g., Launchmass admin handles Launchmass approvals)</List.Item>
              <List.Item>Cross-train admins for coverage (vacations, time zones)</List.Item>
              <List.Item>Document approval criteria (who qualifies for automatic approval)</List.Item>
              <List.Item>Use shared Slack channel for coordination</List.Item>
              <List.Item>Review admin access quarterly (remove unused accounts)</List.Item>
            </List>
          </Box>

          {/* WHAT: Related documentation links */}
          {/* WHY: Guide admins to complementary docs */}
          <Box>
            <Title order={2} mb="sm">Related Documentation</Title>
            <List spacing="xs">
              <List.Item><Anchor component={Link} href="/docs/app-permissions">App Permissions</Anchor> - Technical details of permission system</List.Item>
              <List.Item><Anchor component={Link} href="/docs/authentication">Authentication Guide</Anchor> - OAuth 2.0 flow users experience</List.Item>
              <List.Item><Anchor component={Link} href="/docs/quickstart">Quick Start Guide</Anchor> - For app developers integrating SSO</List.Item>
              <List.Item><Anchor component={Link} href="https://sso.doneisbetter.com/admin" target="_blank">SSO Admin Panel</Anchor> - Login to manage permissions</List.Item>
            </List>
          </Box>

          {/* WHAT: Support and escalation */}
          {/* WHY: Admins need help sometimes */}
          <Box>
            <Title order={2} mb="sm">Support & Escalation</Title>
            <Text size="sm"><strong>For SSO-related issues:</strong></Text>
            <List spacing="xs">
              <List.Item>Email: <Anchor component={Link} href="mailto:sso@doneisbetter.com">sso@doneisbetter.com</Anchor></List.Item>
              <List.Item>Slack: #sso-support (internal)</List.Item>
              <List.Item>Emergency: Contact development team directly</List.Item>
            </List>
            
            <Text size="sm"><strong>When escalating, include:</strong></Text>
            <List spacing="xs">
              <List.Item>User's email address</List.Item>
              <List.Item>App they're trying to access (client_id if known)</List.Item>
              <List.Item>Current permission status (pending/approved/revoked)</List.Item>
              <List.Item>Screenshots of admin panel</List.Item>
              <List.Item>Error messages from user's browser console</List.Item>
              <List.Item>Timestamps (ISO 8601 UTC format)</List.Item>
            </List>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
