import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Group,
  List,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { ArticleShell, PublicBrandFooter, PublicShell } from '@doneisbetter/gds-core/server'
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconTrash } from '@tabler/icons-react'

export default function DataDeletionPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const res = await fetch('/api/public/session', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data?.isValid && data?.user) {
          setUser(data.user)
        }
      }
    } catch (err) {
      console.error('Session check failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        setMessage(
          'Your account and all associated data have been successfully deleted. You will be redirected to the homepage in 3 seconds.'
        )
        setTimeout(() => {
          window.location.href = '/'
        }, 3000)
      } else {
        const data = await res.json()
        setError(data.message || 'Failed to delete account. Please try again or contact support.')
      }
    } catch (err) {
      console.error('Deletion error:', err)
      setError('An error occurred. Please contact support@doneisbetter.com for assistance.')
    } finally {
      setDeleting(false)
      setShowConfirmation(false)
    }
  }

  return (
    <PublicShell
      brand={
        <Anchor component={Link} href="/" fw={700} td="none">
          DoneIsBetter SSO
        </Anchor>
      }
      compact
      footer={
        <PublicBrandFooter
          brandTitle="DoneIsBetter"
          compact
          description="Universal SSO service for shared identity, OAuth, and centralized account access."
          legal={<Text c="dimmed" size="xs">© 2025 DoneIsBetter. All rights reserved.</Text>}
          secondary={
            <Group gap="md">
              <Anchor component={Link} href="/" size="xs">Home</Anchor>
              <Anchor component={Link} href="/privacy" size="xs">Privacy Policy</Anchor>
              <Anchor component={Link} href="/terms" size="xs">Terms of Service</Anchor>
            </Group>
          }
        />
      }
      maxContentWidth="md"
    >
      <Box py="xl">
        <ArticleShell
          eyebrow="Information"
          lead="Your right to be forgotten."
          title="Data Deletion Request"
        >
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={2}>Account and Data Deletion</Title>
          <Text size="sm">
            In accordance with privacy regulations such as GDPR and CCPA, you can request deletion of
            your personal data and account from DoneIsBetter SSO.
          </Text>
        </Stack>

        {loading ? (
          <Alert color="blue" icon={<IconInfoCircle size={16} />} title="Loading session">
            Loading your session information...
          </Alert>
        ) : user ? (
          <>
            <Card p="lg">
              <Stack gap="xs">
                <Title order={2}>Your Account</Title>
                <Text size="sm">
                  <strong>Email:</strong> {user.email}
                </Text>
                <Text size="sm">
                  <strong>Username:</strong> {user.username || 'Not set'}
                </Text>
                <Text size="sm">
                  <strong>User ID:</strong> {user.id}
                </Text>
              </Stack>
            </Card>

            <Stack gap="xs">
              <Title order={2}>What Will Be Deleted</Title>
              <Text size="sm">
                If you proceed with account deletion, the following data will be permanently removed:
              </Text>
              <List spacing="xs" size="sm">
                <List.Item>
                  <strong>Account Information</strong> - Email, username, password, and profile data
                </List.Item>
                <List.Item>
                  <strong>Authentication Records</strong> - Session tokens and login history
                </List.Item>
                <List.Item>
                  <strong>Permissions</strong> - All role-based access controls and admin privileges
                </List.Item>
                <List.Item>
                  <strong>Activity Logs</strong> - Authentication logs and audit trails after 90 days
                </List.Item>
                <List.Item>
                  <strong>OAuth Clients</strong> - Any registered OAuth applications
                </List.Item>
                <List.Item>
                  <strong>Third-Party Access</strong> - Authorization tokens for integrated applications
                </List.Item>
              </List>
              <Alert color="red" icon={<IconAlertTriangle size={16} />} title="Irreversible action">
                Once deleted, your data cannot be recovered.
              </Alert>
            </Stack>

            <Stack gap="xs">
              <Title order={2}>Timeline</Title>
              <List spacing="xs" size="sm">
                <List.Item>
                  <strong>Immediate:</strong> Your account will be deactivated and you will be logged out.
                </List.Item>
                <List.Item>
                  <strong>Within 24 hours:</strong> Personal information will be removed from active databases.
                </List.Item>
                <List.Item>
                  <strong>Within 30 days:</strong> All backup copies will be permanently deleted.
                </List.Item>
                <List.Item>
                  <strong>Within 90 days:</strong> Authentication logs will be purged from audit systems.
                </List.Item>
              </List>
            </Stack>

            <Stack gap="xs">
              <Title order={2}>Important Notes</Title>
              <List spacing="xs" size="sm">
                <List.Item>You will lose access to all applications using DoneIsBetter SSO.</List.Item>
                <List.Item>If you have admin rights, those permissions will be revoked.</List.Item>
                <List.Item>Anonymous usage statistics may be retained without personal identifiers.</List.Item>
                <List.Item>Legal compliance records may be retained as required by law.</List.Item>
              </List>
            </Stack>

            <Stack gap="md">
              <Title order={2}>Delete Your Account</Title>

              {message ? (
                <Alert color="green" icon={<IconCheck size={16} />} title="Deletion requested">
                  {message}
                </Alert>
              ) : null}

              {error ? (
                <Alert color="red" icon={<IconAlertTriangle size={16} />} title="Deletion failed">
                  {error}
                </Alert>
              ) : null}

              {!showConfirmation ? (
                <Button
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={() => setShowConfirmation(true)}
                  w="fit-content"
                >
                  Request Account Deletion
                </Button>
              ) : (
                <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title="Are you absolutely sure?">
                  <Stack gap="md">
                    <Text size="sm">
                      This will permanently delete your account and all associated data. This action
                      cannot be undone.
                    </Text>
                    <Group>
                      <Button color="red" loading={deleting} onClick={handleDeleteAccount}>
                        Yes, Delete My Account
                      </Button>
                      <Button disabled={deleting} onClick={() => setShowConfirmation(false)} variant="default">
                        Cancel
                      </Button>
                    </Group>
                  </Stack>
                </Alert>
              )}
            </Stack>
          </>
        ) : (
          <>
            <Alert color="yellow" icon={<IconInfoCircle size={16} />} title="Authentication required">
              To delete your account, you must be logged in. This ensures only account owners can request
              deletion of their own data.
            </Alert>

            <Button component={Link} href="/login" w="fit-content">
              Sign In to Continue
            </Button>

            <Stack gap="xs">
              <Title order={2}>Alternative: Email Request</Title>
              <Text size="sm">
                If you cannot access your account but need to request data deletion, contact us:
              </Text>
              <List spacing="xs" size="sm">
                <List.Item>
                  <strong>Email:</strong>{' '}
                  <Anchor href="mailto:support@doneisbetter.com">support@doneisbetter.com</Anchor>
                </List.Item>
                <List.Item>
                  <strong>Subject Line:</strong> Data Deletion Request
                </List.Item>
                <List.Item>
                  <strong>Include:</strong> Your email address and any identifying information
                </List.Item>
              </List>
              <Text size="sm">
                We will verify your identity and process your request within 30 days as required by law.
              </Text>
            </Stack>
          </>
        )}

        <Stack gap="xs">
          <Title order={2}>Privacy Rights</Title>
          <Text size="sm">For more information about how we handle your data:</Text>
          <List spacing="xs" size="sm">
            <List.Item>
              <Anchor component={Link} href="/privacy">
                Privacy Policy
              </Anchor>{' '}
              - Our data collection and usage practices
            </List.Item>
            <List.Item>
              <Anchor component={Link} href="/terms">
                Terms of Service
              </Anchor>{' '}
              - Service agreement and user responsibilities
            </List.Item>
            <List.Item>
              <Anchor component={Link} href="/docs">
                Documentation
              </Anchor>{' '}
              - Technical details about our SSO service
            </List.Item>
          </List>
        </Stack>

        <Stack gap="xs">
          <Title order={2}>Questions or Concerns</Title>
          <Text size="sm">If you have questions about data deletion or privacy:</Text>
          <List spacing="xs" size="sm">
            <List.Item>
              <strong>Email:</strong>{' '}
              <Anchor href="mailto:support@doneisbetter.com">support@doneisbetter.com</Anchor>
            </List.Item>
            <List.Item>
              <strong>Response Time:</strong> Within 48 hours for privacy-related inquiries
            </List.Item>
            <List.Item>
              <strong>Support Hours:</strong> Monday to Friday, 9:00 AM to 5:00 PM (UTC)
            </List.Item>
          </List>
        </Stack>
      </Stack>
        </ArticleShell>
      </Box>
    </PublicShell>
  )
}
