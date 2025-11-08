import '../styles/globals.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import packageJson from '../package.json';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [sessionStatus, setSessionStatus] = useState('active');
  const [notificationShown, setNotificationShown] = useState(false);

  // WHAT: Check if current page is admin-related
  // WHY: Admin pages use different session (admin-session cookie) than public pages
  const isAdminPage = router.pathname.startsWith('/admin');

  // Set interval for checking session status
  useEffect(() => {
    // WHAT: Skip session check on admin pages
    // WHY: Admin pages use admin-session cookie, not public user session
    // This prevents false "session expired" alerts when logged in as admin
    if (isAdminPage) {
      return;
    }

    const checkSession = async () => {
      try {
        const response = await fetch('/api/users/session-status');
        const data = await response.json();
        
        if (data.status === 'expired' && !notificationShown) {
          setSessionStatus('expired');
          setNotificationShown(true);
          alert('Your session has expired. Please sign in again.');
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error checking session status:', error);
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [notificationShown, isAdminPage]);

  // Form submission handler
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    
    if (sessionStatus === 'expired') {
      alert('Session expired. Please sign in again.');
      window.location.href = '/';
      return;
    }

    // Continue with form submission
    const form = event.target;
    form.submit();
  };

  // Sign-out handler
  const handleSignOut = async () => {
    try {
      await fetch('/api/users/logout', { method: 'POST' });
      setSessionStatus('expired');
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Add event listeners for forms and sign-out button
  useEffect(() => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', handleFormSubmit);
    });

    const signOutBtn = document.querySelector('#sign-out-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', handleSignOut);
    }

    return () => {
      forms.forEach(form => {
        form.removeEventListener('submit', handleFormSubmit);
      });
      if (signOutBtn) {
        signOutBtn.removeEventListener('click', handleSignOut);
      }
    };
  }, [sessionStatus]);

  return (
    <>
      <Component {...pageProps} />
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        borderTop: '1px solid #e0e0e0',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#666',
        zIndex: 100,
        backdropFilter: 'blur(10px)'
      }}>
        SSO v{packageJson.version} | <a href="https://github.com/moldovancsaba/sso" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none' }}>GitHub</a> | <a href="/docs" style={{ color: '#667eea', textDecoration: 'none' }}>Docs</a> | <a href="/privacy" style={{ color: '#667eea', textDecoration: 'none' }}>Privacy</a> | <a href="/terms" style={{ color: '#667eea', textDecoration: 'none' }}>Terms</a> | <a href="/data-deletion" style={{ color: '#667eea', textDecoration: 'none' }}>Data Deletion</a>
      </footer>
    </>
  )
}
