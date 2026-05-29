import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Loader,
  NativeSelect,
  Paper,
  Stack,
  Text,
} from '@mantine/core'
import { IconAlertCircle, IconLogout } from '@tabler/icons-react'
import { DataToolbar, StateBlock } from '@doneisbetter/gds-core/server'
import { PageHeader } from '@doneisbetter/gds-admin/server'

export async function getServerSideProps(context) {
  const { getAdminUser } = await import('../../lib/auth.mjs')

  const admin = await getAdminUser(context.req)

  if (!admin) {
    return {
      redirect: {
        destination: '/admin?redirect=/admin/activity',
        permanent: false,
      },
    }
  }

  return {
    props: {
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    },
  }
}

const eventLabels = {
  access_attempt: 'Access Attempt',
  access_granted: 'Access Granted',
  access_revoked: 'Access Revoked',
  role_changed: 'Role Changed',
  login_success: 'Login Success',
  login_failed: 'Login Failed',
}

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/oauth-clients', label: 'Clients' },
]

function eventColor(eventType, accessGranted) {
  switch (eventType) {
    case 'access_granted':
      return 'green'
    case 'access_revoked':
      return 'red'
    case 'role_changed':
      return 'blue'
    case 'access_attempt':
      return accessGranted ? 'green' : 'yellow'
    case 'login_failed':
      return 'red'
    default:
      return 'gray'
  }
}

export default function ActivityDashboard({ admin }) {
  const [expandedLog, setExpandedLog] = useState(null)
  const [eventType, setEventType] = useState('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ total: 0, hasMore: false })
  const [skip, setSkip] = useState(0)
  const [timeRange, setTimeRange] = useState('7d')

  async function handleLogout() {
    try {
      await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' })
      window.location.href = '/admin'
    } catch (logoutError) {
      console.error('Logout error:', logoutError)
      setError('Logout failed. Please try again.')
    }
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        timeRange,
        eventType,
        limit: '50',
        skip: skip.toString(),
      })

      const res = await fetch(`/api/admin/activity?${params}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to load activity logs')
      }

      const data = await res.json()
      setLogs(data.logs || [])
      setPagination(data.pagination || { total: 0, hasMore: false })
    } catch (err) {
      console.error('Activity fetch error:', err)
      setError(err.message || 'Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }, [eventType, skip, timeRange])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Head>
        <title>Activity Dashboard - SSO Admin</title>
      </Head>

      <Container py="xl" size="xl">
        <Stack gap="lg">
          <Paper p="lg">
            <Stack gap="md">
              <PageHeader
                description="Cross-app user access attempts, permission changes, and login events."
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
                title="Activity Dashboard"
              />
              <Group gap="sm" wrap="wrap">
                {adminNavItems.map((item) => (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    variant={item.href === '/admin/activity' ? 'filled' : 'default'}
                  >
                    {item.label}
                  </Button>
                ))}
              </Group>
            </Stack>
          </Paper>

          <Card>
          <Stack gap="md">
            <Group align="flex-start" justify="space-between">
              <Stack gap={4}>
                <Text fw={700} size="lg">
                  Activity Filters
                </Text>
                <Text c="dimmed" size="sm">
                  Filter audit activity by time range and event family.
                </Text>
              </Stack>
              <Badge variant="light">{pagination.total}</Badge>
            </Group>
            <DataToolbar />
            <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NativeSelect
                data={[
                  { label: 'Last 24 hours', value: '24h' },
                  { label: 'Last 7 days', value: '7d' },
                  { label: 'Last 30 days', value: '30d' },
                  { label: 'All time', value: 'all' },
                ]}
                label="Time Range"
                onChange={(event) => {
                  setTimeRange(event.currentTarget.value)
                  setSkip(0)
                }}
                value={timeRange}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NativeSelect
                data={[
                  { label: 'All Events', value: 'all' },
                  { label: 'Access Attempts', value: 'access_attempts' },
                  { label: 'Permission Changes', value: 'permission_changes' },
                  { label: 'Login Events', value: 'login_events' },
                ]}
                label="Event Type"
                onChange={(event) => {
                  setEventType(event.currentTarget.value)
                  setSkip(0)
                }}
                value={eventType}
              />
            </Grid.Col>
            </Grid>
          </Stack>
          </Card>

          {error ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {error}
            </Alert>
          ) : null}

          {loading ? (
            <Card>
              <StateBlock
                description="Fetching cross-app access attempts and login events."
                variant="loading"
                title="Loading activity"
              />
            </Card>
          ) : logs.length === 0 ? (
            <Card>
              <StateBlock
                description="No activity logs match the selected filters yet."
                variant="empty"
                title="No activity logs found"
              />
            </Card>
          ) : (
            <Stack gap="md">
              {logs.map((log) => (
                <Card
                  key={log._id}
                  onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                  style={{ cursor: 'pointer' }}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={6}>
                        <Group gap="xs">
                          <Badge color={eventColor(log.eventType, log.accessGranted)}>
                            {eventLabels[log.eventType] || log.eventType}
                          </Badge>
                          {log.accessGranted === false ? (
                            <Badge color="red" variant="light">
                              Denied
                            </Badge>
                          ) : null}
                        </Group>
                        <Text size="sm">
                          <strong>{log.userName || log.userEmail}</strong> {'->'} <strong>{log.appName}</strong>
                        </Text>
                        {log.eventType === 'role_changed' ? (
                          <Text c="dimmed" size="sm">
                            Role: {log.previousRole} {'->'} {log.newRole}
                          </Text>
                        ) : null}
                        {log.message ? (
                          <Text c="dimmed" size="sm">
                            {log.message}
                          </Text>
                        ) : null}
                      </Stack>
                      <Text c="dimmed" size="xs">
                        {formatTimestamp(log.timestamp)}
                      </Text>
                    </Group>

                    {expandedLog === log._id ? (
                      <Grid>
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                          <Text fw={600} size="sm">User ID</Text>
                          <Text ff="monospace" size="sm">{log.userId}</Text>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                          <Text fw={600} size="sm">User Email</Text>
                          <Text size="sm">{log.userEmail}</Text>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                          <Text fw={600} size="sm">Client ID</Text>
                          <Text ff="monospace" size="sm">{log.clientId}</Text>
                        </Grid.Col>
                        {log.currentRole ? (
                          <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Text fw={600} size="sm">Role</Text>
                            <Text size="sm">{log.currentRole}</Text>
                          </Grid.Col>
                        ) : null}
                        {log.changedBy ? (
                          <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Text fw={600} size="sm">Changed By</Text>
                            <Text size="sm">{log.changedBy}</Text>
                          </Grid.Col>
                        ) : null}
                        {log.ip ? (
                          <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Text fw={600} size="sm">IP Address</Text>
                            <Text ff="monospace" size="sm">{log.ip}</Text>
                          </Grid.Col>
                        ) : null}
                      </Grid>
                    ) : null}
                  </Stack>
                </Card>
              ))}

              {pagination.hasMore ? (
                <Group justify="center">
                  <Button onClick={() => setSkip(skip + 50)} variant="default">
                    Load More
                  </Button>
                </Group>
              ) : null}
            </Stack>
          )}
        </Stack>
      </Container>
    </>
  )
}
