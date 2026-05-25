import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '../styles/globals.css';
import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/router';
import AppProviders from '../components/AppProviders';

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
          notifications.clean();
          notifications.show({
            title: 'Session expired',
            message: 'Please sign in again.',
            color: 'red',
            autoClose: 2500,
          });
          window.setTimeout(() => {
            router.push('/');
          }, 300);
        }
      } catch (error) {
        console.error('Error checking session status:', error);
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [notificationShown, isAdminPage, router]);

  // Form submission handler
  const handleFormSubmit = useCallback(async (event) => {
    event.preventDefault();
    
    if (sessionStatus === 'expired') {
      notifications.clean();
      notifications.show({
        title: 'Session expired',
        message: 'Please sign in again before continuing.',
        color: 'red',
        autoClose: 2500,
      });
      router.push('/');
      return;
    }

    // Continue with form submission
    const form = event.target;
    form.submit();
  }, [router, sessionStatus]);

  // Sign-out handler
  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/users/logout', { method: 'POST' });
      setSessionStatus('expired');
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router]);

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
  }, [handleFormSubmit, handleSignOut]);

  return (
    <AppProviders>
      <Component {...pageProps} />
    </AppProviders>
  );
}
