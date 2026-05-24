import Link from 'next/link'
import { Anchor, Box, Container, Group, Stack, Text, Title } from '@mantine/core'

const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/data-deletion', label: 'Data Deletion' },
]

export default function PublicPageLayout({
  actions = null,
  children,
  size = 'md',
  subtitle,
  title,
}) {
  return (
    <Container py="xl" size={size}>
      <Stack gap="xl">
        <Group align="flex-start" justify="space-between">
          <Box>
            <Title order={1} mb="xs">
              {title}
            </Title>
            {subtitle ? (
              <Text c="dimmed" size="sm">
                {subtitle}
              </Text>
            ) : null}
          </Box>
          {actions}
        </Group>

        {children}

        <Group align="center" justify="space-between" pt="lg" wrap="wrap">
          <Text c="dimmed" size="xs">
            © 2025 DoneIsBetter. All rights reserved.
          </Text>
          <Group gap="md">
            {footerLinks.map((link) => (
              <Anchor component={Link} href={link.href} key={link.href} size="xs">
                {link.label}
              </Anchor>
            ))}
          </Group>
        </Group>
      </Stack>
    </Container>
  )
}
