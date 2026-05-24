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

export default function Quickstart() {
  return (
    <DocsLayout>
      <Stack gap="xl">
        <Box>
          <Title order={1} mb="xs">Quick Start Guide</Title>
          <Text size="sm" c="dimmed" fw={500} mb="xs">API Version: {packageJson.version}</Text>
        </Box>
        
          <Box>
            <Paper withBorder p="md" shadow="sm" radius="md" style={{ borderLeft: "4px solid var(--mantine-color-yellow-6)" }} bg="var(--mantine-color-yellow-light)">
              <Text size="sm">
                <strong>Recommended path:</strong> use OAuth 2.0 Authorization Code flow. Do not treat the public
                password-login endpoint as a replacement for OAuth token issuance.
              </Text>
              <Text size="sm">
                <strong>Design / UI / UX SSOT:</strong> if you are implementing login screens, auth forms, or app UI around this flow,
                follow <code>/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM</code> as the authoritative cross-project design system.
              </Text>
            </Paper>
          </Box>

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
    </DocsLayout>
  );
}
