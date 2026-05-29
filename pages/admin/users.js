import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Modal,
  NativeSelect,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconAlertCircle, IconCircleCheck, IconLogout } from '@tabler/icons-react'
import { DataToolbar, StateBlock } from '@doneisbetter/gds-core/server'
import { ResponsiveDataView } from '@doneisbetter/gds-admin/client'
import { PageHeader } from '@doneisbetter/gds-admin/server'
import { fetchAdminJson, isAuthRedirectError } from '../../lib/adminAuthFlow.js'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/oauth-clients', label: 'Clients' },
]

function loginMethodColor(method) {
  if (method === 'facebook') return 'blue'
  if (method === 'google') return 'red'
  return 'brand'
}

function loginMethodLabel(method) {
  if (method === 'password') return 'Email+Password'
  return method.charAt(0).toUpperCase() + method.slice(1)
}

function openUserDetails(user, setSelectedUser, setShowDetails) {
  setSelectedUser(user)
  setShowDetails(true)
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const [appPermissions, setAppPermissions] = useState([])
  const [appPermissionsLoading, setAppPermissionsLoading] = useState(false)
  const [appPermissionsError, setAppPermissionsError] = useState('')
  const [appActionLoading, setAppActionLoading] = useState({})
  const [selectedRoles, setSelectedRoles] = useState({})
  const [permissionSuccess, setPermissionSuccess] = useState('')

  const [linkingProvider, setLinkingProvider] = useState(null)
  const [linkFormData, setLinkFormData] = useState({ providerId: '', email: '', name: '', picture: '' })
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')
  const [unlinkLoading, setUnlinkLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        filter,
        sortBy,
        sortOrder,
      })

      const data = await fetchAdminJson(`/api/admin/public-users?${params}`)
      setUsers(data.users || [])
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        console.error('Failed to fetch users:', err)
        setMessage({ type: 'error', text: err.message || 'An unexpected error occurred' })
      }
    } finally {
      setLoading(false)
    }
  }, [filter, sortBy, sortOrder])

  const checkSession = useCallback(async () => {
    try {
      const data = await fetchAdminJson('/api/admin/session')
      if (data?.isValid) {
        setAdmin(data.user)
      }
    } catch (e) {
      if (!isAuthRedirectError(e)) {
        console.error('Session check error:', e)
      }
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  useEffect(() => {
    if (admin) {
      fetchUsers()
    }
  }, [admin, fetchUsers])

  useEffect(() => {
    if (showDetails && selectedUser?.id) {
      fetchAppPermissions(selectedUser.id)
    } else if (!showDetails) {
      setAppPermissions([])
      setAppPermissionsError('')
      setAppPermissionsLoading(false)
      setAppActionLoading({})
      setSelectedRoles({})
      setPermissionSuccess('')
      setLinkingProvider(null)
      setLinkFormData({ providerId: '', email: '', name: '', picture: '' })
      setLinkError('')
      setLinkSuccess('')
    }
  }, [showDetails, selectedUser?.id])

  const filteredUsers = users.filter((user) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.id?.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const fetchAppPermissions = async (userId) => {
    setAppPermissionsLoading(true)
    setAppPermissionsError('')
    setPermissionSuccess('')

    try {
      const data = await fetchAdminJson(`/api/admin/app-permissions/${userId}`)
      setAppPermissions(data.apps || [])

      const roles = {}
      for (const app of data.apps || []) {
        roles[app.clientId] = app.role === 'admin' || app.role === 'user' ? app.role : 'user'
      }
      setSelectedRoles(roles)
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        console.error('Failed to fetch app permissions:', err)
        setAppPermissionsError(err.message || 'Connection error. Please check your internet and try again.')
        setAppPermissions([])
      }
    } finally {
      setAppPermissionsLoading(false)
    }
  }

  const handleDisableUser = async (userId) => {
    if (!confirm('Disable this user account? They will not be able to log in.')) return
    setActionLoading(true)
    try {
      await fetchAdminJson(`/api/admin/public-users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disabled' }),
      })

      setMessage({ type: 'success', text: 'User disabled successfully' })
      fetchUsers()
      setShowDetails(false)
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage({ type: 'error', text: err.message || 'An unexpected error occurred' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnableUser = async (userId) => {
    setActionLoading(true)
    try {
      await fetchAdminJson(`/api/admin/public-users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      setMessage({ type: 'success', text: 'User enabled successfully' })
      fetchUsers()
      setShowDetails(false)
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage({ type: 'error', text: err.message || 'An unexpected error occurred' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`PERMANENTLY DELETE user ${userEmail}? This action cannot be undone and will remove all associated data.`)) return
    const confirmation = prompt(`Type "${userEmail}" to confirm deletion:`)
    if (confirmation !== userEmail) {
      alert('Confirmation failed. User not deleted.')
      return
    }

    setActionLoading(true)
    try {
      await fetchAdminJson(`/api/admin/public-users/${userId}`, {
        method: 'DELETE',
      })

      setMessage({ type: 'success', text: 'User deleted successfully' })
      fetchUsers()
      setShowDetails(false)
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage({ type: 'error', text: err.message || 'An unexpected error occurred' })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleGrantAccess = async (userId, clientId, role) => {
    setAppActionLoading((prev) => ({ ...prev, [clientId]: true }))
    setAppPermissionsError('')
    setPermissionSuccess('')

    try {
      await fetchAdminJson(`/api/admin/app-permissions/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, role, status: 'approved' }),
      })

      setPermissionSuccess(`Access granted as ${role}`)
      setTimeout(() => setPermissionSuccess(''), 3000)
      await fetchAppPermissions(userId)
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        console.error('Failed to grant access:', err)
        setAppPermissionsError(err.message || 'Connection error. Please try again.')
      }
    } finally {
      setAppActionLoading((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  const handleRevokeAccess = async (userId, clientId, appName) => {
    if (!confirm(`Revoke user's access to ${appName}? They will no longer be able to log in to this application.`)) {
      return
    }

    setAppActionLoading((prev) => ({ ...prev, [clientId]: true }))
    setAppPermissionsError('')
    setPermissionSuccess('')

    try {
      await fetchAdminJson(`/api/admin/app-permissions/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      setPermissionSuccess('Access revoked successfully')
      setTimeout(() => setPermissionSuccess(''), 3000)
      await fetchAppPermissions(userId)
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        console.error('Failed to revoke access:', err)
        setAppPermissionsError(err.message || 'Connection error. Please try again.')
      }
    } finally {
      setAppActionLoading((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  const handleChangeRole = async (userId, clientId, newRole) => {
    setAppActionLoading((prev) => ({ ...prev, [clientId]: true }))
    setAppPermissionsError('')
    setPermissionSuccess('')

    try {
      await fetchAdminJson(`/api/admin/app-permissions/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, role: newRole }),
      })

      setPermissionSuccess(`Role changed to ${newRole}`)
      setTimeout(() => setPermissionSuccess(''), 3000)
      await fetchAppPermissions(userId)
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        console.error('Failed to change role:', err)
        setAppPermissionsError(err.message || 'Connection error. Please try again.')
      }
    } finally {
      setAppActionLoading((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  const handleRoleSelectChange = (clientId, newRole) => {
    setSelectedRoles((prev) => ({ ...prev, [clientId]: newRole }))
  }

  const handleLinkProvider = async (userId, provider, formData) => {
    setLinkLoading(true)
    setLinkError('')
    setLinkSuccess('')

    try {
      await fetchAdminJson(`/api/admin/public-users/${userId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, providerData: formData }),
      })

      setLinkSuccess(`${provider} linked successfully`)
      setLinkingProvider(null)
      setLinkFormData({ providerId: '', email: '', name: '', picture: '' })
      fetchUsers()
      setTimeout(() => setLinkSuccess(''), 3000)
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setLinkError(err.message || 'Connection error')
      }
    } finally {
      setLinkLoading(false)
    }
  }

  const handleAdminUnlinkProvider = async (userId, provider) => {
    const providerName = provider === 'password' ? 'Email+Password' : provider.charAt(0).toUpperCase() + provider.slice(1)
    if (!confirm(`Unlink ${providerName} from this user's account?`)) return

    setUnlinkLoading(true)
    try {
      await fetchAdminJson(`/api/admin/public-users/${userId}/unlink/${provider}`, {
        method: 'DELETE',
      })

      fetchUsers()
      setMessage({ type: 'success', text: `${providerName} unlinked successfully` })
      if (selectedUser) {
        setSelectedUser((prev) => ({
          ...prev,
          loginMethods: prev.loginMethods.filter((method) => method !== provider),
        }))
      }
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage({ type: 'error', text: err.message || 'Connection error' })
      }
    } finally {
      setUnlinkLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' })
      window.location.href = '/admin'
    } catch (logoutError) {
      console.error('Logout error:', logoutError)
      setMessage({ type: 'error', text: 'Logout failed. Please try again.' })
    }
  }

  if (!admin) {
    return (
      <Container py="xl" size="xl">
        <Stack gap="lg">
          <Paper p="lg">
            <Stack gap="md">
              <PageHeader
                description="Loading the admin user list."
                title="User Management"
              />
              <Group gap="sm" wrap="wrap">
                {adminNavItems.map((item) => (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    variant={router.pathname === item.href ? 'filled' : 'default'}
                  >
                    {item.label}
                  </Button>
                ))}
              </Group>
            </Stack>
          </Paper>
          <Card>
            <StateBlock
              description="Loading the current admin user list."
              variant="loading"
              title="Loading users"
            />
          </Card>
        </Stack>
      </Container>
    )
  }

  return (
    <>
      <Head>
        <title>User Management - SSO Admin</title>
      </Head>

      <Container py="xl" size="xl">
        <Stack gap="lg">
          <Paper p="lg">
            <Stack gap="md">
              <PageHeader
                description="Manage public users, linked login methods, and per-application access."
                primaryAction={(
                  <ActionIcon
                    aria-label="Logout"
                    color="gray"
                    onClick={handleLogout}
                    variant="default"
                  >
                    <IconLogout size={18} />
                  </ActionIcon>
                )}
                secondaryActions={(
                  <Group gap="sm" justify="flex-end" wrap="wrap">
                    <Text c="dimmed" size="sm">
                      {admin.email} ({admin.role})
                    </Text>
                  </Group>
                )}
                title="User Management"
              />
              <Group gap="sm" wrap="wrap">
                {adminNavItems.map((item) => (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    variant={router.pathname === item.href ? 'filled' : 'default'}
                  >
                    {item.label}
                  </Button>
                ))}
              </Group>
            </Stack>
          </Paper>

        {message ? (
          <Alert
            color={message.type === 'error' ? 'red' : 'green'}
            icon={message.type === 'error' ? <IconAlertCircle size={18} /> : <IconCircleCheck size={18} />}
          >
            {message.text}
          </Alert>
        ) : null}

        <Card>
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={2}>Directory Controls</Title>
              <Text c="dimmed" size="sm">
                Search, filter, and sort the public user directory.
              </Text>
            </Stack>
            <DataToolbar />
            <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Search"
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Email, name, or ID..."
                value={search}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NativeSelect
                data={[
                  { label: 'All Users', value: 'all' },
                  { label: 'Active Only', value: 'active' },
                  { label: 'Disabled Only', value: 'disabled' },
                ]}
                label="Status Filter"
                onChange={(event) => setFilter(event.currentTarget.value)}
                value={filter}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NativeSelect
                data={[
                  { label: 'Registration Date', value: 'createdAt' },
                  { label: 'Email', value: 'email' },
                  { label: 'Last Login', value: 'lastLoginAt' },
                ]}
                label="Sort By"
                onChange={(event) => setSortBy(event.currentTarget.value)}
                value={sortBy}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NativeSelect
                data={[
                  { label: 'Newest First', value: 'desc' },
                  { label: 'Oldest First', value: 'asc' },
                ]}
                label="Sort Order"
                onChange={(event) => setSortOrder(event.currentTarget.value)}
                value={sortOrder}
              />
            </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        <Card>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>Users</Title>
              <Badge variant="light">{filteredUsers.length}</Badge>
            </Group>

            <ResponsiveDataView
              columns={[
                { key: 'email', label: 'Email' },
                {
                  key: 'name',
                  label: 'Name',
                  render: (user) => user.name || '-',
                },
                {
                  key: 'loginMethods',
                  label: 'Login Methods',
                  render: (user) => (
                    <Group gap={4}>
                      {user.loginMethods?.length ? user.loginMethods.map((method) => (
                        <Badge key={method} color={loginMethodColor(method)}>
                          {loginMethodLabel(method)}
                        </Badge>
                      )) : (
                        <Text c="dimmed" size="sm">
                          -
                        </Text>
                      )}
                    </Group>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (user) => (
                    <Badge color={user.status === 'active' ? 'green' : 'red'} variant="light">
                      {user.status || 'active'}
                    </Badge>
                  ),
                },
                {
                  key: 'createdAt',
                  label: 'Registered',
                  render: (user) => formatDate(user.createdAt),
                },
                {
                  key: 'lastLoginAt',
                  label: 'Last Login',
                  render: (user) => formatDate(user.lastLoginAt),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (user) => (
                    <Button
                      onClick={() => openUserDetails(user, setSelectedUser, setShowDetails)}
                      size="compact-sm"
                      variant="default"
                    >
                      Manage
                    </Button>
                  ),
                },
              ]}
              data={filteredUsers}
              emptyDescription="No users match the current search and status filters."
              emptyTitle="No users found"
              getRowKey={(user) => user.id}
              loading={loading}
              renderCard={(user) => (
                <Paper key={user.id} p="md">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4}>
                        <Text fw={600}>{user.email}</Text>
                        <Text c="dimmed" size="sm">{user.name || 'No name set'}</Text>
                      </Stack>
                      <Badge color={user.status === 'active' ? 'green' : 'red'} variant="light">
                        {user.status || 'active'}
                      </Badge>
                    </Group>
                    <Group gap={4} wrap="wrap">
                      {user.loginMethods?.length ? user.loginMethods.map((method) => (
                        <Badge key={method} color={loginMethodColor(method)}>
                          {loginMethodLabel(method)}
                        </Badge>
                      )) : <Text c="dimmed" size="sm">No login methods</Text>}
                    </Group>
                    <Text c="dimmed" size="sm">Registered: {formatDate(user.createdAt)}</Text>
                    <Text c="dimmed" size="sm">Last login: {formatDate(user.lastLoginAt)}</Text>
                    <Button
                      onClick={() => openUserDetails(user, setSelectedUser, setShowDetails)}
                      variant="default"
                    >
                      Manage
                    </Button>
                  </Stack>
                </Paper>
              )}
            />
          </Stack>
        </Card>

        <Modal
          onClose={() => {
            setShowDetails(false)
            setSelectedUser(null)
          }}
          opened={showDetails && Boolean(selectedUser)}
          size="xl"
          title="User Details"
        >
          {selectedUser ? (
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Text size="sm"><strong>ID:</strong> {selectedUser.id}</Text>
                <Text size="sm"><strong>Email:</strong> {selectedUser.email}</Text>
                <Text size="sm"><strong>Name:</strong> {selectedUser.name || 'Not set'}</Text>
                <Text size="sm"><strong>Status:</strong> {selectedUser.status || 'active'}</Text>
                <Text size="sm"><strong>Email Verified:</strong> {selectedUser.emailVerified !== false ? 'Yes' : 'No'}</Text>
                <Text size="sm"><strong>Created:</strong> {formatDate(selectedUser.createdAt)}</Text>
                <Text size="sm"><strong>Last Login:</strong> {formatDate(selectedUser.lastLoginAt)}</Text>
                <Text size="sm"><strong>Login Count:</strong> {selectedUser.loginCount || 0}</Text>
              </SimpleGrid>

              <Divider label="Login Methods" labelPosition="left" />
              <Group gap="sm" wrap="wrap">
                {selectedUser.loginMethods?.length ? selectedUser.loginMethods.map((method) => {
                  const disableUnlink = (selectedUser.loginMethods?.length || 0) <= 1
                  return (
                    <Card key={method} padding="md" style={{ minWidth: 220 }}>
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={4}>
                          <Text fw={600} size="sm">{loginMethodLabel(method)}</Text>
                          <Badge color={loginMethodColor(method)}>Linked</Badge>
                        </Stack>
                        <Button
                          color="red"
                          disabled={unlinkLoading || disableUnlink}
                          onClick={() => handleAdminUnlinkProvider(selectedUser.id, method)}
                          size="compact-sm"
                          variant="light"
                        >
                          Unlink
                        </Button>
                      </Group>
                    </Card>
                  )
                }) : <Text c="dimmed" size="sm">No login methods available.</Text>}
              </Group>

              <Divider label="Application Access" labelPosition="left" />
              <Alert color="blue">
                You are acting as an SSO administrator. Assigned roles here apply within the selected application, not within the SSO system itself.
              </Alert>

              {permissionSuccess ? (
                <Alert color="green" icon={<IconCircleCheck size={18} />}>
                  {permissionSuccess}
                </Alert>
              ) : null}

              {appPermissionsError ? (
                <Alert color="red" icon={<IconAlertCircle size={18} />}>
                  <Group justify="space-between">
                    <span>{appPermissionsError}</span>
                    <Button onClick={() => fetchAppPermissions(selectedUser.id)} size="compact-sm" variant="default">
                      Retry
                    </Button>
                  </Group>
                </Alert>
              ) : null}

              {appPermissionsLoading ? (
                <StateBlock
                  description="Loading the selected user's application permissions."
                  variant="loading"
                  title="Loading application access"
                />
              ) : appPermissions.length === 0 ? (
                <StateBlock
                  description="This user has no integrated applications available for permission management."
                  variant="empty"
                  title="No applications available"
                />
              ) : (
                <SimpleGrid cols={{ base: 1, md: 2 }}>
                  {appPermissions.map((app) => {
                    const isLoading = appActionLoading[app.clientId]
                    const isApproved = app.status === 'approved'
                    const isPending = app.status === 'pending'
                    const currentRole = selectedRoles[app.clientId] || 'user'

                    return (
                      <Paper key={app.clientId} p="md">
                        <Stack gap="sm">
                          <div>
                            <Text fw={600}>{app.name}</Text>
                            {app.description ? (
                              <Text c="dimmed" size="sm">{app.description}</Text>
                            ) : null}
                          </div>
                          <Group gap="xs">
                            <Badge color={isApproved ? 'green' : isPending ? 'yellow' : 'gray'} variant="light">
                              {app.status}
                            </Badge>
                            <Badge variant="outline">Role: {app.role}</Badge>
                          </Group>
                          <NativeSelect
                            data={[
                              { label: 'User', value: 'user' },
                              { label: 'Admin', value: 'admin' },
                            ]}
                            onChange={(event) => handleRoleSelectChange(app.clientId, event.currentTarget.value)}
                            value={isApproved ? app.role : currentRole}
                          />

                          {!isApproved ? (
                            <Button
                              disabled={isLoading || appPermissionsLoading}
                              onClick={() => handleGrantAccess(selectedUser.id, app.clientId, currentRole)}
                              loading={isLoading}
                            >
                              {isPending ? 'Approve' : 'Grant Access'}
                            </Button>
                          ) : (
                            <Group grow>
                              <Button
                                disabled={isLoading || appPermissionsLoading}
                                onClick={() => handleChangeRole(selectedUser.id, app.clientId, selectedRoles[app.clientId] || app.role)}
                                loading={isLoading}
                                variant="default"
                              >
                                Update Role
                              </Button>
                              <Button
                                color="red"
                                disabled={isLoading || appPermissionsLoading}
                                onClick={() => handleRevokeAccess(selectedUser.id, app.clientId, app.name)}
                                loading={isLoading}
                              >
                                Revoke
                              </Button>
                            </Group>
                          )}
                        </Stack>
                      </Paper>
                    )
                  })}
                </SimpleGrid>
              )}

              <Divider label="Link Social Provider" labelPosition="left" />
              {!linkingProvider ? (
                <Group>
                  {!selectedUser.loginMethods?.includes('facebook') ? (
                    <Button color="blue" onClick={() => {
                      setLinkingProvider('facebook')
                      setLinkFormData({ providerId: '', email: '', name: '', picture: '' })
                      setLinkError('')
                      setLinkSuccess('')
                    }} variant="light">
                      Link Facebook
                    </Button>
                  ) : null}
                  {!selectedUser.loginMethods?.includes('google') ? (
                    <Button color="red" onClick={() => {
                      setLinkingProvider('google')
                      setLinkFormData({ providerId: '', email: '', name: '', picture: '' })
                      setLinkError('')
                      setLinkSuccess('')
                    }} variant="light">
                      Link Google
                    </Button>
                  ) : null}
                  {selectedUser.loginMethods?.includes('facebook') && selectedUser.loginMethods?.includes('google') ? (
                    <Text c="dimmed" size="sm">All social providers are already linked.</Text>
                  ) : null}
                </Group>
              ) : (
                <Paper p="md">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={600}>Link {linkingProvider === 'facebook' ? 'Facebook' : 'Google'} Account</Text>
                      <Button onClick={() => {
                        setLinkingProvider(null)
                        setLinkFormData({ providerId: '', email: '', name: '', picture: '' })
                        setLinkError('')
                        setLinkSuccess('')
                      }} size="compact-sm" variant="default">
                        Cancel
                      </Button>
                    </Group>
                    <TextInput
                      label={`${linkingProvider === 'facebook' ? 'Facebook' : 'Google'} ID`}
                      onChange={(event) => setLinkFormData({ ...linkFormData, providerId: event.currentTarget.value })}
                      value={linkFormData.providerId}
                    />
                    <TextInput
                      label="Email"
                      onChange={(event) => setLinkFormData({ ...linkFormData, email: event.currentTarget.value })}
                      value={linkFormData.email}
                    />
                    <TextInput
                      label="Name"
                      onChange={(event) => setLinkFormData({ ...linkFormData, name: event.currentTarget.value })}
                      value={linkFormData.name}
                    />
                    <TextInput
                      label="Picture URL"
                      onChange={(event) => setLinkFormData({ ...linkFormData, picture: event.currentTarget.value })}
                      value={linkFormData.picture}
                    />
                    <Button
                      disabled={linkLoading || !linkFormData.providerId || !linkFormData.email || !linkFormData.name}
                      onClick={() => handleLinkProvider(selectedUser.id, linkingProvider, linkFormData)}
                      loading={linkLoading}
                    >
                      Link {linkingProvider === 'facebook' ? 'Facebook' : 'Google'} Account
                    </Button>
                    {linkSuccess ? (
                      <Alert color="green" icon={<IconCircleCheck size={18} />}>
                        {linkSuccess}
                      </Alert>
                    ) : null}
                    {linkError ? (
                      <Alert color="red" icon={<IconAlertCircle size={18} />}>
                        {linkError}
                      </Alert>
                    ) : null}
                  </Stack>
                </Paper>
              )}

              <Divider label="Account Actions" labelPosition="left" />
              <Group>
                {selectedUser.status !== 'disabled' ? (
                  <Button color="yellow" loading={actionLoading} onClick={() => handleDisableUser(selectedUser.id)} variant="light">
                    Disable Account
                  </Button>
                ) : (
                  <Button color="green" loading={actionLoading} onClick={() => handleEnableUser(selectedUser.id)} variant="light">
                    Enable Account
                  </Button>
                )}
                <Button color="red" loading={actionLoading} onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}>
                  Delete User Permanently
                </Button>
              </Group>
            </Stack>
          ) : null}
        </Modal>
        </Stack>
      </Container>
    </>
  )
}
