import '../styles/globals.css';
import { useState, useEffect } from 'react';

export default function App({ Component, pageProps }) {
  const [sessionStatus, setSessionStatus] = useState('active');
  const [notificationShown, setNotificationShown] = useState(false);

  // Set interval for checking session status
  useEffect(() => {
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
  }, [notificationShown]);

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

  return <Component {...pageProps} />
}
