import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  PasswordInput,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { PageHeader } from '@doneisbetter/gds-admin/server'
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'

export async function getServerSideProps(context) {
  const { getPublicUserFromRequest } = await import('../lib/publicSessions.mjs')
  const { getUserLoginMethods } = await import('../lib/accountLinking.mjs')
  const { getDb } = await import('../lib/db.mjs')

  try {
    const user = await getPublicUserFromRequest(context.req)

    if (!user) {
      return {
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/account'),
          permanent: false,
        },
      }
    }

    const db = await getDb()
    const fullUser = await db.collection('publicUsers').findOne({ id: user.id })
    const loginMethods = getUserLoginMethods(fullUser || user)

    return {
      props: {
        initialUser: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role || 'user',
          status: user.status,
          emailVerified: user.emailVerified !== false,
          loginMethods,
        },
      },
    }
  } catch (error) {
    console.error('Account page session check error:', error)
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }
}

function loginMethodColor(method) {
  switch (method) {
    case 'facebook':
      return 'blue'
    case 'google':
      return 'red'
    case 'password':
      return 'brand'
    default:
      return 'gray'
  }
}

function loginMethodLabel(method) {
  if (method === 'password') return 'Email + Password'
  return method.charAt(0).toUpperCase() + method.slice(1)
}

export default function AccountPage({ initialUser }) {
  const [authorizations, setAuthorizations] = useState([])
  const [authsLoading, setAuthsLoading] = useState(true)
  const [changingPassword, setChangingPassword] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [profileData, setProfileData] = useState({ name: '' })
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [unlinkError, setUnlinkError] = useState('')
  const [unlinkingProvider, setUnlinkingProvider] = useState(null)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [user, setUser] = useState(initialUser)

  useEffect(() => {
    if (initialUser) {
      setProfileData({ name: initialUser.name || '' })
    }
  }, [initialUser])

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        const res = await fetch('/api/public/authorizations', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setAuthorizations(data.authorizations || [])
        }
      } catch (err) {
        console.error('Failed to fetch authorizations:', err)
      } finally {
        setAuthsLoading(false)
      }
    })()
  }, [user])

  const resetDeleteModal = () => {
    setShowDeleteConfirm(false)
    setDeleteConfirmEmail('')
    setDeleteError('')
  }

  const handleProfileUpdate = async (event) => {
    event.preventDefault()
    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess(false)

    try {
      const res = await fetch('/api/public/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      })

      const data = await res.json()

      if (res.ok) {
        setUser({ ...user, name: profileData.name })
        setProfileSuccess(true)
        setTimeout(() => {
          setEditingProfile(false)
          setProfileSuccess(false)
        }, 2000)
      } else {
        setProfileError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      console.error('Profile update error:', err)
      setProfileError('An unexpected error occurred')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess(false)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      setPasswordLoading(false)
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      setPasswordLoading(false)
      return
    }

    try {
      const res = await fetch('/api/public/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPasswordSuccess(true)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => {
          setChangingPassword(false)
          setPasswordSuccess(false)
        }, 2000)
      } else {
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch (err) {
      console.error('Password change error:', err)
      setPasswordError('An unexpected error occurred')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleRevokeService = async (authId, clientName) => {
    if (!confirm(`Are you sure you want to revoke access for "${clientName}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/public/authorizations/${authId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        setAuthorizations(authorizations.filter((auth) => auth._id !== authId))
      } else {
        alert('Failed to revoke access')
      }
    } catch (err) {
      console.error('Revoke error:', err)
      alert('An unexpected error occurred')
    }
  }

  const handleUnlinkProvider = async (provider) => {
    const providerName = provider === 'password' ? 'Email+Password' : provider.charAt(0).toUpperCase() + provider.slice(1)
    const methodsCount = user.loginMethods?.length || 0

    if (methodsCount <= 1) {
      alert('Cannot unlink - you must have at least one login method')
      return
    }

    if (!confirm(`Unlink ${providerName}? You can re-link it later by logging in with ${providerName}.`)) {
      return
    }

    setUnlinkingProvider(provider)
    setUnlinkLoading(true)
    setUnlinkError('')

    try {
      const res = await fetch(`/api/public/account/unlink/${provider}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await res.json()

      if (res.ok) {
        window.location.reload()
      } else {
        setUnlinkError(data.details || data.error || 'Failed to unlink')
        setUnlinkingProvider(null)
      }
    } catch (err) {
      console.error('Unlink error:', err)
      setUnlinkError('Connection error')
      setUnlinkingProvider(null)
    } finally {
      setUnlinkLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail.toLowerCase().trim() !== user.email.toLowerCase()) {
      setDeleteError('Email does not match')
      return
    }

    setDeleteLoading(true)
    setDeleteError('')

    try {
      const res = await fetch('/api/public/account', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        window.location.href = '/?deleted=true'
      } else {
        const data = await res.json()
        setDeleteError(data.error || 'Failed to delete account')
      }
    } catch (err) {
      console.error('Delete account error:', err)
      setDeleteError('An unexpected error occurred')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>My Account - SSO Service</title>
        <meta name="description" content="Manage your SSO account" />
      </Head>

      <Container py="xl" size="md">
        <Stack gap="lg">
          <Paper p="lg">
            <PageHeader
              description="Manage your SSO profile, login methods, and connected services."
              secondaryActions={
                <Group gap="sm">
                  <Button component={Link} href="/logout" variant="default">
                    Logout
                  </Button>
                </Group>
              }
              title="My Account"
              primaryAction={
                <Button component={Link} href="/" size="compact-sm" variant="subtle">
                  Back to home
                </Button>
              }
            />
          </Paper>

        <Card>
          <Stack gap="md">
            <Text fw={600} size="lg">Login Methods</Text>
            <Text c="dimmed" size="sm">
              You can use any linked method to access your account.
            </Text>
            <Group align="stretch" gap="sm" wrap="wrap">
              {['password', 'facebook', 'google'].map((method) => {
                const linked = user.loginMethods?.includes(method)
                const disableUnlink = (user.loginMethods?.length || 0) <= 1

                return (
                  <Card key={method} padding="md" style={{ minWidth: 230, flex: '1 1 230px' }}>
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={2}>
                          <Text fw={600}>{loginMethodLabel(method)}</Text>
                          <Badge color={linked ? loginMethodColor(method) : 'gray'} variant={linked ? 'filled' : 'light'}>
                            {linked ? 'Linked' : 'Not linked'}
                          </Badge>
                        </Stack>
                        {linked ? (
                          <Button
                            color="red"
                            disabled={unlinkLoading || disableUnlink}
                            onClick={() => handleUnlinkProvider(method)}
                            size="compact-sm"
                            variant="light"
                          >
                            {unlinkingProvider === method ? 'Unlinking...' : 'Unlink'}
                          </Button>
                        ) : null}
                      </Group>
                    </Stack>
                  </Card>
                )
              })}
            </Group>

            {unlinkError ? (
              <Alert color="red" icon={<IconAlertCircle size={18} />}>
                {unlinkError}
              </Alert>
            ) : null}

            <Text c="dimmed" size="xs">
              Link multiple login methods to the same account by using the same email address when logging in.
            </Text>
          </Stack>
        </Card>

        <Card>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600} size="lg">Profile</Text>
                <Text c="dimmed" size="sm">Your basic account information.</Text>
              </div>
              {!editingProfile ? (
                <Button onClick={() => setEditingProfile(true)} variant="default">
                  Edit
                </Button>
              ) : null}
            </Group>

            {editingProfile ? (
              <Stack component="form" gap="md" onSubmit={handleProfileUpdate}>
                {profileError ? (
                  <Alert color="red" icon={<IconAlertCircle size={18} />}>
                    {profileError}
                  </Alert>
                ) : null}
                {profileSuccess ? (
                  <Alert color="green" icon={<IconCircleCheck size={18} />}>
                    Profile updated successfully.
                  </Alert>
                ) : null}

                <TextInput
                  label="Name"
                  onChange={(event) => setProfileData({ ...profileData, name: event.currentTarget.value })}
                  value={profileData.name}
                />
                <TextInput
                  disabled
                  label="Email"
                  value={user.email}
                />
                <Text c="dimmed" size="xs">Email cannot be changed.</Text>

                <Group>
                  <Button loading={profileLoading} type="submit">
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingProfile(false)
                      setProfileData({ name: user.name || '' })
                      setProfileError('')
                    }}
                    type="button"
                    variant="default"
                  >
                    Cancel
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Stack gap={4}>
                <Text><strong>Name:</strong> {user.name || 'Not set'}</Text>
                <Text><strong>Email:</strong> {user.email}</Text>
              </Stack>
            )}
          </Stack>
        </Card>

        <Card>
          <Stack gap="md">
            <Text fw={600} size="lg">Connected Services</Text>
            <Text c="dimmed" size="sm">Services that currently have access to your SSO account.</Text>

            {authsLoading ? (
              <Group justify="center" py="md">
                <Loader size="sm" />
              </Group>
            ) : authorizations.length === 0 ? (
              <Text c="dimmed" size="sm">No connected services yet.</Text>
            ) : (
              <Stack gap="sm">
                {authorizations.map((auth) => (
                  <Card key={auth._id} withBorder>
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2}>
                        <Text fw={600}>{auth.clientName || auth.clientId}</Text>
                        <Text c="dimmed" size="xs">
                          Granted: {new Date(auth.createdAt).toLocaleDateString()}
                        </Text>
                        {auth.scope ? (
                          <Text c="dimmed" size="xs">
                            Scopes: {auth.scope}
                          </Text>
                        ) : null}
                      </Stack>
                      <Button
                        color="red"
                        onClick={() => handleRevokeService(auth._id, auth.clientName || auth.clientId)}
                        variant="light"
                      >
                        Revoke
                      </Button>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>

        <Card>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600} size="lg">Security</Text>
                <Text c="dimmed" size="sm">Change your password.</Text>
              </div>
              {!changingPassword ? (
                <Button onClick={() => setChangingPassword(true)} variant="default">
                  Change Password
                </Button>
              ) : null}
            </Group>

            {changingPassword ? (
              <Stack component="form" gap="md" onSubmit={handlePasswordChange}>
                {passwordError ? (
                  <Alert color="red" icon={<IconAlertCircle size={18} />}>
                    {passwordError}
                  </Alert>
                ) : null}
                {passwordSuccess ? (
                  <Alert color="green" icon={<IconCircleCheck size={18} />}>
                    Password changed successfully.
                  </Alert>
                ) : null}

                <PasswordInput
                  label="Current Password"
                  onChange={(event) => setPasswordData({ ...passwordData, currentPassword: event.currentTarget.value })}
                  value={passwordData.currentPassword}
                />
                <PasswordInput
                  label="New Password"
                  onChange={(event) => setPasswordData({ ...passwordData, newPassword: event.currentTarget.value })}
                  value={passwordData.newPassword}
                />
                <PasswordInput
                  label="Confirm New Password"
                  onChange={(event) => setPasswordData({ ...passwordData, confirmPassword: event.currentTarget.value })}
                  value={passwordData.confirmPassword}
                />

                <Group>
                  <Button loading={passwordLoading} type="submit">
                    Change Password
                  </Button>
                  <Button
                    onClick={() => {
                      setChangingPassword(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      setPasswordError('')
                    }}
                    type="button"
                    variant="default"
                  >
                    Cancel
                  </Button>
                </Group>
              </Stack>
            ) : null}
          </Stack>
        </Card>

        <Card border="red" withBorder>
          <Stack gap="md">
            <Text c="red" fw={700} size="lg">Danger Zone</Text>
            <Text c="dimmed" size="sm">
              Permanently delete your account and all associated data.
            </Text>
            <Group>
              <Button color="red" onClick={() => setShowDeleteConfirm(true)}>
                Delete Account
              </Button>
            </Group>
          </Stack>
        </Card>

        <Modal
          onClose={resetDeleteModal}
          opened={showDeleteConfirm}
          title="Delete Account"
        >
          <Stack gap="md">
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              This action cannot be undone. It permanently deletes your account, active sessions, connected services, and account history.
            </Alert>

            {deleteError ? (
              <Alert color="red" icon={<IconAlertCircle size={18} />}>
                {deleteError}
              </Alert>
            ) : null}

            <Text size="sm">
              Type <strong>{user.email}</strong> to confirm.
            </Text>
            <TextInput
              onChange={(event) => {
                setDeleteConfirmEmail(event.currentTarget.value)
                setDeleteError('')
              }}
              placeholder="Enter your email"
              value={deleteConfirmEmail}
            />

            <Group justify="flex-end">
              <Button onClick={resetDeleteModal} variant="default">
                Cancel
              </Button>
              <Button
                color="red"
                disabled={deleteConfirmEmail.toLowerCase().trim() !== user.email.toLowerCase()}
                loading={deleteLoading}
                onClick={handleDeleteAccount}
              >
                Delete My Account
              </Button>
            </Group>
          </Stack>
        </Modal>
        </Stack>
      </Container>
    </>
  )
}
