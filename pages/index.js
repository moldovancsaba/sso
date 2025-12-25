import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../styles/home.module.css';

export default function Home() {
  const [publicUser, setPublicUser] = useState(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    // WHAT: Check public user session and admin permissions
    // WHY: Show admin button only if user has admin access
    (async () => {
      try {
        const publicRes = await fetch('/api/public/session', { credentials: 'include' });
        if (publicRes.ok) {
          const data = await publicRes.json();
          if (data?.isValid) {
            setPublicUser(data.user);
            
            // WHAT: Check if user has admin access
            // WHY: Show SSO Admin button conditionally
            try {
              const adminRes = await fetch('/api/admin/check-access', { credentials: 'include' });
              if (adminRes.ok) {
                setHasAdminAccess(true);
              }
            } catch {}
          }
        }
      } catch {}
    })();
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>DoneIsBetter SSO</h1>
        <p className={styles.subtitle}>Secure Single Sign-On Solution</p>
      </header>

      <section className={styles.section}>
        {publicUser ? (
          <div className={styles.apiCard}>
            <h2>✅ Logged In</h2>
            <p>Welcome, <strong>{publicUser.email}</strong>!</p>
            <p className={styles.sessionInfo}>Your session is active and secure.</p>
            <div className={styles.apiLinks}>
              <Link href="/account" className={styles.primaryButton}>My Account</Link>
              {hasAdminAccess && (
                <Link href="/admin" className={styles.adminButton}>SSO Admin</Link>
              )}
              <Link href="/logout" className={styles.secondaryButton}>Logout</Link>
            </div>
          </div>
        ) : (
          <div className={styles.apiCard}>
            <h2>🔐 User Login</h2>
            <p>Sign in to access your account with multiple authentication options:</p>
            <ul className={styles.featureList}>
              <li>🔑 Email + Password</li>
              <li>🔗 Magic Link (passwordless)</li>
              <li>📱 Facebook Login</li>
              <li>🔒 PIN Verification (enhanced security)</li>
            </ul>
            <div className={styles.apiLinks}>
              <Link href="/login" className={styles.primaryButton}>Sign In</Link>
              <Link href="/register" className={styles.secondaryButton}>Create Account</Link>
            </div>
          </div>
        )}

        <div className={styles.apiCard}>
          <h2>🔗 API Integration</h2>
          <p>Ready to integrate SSO into your application?</p>
          <div className={styles.apiLinks}>
            <Link href="/docs/integration" className={styles.primaryButton}>Third-Party Integration Guide</Link>
            <Link href="/docs/api" className={styles.secondaryButton}>API Documentation</Link>
            <Link href="/docs/quickstart" className={styles.secondaryButton}>Quick Start Guide</Link>
          </div>
          <div className={styles.apiExample}>
            <code>{`// Quick integration example\nconst sso = new SSOClient('https://sso.doneisbetter.com');\nconst session = await sso.validateSession();`}</code>
          </div>
        </div>
      </section>
    </div>
  );
}

