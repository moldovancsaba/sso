import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';

export default function Quickstart() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Quick Start Guide</h1>
          <p className={styles.version}>Version: 5.1.0</p>
          <p className={styles.lastUpdated}>Last updated: 2025-10-04T06:52:00.000Z</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Cookie-Based SSO Integration (Recommended)</h2>
            <p>
              <strong>For *.doneisbetter.com subdomains:</strong> Use cookie-based authentication - the simplest and most reliable method.
            </p>
            <p>
              ⚠️ <strong>Critical:</strong> Use <code>printf</code> (NOT <code>echo</code>) when setting environment variables to avoid trailing newlines!
            </p>
          </section>

          <section className={styles.section}>
            <h2>1. Set Environment Variable</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`# Good - No newline
printf "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production

# Bad - Adds newline (will cause 500 errors!)
echo "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>2. Create Authentication Library</h2>
            <p>Create <code>lib/auth.js</code> in your project:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`export async function validateSsoSession(req) {
  try {
    if (!process.env.SSO_SERVER_URL) {
      return { isValid: false };
    }
    
    const publicUrl = \`\${process.env.SSO_SERVER_URL}/api/public/validate\`;
    const resp = await fetch(publicUrl, {
      method: 'GET',
      headers: {
        cookie: req.headers.cookie || '',
        accept: 'application/json',
      },
      cache: 'no-store',
    });
    
    const data = await resp.json();
    if (data?.isValid && data?.user?.id) {
      return { isValid: true, user: data.user };
    }
    return { isValid: false };
  } catch (err) {
    return { isValid: false };
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>3. Protect Your Pages</h2>
            <p>In <code>pages/admin/index.js</code> (or any protected page):</p>
            <div className={styles.codeBlock}>
              <pre>
                {`import { validateSsoSession } from '../../lib/auth';

export async function getServerSideProps(context) {
  try {
    const { req, resolvedUrl } = context;
    const { isValid, user } = await validateSsoSession(req);
    
    if (!isValid) {
      const ssoUrl = process.env.SSO_SERVER_URL;
      const returnUrl = \`https://yourapp.doneisbetter.com\${resolvedUrl}\`;
      const loginUrl = \`\${ssoUrl}/login?redirect=\${encodeURIComponent(returnUrl)}\`;
      
      return { redirect: { destination: loginUrl, permanent: false } };
    }
    
    return { props: { user } };
  } catch (err) {
    // Always redirect on error (never throw 500)
    return { redirect: { destination: '/login', permanent: false } };
  }
}`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>4. Test Before Deploying</h2>
            <div className={styles.codeBlock}>
              <pre>
                {`# Verify no newlines in env var
vercel env pull .env.production
cat .env.production | grep SSO_SERVER_URL

# Should output: SSO_SERVER_URL="https://sso.doneisbetter.com"
# NO trailing newline or extra characters!`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>5. Next Steps</h2>
            <p>
              For more detailed information, check out these guides:
            </p>
            <ul>
              <li><a href="/docs/api">API Reference</a></li>
              <li><a href="/docs/error-handling">Error Handling Guide</a></li>
              <li><a href="/docs/session-management">Session Management</a></li>
              <li><a href="/docs/security/best-practices">Security Best Practices</a></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
