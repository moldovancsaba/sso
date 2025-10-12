import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../styles/home.module.css';

export default function Home() {
  const [publicUser, setPublicUser] = useState(null);

  useEffect(() => {
    // WHAT: Check ONLY public user session on homepage
    // WHY: Homepage is for SSO service users, NOT system administrators
    // NOTE: Admins have separate /admin portal, never shown on public pages
    (async () => {
      try {
        const publicRes = await fetch('/api/public/session', { credentials: 'include' });
        if (publicRes.ok) {
          const data = await publicRes.json();
          if (data?.isValid) {
            setPublicUser(data.user);
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

        <div className={styles.apiCard}>
          <h2>🔗 API Integration</h2>
          <p>Ready to integrate SSO into your application?</p>
          <div className={styles.apiLinks}>
            <Link href="/docs/api" className={styles.primaryButton}>API Documentation</Link>
            <Link href="/docs/quickstart" className={styles.secondaryButton}>Quick Start Guide</Link>
          </div>
          <div className={styles.apiExample}>
            <code>{`// Quick integration example\nconst sso = new SSOClient('https://sso.doneisbetter.com');\nconst session = await sso.validateSession();`}</code>
          </div>
        </div>
      </header>

      <section style={{ marginTop: '2rem' }}>
        {publicUser ? (
          <div className={styles.apiCard}>
            <h2>✅ Logged In</h2>
            <p>Welcome, <strong>{publicUser.email}</strong>!</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>Your session is active and secure.</p>
            <div className={styles.apiLinks}>
              <Link href="/account" className={styles.primaryButton}>My Account</Link>
              <Link href="/logout" className={styles.secondaryButton}>Logout</Link>
            </div>
          </div>
        ) : (
          <div className={styles.apiCard}>
            <h2>🔐 User Login</h2>
            <p>Sign in to access your account with multiple authentication options:</p>
            <ul style={{ textAlign: 'left', marginBottom: '1rem', lineHeight: '1.8' }}>
              <li>🔑 Email + Password</li>
              <li>🔗 Magic Link (passwordless)</li>
              <li>📧 Forgot Password Recovery</li>
              <li>🔒 PIN Verification (enhanced security)</li>
            </ul>
            <div className={styles.apiLinks}>
              <Link href="/login" className={styles.primaryButton}>Sign In</Link>
              <Link href="/register" className={styles.secondaryButton}>Create Account</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

