import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Badge,
  Button,
  Card,
  Code,
  Container,
  Group,
  List,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  IconApps,
  IconArrowRight,
  IconBook,
  IconBuilding,
  IconKey,
  IconLock,
  IconLogin2,
  IconShieldCheck,
  IconUser,
  IconUserPlus,
  IconWorld,
} from '@tabler/icons-react'

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
                    <Button component={Link} href="/account" leftSection={<IconUser size={16} />}>
                      My Account
                    </Button>
                    {hasAdminAccess ? (
                      <Button color="yellow" component={Link} href="/admin" leftSection={<IconApps size={16} />} variant="filled">
                        SSO Admin
                      </Button>
                    ) : null}
                    <Button component={Link} href="/logout" leftSection={<IconLogin2 size={16} />} variant="default">
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
                    <Button component={Link} href="/login" leftSection={<IconLogin2 size={16} />}>
                      Sign In
                    </Button>
                    <Button component={Link} href="/register" leftSection={<IconUserPlus size={16} />} variant="default">
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
                <Button component={Link} href="/docs/integration" leftSection={<IconApps size={16} />}>
                  Integration Guide
                </Button>
                <Button component={Link} href="/docs/api" leftSection={<IconBook size={16} />} variant="default">
                  API Documentation
                </Button>
                <Button component={Link} href="/docs/quickstart" leftSection={<IconArrowRight size={16} />} variant="default">
                  Quick Start
                </Button>
              </Group>
              <Code block>{`const sso = new SSOClient('https://sso.doneisbetter.com')
const session = await sso.validateSession()`}</Code>
            </Stack>
          </Card>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Card>
            <Stack gap="md">
              <Group>
                <ThemeIcon radius="xl" size="lg" variant="light">
                  <IconShieldCheck size={18} />
                </ThemeIcon>
                <Title order={2}>What the Service Does</Title>
              </Group>
              <Text c="dimmed">
                DoneIsBetter SSO gives your products one trusted identity layer for sign-in, session management, access control,
                and OAuth-based application access.
              </Text>
              <List
                icon={(
                  <ThemeIcon color="blue" radius="xl" size={20} variant="light">
                    <IconLock size={12} />
                  </ThemeIcon>
                )}
                spacing="sm"
                size="sm"
              >
                <List.Item>Centralized authentication for public users and internal operators</List.Item>
                <List.Item>OAuth and OIDC flows for connected applications and internal tools</List.Item>
                <List.Item>Account recovery, approval workflows, and audited admin operations</List.Item>
                <List.Item>Reusable session controls across multiple products and environments</List.Item>
              </List>
            </Stack>
          </Card>

          <Card>
            <Stack gap="md">
              <Group>
                <ThemeIcon radius="xl" size="lg" variant="light">
                  <IconBuilding size={18} />
                </ThemeIcon>
                <Title order={2}>Connected Applications</Title>
              </Group>
              <Text c="dimmed">
                Current integrations in this service include internal and partner-facing applications that rely on the same
                identity, session, and authorization backbone.
              </Text>
              <Group gap="sm">
                <Badge leftSection={<IconWorld size={12} />} size="lg" variant="light">LaunchMass</Badge>
                <Badge leftSection={<IconWorld size={12} />} size="lg" variant="light">Amanoba</Badge>
                <Badge leftSection={<IconWorld size={12} />} size="lg" variant="light">Camera</Badge>
                <Badge leftSection={<IconApps size={12} />} size="lg" variant="light">SSO Admin Dashboard</Badge>
              </Group>
              <Text c="dimmed" size="sm">
                Customer or company logos should only be added when there is explicit approval to present them publicly.
              </Text>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
