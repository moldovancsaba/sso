import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import Link from 'next/link';

export default function IntegrationGuidePage() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Third-Party Integration Guide</h1>
          <p className={styles.version}>SSO v5.24.0</p>
          <p className={styles.subtitle}>Complete guide for integrating SSO into your application</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>📖 Full Integration Guide</h2>
            <p>
              The comprehensive Third-Party Integration Guide covers everything you need to integrate SSO into your application:
            </p>
            <ul className={styles.featureList}>
              <li><strong>OAuth2/OIDC Integration</strong> - Complete authorization code flow with PKCE</li>
              <li><strong>App-Level Permissions</strong> - NEW in v5.24.0: Manage user roles per app</li>
              <li><strong>Cookie-Based SSO</strong> - Simple subdomain integration</li>
              <li><strong>Social Login</strong> - Facebook, Google (coming soon)</li>
              <li><strong>Token Management</strong> - Access tokens, refresh tokens, ID tokens</li>
              <li><strong>Security Best Practices</strong> - PKCE, CSRF protection, token rotation</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>🎯 NEW: App-Level Permissions (v5.24.0)</h2>
            <div className={styles.warningBox}>
              <p>
                <strong>Multi-App Authorization is now available!</strong> SSO provides centralized permission management
                for all integrated applications. Learn how to:
              </p>
              <ul>
                <li>Query user's app-specific role (user/admin/superadmin)</li>
                <li>Store app permissions in your session</li>
                <li>Control access based on roles</li>
                <li>Sync permissions in real-time</li>
                <li>Handle pending approval workflows</li>
              </ul>
            </div>
          </section>

          <section className={styles.section}>
            <h2>📥 Download Guide</h2>
            <p>The complete integration guide is available as a markdown file:</p>
            <div className={styles.codeBlock}>
              <code>docs/THIRD_PARTY_INTEGRATION_GUIDE.md</code>
            </div>
            <p>
              <strong>Location:</strong> <code>/Users/moldovancsaba/Projects/sso/docs/THIRD_PARTY_INTEGRATION_GUIDE.md</code>
            </p>
            <p>
              <strong>Version:</strong> 5.24.0 (Last updated: 2025-11-09)
            </p>
            <p>
              <strong>Size:</strong> ~900 lines | Comprehensive with code examples
            </p>
            <div className={styles.apiLinks}>
              <a 
                href="https://github.com/moldovancsaba/sso/blob/main/docs/THIRD_PARTY_INTEGRATION_GUIDE.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.primaryButton}
              >
                View on GitHub
              </a>
            </div>
          </section>

          <section className={styles.section}>
            <h2>🚀 Quick Start</h2>
            <p>For a quick integration example, see:</p>
            <ul>
              <li><Link href="/docs/quickstart">Quick Start Guide</Link> - Get started in 5 minutes</li>
              <li><Link href="/docs/api">API Reference</Link> - All endpoints documented</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>📚 Table of Contents</h2>
            <ol className={styles.steps}>
              <li><strong>Overview</strong> - What you get with SSO</li>
              <li><strong>Integration Methods</strong> - Choose the right approach</li>
              <li><strong>OAuth2/OIDC</strong> - Complete OAuth integration
                <ul>
                  <li>Register OAuth client</li>
                  <li>Implement OAuth flow with PKCE</li>
                  <li>Token management (access, refresh, ID tokens)</li>
                  <li>Logout and token revocation</li>
                </ul>
              </li>
              <li><strong>App-Level Permissions</strong> - NEW! Multi-app authorization
                <ul>
                  <li>Query user's app permission</li>
                  <li>Request app access</li>
                  <li>Use role for authorization</li>
                  <li>Periodic permission sync</li>
                  <li>Access denied pages</li>
                  <li>Complete integration example</li>
                </ul>
              </li>
              <li><strong>Cookie-Based SSO</strong> - Subdomain integration</li>
              <li><strong>Social Login</strong> - Facebook/Google integration</li>
              <li><strong>API Reference</strong> - All endpoints</li>
              <li><strong>Security Best Practices</strong> - Production checklist</li>
              <li><strong>Troubleshooting</strong> - Common issues and solutions</li>
            </ol>
          </section>

          <section className={styles.section}>
            <h2>💡 Real-World Example</h2>
            <p>
              The <strong>Camera app</strong> integration is a reference implementation showing:
            </p>
            <ul className={styles.featureList}>
              <li>OAuth2 callback with permission check</li>
              <li>Session storage with app role</li>
              <li>Admin UI conditional rendering</li>
              <li>Access denied page</li>
            </ul>
            <p>
              See commit <code>ae26e49</code> in the Camera repository for the full implementation.
            </p>
          </section>

          <section className={styles.section}>
            <h2>🔧 Integration Steps Summary</h2>
            <div className={styles.codeBlock}>
              <pre>{`// 1. OAuth Callback - Exchange code for tokens
const tokens = await exchangeCodeForToken(code, codeVerifier);

// 2. Extract user from ID token
const user = decodeIdToken(tokens.id_token);

// 3. Query SSO for app permission (NEW in v5.24.0)
const permission = await getAppPermission(user.id, tokens.access_token);

// 4. Check if user has access
if (!permission.hasAccess) {
  if (permission.status === 'pending') {
    return redirectTo('/access-pending');
  } else {
    await requestAppAccess(user.id, tokens.access_token);
    return redirectTo('/access-pending');
  }
}

// 5. Store app role in session
await createSession(user, tokens, {
  appRole: permission.role,  // 'user', 'admin', or 'superadmin'
  appAccess: permission.hasAccess,
});

// 6. Redirect to app
return redirectTo('/dashboard');`}</pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>📞 Support</h2>
            <p>Need help with integration?</p>
            <ul>
              <li><strong>Email:</strong> support@doneisbetter.com</li>
              <li><strong>GitHub:</strong> <a href="https://github.com/moldovancsaba/sso" target="_blank" rel="noopener noreferrer">github.com/moldovancsaba/sso</a></li>
              <li><strong>Admin UI:</strong> <a href="https://sso.doneisbetter.com/admin">sso.doneisbetter.com/admin</a></li>
            </ul>
          </section>

          <div className={styles.backLink}>
            <Link href="/docs">← Back to Documentation</Link>
          </div>
        </main>
      </div>
    </DocsLayout>
  );
}
