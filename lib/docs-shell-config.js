import Link from 'next/link'
import { Anchor, Badge, Box, Group, NavLink, ScrollArea, Stack, Text } from '@mantine/core'
import { PublicBrandFooter } from '@sovereignsquad/gds-core/server'
import packageJson from '../package.json'

const docsSections = [
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

// WHAT: The full section tree, as a vertical stack of grouped NavLinks.
// WHY: Used in two slots that both want a column — the burger sheet below `sm`, and
//      DocsPageShell's `sideRail` from `lg` up. It must NOT go in PublicShell's
//      `navigation` slot: that renders inside a fixed 72px-tall header Group, so a
//      vertical stack overflowed roughly 900px down across the article at every width
//      from `sm` up. See getDocsNavItems() for what belongs in the header instead.
function createNavigationNode(activePath) {
  return (
    <Stack gap="md">
      <Text c="dimmed" size="sm">
        Browse documentation sections.
      </Text>
      <ScrollArea h="100%">
        {docsSections.map((section) => (
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
                active={activePath === link.href}
                variant="light"
                radius="sm"
              />
            ))}
          </Stack>
        ))}
      </ScrollArea>
    </Stack>
  )
}

// WHAT: Short header labels, one per section, so the horizontal header nav fits
//       alongside the brand and the GitHub/Support actions at narrower widths.
// WHY: The section titles used in the column ("Integration Guide", "API Reference")
//      are too long for a single header row once the brand and actions are present.
const SECTION_HEADER_LABELS = {
  'Getting Started': 'Start',
  'Integration Guide': 'Integrate',
  'API Reference': 'API',
  Examples: 'Examples',
  Security: 'Security',
}

// WHAT: One nav item per section, pointing at that section's first page.
// WHY: PublicShell renders `navItems` through PublicNav — a horizontal Group of
//      Anchors with aria-current — which is what its header slot is built for. This
//      is the only navigation visible between `sm` and `lg`, because the burger is
//      hiddenFrom="sm" and the side rail is visibleFrom="lg".
export function getDocsNavItems() {
  return docsSections.map((section) => ({
    id: section.title,
    label: SECTION_HEADER_LABELS[section.title] ?? section.title,
    href: section.links[0].href,
  }))
}

// WHAT: Which header item to mark current for a given docs route.
// WHY: Matches on the section that owns the page, not on the href of the item itself,
//      so every page in a section highlights that section.
export function getDocsActiveNavId(activePath) {
  const owning = docsSections.find((section) =>
    section.links.some((link) => link.href === activePath),
  )
  return owning ? owning.title : undefined
}

// WHAT: The section tree for DocsPageShell's `sideRail` slot.
// WHY: DocsPageShell renders it as a 240px column beside the article, visibleFrom="lg".
//      This is the "column on wide" half of the navigation contract; the burger covers
//      below `sm` and the header items cover the band between.
export function getDocsSideRail(activePath) {
  return createNavigationNode(activePath)
}

export function createDocsVersionMeta(versionLabel = 'API Version') {
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

export function getDocsShellProps(activePath) {
  const navigationNode = createNavigationNode(activePath)

  return {
    actions: (
      <Group gap="lg">
        <Anchor href="https://github.com/doneisbetter/sso" target="_blank" rel="noopener noreferrer" size="sm" c="dimmed">
          GitHub
        </Anchor>
        <Anchor href="mailto:support@doneisbetter.com" size="sm" c="dimmed">
          Support
        </Anchor>
      </Group>
    ),
    brand: (
      <Link href="/">
        <Box component="span" display="inline-flex">
          <Box alt="DoneIsBetter SSO" component="img" h={28} src="/logo.svg" w={132} />
        </Box>
      </Link>
    ),
    footer: (
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
    ),
    maxContentWidth: 'md',
    mobileNavigation: navigationNode,
    mobileNavigationMode: 'inline-collapse',
    // WHAT: Header navigation goes through navItems, not the `navigation` slot.
    // WHY: PublicShell renders `navigation` verbatim inside a fixed-height header
    //      Group. Passing the vertical section tree there put a ~900px column inside
    //      a 72px header, overlaying the article at every width from `sm` up.
    navItems: getDocsNavItems(),
    activeNavId: getDocsActiveNavId(activePath),
  }
}
