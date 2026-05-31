import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  List,
  Box,
} from '@mantine/core';
import { DocsPageShell, PublicShell } from '@doneisbetter/gds-core/server'
import { createDocsVersionMeta, getDocsShellProps } from '../../lib/docs-shell-config'

export default function IntegrationGuidePage() {
  return (
    <PublicShell {...getDocsShellProps('/docs/integration')}>
      <DocsPageShell
        eyebrow="Integration Guide"
        lead="Choose the right integration surface for your application."
        meta={createDocsVersionMeta('SSO Version')}
        title="Third-Party Integration Guide"
      >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Integration Options</Title>
            <List spacing="xs">
              <List.Item><strong>OAuth2 / OIDC</strong> - recommended for most apps</List.Item>
              <List.Item><strong>Cookie-Based SSO</strong> - only for shared-domain deployments</List.Item>
              <List.Item><strong>Hosted Social Login</strong> - Google and Facebook through the SSO login page</List.Item>
              <List.Item><strong>Centralized App Permissions</strong> - per-app access and role management in SSO</List.Item>
            </List>
        </Box>

        <Box>
            <Title order={2} mb="sm">Recommended Default</Title>
            <Text size="sm">
              Start with OAuth 2.0 Authorization Code flow plus OIDC claims. Use the cookie-session endpoints only
              when your app truly shares the configured cookie domain and does not need its own OAuth token lifecycle.
            </Text>
        </Box>

        <Box>
            <Title order={2} mb="sm">Key Runtime Facts</Title>
            <List spacing="xs">
              <List.Item>Public login endpoints set cookies; they do not issue bearer tokens.</List.Item>
              <List.Item>Canonical app-permission roles are <code>none</code>, <code>user</code>, <code>admin</code>.</List.Item>
              <List.Item>Canonical app-permission statuses are <code>pending</code>, <code>approved</code>, <code>revoked</code>.</List.Item>
              <List.Item>Access requests require a valid user-bound token for the same user and same client.</List.Item>
            </List>
        </Box>

        <Box>
            <Title order={2} mb="sm">Read Next</Title>
            <List spacing="xs">
              <List.Item><Link href="/docs/quickstart">Quick Start Guide</Link></List.Item>
              <List.Item><Link href="/docs/authentication">Authentication Guide</Link></List.Item>
              <List.Item><Link href="/docs/api">API Reference</Link></List.Item>
            </List>
        </Box>
      </Stack>
      </DocsPageShell>
    </PublicShell>
  );
}
