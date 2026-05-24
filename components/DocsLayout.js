import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  TextInput,
  Stack,
  Text,
  Container,
  Divider,
  Anchor,
  Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';

export default function DocsLayout({ children }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();

  const navigation = [
    { 
      title: 'Getting Started',
      links: [
        { href: '/docs', label: 'Introduction' },
        { href: '/docs/quickstart', label: 'Quick Start' },
        { href: '/docs/installation', label: 'Installation' },
      ]
    },
    {
      title: 'Integration Guide',
      links: [
        { href: '/docs/authentication', label: 'Authentication' },
        { href: '/docs/session-management', label: 'Session Management' },
        { href: '/docs/error-handling', label: 'Error Handling' },
      ]
    },
    {
      title: 'API Reference',
      links: [
        { href: '/docs/api/endpoints', label: 'Endpoints' },
        { href: '/docs/api/responses', label: 'Response Format' },
        { href: '/docs/api/errors', label: 'Error Codes' },
      ]
    },
    {
      title: 'Examples',
      links: [
        { href: '/docs/examples/react', label: 'React' },
        { href: '/docs/examples/vue', label: 'Vue.js' },
        { href: '/docs/examples/vanilla', label: 'Vanilla JS' },
      ]
    },
    {
      title: 'Security',
      links: [
        { href: '/docs/security/best-practices', label: 'Best Practices' },
        { href: '/docs/security/cors', label: 'CORS Configuration' },
        { href: '/docs/security/permissions', label: 'Permissions' },
      ]
    }
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <img src="/logo.svg" alt="DoneIsBetter SSO" style={{ height: 28 }} />
            </Link>
            <Select
              size="xs"
              w={90}
              data={['v1.0.0']}
              defaultValue="v1.0.0"
              styles={{ input: { border: 'none', background: 'transparent', fontWeight: 600 } }}
            />
          </Group>
          <Group gap="lg">
            <Anchor href="https://github.com/doneisbetter/sso" target="_blank" rel="noopener noreferrer" size="sm" c="dimmed">
              GitHub
            </Anchor>
            <Anchor href="mailto:support@doneisbetter.com" size="sm" c="dimmed">
              Support
            </Anchor>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section>
          <TextInput
            placeholder="Search documentation..."
            mb="md"
            leftSection={<IconSearch size={16} style={{ opacity: 0.6 }} />}
          />
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea} mx="-xs" px="xs">
          {navigation.map((section, i) => (
            <Stack key={i} gap={4} mb="lg">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="xs" mb={4}>
                {section.title}
              </Text>
              {section.links.map((link, j) => (
                <NavLink
                  key={j}
                  component={Link}
                  href={link.href}
                  label={link.label}
                  active={router.pathname === link.href}
                  variant="light"
                  styles={{
                    root: {
                      borderRadius: 'var(--mantine-radius-sm)',
                    }
                  }}
                />
              ))}
            </Stack>
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main bg="var(--mantine-color-body)">
        <Container size="md" py="xl">
          <Stack gap="xl">
            {children}
            <Divider mt="xl" />
            <Group justify="space-between" align="center" wrap="wrap">
              <Text size="xs" c="dimmed">
                © 2025 DoneIsBetter. All rights reserved.
              </Text>
              <Group gap="md">
                <Anchor component={Link} href="/privacy" size="xs" c="dimmed">
                  Privacy Policy
                </Anchor>
                <Anchor component={Link} href="/terms" size="xs" c="dimmed">
                  Terms of Service
                </Anchor>
                <Anchor component={Link} href="/data-deletion" size="xs" c="dimmed">
                  Data Deletion
                </Anchor>
              </Group>
            </Group>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
