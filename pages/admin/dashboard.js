import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Container,
  Grid,
  Loader,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core'
import {
  IconActivityHeartbeat,
  IconAlertCircle,
  IconApps,
  IconChecklist,
  IconLogout,
  IconUsers,
} from '@tabler/icons-react'
import { fetchAdminJson, isAuthRedirectError } from '../../lib/adminAuthFlow.js'
import { PageHeader as GdsPageHeader } from '@doneisbetter/gds-admin/server'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/oauth-clients', label: 'Clients' },
]

function StatCard({ description, href, icon: Icon, title, value }) {
  return (
    <Card component={Link} href={href} shadow="sm" style={{ textDecoration: 'none' }}>
      <Stack gap="sm">
        <ThemeIcon color="brand" radius="xl" size={42} variant="light">
          <Icon size={22} />
        </ThemeIcon>
        <div>
          <Text c="dimmed" size="sm">
            {title}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
        </div>
        {description ? (
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        ) : null}
      </Stack>
    </Card>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
  })

  const loadStats = useCallback(async () => {
    const [usersData, clientsData] = await Promise.all([
      fetchAdminJson('/api/admin/public-users'),
      fetchAdminJson('/api/admin/oauth-clients'),
    ])

    setStats({
      totalUsers: usersData.users?.length || 0,
      totalClients: clientsData.clients?.length || 0,
    })
  }, [])

  const initializePage = useCallback(async () => {
    try {
      const data = await fetchAdminJson('/api/admin/session')
      if (data?.isValid) {
        setAdmin(data.user)
        await loadStats()
      }
    } catch (e) {
      if (!isAuthRedirectError(e)) {
        console.error('Session check error:', e)
        setError('Failed to load the admin dashboard.')
      }
    } finally {
      setLoading(false)
    }
  }, [loadStats])

  useEffect(() => {
    initializePage()
  }, [initializePage])

  async function handleLogout() {
    try {
      await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' })
      window.location.href = '/admin'
    } catch (e) {
      console.error('Logout error:', e)
      setError('Logout failed. Please try again.')
    }
  }

  if (loading) {
    return (
      <Container py="xl" size="xl">
        <Stack gap="lg">
          <Paper p="lg">
            <Stack gap="md">
              <GdsPageHeader
                description="Loading the current admin session."
                title="Admin Dashboard"
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
          <Stack align="center" py="xl">
            <Loader />
          </Stack>
        </Stack>
      </Container>
    )
  }

  if (!admin) {
    return (
      <Container py="xl" size="xl">
        <Stack gap="lg">
          <Paper p="lg">
            <Stack gap="md">
              <GdsPageHeader
                description="Admin session is not available."
                title="Admin Dashboard"
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
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {error || 'Admin session is not available.'}
          </Alert>
        </Stack>
      </Container>
    )
  }

  return (
    <Container py="xl" size="xl">
      <Stack gap="lg">
        <Paper p="lg">
          <Stack gap="md">
            <GdsPageHeader
              description="Operational overview for public users, OAuth clients, and system access."
              primaryAction={
                <ActionIcon
                  aria-label="Logout"
                  color="gray"
                  onClick={handleLogout}
                  variant="default"
                >
                  <IconLogout size={18} />
                </ActionIcon>
              }
              secondaryActions={(
                <Group gap="sm" justify="flex-end" wrap="wrap">
                  <Text c="dimmed" size="sm">
                    {admin.email} ({admin.role})
                  </Text>
                </Group>
              )}
              title="Admin Dashboard"
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

        {error ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {error}
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <StatCard
            description="Registered public accounts managed by this SSO instance."
            href="/admin/users"
            icon={IconUsers}
            title="Total Users"
            value={stats.totalUsers}
          />
          <StatCard
            description="OAuth applications currently configured for the platform."
            href="/admin/oauth-clients"
            icon={IconApps}
            title="OAuth Clients"
            value={stats.totalClients}
          />
          <StatCard
            description="Centralized access and permission activity across the system."
            href="/admin/activity"
            icon={IconActivityHeartbeat}
            title="System Status"
            value="Operational"
          />
        </SimpleGrid>

        <Card>
          <Stack gap="md">
            <Text fw={600} size="lg">
              Quick Actions
            </Text>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Button component={Link} fullWidth href="/admin/users" leftSection={<IconUsers size={18} />}>
                  Manage Users
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Button component={Link} fullWidth href="/admin/oauth-clients" leftSection={<IconApps size={18} />} variant="default">
                  Manage OAuth Clients
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Button component={Link} fullWidth href="/admin/activity" leftSection={<IconChecklist size={18} />} variant="default">
                  View Activity
                </Button>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Button component={Link} fullWidth href="/docs" leftSection={<IconChecklist size={18} />} variant="default">
                  Open Documentation
                </Button>
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>

        <Alert color="blue" icon={<IconChecklist size={18} />}>
          Welcome back, <strong>{admin.name || admin.email}</strong>. Your current runtime role is <strong>{admin.role}</strong>.
        </Alert>
      </Stack>
    </Container>
  )
}
