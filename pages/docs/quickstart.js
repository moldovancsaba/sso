import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Code,
  List,
  Box,
} from '@mantine/core';
import { AccentPanel, DocsPageShell, PublicShell } from '@doneisbetter/gds-core/server'
import { createDocsVersionMeta, getDocsShellProps } from '../../lib/docs-shell-config'

export default function Quickstart() {
  return (
    <PublicShell {...getDocsShellProps('/docs/quickstart')}>
      <DocsPageShell
        eyebrow="Getting Started"
        lead="The shortest safe path from client registration to a working OAuth integration."
        meta={createDocsVersionMeta('API Version')}
        title="Quick Start Guide"
      >
      <Stack gap="xl">
        <AccentPanel title="Recommended path" tone="amber" variant="soft-outline">
          <Stack gap="sm">
            <Text size="sm">
              Use OAuth 2.0 Authorization Code flow. Do not treat the public password-login endpoint as a replacement for OAuth token issuance.
            </Text>
            <Text size="sm">
              If you are implementing login screens, auth forms, or app UI around this flow, follow the shared <Link href="https://github.com/sovereignsquad/general-design-system">General Design System</Link> as the authoritative cross-project design system.
            </Text>
          </Stack>
        </AccentPanel>

        <Box>
            <Title order={2} mb="sm">1. Register Your OAuth Client</Title>
            <Text size="sm">Create an OAuth client in the SSO admin UI and store:</Text>
            <Code block>
              {`SSO_CLIENT_ID=your-client-id
SSO_CLIENT_SECRET=your-client-secret
SSO_REDIRECT_URI=https://yourapp.com/auth/callback`}
            </Code>
        </Box>

        <Box>
            <Title order={2} mb="sm">2. Redirect to Authorization</Title>
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
            <Text size="sm">Users can authenticate there with password, magic link, PIN, Google, or Facebook.</Text>
        </Box>

        <Box>
            <Title order={2} mb="sm">3. Exchange the Code Server-Side</Title>
            <Code block>
              {`POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://yourapp.com/auth/callback",
  "code_verifier": "PKCE_VERIFIER"
}`}
            </Code>
        </Box>

        <Box>
            <Title order={2} mb="sm">4. Use Tokens Correctly</Title>
            <List spacing="xs">
              <List.Item>Use <code>id_token</code> for identity claims.</List.Item>
              <List.Item>Use <code>access_token</code> for SSO API authorization.</List.Item>
              <List.Item>Refresh expired access tokens with <code>grant_type=refresh_token</code>.</List.Item>
            </List>
        </Box>

        <Box>
            <Title order={2} mb="sm">5. Check App Permission State</Title>
            <Text size="sm">
              Authentication alone is not enough for per-app access. Check or manage permission state with the
              relevant permission endpoints.
            </Text>
        </Box>
      </Stack>
      </DocsPageShell>
    </PublicShell>
  );
}
