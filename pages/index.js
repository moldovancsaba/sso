import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Anchor,
  Badge,
  Box,
  Button,
  Code,
  Group,
  Stack,
  Text,
} from '@mantine/core'
import {
  AccentPanel,
  ConsumerDashboardGrid,
  ConsumerSection,
  CtaButtonGroup,
  EditorialCard,
  EditorialHero,
  FeatureBand,
  PublicBrandFooter,
  PublicShell,
} from '@doneisbetter/gds-core/server'
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

const publicNavItems = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'docs', label: 'Documentation', href: '/docs' },
  { id: 'privacy', label: 'Privacy', href: '/privacy' },
  { id: 'terms', label: 'Terms', href: '/terms' },
]

const integrationCards = [
  {
    badge: <Badge size="sm" variant="light">Connected app</Badge>,
    description: 'Customer engagement workflows and sign-in orchestration on the shared identity backbone.',
    meta: <Text c="dimmed" size="sm">Uses centralized auth, session validation, and app permissions.</Text>,
    title: 'LaunchMass',
  },
  {
    badge: <Badge size="sm" variant="light">Connected app</Badge>,
    description: 'Partner-facing access flow with the same hosted session, OAuth, and account lifecycle controls.',
    meta: <Text c="dimmed" size="sm">Uses public-user auth and centralized permission enforcement.</Text>,
    title: 'Amanoba',
  },
  {
    badge: <Badge size="sm" variant="light">Connected app</Badge>,
    description: 'Domain-specific application that relies on the same shared identity and authorization surface.',
    meta: <Text c="dimmed" size="sm">Uses centralized auth and reusable session validation.</Text>,
    title: 'Camera',
  },
  {
    badge: <Badge leftSection={<IconApps size={12} />} size="sm" variant="light">Operations</Badge>,
    description: 'Internal operator console for users, activity, OAuth clients, approvals, and enterprise groundwork.',
    meta: <Text c="dimmed" size="sm">Uses unified admin controls and audited privileged actions.</Text>,
    title: 'SSO Admin Dashboard',
  },
]

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

  const heroActions = publicUser
    ? [
        { href: '/account', label: 'My Account', variant: 'primary' },
        ...(hasAdminAccess ? [{ href: '/admin', label: 'SSO Admin', variant: 'secondary' }] : []),
        { href: '/logout', label: 'Logout', variant: 'subtle' },
      ]
    : [
        { href: '/login', label: 'Sign In', variant: 'primary' },
        { href: '/register', label: 'Create Account', variant: 'secondary' },
        { href: '/docs/quickstart', label: 'Quick Start', variant: 'subtle' },
      ]

  const capabilityItems = publicUser
    ? [
        {
          description: `Signed in as ${publicUser.email}. Your hosted SSO session is active and ready for account management.`,
          icon: <IconUser size={20} />,
          id: 'user-access',
          meta: hasAdminAccess ? 'Admin dashboard access is available on this session.' : 'Standard account access is available on this session.',
          title: 'User access',
        },
        {
          description: 'Integrate centralized authentication into your application with the documented OAuth, session, and permission APIs.',
          icon: <IconApps size={20} />,
          id: 'api-integration',
          meta: 'OAuth / OIDC, public sessions, and client permission contracts are documented.',
          title: 'API integration',
        },
        {
          description: 'Public users, operators, and connected apps all use the same audited identity and authorization backbone.',
          icon: <IconShieldCheck size={20} />,
          id: 'operational-controls',
          meta: 'Approval flows, passwordless entry, PIN verification, and admin guardrails are all in the same service.',
          title: 'Operational controls',
        },
      ]
    : [
        {
          description: 'Hosted sign-in supports password, magic link, social login, and PIN verification from one shared identity surface.',
          icon: <IconUser size={20} />,
          id: 'user-access',
          meta: 'Email + password, magic link, Google, Facebook, and PIN-gated completion are supported.',
          title: 'User access',
        },
        {
          description: 'Integrate centralized authentication into your application with the documented OAuth, session, and permission APIs.',
          icon: <IconApps size={20} />,
          id: 'api-integration',
          meta: 'OAuth / OIDC, public sessions, and client permission contracts are documented.',
          title: 'API integration',
        },
        {
          description: 'Public users, operators, and connected apps all use the same audited identity and authorization backbone.',
          icon: <IconShieldCheck size={20} />,
          id: 'operational-controls',
          meta: 'Approval flows, passwordless entry, PIN verification, and admin guardrails are all in the same service.',
          title: 'Operational controls',
        },
      ]

  return (
    <PublicShell
      actions={
        <Group gap="md">
          <Button component={Link} href="/docs" leftSection={<IconBook size={16} />} size="compact-md" variant="subtle">
            Docs
          </Button>
          {!publicUser ? (
            <Button component={Link} href="/login" leftSection={<IconLogin2 size={16} />} size="compact-md">
              Sign In
            </Button>
          ) : null}
        </Group>
      }
      activeNavId="home"
      brand={
        <Link href="/">
          <Box component="span" display="inline-flex">
            <Box alt="DoneIsBetter SSO" component="img" h={28} src="/logo.svg" w={132} />
          </Box>
        </Link>
      }
      footer={
        <PublicBrandFooter
          actions={
            <CtaButtonGroup
              primary={
                <Button component={Link} href="/docs/quickstart" leftSection={<IconArrowRight size={16} />}>
                  Quick Start
                </Button>
              }
              secondary={
                <Button component={Link} href="/docs/api" leftSection={<IconBook size={16} />} variant="default">
                  API Reference
                </Button>
              }
            />
          }
          brandTitle="DoneIsBetter"
          compact
          description="Universal SSO service for shared identity, OAuth, and centralized account access."
          legal={<Text c="dimmed" size="xs">© 2025 DoneIsBetter. All rights reserved.</Text>}
          secondary={
            <Group gap="md">
              <Anchor component={Link} href="/privacy" size="xs">
                Privacy Policy
              </Anchor>
              <Anchor component={Link} href="/terms" size="xs">
                Terms of Service
              </Anchor>
              <Anchor component={Link} href="/data-deletion" size="xs">
                Data Deletion
              </Anchor>
            </Group>
          }
        />
      }
      headerVariant="branded-quiet"
      maxContentWidth="lg"
      navItems={publicNavItems}
    >
      <Stack gap="3rem" py="xl">
        <EditorialHero
          actions={heroActions}
          align="start"
          description={
            publicUser
              ? 'Your hosted SSO session is active. Manage your account, move into admin operations, or continue integrating OAuth and session flows.'
              : 'Secure single sign-on for public users, admin operators, and third-party OAuth clients from one governed identity platform.'
          }
          eyebrow="Unified identity"
          media={
            <Code block>{`const sso = new SSOClient('https://sso.doneisbetter.com')
const session = await sso.validateSession()`}</Code>
          }
          mediaFade="background-match"
          meta={[
            { icon: <IconKey size={16} />, id: 'hosted-auth', label: 'Hosted auth' },
            { icon: <IconLock size={16} />, id: 'oauth-oidc', label: 'OAuth / OIDC' },
            { icon: <IconShieldCheck size={16} />, id: 'shared-sessions', label: 'Shared sessions' },
          ]}
          title="Identity for people, operators, and connected applications."
        />

        <FeatureBand
          bordered
          columns={3}
          items={capabilityItems}
        />

        <AccentPanel title="What the service does" tone="blue" variant="soft-outline">
          <Stack gap="sm">
            <Text size="sm">
              DoneIsBetter SSO gives your products one trusted identity layer for sign-in, session management, access control, and OAuth-based application access.
            </Text>
            <Text c="dimmed" size="sm">
              The same runtime governs public-user authentication, internal operator controls, approval workflows, account recovery, and per-application authorization state.
            </Text>
          </Stack>
        </AccentPanel>

        <ConsumerSection
          description="Current integrations in this service rely on the same identity, session, and authorization backbone."
          title="Connected applications"
        >
          <ConsumerDashboardGrid columns={2}>
            {integrationCards.map((item) => (
              <EditorialCard
                key={item.title}
                badge={item.badge}
                description={item.description}
                media={<IconWorld size={28} />}
                meta={item.meta}
                title={item.title}
                tone={item.title === 'SSO Admin Dashboard' ? 'cool' : 'default'}
              />
            ))}
          </ConsumerDashboardGrid>
          <Box mt="md">
            <Text c="dimmed" size="sm">
              Public customer logos or endorsements should only be added with explicit approval and verified public references.
            </Text>
          </Box>
        </ConsumerSection>
      </Stack>
    </PublicShell>
  )
}
