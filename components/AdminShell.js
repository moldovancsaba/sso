import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ActionIcon,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconLogout } from '@tabler/icons-react'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/oauth-clients', label: 'Clients' },
]

export default function AdminShell({
  actions = null,
  admin = null,
  children,
  description,
  title,
  onLogout,
}) {
  const router = useRouter()

  return (
    <Container py="xl" size="xl">
      <Stack gap="lg">
        <Paper p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Title order={1}>{title}</Title>
                {description ? (
                  <Text c="dimmed" size="sm">
                    {description}
                  </Text>
                ) : null}
              </Stack>

              <Group gap="sm" wrap="wrap" justify="flex-end">
                {admin ? (
                  <Text c="dimmed" size="sm">
                    {admin.email} ({admin.role})
                  </Text>
                ) : null}
                {actions}
                {onLogout ? (
                  <ActionIcon
                    aria-label="Logout"
                    color="gray"
                    onClick={onLogout}
                    variant="default"
                  >
                    <IconLogout size={18} />
                  </ActionIcon>
                ) : null}
              </Group>
            </Group>

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

        {children}
      </Stack>
    </Container>
  )
}
