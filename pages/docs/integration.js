import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import Link from 'next/link';
import packageJson from '../../package.json';

export default function IntegrationGuidePage() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Third-Party Integration Guide</h1>
          <p className={styles.version}>SSO v{packageJson.version}</p>
          <p className={styles.subtitle}>Choose the right integration surface for your application.</p>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Integration Options</h2>
            <ul className={styles.featureList}>
              <li><strong>OAuth2 / OIDC</strong> - recommended for most apps</li>
              <li><strong>Cookie-Based SSO</strong> - only for shared-domain deployments</li>
              <li><strong>Hosted Social Login</strong> - Google and Facebook through the SSO login page</li>
              <li><strong>Centralized App Permissions</strong> - per-app access and role management in SSO</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Recommended Default</h2>
            <p>
              Start with OAuth 2.0 Authorization Code flow plus OIDC claims. Use the cookie-session endpoints only
              when your app truly shares the configured cookie domain and does not need its own OAuth token lifecycle.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Key Runtime Facts</h2>
            <ul>
              <li>Public login endpoints set cookies; they do not issue bearer tokens.</li>
              <li>Canonical app-permission roles are <code>none</code>, <code>user</code>, <code>admin</code>.</li>
              <li>Canonical app-permission statuses are <code>pending</code>, <code>approved</code>, <code>revoked</code>.</li>
              <li>Access requests require a valid user-bound token for the same user and same client.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Read Next</h2>
            <ul>
              <li><Link href="/docs/quickstart">Quick Start Guide</Link></li>
              <li><Link href="/docs/authentication">Authentication Guide</Link></li>
              <li><Link href="/docs/api">API Reference</Link></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
