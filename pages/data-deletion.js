import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Paper,
  Code,
  List,
  Box,
  Anchor,
  Container,
  Divider,
  Group,
} from '@mantine/core';
import { useState, useEffect } from 'react';

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
    <Container size="md" py="xl"><Stack gap="xl">
      <Box>
        <Title order={1} mb="xs">Data Deletion Request</Title>
        <Text size="sm">Your Right to Be Forgotten</Text>
      </Box>

      
        <Box>
          <Title order={2} mb="sm">Account and Data Deletion</Title>
          <Text size="sm">
            In accordance with privacy regulations (GDPR, CCPA), you have the right to request deletion 
            of your personal data and account from DoneIsBetter SSO.
          </Text>
        </Box>

        {loading ? (
          <Box>
            <Text size="sm">Loading your session information...</Text>
          </Box>
        ) : user ? (
          <>
            <Box>
              <Title order={2} mb="sm">Your Account</Title>
              <div style={{ 
                background: '#f7fafc', 
                padding: '1.5rem', 
                borderRadius: '8px',
                marginBottom: '1rem' 
              }}>
                <Text size="sm"><strong>Email:</strong> {user.email}</Text>
                <Text size="sm"><strong>Username:</strong> {user.username || 'Not set'}</Text>
                <Text size="sm"><strong>User ID:</strong> {user.id}</Text>
              </div>
            </Box>

            <Box>
              <Title order={2} mb="sm">What Will Be Deleted</Title>
              <Text size="sm">If you proceed with account deletion, the following data will be permanently removed:</Text>
              <List spacing="xs">
                <List.Item><strong>Account Information</strong> - Email, username, password, and profile data</List.Item>
                <List.Item><strong>Authentication Records</strong> - Session tokens and login history</List.Item>
                <List.Item><strong>Permissions</strong> - All role-based access controls and admin privileges</List.Item>
                <List.Item><strong>Activity Logs</strong> - Authentication logs and audit trails (after 90 days)</List.Item>
                <List.Item><strong>OAuth Clients</strong> - Any registered OAuth applications</List.Item>
                <List.Item><strong>Third-Party Access</strong> - Authorization tokens for integrated applications</List.Item>
              </List>
              <Text size="sm" style={{ marginTop: '1rem', color: '#c82333', fontWeight: 'bold' }}>
                ⚠️ This action is irreversible. Once deleted, your data cannot be recovered.
              </Text>
            </Box>

            <Box>
              <Title order={2} mb="sm">Timeline</Title>
              <List spacing="xs">
                <List.Item><strong>Immediate:</strong> Your account will be deactivated and you will be logged out</List.Item>
                <List.Item><strong>Within 24 hours:</strong> Personal information will be removed from active databases</List.Item>
                <List.Item><strong>Within 30 days:</strong> All backup copies will be permanently deleted</List.Item>
                <List.Item><strong>Within 90 days:</strong> Authentication logs will be purged from audit systems</List.Item>
              </List>
            </Box>

            <Box>
              <Title order={2} mb="sm">Important Notes</Title>
              <List spacing="xs">
                <List.Item>You will lose access to all applications using DoneIsBetter SSO for authentication</List.Item>
                <List.Item>If you have admin rights on integrated applications, those permissions will be revoked</List.Item>
                <List.Item>Anonymous usage statistics may be retained for service improvement (no personal identifiers)</List.Item>
                <List.Item>Legal compliance records may be retained as required by law</List.Item>
              </List>
            </Box>

            <Box>
              <Title order={2} mb="sm">Delete Your Account</Title>
              
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
                  <Text size="sm" style={{ fontWeight: 'bold', marginBottom: '1rem', color: '#856404' }}>
                    ⚠️ Are you absolutely sure?
                  </Text>
                  <Text size="sm" style={{ marginBottom: '1rem', color: '#856404' }}>
                    This will permanently delete your account and all associated data. This action cannot be undone.
                  </Text>
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
            </Box>
          </>
        ) : (
          <>
            <Box>
              <Title order={2} mb="sm">Authentication Required</Title>
              <Text size="sm">
                To delete your account, you must be logged in. This ensures that only account owners 
                can request deletion of their own data.
              </Text>
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
            </Box>

            <Box>
              <Title order={2} mb="sm">Alternative: Email Request</Title>
              <Text size="sm">
                If you cannot access your account but need to request data deletion, please contact us:
              </Text>
              <List spacing="xs">
                <List.Item><strong>Email:</strong> <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></List.Item>
                <List.Item><strong>Subject Line:</strong> "Data Deletion Request"</List.Item>
                <List.Item><strong>Include:</strong> Your email address and any identifying information</List.Item>
              </List>
              <Text size="sm">
                We will verify your identity and process your request within 30 days as required by law.
              </Text>
            </Box>
          </>
        )}

        <Box>
          <Title order={2} mb="sm">Privacy Rights</Title>
          <Text size="sm">For more information about how we handle your data:</Text>
          <List spacing="xs">
            <List.Item><Link href="/privacy">Privacy Policy</Link> - Our data collection and usage practices</List.Item>
            <List.Item><Link href="/terms">Terms of Service</Link> - Service agreement and user responsibilities</List.Item>
            <List.Item><Link href="/docs">Documentation</Link> - Technical details about our SSO service</List.Item>
          </List>
        </Box>

        <Box>
          <Title order={2} mb="sm">Questions or Concerns</Title>
          <Text size="sm">If you have questions about data deletion or privacy:</Text>
          <List spacing="xs">
            <List.Item><strong>Email:</strong> <a href="mailto:support@doneisbetter.com">support@doneisbetter.com</a></List.Item>
            <List.Item><strong>Response Time:</strong> Within 48 hours for privacy-related inquiries</List.Item>
            <List.Item><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM (UTC)</List.Item>
          </List>
        </Box>
      

      <Divider mt="xl" />
      <Group justify="space-between" align="center" wrap="wrap">
        <Text size="xs" c="dimmed">© 2025 DoneIsBetter. All rights reserved.</Text>
        <Group gap="md">
          <Link href="/">Home</Link> | 
          <Link href="/privacy" style={{ margin: '0 0.5rem' }}>Privacy Policy</Link> | 
          <Link href="/terms" style={{ margin: '0 0.5rem' }}>Terms of Service</Link> | 
          <Link href="/data-deletion">Data Deletion</Link>
        </Group>
      </Group>
    </Stack></Container>
  );
}
