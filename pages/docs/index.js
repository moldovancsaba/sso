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
import DocsLayout from '../../components/DocsLayout';
import packageJson from '../../package.json';

export default function DocsPage() {
  return (
    <DocsLayout>
      <Stack gap="xl">
        <Box>
          <Title order={1} mb="xs">DoneIsBetter SSO Documentation</Title>
          <Text size="sm" c="dimmed" fw={500} mb="xs">API Version: {packageJson.version}</Text>
          <Text size="lg" c="dimmed">Current runtime guide for OAuth, hosted auth, and shared-domain session validation.</Text>
        </Box>

        
          <Box>
            <Paper withBorder p="md" shadow="sm" radius="md" style={{ borderLeft: "4px solid var(--mantine-color-yellow-6)" }} bg="var(--mantine-color-yellow-light)">
              <Text size="sm">
                <strong>Recommended default:</strong> use OAuth 2.0 Authorization Code flow with OIDC claims.
                Public login endpoints create cookie-backed sessions, but they do not replace the OAuth token flow.
              </Text>
              <Text size="sm">
                <strong>Design / UI / UX SSOT:</strong> cross-project design rules now live in
                {' '}<code>/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM</code>.
                Local styling in this repo should be treated as migration-state implementation, not the long-term design source of truth.
              </Text>
            </Paper>
          </Box>

          <Box>
            <Title order={2} mb="sm">Current Capabilities</Title>
            <List spacing="xs">
              <List.Item>OAuth 2.0 / OpenID Connect authorization server</List.Item>
              <List.Item>Hosted public-user authentication with password, magic link, PIN, Google, and Facebook</List.Item>
              <List.Item>Centralized per-app authorization through <code>appPermissions</code></List.Item>
              <List.Item>Cookie-based SSO for shared subdomain deployments</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Canonical Runtime Contract</Title>
            <List spacing="xs">
              <List.Item>App-permission roles: <code>none</code>, <code>user</code>, <code>admin</code></List.Item>
              <List.Item>App-permission statuses: <code>pending</code>, <code>approved</code>, <code>revoked</code></List.Item>
              <List.Item>Admin cookie: <code>admin-session</code></List.Item>
              <List.Item>Public cookie: <code>public-session</code></List.Item>
              <List.Item>Apple Sign In, passkeys, SAML, and SCIM are not implemented today</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Choose Your Integration</Title>
            <List spacing="xs" type="ordered">
              <List.Item>
                <Title order={3} mb="xs">OAuth2 / OIDC</Title>
                <Text size="sm">Use this for most apps, especially external domains, SPAs, mobile apps, and server applications.</Text>
                <Code block>
              {`GET /api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/auth/callback
  &response_type=code
  &scope=openid%20profile%20email%20offline_access
  &state=RANDOM_STATE
  &nonce=RANDOM_NONCE
  &code_challenge=PKCE_CHALLENGE
  &code_challenge_method=S256`}
            </Code>
              </List.Item>

              <List.Item>
                <Title order={3} mb="xs">Cookie-Based SSO</Title>
                <Text size="sm">Use this only when your app shares the configured cookie domain with the SSO service.</Text>
                <Code block>
              {`GET /api/public/session
Cookie: public-session=...`}
            </Code>
              </List.Item>

              <List.Item>
                <Title order={3} mb="xs">Permission-Aware Integrations</Title>
                <Text size="sm">App access is not based on authentication alone. Check or manage the user’s permission record per client.</Text>
                <Code block>
              {`GET /api/users/{userId}/apps/{clientId}/permissions
Authorization: Bearer ACCESS_TOKEN`}
            </Code>
              </List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Key Endpoints</Title>
            <List spacing="xs">
              <List.Item><code>GET /api/oauth/authorize</code></List.Item>
              <List.Item><code>POST /api/oauth/token</code></List.Item>
              <List.Item><code>GET /api/oauth/userinfo</code></List.Item>
              <List.Item><code>GET /api/public/session</code></List.Item>
              <List.Item><code>POST /api/public/login</code></List.Item>
              <List.Item><code>POST /api/public/request-magic-link</code></List.Item>
              <List.Item><code>POST /api/users/[userId]/apps/[clientId]/request-access</code></List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Read Next</Title>
            <List spacing="xs">
              <List.Item><Link href="/docs/quickstart">Quick Start</Link></List.Item>
              <List.Item><Link href="/docs/authentication">Authentication Guide</Link></List.Item>
              <List.Item><Link href="/docs/integration">Integration Options</Link></List.Item>
              <List.Item><Link href="/docs/api">API Reference</Link></List.Item>
            </List>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
