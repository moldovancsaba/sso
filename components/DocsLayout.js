import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Badge,
  Box,
  NavLink,
  ScrollArea,
  Anchor,
  Group,
  Stack,
  Text,
} from '@mantine/core'
import { DocsPageShell, PublicBrandFooter, PublicShell } from '@doneisbetter/gds-core/server'
import packageJson from '../package.json'

const docsNavigation = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs', label: 'Introduction' },
      { href: '/docs/quickstart', label: 'Quick Start' },
      { href: '/docs/installation', label: 'Installation' },
    ],
  },
  {
    title: 'Integration Guide',
    links: [
      { href: '/docs/authentication', label: 'Authentication' },
      { href: '/docs/session-management', label: 'Session Management' },
      { href: '/docs/error-handling', label: 'Error Handling' },
    ],
  },
  {
    title: 'API Reference',
    links: [
      { href: '/docs/api/endpoints', label: 'Endpoints' },
      { href: '/docs/api/responses', label: 'Response Format' },
      { href: '/docs/api/errors', label: 'Error Codes' },
    ],
  },
  {
    title: 'Examples',
    links: [
      { href: '/docs/examples/react', label: 'React' },
      { href: '/docs/examples/vue', label: 'Vue.js' },
      { href: '/docs/examples/vanilla', label: 'Vanilla JS' },
    ],
  },
  {
    title: 'Security',
    links: [
      { href: '/docs/security/best-practices', label: 'Best Practices' },
      { href: '/docs/security/cors', label: 'CORS Configuration' },
      { href: '/docs/security/permissions', label: 'Permissions' },
    ],
  },
]

function buildVersionMeta(versionLabel) {
  return (
    <Group gap="xs">
      <Badge color="gray" variant="light">
        {versionLabel}
      </Badge>
      <Text c="dimmed" size="sm">
        {packageJson.version}
      </Text>
    </Group>
  )
}

export default function DocsLayout({
  breadcrumbs = [],
  children,
  eyebrow = 'Documentation',
  footerNext,
  lead,
  meta = null,
  sideRail = null,
  title = '',
  versionLabel = 'API Version',
}) {
  const router = useRouter()

  const navigationNode = (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        Browse documentation sections.
      </Text>
      <ScrollArea h="100%">
        {docsNavigation.map((section) => (
          <Stack key={section.title} gap={4} mb="lg">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="xs" mb={4}>
              {section.title}
            </Text>
            {section.links.map((link) => (
              <NavLink
                key={link.href}
                component={Link}
                href={link.href}
                label={link.label}
                active={router.pathname === link.href}
                variant="light"
                radius="sm"
              />
            ))}
          </Stack>
        ))}
      </ScrollArea>
    </Stack>
  )

  return (
    <PublicShell
      actions={
        <Group gap="lg">
          <Anchor href="https://github.com/doneisbetter/sso" target="_blank" rel="noopener noreferrer" size="sm" c="dimmed">
            GitHub
          </Anchor>
          <Anchor href="mailto:support@doneisbetter.com" size="sm" c="dimmed">
            Support
          </Anchor>
        </Group>
      }
      brand={
        <Link href="/">
          <Box component="span" display="inline-flex">
            <Box alt="DoneIsBetter SSO" component="img" h={28} src="/logo.svg" w={132} />
          </Box>
        </Link>
      }
      footer={
        <PublicBrandFooter
          brandTitle="DoneIsBetter"
          compact
          legal={<Text size="xs" c="dimmed">© 2025 DoneIsBetter. All rights reserved.</Text>}
          secondary={
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
          }
        />
      }
      maxContentWidth="md"
      mobileNavigation={navigationNode}
      mobileNavigationMode="inline-collapse"
      navigation={navigationNode}
    >
      {title ? (
        <DocsPageShell
          breadcrumbs={breadcrumbs}
          eyebrow={eyebrow}
          footerNext={footerNext}
          lead={lead}
          meta={meta ?? buildVersionMeta(versionLabel)}
          sideRail={sideRail}
          title={title}
        >
          {children}
        </DocsPageShell>
      ) : (
        <Stack gap="xl" py="xl">
          {children}
        </Stack>
      )}
    </PublicShell>
  )
}
