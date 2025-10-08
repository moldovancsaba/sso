import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from '../styles/home.module.css';

export default function Home() {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/sso/validate', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.isValid) setAdmin(data.user);
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
        {admin ? (
          <div className={styles.apiCard}>
            <h2>👤 Admin Session</h2>
            <p>Logged in as <strong>{admin.email}</strong> ({admin.role})</p>
            <div className={styles.apiLinks}>
              <Link href="/admin" className={styles.primaryButton}>Go to Admin</Link>
            </div>
          </div>
        ) : (
          <>
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
            
            <div className={styles.apiCard} style={{ marginTop: '2rem' }}>
              <h2>👤 Admin Access</h2>
              <p>System administrators can log in using email + 32-hex token.</p>
              <div className={styles.apiLinks}>
                <Link href="/admin" className={styles.secondaryButton}>Admin Login</Link>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

