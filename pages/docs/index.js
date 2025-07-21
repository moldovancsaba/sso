import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';

export default function DocsPage() {
  return (
    <DocsLayout>
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>DoneIsBetter SSO Integration Guide</h1>
        <p className={styles.version}>API Version: 1.0.0</p>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>Quick Start</h2>
          <div className={styles.codeBlock}>
            <code>
              {`<script src="https://sso.doneisbetter.com/sso-client.js"></script>`}
            </code>
          </div>
          <p>Initialize the SSO client:</p>
          <div className={styles.codeBlock}>
            <code>
              {`const sso = new SSOClient('https://sso.doneisbetter.com');`}
            </code>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Basic Implementation</h2>
          <div className={styles.codeBlock}>
            <pre>
              {`// Check authentication status
async function checkAuth() {
  const sso = new SSOClient('https://sso.doneisbetter.com');
  const result = await sso.validateSession();
  
  if (result.isValid) {
    // User is authenticated
    console.log('Logged in as:', result.user.username);
    return result.user;
  } else {
    // Redirect to SSO login
    sso.redirectToLogin();
    return null;
  }
}`}
            </pre>
          </div>
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
