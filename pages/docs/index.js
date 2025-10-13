import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

// WHAT: Main documentation landing page for SSO OAuth 2.0 integration
// WHY: Developers need clear, up-to-date instructions for integrating with our SSO service
// HOW: OAuth 2.0 authorization code flow with app-level permission management
export default function DocsPage() {
  return (
    <DocsLayout>
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>DoneIsBetter SSO Integration Guide</h1>
        <p className={styles.version}>API Version: {packageJson.version}</p>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>OAuth 2.0 Authorization Server</p>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>⚠️ Important: OAuth 2.0 Flow</h2>
          <div style={{ background: '#fff3e0', border: '1px solid #f57c00', borderRadius: '8px', padding: '16px', marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>
              <strong>This SSO service uses OAuth 2.0 Authorization Code Flow.</strong> The old client-side approach has been deprecated. 
              You must implement server-side token exchange and handle app-level permissions.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Overview</h2>
          <p>DoneIsBetter SSO is an OAuth 2.0 authorization server that provides:</p>
          <ul>
            <li><strong>Centralized Authentication</strong> - Users log in once, access multiple apps</li>
            <li><strong>App-Level Permissions</strong> - Control which users can access which applications</li>
            <li><strong>Role-Based Access</strong> - Assign users as <code>user</code> or <code>admin</code> per app</li>
            <li><strong>Admin Approval Workflow</strong> - New users require SSO admin approval before accessing apps</li>
            <li><strong>Secure Token Management</strong> - JWT-based access and refresh tokens</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Authentication Flow</h2>
          <ol className={styles.steps}>
            <li>
              <h3>User Clicks "Login"</h3>
              <p>Your app redirects to SSO authorization endpoint:</p>
              <div className={styles.codeBlock}>
                <code>
                  {`https://sso.doneisbetter.com/api/oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/auth/callback&
  response_type=code&
  scope=openid profile email`}
                </code>
              </div>
            </li>
            
            <li>
              <h3>User Authenticates</h3>
              <p>SSO presents login page. User enters credentials or uses magic link/PIN.</p>
            </li>

            <li>
              <h3>Permission Check</h3>
              <p>SSO verifies user has approved access to your app:</p>
              <ul>
                <li><code>status: 'approved'</code> → Continue to step 4</li>
                <li><code>status: 'pending'</code> → Show "Access Pending Approval" message</li>
                <li><code>status: 'revoked'</code> or no permission → Show "Access Denied"</li>
              </ul>
            </li>

            <li>
              <h3>Authorization Code</h3>
              <p>SSO redirects back to your app with authorization code:</p>
              <div className={styles.codeBlock}>
                <code>
                  {`https://yourapp.com/auth/callback?code=AUTHORIZATION_CODE`}
                </code>
              </div>
            </li>

            <li>
              <h3>Token Exchange (Server-Side)</h3>
              <p>Your backend exchanges code for tokens:</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`POST https://sso.doneisbetter.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/auth/callback"
}`}
                </pre>
              </div>
            </li>

            <li>
              <h3>Receive Tokens</h3>
              <p>SSO returns access token, ID token, and refresh token:</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGci...",
  "id_token": "eyJhbGci..."
}`}
                </pre>
              </div>
              <p>Decode ID token to get user info and app-level role:</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "admin",  // App-level role: 'user' or 'admin'
  "iat": 1234567890,
  "exp": 1234571490
}`}
                </pre>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>Integration Steps</h2>
          <ol className={styles.steps}>
            <li>
              <h3>Register Your Domain</h3>
              <p>Contact us at <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a> to register your domain.</p>
              <p>Required information:</p>
              <ul>
                <li>Your domain name</li>
                <li>Organization name</li>
                <li>Technical contact email</li>
                <li>Development and production URLs</li>
              </ul>
            </li>
            
            <li>
              <h3>Add SSO Client</h3>
              <p>Include our client script in your HTML:</p>
              <div className={styles.codeBlock}>
                <code>
                  {`<script src="https://sso.doneisbetter.com/sso-client.js"></script>`}
                </code>
              </div>
            </li>

            <li>
              <h3>Initialize SSO</h3>
              <p>Create an SSO instance and check authentication:</p>
              <div className={styles.codeBlock}>
                <pre>
                  {`const sso = new SSOClient('https://sso.doneisbetter.com');

// Check on page load
document.addEventListener('DOMContentLoaded', async () => {
  const session = await sso.validateSession();
  if (session.isValid) {
    // Handle authenticated user
    console.log('User:', session.user);
  } else {
    // Handle unauthenticated state
    sso.redirectToLogin();
  }
});`}
                </pre>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>API Reference</h2>
          
          <h3>Session Validation</h3>
          <p>Endpoint: <code>GET https://sso.doneisbetter.com/api/sso/validate</code></p>
          <p>Headers:</p>
          <ul>
            <li><code>Content-Type: application/json</code></li>
            <li><code>Origin: your-domain.com</code></li>
          </ul>
          
          <h4>Success Response (200 OK)</h4>
          <div className={styles.codeBlock}>
            <pre>
              {`{
  "isValid": true,
  "user": {
    "id": "user_id",
    "username": "username",
    "permissions": {
      "isAdmin": false,
      "canViewUsers": false,
      "canManageUsers": false
    }
  },
  "session": {
    "expiresAt": "2025-07-21T14:43:47Z"
  }
}`}
            </pre>
          </div>

          <h4>Error Responses</h4>
          <ul>
            <li><code>401</code> - Invalid or expired session</li>
            <li><code>403</code> - Unauthorized domain</li>
            <li><code>500</code> - Server error</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Security Best Practices</h2>
          <ul>
            <li>Always use HTTPS in production</li>
            <li>Validate session status before accessing protected resources</li>
            <li>Implement proper error handling</li>
            <li>Don't store sensitive user data in localStorage</li>
            <li>Keep the SSO client script updated to the latest version</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Example Implementations</h2>
          <div className={styles.tabs}>
            <div className={styles.tab}>
              <h3>React</h3>
              <div className={styles.codeBlock}>
                <pre>
                  {`import { useEffect, useState } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const sso = new SSOClient('https://sso.doneisbetter.com');
      try {
        const result = await sso.validateSession();
        if (result.isValid) {
          setUser(result.user);
        } else {
          sso.redirectToLogin();
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Welcome, {user.username}!</div>;
}`}
                </pre>
              </div>
            </div>

            <div className={styles.tab}>
              <h3>Vue.js</h3>
              <div className={styles.codeBlock}>
                <pre>
                  {`// auth.js
export default {
  data() {
    return {
      user: null,
      loading: true
    }
  },
  async created() {
    const sso = new SSOClient('https://sso.doneisbetter.com');
    try {
      const result = await sso.validateSession();
      if (result.isValid) {
        this.user = result.user;
      } else {
        sso.redirectToLogin();
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      this.loading = false;
    }
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Support</h2>
          <p>For technical support or to report issues:</p>
          <ul>
            <li>Email: <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></li>
            <li>Documentation: <a href="https://sso.doneisbetter.com/docs">https://sso.doneisbetter.com/docs</a></li>
            <li>GitHub: <a href="https://github.com/doneisbetter/sso">https://github.com/doneisbetter/sso</a></li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© 2025 DoneIsBetter. All rights reserved.</p>
      </footer>
    </div>
    </DocsLayout>
  );
}
