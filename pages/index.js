import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../styles/home.module.css';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null); // Can be public user or admin
  const [loading, setLoading] = useState(true);
  const { redirect } = router.query;

  // WHY: Check if user is already authenticated (public or admin) and redirect if needed
  // This enables subdomain SSO flow: app redirects to SSO, SSO checks session, redirects back
  useEffect(() => {
    // WHAT: Fallback timeout to prevent infinite loading
    // WHY: If fetch hangs or errors silently, show UI after 3 seconds
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    (async () => {
      try {
        // WHAT: Check for public user session first (most common)
        // WHY: Public users use 'user-session' cookie
        let res = await fetch('/api/public/validate', { credentials: 'include' });
        let data = await res.json();
        
        // WHAT: If no public session, check for admin session
        // WHY: Admin users use 'admin-session' cookie (legacy system)
        if (!data?.isValid) {
          res = await fetch('/api/sso/validate', { credentials: 'include' });
          data = await res.json();
        }
        
        if (data?.isValid) {
          setUser(data.user);
          // WHAT: If user is authenticated and redirect URL is provided, redirect back to origin
          if (redirect) {
            // WHY: Validate redirect URL to prevent open redirect vulnerability
            const redirectUrl = decodeURIComponent(redirect);
            if (isValidRedirectUrl(redirectUrl)) {
              clearTimeout(timeout);
              window.location.href = redirectUrl;
              return;
            }
          }
        }
        // WHAT: Always set loading to false, even if validation fails
        // WHY: Prevents infinite loading state; shows login UI
        clearTimeout(timeout);
        setLoading(false);
      } catch (err) {
        // WHAT: Log errors for debugging but continue to show UI
        console.error('[SSO] Session check error:', err);
        clearTimeout(timeout);
        setLoading(false);
      }
    })();

    return () => clearTimeout(timeout);
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

      {/* Public User Authentication Section */}
      <section style={{ marginTop: '2rem' }}>
        <div className={styles.apiCard}>
          <h2>🌟 Public Access</h2>
          <p>Anyone can create an account and experience our SSO service.</p>
          <div className={styles.apiLinks}>
            <Link href="/register" className={styles.primaryButton}>Create Account</Link>
            <Link href="/login" className={styles.secondaryButton}>Sign In</Link>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
            Try the demo - create an account and see SSO in action!
          </p>
        </div>
      </section>

      {/* Current Session Section */}
      {user && (
        <section style={{ marginTop: '2rem' }}>
          <div className={styles.apiCard}>
            <h2>👤 Active Session</h2>
            <p>Logged in as <strong>{user.email}</strong> ({user.role})</p>
            <div className={styles.apiLinks}>
              {user.role === 'admin' && (
                <Link href="/admin" className={styles.primaryButton}>Go to Admin</Link>
              )}
              {user.role === 'user' && (
                <Link href="/demo" className={styles.primaryButton}>Go to Demo</Link>
              )}
              {redirect && isValidRedirectUrl(decodeURIComponent(redirect)) && (
                <a href={decodeURIComponent(redirect)} className={styles.secondaryButton}>Return to Application</a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Admin Access Section (only shown if not logged in) */}
      {!user && (
        <section style={{ marginTop: '2rem' }}>
          <div className={styles.apiCard}>
            <h2>👤 Admin Access</h2>
            <p>Admins can log in using email + token (32‑hex). Use the button below to access the admin login page.</p>
            <div className={styles.apiLinks}>
              <Link href="/admin" className={styles.primaryButton}>Admin Login</Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

