import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Button,
  Card,
  Code,
  Container,
  Group,
  List,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconApps, IconLock, IconUser } from '@tabler/icons-react'

export default function Home() {
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [publicUser, setPublicUser] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const publicRes = await fetch('/api/public/session', { credentials: 'include' })
        if (!publicRes.ok) return

        const data = await publicRes.json()
        if (!data?.isValid) return

        setPublicUser(data.user)

        try {
          const adminRes = await fetch('/api/admin/check-access', { credentials: 'include' })
          if (adminRes.ok) {
            setHasAdminAccess(true)
          }
        } catch {}
      } catch {}
    })()
  }, [])

  return (
    <Container py="xl" size="lg">
      <Stack gap="xl">
        <Stack align="center" gap="sm" py="xl">
          <Title order={1} ta="center">
            DoneIsBetter SSO
          </Title>
          <Text c="dimmed" maw={640} size="lg" ta="center">
            Secure single sign-on for public users, admin operators, and third-party OAuth clients.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Card>
            <Stack gap="md">
              <Group>
                <IconUser size={22} />
                <Title order={2}>User Access</Title>
              </Group>

              {publicUser ? (
                <>
                  <Text>
                    Welcome, <strong>{publicUser.email}</strong>.
                  </Text>
                  <Text c="dimmed" size="sm">
                    Your session is active and available for account management.
                  </Text>
                  <Group>
                    <Button component={Link} href="/account">
                      My Account
                    </Button>
                    {hasAdminAccess ? (
                      <Button color="yellow" component={Link} href="/admin" variant="filled">
                        SSO Admin
                      </Button>
                    ) : null}
                    <Button component={Link} href="/logout" variant="default">
                      Logout
                    </Button>
                  </Group>
                </>
              ) : (
                <>
                  <Text>
                    Sign in with password, magic link, social login, and PIN verification.
                  </Text>
                  <List size="sm">
                    <List.Item>Email + Password</List.Item>
                    <List.Item>Magic Link</List.Item>
                    <List.Item>Facebook Login</List.Item>
                    <List.Item>PIN Verification</List.Item>
                  </List>
                  <Group>
                    <Button component={Link} href="/login">
                      Sign In
                    </Button>
                    <Button component={Link} href="/register" variant="default">
                      Create Account
                    </Button>
                  </Group>
                </>
              )}
            </Stack>
          </Card>

          <Card>
            <Stack gap="md">
              <Group>
                <IconApps size={22} />
                <Title order={2}>API Integration</Title>
              </Group>
              <Text>
                Integrate centralized authentication into your application with the documented OAuth and session APIs.
              </Text>
              <Group>
                <Button component={Link} href="/docs/integration">
                  Integration Guide
                </Button>
                <Button component={Link} href="/docs/api" variant="default">
                  API Documentation
                </Button>
                <Button component={Link} href="/docs/quickstart" variant="default">
                  Quick Start
                </Button>
              </Group>
              <Code block>{`const sso = new SSOClient('https://sso.doneisbetter.com')
const session = await sso.validateSession()`}</Code>
            </Stack>
          </Card>
        </SimpleGrid>

        <Card>
          <Group mb="sm">
            <IconLock size={22} />
            <Title order={2}>Operational Model</Title>
          </Group>
          <Text c="dimmed">
            This repo now uses Mantine as the live product UI foundation, while the shared design, UI, and UX contracts live in
            {' '}
            <Code>/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM</Code>.
          </Text>
        </Card>
      </Stack>
    </Container>
  )
}
