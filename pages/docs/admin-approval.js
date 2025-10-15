// WHAT: Admin Approval Process documentation for SSO administrators
// WHY: SSO admins need guidance on managing user access to apps
// HOW: Step-by-step workflows for granting/revoking app permissions

import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function AdminApproval() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Admin Approval Process</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          {/* WHAT: Overview for SSO admins */}
          {/* WHY: Set context for administrative responsibilities */}
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              As an <strong>SSO Administrator</strong>, you control which users can access which applications 
              in the DoneIsBetter ecosystem. This is a critical security responsibility that ensures only 
              authorized users can access sensitive applications.
            </p>
            <p><strong>Your Responsibilities:</strong></p>
            <ul>
              <li>Review and approve/deny user access requests</li>
              <li>Assign app-level roles (user vs admin)</li>
              <li>Monitor active permissions across all apps</li>
              <li>Revoke access when needed (security incidents, role changes)</li>
              <li>Maintain audit trail of permission changes</li>
            </ul>
          </section>

          {/* WHAT: Access the admin panel */}
          {/* WHY: First step for any admin task */}
          <section className={styles.section}>
            <h2>Accessing the Admin Panel</h2>
            
            <h3>Login</h3>
            <ol>
              <li>Navigate to <a href="https://sso.doneisbetter.com/admin" target="_blank">https://sso.doneisbetter.com/admin</a></li>
              <li>Enter your SSO admin email and 32-hex password token</li>
              <li>Alternatively, request a magic link if configured</li>
              <li>Session lasts 7 days with automatic extension</li>
            </ol>

            <h3>Admin Panel Layout</h3>
            <ul>
              <li><strong>Users Tab</strong> - Manage user accounts and app permissions (primary focus)</li>
              <li><strong>OAuth Clients Tab</strong> - View registered applications</li>
              <li><strong>Settings</strong> - Admin account settings and logout</li>
            </ul>
          </section>

          {/* WHAT: User approval workflow */}
          {/* WHY: Most common task for SSO admins */}
          <section className={styles.section}>
            <h2>Approving User Access</h2>
            
            <h3>When Users Need Approval</h3>
            <p>Users need approval in these scenarios:</p>
            <ul>
              <li><strong>First-time access</strong> - User tries to login to app for the first time</li>
              <li><strong>After revocation</strong> - User's access was previously revoked, they're requesting again</li>
              <li><strong>New app registration</strong> - App is newly registered, all users need approval</li>
            </ul>

            <h3>Step-by-Step Approval Process</h3>
            
            <h4>1. Identify Pending Requests</h4>
            <p>Navigate to Admin Panel → Users tab:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`Users List:
┌─────────────────────────────────────────────────┐
│ Name          │ Email              │ Actions   │
├─────────────────────────────────────────────────┤
│ John Doe      │ john@example.com   │ [View]    │ ← Click here
│ Jane Smith    │ jane@example.com   │ [View]    │
│ ...           │ ...                │ ...       │
└─────────────────────────────────────────────────┘`}
              </pre>
            </div>

            <h4>2. View User Details</h4>
            <p>Click "View" on a user to see their profile and app permissions:</p>
            <div className={styles.codeBlock}>
              <pre>
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
              </pre>
            </div>

            <h4>3. Select Appropriate Role</h4>
            <p>Before granting access, choose the right role:</p>
            <ul>
              <li>
                <strong>user</strong> (Default)
                <ul>
                  <li>Standard app access</li>
                  <li>Cannot access admin features</li>
                  <li>Best for: Regular users, team members</li>
                </ul>
              </li>
              <li>
                <strong>admin</strong> (Elevated)
                <ul>
                  <li>Full app access including admin panel</li>
                  <li>Can manage app-specific users and settings</li>
                  <li>Best for: Trusted administrators, app owners</li>
                </ul>
              </li>
            </ul>

            <h4>4. Grant Access</h4>
            <ol>
              <li>Click the role dropdown next to "Grant Access"</li>
              <li>Select "user" or "admin"</li>
              <li>Click "Grant Access" button</li>
              <li>Success message appears: "Access granted successfully"</li>
              <li>Status changes to "APPROVED ✓"</li>
            </ol>

            <h4>5. Notify User (Optional)</h4>
            <p>
              SSO doesn't automatically email users. Consider:
            </p>
            <ul>
              <li>Sending manual notification: "Your access to [App] has been approved"</li>
              <li>Instructing user to try logging in again</li>
              <li>Setting up Slack/Discord notifications for your team</li>
            </ul>
          </section>

          {/* WHAT: Role management */}
          {/* WHY: Admins need to change roles as users' responsibilities change */}
          <section className={styles.section}>
            <h2>Managing User Roles</h2>
            
            <h3>Changing an Existing Role</h3>
            <p>If a user's responsibilities change:</p>
            <ol>
              <li>Navigate to User Details → Application Access</li>
              <li>Find app with status "APPROVED"</li>
              <li>Click role dropdown (shows current role)</li>
              <li>Select new role: "user" or "admin"</li>
              <li>Change applies immediately</li>
            </ol>
            
            <div style={{ background: '#fff3e0', border: '1px solid #f57c00', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>
                <strong>⚠️ Token Lag:</strong><br />
                Role changes don't affect existing access tokens until they expire or refresh (max 1 hour). 
                For immediate effect, consider revoking and re-granting access.
              </p>
            </div>

            <h3>Common Role Change Scenarios</h3>
            <ul>
              <li>
                <strong>Promotion: user → admin</strong>
                <p>User is now managing app features, needs admin panel access</p>
              </li>
              <li>
                <strong>Demotion: admin → user</strong>
                <p>User no longer needs administrative privileges, reduce access</p>
              </li>
            </ul>
          </section>

          {/* WHAT: Revoking access */}
          {/* WHY: Security incidents, offboarding, policy violations */}
          <section className={styles.section}>
            <h2>Revoking User Access</h2>
            
            <h3>When to Revoke Access</h3>
            <ul>
              <li><strong>User leaves organization</strong> - Offboarding process</li>
              <li><strong>Security incident</strong> - Compromised account</li>
              <li><strong>Policy violation</strong> - Terms of service breach</li>
              <li><strong>Role change</strong> - User no longer needs app access</li>
              <li><strong>Temporary suspension</strong> - Pending investigation</li>
            </ul>

            <h3>Revocation Process</h3>
            <ol>
              <li>Navigate to User Details → Application Access</li>
              <li>Find app with status "APPROVED"</li>
              <li>Click "Revoke Access" button</li>
              <li>Confirm in dialog: "Are you sure you want to revoke access?"</li>
              <li>Success message: "Access revoked successfully"</li>
              <li>Status changes to "REVOKED ❌"</li>
            </ol>

            <h3>What Happens After Revocation</h3>
            <ul>
              <li><strong>Immediate:</strong> User cannot complete new OAuth flows</li>
              <li><strong>Existing tokens:</strong> Remain valid until expiry (max 1 hour)</li>
              <li><strong>Next login attempt:</strong> Shows "Access Denied" message</li>
              <li><strong>Database record:</strong> Kept with status "revoked" (audit trail)</li>
              <li><strong>Re-approval:</strong> Can grant access again later if needed</li>
            </ul>

            <div style={{ background: '#fee', border: '1px solid #c33', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#c33' }}>
                <strong>🚨 Token Delay:</strong><br />
                Revoked users can still use existing access tokens for up to 1 hour. 
                For immediate lockout, contact app administrators to implement server-side session validation.
              </p>
            </div>
          </section>

          {/* WHAT: Bulk operations */}
          {/* WHY: Manage multiple users efficiently */}
          <section className={styles.section}>
            <h2>Batch Operations</h2>
            
            <h3>Current Limitations</h3>
            <p>
              The admin panel currently requires one-by-one permission management. 
              For bulk operations, contact development team to:
            </p>
            <ul>
              <li>Build batch approval UI</li>
              <li>Use API scripts for bulk grants/revokes</li>
              <li>Export/import permission lists</li>
            </ul>

            <h3>API-Based Bulk Operations</h3>
            <p>For administrators comfortable with APIs:</p>
            <div className={styles.codeBlock}>
              <pre>
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
              </pre>
            </div>
          </section>

          {/* WHAT: Monitoring and audit */}
          {/* WHY: Track permission changes for security/compliance */}
          <section className={styles.section}>
            <h2>Monitoring & Audit Trail</h2>
            
            <h3>Permission Metadata</h3>
            <p>Every permission record includes audit fields:</p>
            <ul>
              <li><code>createdAt</code> - When permission was first requested (ISO 8601 UTC)</li>
              <li><code>updatedAt</code> - Last modification timestamp</li>
              <li><code>grantedAt</code> - When approval was granted</li>
              <li><code>grantedBy</code> - Admin user ID who granted access</li>
              <li><code>revokedAt</code> - When access was revoked (if applicable)</li>
              <li><code>revokedBy</code> - Admin user ID who revoked access</li>
            </ul>

            <h3>Viewing Audit Information</h3>
            <p>Currently, audit fields are stored in MongoDB but not shown in UI. To view:</p>
            <ol>
              <li>Connect to MongoDB Atlas</li>
              <li>Query <code>appPermissions</code> collection</li>
              <li>Filter by <code>userId</code> or <code>clientId</code></li>
              <li>Examine audit fields</li>
            </ol>

            <h3>Future Audit Features</h3>
            <p>Planned enhancements:</p>
            <ul>
              <li>Permission change history log in UI</li>
              <li>Export audit reports (CSV/PDF)</li>
              <li>Email notifications for permission changes</li>
              <li>Slack/Discord integration for real-time alerts</li>
            </ul>
          </section>

          {/* WHAT: Best practices */}
          {/* WHY: Guide admins to secure, efficient workflows */}
          <section className={styles.section}>
            <h2>Best Practices</h2>
            
            <h3>Security</h3>
            <ul>
              <li>✅ <strong>Default to "user" role</strong> - Only grant "admin" when truly needed</li>
              <li>✅ <strong>Review pending requests daily</strong> - Don't leave users waiting unnecessarily</li>
              <li>✅ <strong>Verify user identity</strong> - Confirm via email/Slack before approving</li>
              <li>✅ <strong>Document approval decisions</strong> - Keep notes on why access was granted</li>
              <li>✅ <strong>Regular access reviews</strong> - Quarterly audit of who has what access</li>
              <li>✅ <strong>Revoke on departure</strong> - Part of offboarding checklist</li>
              <li>❌ <strong>Don't share admin credentials</strong> - Each admin should have own account</li>
            </ul>

            <h3>Workflow Efficiency</h3>
            <ul>
              <li>📋 <strong>Check pending requests daily</strong> - Morning routine</li>
              <li>📋 <strong>Batch similar requests</strong> - Approve all "user" roles together</li>
              <li>📋 <strong>Set approval criteria</strong> - Define who auto-qualifies (e.g., company email domain)</li>
              <li>📋 <strong>Communicate expectations</strong> - Tell users typical approval time (e.g., "within 24 hours")</li>
              <li>📋 <strong>Delegate when possible</strong> - Multiple SSO admins for coverage</li>
            </ul>

            <h3>Communication</h3>
            <ul>
              <li>💬 <strong>Notify users of approval</strong> - Manual email or Slack message</li>
              <li>💬 <strong>Explain rejections</strong> - If denying, tell user why and next steps</li>
              <li>💬 <strong>Announce new apps</strong> - When registering new app, notify team</li>
              <li>💬 <strong>Coordinate with app admins</strong> - They manage org-level access, you manage SSO-level</li>
            </ul>
          </section>

          {/* WHAT: Troubleshooting */}
          {/* WHY: Help admins solve common issues */}
          <section className={styles.section}>
            <h2>Troubleshooting</h2>
            
            <h3>User Says "Access Pending" But I Already Approved</h3>
            <p><strong>Possible Causes:</strong></p>
            <ul>
              <li>User hasn't tried logging in again after approval</li>
              <li>Wrong app - Check which app they're trying to access</li>
              <li>Wrong user - Verify email matches SSO account</li>
              <li>Cache issue - Have user clear browser cache/try incognito</li>
            </ul>
            <p><strong>Resolution:</strong></p>
            <ol>
              <li>Navigate to user details in admin panel</li>
              <li>Verify status shows "APPROVED" for correct app</li>
              <li>Have user logout and login again</li>
              <li>Check browser console for OAuth errors</li>
            </ol>

            <h3>I Changed Role But User Still Has Old Permissions</h3>
            <p><strong>Cause:</strong> Existing access tokens cached old role (max 1 hour)</p>
            <p><strong>Resolution:</strong></p>
            <ul>
              <li><strong>Wait:</strong> Token expires within 1 hour, new role applies automatically</li>
              <li><strong>Force refresh:</strong> Revoke access, wait 5 seconds, re-grant with new role</li>
              <li><strong>User action:</strong> Have user logout and login again (forces token refresh)</li>
            </ul>

            <h3>User Can't Login After Revocation</h3>
            <p><strong>Expected Behavior:</strong> If you revoked access, user should see "Access Denied"</p>
            <p><strong>If they need access back:</strong></p>
            <ol>
              <li>Navigate to user details</li>
              <li>Find app with status "REVOKED"</li>
              <li>Select role and click "Grant Access" (same as first-time approval)</li>
              <li>User can now login again</li>
            </ol>

            <h3>Don't See Any Pending Requests</h3>
            <p><strong>Possible Reasons:</strong></p>
            <ul>
              <li>No users have attempted login recently</li>
              <li>All existing requests already approved</li>
              <li>Users are trying to login to different SSO instance (check environment)</li>
            </ul>
            <p><strong>To Generate Test Request:</strong></p>
            <ol>
              <li>Open incognito browser</li>
              <li>Navigate to your app (e.g., https://launchmass.doneisbetter.com)</li>
              <li>Click "Login with SSO"</li>
              <li>Register new test account</li>
              <li>Complete OAuth flow - Should create pending request</li>
              <li>Check admin panel for new pending entry</li>
            </ol>
          </section>

          {/* WHAT: Admin roles and delegation */}
          {/* WHY: Multiple admins need coordination */}
          <section className={styles.section}>
            <h2>Multiple Admins & Delegation</h2>
            
            <h3>SSO Admin Roles</h3>
            <p>SSO has two admin levels:</p>
            <ul>
              <li>
                <strong>admin</strong> - Can manage users and app permissions
              </li>
              <li>
                <strong>super-admin</strong> - Can manage users, permissions, AND create new SSO admins
              </li>
            </ul>

            <h3>Creating New Admins (Super-Admins Only)</h3>
            <ol>
              <li>Login to admin panel as super-admin</li>
              <li>Navigate to Users tab</li>
              <li>Click "Create Admin User"</li>
              <li>Enter email, name, select role (admin or super-admin)</li>
              <li>System generates 32-hex password token</li>
              <li><strong>Copy and securely share token</strong> (shown only once!)</li>
              <li>New admin can login at https://sso.doneisbetter.com/admin</li>
            </ol>

            <h3>Delegation Best Practices</h3>
            <ul>
              <li>Assign primary admin for each app (e.g., Launchmass admin handles Launchmass approvals)</li>
              <li>Cross-train admins for coverage (vacations, time zones)</li>
              <li>Document approval criteria (who qualifies for automatic approval)</li>
              <li>Use shared Slack channel for coordination</li>
              <li>Review admin access quarterly (remove unused accounts)</li>
            </ul>
          </section>

          {/* WHAT: Related documentation links */}
          {/* WHY: Guide admins to complementary docs */}
          <section className={styles.section}>
            <h2>Related Documentation</h2>
            <ul>
              <li><a href="/docs/app-permissions">App Permissions</a> - Technical details of permission system</li>
              <li><a href="/docs/authentication">Authentication Guide</a> - OAuth 2.0 flow users experience</li>
              <li><a href="/docs/quickstart">Quick Start Guide</a> - For app developers integrating SSO</li>
              <li><a href="https://sso.doneisbetter.com/admin" target="_blank">SSO Admin Panel</a> - Login to manage permissions</li>
            </ul>
          </section>

          {/* WHAT: Support and escalation */}
          {/* WHY: Admins need help sometimes */}
          <section className={styles.section}>
            <h2>Support & Escalation</h2>
            <p><strong>For SSO-related issues:</strong></p>
            <ul>
              <li>Email: <a href="mailto:sso@doneisbetter.com">sso@doneisbetter.com</a></li>
              <li>Slack: #sso-support (internal)</li>
              <li>Emergency: Contact development team directly</li>
            </ul>
            
            <p><strong>When escalating, include:</strong></p>
            <ul>
              <li>User's email address</li>
              <li>App they're trying to access (client_id if known)</li>
              <li>Current permission status (pending/approved/revoked)</li>
              <li>Screenshots of admin panel</li>
              <li>Error messages from user's browser console</li>
              <li>Timestamps (ISO 8601 UTC format)</li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
