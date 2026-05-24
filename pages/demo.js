import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Badge,
  Button,
  Card,
  Code,
  Group,
  List,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { IconCheck, IconLogout } from '@tabler/icons-react'
import AccountShell from '../components/AccountShell'
import { getPublicUserFromRequest } from '../lib/publicSessions.mjs'

export async function getServerSideProps({ req }) {
  try {
    const user = await getPublicUserFromRequest(req)

    if (!user) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      }
    }

    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      },
    }
  } catch (error) {
    console.error('[Demo] SSR authentication error:', error)
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }
}

function InfoCard({ children, label }) {
  return (
    <Card p="md">
      <Text c="dimmed" fw={700} size="xs" tt="uppercase">
        {label}
      </Text>
      {children}
    </Card>
  )
}

export default function DemoPage({ user }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)

    try {
      const res = await fetch('/api/public/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        console.error('[Demo] Logout failed')
      }
    } catch (err) {
      console.error('[Demo] Logout error:', err)
    } finally {
      router.push('/')
    }
  }

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A'
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    })
  }

  return (
    <>
      <Head>
        <title>Demo - SSO Service</title>
        <meta name="description" content="Protected demo page" />
      </Head>

      <AccountShell
        actions={
          <Button
            color="red"
            leftSection={<IconLogout size={16} />}
            loading={loggingOut}
            onClick={handleLogout}
            variant="light"
          >
            Logout
          </Button>
        }
        description="You are successfully authenticated through the public SSO flow."
        title={`Welcome, ${user.name}!`}
      >
        <Stack gap="lg">
          <Card p="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap">
                <Title order={2}>Your Account Information</Title>
                <Badge color={user.status === 'active' ? 'green' : 'gray'} variant="light">
                  {user.status}
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <InfoCard label="User ID">
                  <Code block>{user.id}</Code>
                </InfoCard>
                <InfoCard label="Email Address">
                  <Text>{user.email}</Text>
                </InfoCard>
                <InfoCard label="Full Name">
                  <Text>{user.name}</Text>
                </InfoCard>
                <InfoCard label="Role">
                  <Text tt="capitalize">{user.role || 'user'}</Text>
                </InfoCard>
                <InfoCard label="Account Created">
                  <Text>{formatDate(user.createdAt)}</Text>
                </InfoCard>
                <InfoCard label="Last Login">
                  <Text>{formatDate(user.lastLoginAt)}</Text>
                </InfoCard>
              </SimpleGrid>
            </Stack>
          </Card>

          <Card p="lg">
            <Stack gap="md">
              <Title order={2}>SSO Authentication Success</Title>
              <Text c="dimmed" size="sm">
                You have successfully registered and logged in using the SSO service. This confirms the
                public user authentication path is working correctly.
              </Text>
              <List
                spacing="xs"
                icon={
                  <ThemeIcon color="brand" radius="xl" size={18} variant="light">
                    <IconCheck size={12} stroke={2} />
                  </ThemeIcon>
                }
              >
                <List.Item>HttpOnly cookies protect the active session token.</List.Item>
                <List.Item>Bcrypt password hashing uses 12 salt rounds.</List.Item>
                <List.Item>Session tokens are hashed with SHA-256 at rest.</List.Item>
                <List.Item>Server-side authentication guards protect the route.</List.Item>
                <List.Item>Sessions use a 30-day lifetime with cleanup.</List.Item>
              </List>
              <Group>
                <Button component={Link} href="/">
                  Back to Home
                </Button>
                <Button color="red" onClick={handleLogout} variant="subtle">
                  Logout
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </AccountShell>
    </>
  )
}
