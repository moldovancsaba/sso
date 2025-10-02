import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/home.module.css';

export default function Home() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const { redirect } = router.query;

  // WHY: Check if user is already authenticated and redirect if needed
  // This enables subdomain SSO flow: app redirects to SSO, SSO checks session, redirects back
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/sso/validate', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.isValid) {
            setAdmin(data.user);
            // WHAT: If user is authenticated and redirect URL is provided, redirect back to origin
            if (redirect) {
              // WHY: Validate redirect URL to prevent open redirect vulnerability
              const redirectUrl = decodeURIComponent(redirect);
              if (isValidRedirectUrl(redirectUrl)) {
                window.location.href = redirectUrl;
                return;
              }
            }
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, [redirect]);

  // WHAT: Validate redirect URL to prevent open redirect attacks
  // WHY: Only allow redirects to *.doneisbetter.com subdomains and localhost (dev)
  const isValidRedirectUrl = (url) => {
    try {
      const parsed = new URL(url);
      // Allow localhost for development
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return true;
      }
      // Allow *.doneisbetter.com subdomains
      if (parsed.hostname.endsWith('.doneisbetter.com') || parsed.hostname === 'doneisbetter.com') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // WHAT: Show loading state while checking authentication
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

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
              {redirect && isValidRedirectUrl(decodeURIComponent(redirect)) && (
                <a href={decodeURIComponent(redirect)} className={styles.secondaryButton}>Return to Application</a>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.apiCard}>
            <h2>👤 {redirect ? 'Authentication Required' : 'Admin Access'}</h2>
            {redirect && isValidRedirectUrl(decodeURIComponent(redirect)) ? (
              <>
                <p>You need to log in to access <strong>{new URL(decodeURIComponent(redirect)).hostname}</strong></p>
                <p>Please use your admin credentials (email + 32-hex token) to continue.</p>
              </>
            ) : (
              <p>Admins can log in using email + token (32‑hex). Use the button below to access the admin login page.</p>
            )}
            <div className={styles.apiLinks}>
              <Link 
                href={redirect ? `/admin?redirect=${encodeURIComponent(redirect)}` : '/admin'} 
                className={styles.primaryButton}
              >
                {redirect ? 'Login to Continue' : 'Admin Login'}
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

