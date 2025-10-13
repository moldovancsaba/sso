import { useState, useEffect } from 'react';
import styles from '../styles/docs.module.css';
import Link from 'next/link';

// WHAT: Public data deletion request page for SSO service
// WHY: Required for GDPR/privacy compliance; allows users to request account and data deletion
export default function DataDeletionPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // WHAT: Check if user is logged in on page load
    // WHY: Need to verify authentication before allowing deletion
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/public/session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data?.isValid && data?.user) {
          setUser(data.user);
        }
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setError('');
    setMessage('');

    try {
      // WHAT: Send DELETE request to user's account endpoint
      // WHY: Permanently removes user account and all associated data
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setMessage('Your account and all associated data have been successfully deleted. You will be redirected to the homepage in 3 seconds.');
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete account. Please try again or contact support.');
      }
    } catch (err) {
      console.error('Deletion error:', err);
      setError('An error occurred. Please contact support@doneisbetter.com for assistance.');
    } finally {
      setDeleting(false);
      setShowConfirmation(false);
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Data Deletion Request</h1>
        <p className={styles.version}>Your Right to Be Forgotten</p>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>Account and Data Deletion</h2>
          <p>
            In accordance with privacy regulations (GDPR, CCPA), you have the right to request deletion 
            of your personal data and account from DoneIsBetter SSO.
          </p>
        </section>

        {loading ? (
          <section className={styles.section}>
            <p>Loading your session information...</p>
          </section>
        ) : user ? (
          <>
            <section className={styles.section}>
              <h2>Your Account</h2>
              <div style={{ 
                background: '#f7fafc', 
                padding: '1.5rem', 
                borderRadius: '8px',
                marginBottom: '1rem' 
              }}>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Username:</strong> {user.username || 'Not set'}</p>
                <p><strong>User ID:</strong> {user.id}</p>
              </div>
            </section>

            <section className={styles.section}>
              <h2>What Will Be Deleted</h2>
              <p>If you proceed with account deletion, the following data will be permanently removed:</p>
              <ul>
                <li><strong>Account Information</strong> - Email, username, password, and profile data</li>
                <li><strong>Authentication Records</strong> - Session tokens and login history</li>
                <li><strong>Permissions</strong> - All role-based access controls and admin privileges</li>
                <li><strong>Activity Logs</strong> - Authentication logs and audit trails (after 90 days)</li>
                <li><strong>OAuth Clients</strong> - Any registered OAuth applications</li>
                <li><strong>Third-Party Access</strong> - Authorization tokens for integrated applications</li>
              </ul>
              <p style={{ marginTop: '1rem', color: '#c82333', fontWeight: 'bold' }}>
                ⚠️ This action is irreversible. Once deleted, your data cannot be recovered.
              </p>
            </section>

            <section className={styles.section}>
              <h2>Timeline</h2>
              <ul>
                <li><strong>Immediate:</strong> Your account will be deactivated and you will be logged out</li>
                <li><strong>Within 24 hours:</strong> Personal information will be removed from active databases</li>
                <li><strong>Within 30 days:</strong> All backup copies will be permanently deleted</li>
                <li><strong>Within 90 days:</strong> Authentication logs will be purged from audit systems</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>Important Notes</h2>
              <ul>
                <li>You will lose access to all applications using DoneIsBetter SSO for authentication</li>
                <li>If you have admin rights on integrated applications, those permissions will be revoked</li>
                <li>Anonymous usage statistics may be retained for service improvement (no personal identifiers)</li>
                <li>Legal compliance records may be retained as required by law</li>
              </ul>
            </section>

            <section className={styles.section}>
              <h2>Delete Your Account</h2>
              
              {message && (
                <div style={{ 
                  background: '#d4edda', 
                  color: '#155724', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #c3e6cb'
                }}>
                  {message}
                </div>
              )}

              {error && (
                <div style={{ 
                  background: '#f8d7da', 
                  color: '#721c24', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  border: '1px solid #f5c6cb'
                }}>
                  {error}
                </div>
              )}

              {!showConfirmation ? (
                <button
                  onClick={() => setShowConfirmation(true)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    padding: '0.75rem 2rem',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#c82333'}
                  onMouseOut={(e) => e.target.style.background = '#dc3545'}
                >
                  Request Account Deletion
                </button>
              ) : (
                <div style={{ 
                  background: '#fff3cd', 
                  padding: '1.5rem', 
                  borderRadius: '8px',
                  border: '1px solid #ffc107'
                }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#856404' }}>
                    ⚠️ Are you absolutely sure?
                  </p>
                  <p style={{ marginBottom: '1rem', color: '#856404' }}>
                    This will permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        padding: '0.75rem 2rem',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: deleting ? 'not-allowed' : 'pointer',
                        opacity: deleting ? 0.6 : 1
                      }}
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                    </button>
                    <button
                      onClick={() => setShowConfirmation(false)}
                      disabled={deleting}
                      style={{
                        background: '#6c757d',
                        color: 'white',
                        padding: '0.75rem 2rem',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: deleting ? 'not-allowed' : 'pointer',
                        opacity: deleting ? 0.6 : 1
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className={styles.section}>
              <h2>Authentication Required</h2>
              <p>
                To delete your account, you must be logged in. This ensures that only account owners 
                can request deletion of their own data.
              </p>
              <div style={{ marginTop: '1.5rem' }}>
                <Link 
                  href="/login"
                  style={{
                    display: 'inline-block',
                    background: '#007bff',
                    color: 'white',
                    padding: '0.75rem 2rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Sign In to Continue
                </Link>
              </div>
            </section>

            <section className={styles.section}>
              <h2>Alternative: Email Request</h2>
              <p>
                If you cannot access your account but need to request data deletion, please contact us:
              </p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></li>
                <li><strong>Subject Line:</strong> "Data Deletion Request"</li>
                <li><strong>Include:</strong> Your email address and any identifying information</li>
              </ul>
              <p>
                We will verify your identity and process your request within 30 days as required by law.
              </p>
            </section>
          </>
        )}

        <section className={styles.section}>
          <h2>Privacy Rights</h2>
          <p>For more information about how we handle your data:</p>
          <ul>
            <li><Link href="/privacy">Privacy Policy</Link> - Our data collection and usage practices</li>
            <li><Link href="/terms">Terms of Service</Link> - Service agreement and user responsibilities</li>
            <li><Link href="/docs">Documentation</Link> - Technical details about our SSO service</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Questions or Concerns</h2>
          <p>If you have questions about data deletion or privacy:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></li>
            <li><strong>Response Time:</strong> Within 48 hours for privacy-related inquiries</li>
            <li><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM (UTC)</li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© 2025 DoneIsBetter. All rights reserved.</p>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/">Home</Link> | 
          <Link href="/privacy" style={{ margin: '0 0.5rem' }}>Privacy Policy</Link> | 
          <Link href="/terms" style={{ margin: '0 0.5rem' }}>Terms of Service</Link> | 
          <Link href="/data-deletion">Data Deletion</Link>
        </div>
      </footer>
    </div>
  );
}
