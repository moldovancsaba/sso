import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';

export default function Quickstart() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Quick Start Guide</h1>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>1. Installation</h2>
            <p>
              Install the SSO client library using npm or yarn:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`npm install @doneisbetter/sso-client

# or using yarn
yarn add @doneisbetter/sso-client`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>2. Initialize the Client</h2>
            <p>
              Create an instance of the SSO client:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`import { SSOClient } from '@doneisbetter/sso-client';

const sso = new SSOClient('https://sso.doneisbetter.com');`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>3. Implement Authentication</h2>
            <p>
              Add login functionality to your application:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`// Register/login a user
const response = await sso.register({
  username: 'user@example.com'
});

// Check session status
const session = await sso.validateSession();
if (session.isValid) {
  console.log('User:', session.user);
}

// Logout
await sso.logout();`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>4. Handle Errors</h2>
            <p>
              Implement proper error handling:
            </p>
            <div className={styles.codeBlock}>
              <pre>
                {`try {
  const session = await sso.validateSession();
  if (session.isValid) {
    // User is authenticated
  }
} catch (error) {
  if (error.code === 'SESSION_EXPIRED') {
    // Redirect to login
  } else {
    // Handle other errors
  }
}`}
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
