import Link from 'next/link'
import { Anchor, Box, Container, Group, Text } from '@mantine/core'

const footerLinks = [
  { href: '/docs', label: 'Docs' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/data-deletion', label: 'Data Deletion' },
];

export default function AppFooter({ version }) {
  return (
    <Box
      component="footer"
      style={(theme) => ({
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'var(--mantine-color-body)',
        borderTop: `1px solid ${theme.colors.gray[2]}`,
      })}
    >
      <Container size="xl" py="xs">
        <Group justify="center" gap="xs" wrap="wrap">
          <Text c="dimmed" size="xs">
            SSO v{version}
          </Text>
          <Text c="dimmed" size="xs">
            |
          </Text>
          <Anchor
            c="brand.6"
            href="https://github.com/moldovancsaba/sso"
            rel="noopener noreferrer"
            size="xs"
            target="_blank"
            underline="never"
          >
            GitHub
          </Anchor>
          {footerLinks.map((link) => (
            <Group gap="xs" key={link.href}>
              <Text c="dimmed" size="xs">
                |
              </Text>
              <Anchor component={Link} href={link.href} size="xs" underline="never">
                {link.label}
              </Anchor>
            </Group>
          ))}
        </Group>
      </Container>
    </Box>
  )
}
