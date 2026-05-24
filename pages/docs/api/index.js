import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Paper,
  Code,
  List,
  Box,
  Anchor,
  Container,
  Divider,
  Group,
} from '@mantine/core';
import DocsLayout from '../../../components/DocsLayout';
import packageJson from '../../../package.json';

export default function ApiDocs() {
  return (
    <DocsLayout>
      <Stack gap="xl">
        <Box>
          <Title order={1} mb="xs">SSO API Reference</Title>
          <Text size="sm" c="dimmed" fw={500} mb="xs">API Version: {packageJson.version}</Text>
        </Box>

        
          <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              The SSO API combines OAuth 2.0 / OpenID Connect endpoints, public-user authentication,
              session-validation endpoints, and permission-management APIs.
            </Text>
            <Paper withBorder p="md" shadow="sm" radius="md" style={{ borderLeft: "4px solid var(--mantine-color-yellow-6)" }} bg="var(--mantine-color-yellow-light)">
              <Text size="sm">
                <strong>Current contract:</strong> OAuth token issuance happens through <code>/api/oauth/*</code>.
                Public login endpoints set a cookie-backed session and do not replace the OAuth token flow.
              </Text>
            </Paper>
          </Box>

          <Box>
            <Title order={2} mb="sm">API Areas</Title>

            <Title order={3} mb="xs">OAuth / OIDC</Title>
            <List spacing="xs">
              <List.Item><code>GET /api/oauth/authorize</code> - start authorization-code flow</List.Item>
              <List.Item><code>POST /api/oauth/token</code> - exchange code or refresh token</List.Item>
              <List.Item><code>GET /api/oauth/userinfo</code> - get user claims from access token</List.Item>
              <List.Item><code>POST /api/oauth/revoke</code> - revoke token</List.Item>
              <List.Item><code>GET /api/oauth/logout</code> - logout from the hosted SSO session</List.Item>
              <List.Item><code>GET /.well-known/openid-configuration</code> - OIDC discovery document</List.Item>
              <List.Item><code>GET /.well-known/jwks.json</code> - JWKS for token verification</List.Item>
            </List>

            <Title order={3} mb="xs">Public Authentication</Title>
            <List spacing="xs">
              <List.Item><code>POST /api/public/register</code> - create account or add password to a social-only account</List.Item>
              <List.Item><code>POST /api/public/login</code> - password login, sets <code>public-session</code></List.Item>
              <List.Item><code>POST /api/public/request-magic-link</code> - request email magic link</List.Item>
              <List.Item><code>GET /api/public/magic-login</code> - consume magic-link token</List.Item>
              <List.Item><code>POST /api/public/verify-pin</code> - complete a PIN-gated login</List.Item>
              <List.Item><code>GET /api/public/session</code> - validate public session cookie</List.Item>
            </List>

            <Title order={3} mb="xs">Social Login</Title>
            <List spacing="xs">
              <List.Item><code>GET /api/auth/google/login</code></List.Item>
              <List.Item><code>GET /api/auth/google/callback</code></List.Item>
              <List.Item><code>GET /api/auth/facebook/login</code></List.Item>
              <List.Item><code>GET /api/auth/facebook/callback</code></List.Item>
            </List>

            <Title order={3} mb="xs">Permission APIs</Title>
            <List spacing="xs">
              <List.Item><code>GET /api/users/[userId]/apps/[clientId]/permissions</code> - read a permission record</List.Item>
              <List.Item><code>PUT /api/users/[userId]/apps/[clientId]/permissions</code> - app-managed permission update</List.Item>
              <List.Item><code>DELETE /api/users/[userId]/apps/[clientId]/permissions</code> - app-managed revoke</List.Item>
              <List.Item><code>POST /api/users/[userId]/apps/[clientId]/request-access</code> - create pending access request</List.Item>
              <List.Item><code>PUT /api/admin/users/[userId]/apps/[clientId]/permissions</code> - admin-managed permission update</List.Item>
              <List.Item><code>DELETE /api/admin/users/[userId]/apps/[clientId]/permissions</code> - admin-managed revoke</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Important Behavior</Title>
            <List spacing="xs">
              <List.Item>Canonical permission roles are <code>none</code>, <code>user</code>, and <code>admin</code>.</List.Item>
              <List.Item>Canonical permission statuses are <code>pending</code>, <code>approved</code>, and <code>revoked</code>.</List.Item>
              <List.Item>Public session validation is cookie-based.</List.Item>
              <List.Item>OAuth-protected permission writes require a client token with <code>manage_permissions</code>.</List.Item>
              <List.Item>Access-request creation requires a user-bound token whose subject and client both match the request target.</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">See Also</Title>
            <List spacing="xs">
              <List.Item><Anchor component={Link} href="/docs/api/endpoints">Endpoint reference</Anchor></List.Item>
              <List.Item><Anchor component={Link} href="/docs/api/responses">Response formats</Anchor></List.Item>
              <List.Item><Anchor component={Link} href="/docs/api/errors">Error reference</Anchor></List.Item>
              <List.Item><Anchor component={Link} href="/docs/authentication">Authentication guide</Anchor></List.Item>
            </List>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
