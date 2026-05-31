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

export default function Authentication() {
  return (
    <PublicShell {...getDocsShellProps('/docs/authentication')}>
      <DocsPageShell
        eyebrow="Integration Guide"
        lead="Recommended authentication and hosted-login model for OAuth-based consumers."
        meta={createDocsVersionMeta('API Version')}
        title="Authentication Guide"
      >
      <Stack gap="xl">
        <Box>
          <Title order={2} mb="sm">Overview</Title>
          <Text size="sm">
            The recommended integration path is OAuth 2.0 Authorization Code flow with OIDC claims
            and PKCE where appropriate. Public-user hosted auth and social login feed into that same
            authorization flow.
          </Text>
          <Text size="sm">
            Design, UI, and UX rules for those hosted auth surfaces now defer to
            {' '}the shared <Link href="https://github.com/sovereignsquad/general-design-system">General Design System</Link>.
          </Text>
        </Box>

        <Box>
            <Title order={2} mb="sm">Current Authentication Methods</Title>
            <List spacing="xs">
              <List.Item>Email and password</List.Item>
              <List.Item>Magic links</List.Item>
              <List.Item>PIN verification on selected login attempts</List.Item>
              <List.Item>Google</List.Item>
              <List.Item>Facebook</List.Item>
            </List>
            <Text size="sm">Apple Sign In and passkeys are planned backlog work and are not active today.</Text>
        </Box>

        <Box>
            <Title order={2} mb="sm">OAuth Flow</Title>
            <List spacing="xs" type="ordered">
              <List.Item>Redirect the user to <code>/api/oauth/authorize</code>.</List.Item>
              <List.Item>User authenticates on the hosted SSO login surface.</List.Item>
              <List.Item>SSO checks or creates the user’s app-permission state.</List.Item>
              <List.Item>SSO redirects back with an authorization code.</List.Item>
              <List.Item>Your backend exchanges that code at <code>/api/oauth/token</code>.</List.Item>
            </List>
        </Box>

        <Box>
            <Title order={2} mb="sm">Important Distinction</Title>
            <Text size="sm">
              Public-auth endpoints and OAuth endpoints are not interchangeable:
            </Text>
            <List spacing="xs">
              <List.Item><code>/api/public/login</code> creates a cookie-backed public session.</List.Item>
              <List.Item><code>/api/oauth/token</code> issues OAuth tokens.</List.Item>
            </List>
            <Text size="sm">
              If your application needs bearer tokens, use the OAuth flow. If your shared-domain UI only
              needs hosted session validation, use the public session endpoints.
            </Text>
        </Box>

        <Box>
            <Title order={2} mb="sm">Social Login Security</Title>
            <Text size="sm">
              Google and Facebook callbacks use a canonical encoded state payload tied to the signed CSRF cookie.
              After successful callback validation, the callback CSRF cookie is cleared to reduce replay value.
            </Text>
        </Box>
      </Stack>
      </DocsPageShell>
    </PublicShell>
  );
}
