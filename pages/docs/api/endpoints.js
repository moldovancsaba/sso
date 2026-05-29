import {
  Stack,
  Title,
  Text,
  Code,
  List,
  Box,
} from '@mantine/core'
import DocsLayout from '../../../components/DocsLayout'

export default function ApiEndpoints() {
  return (
    <DocsLayout
      eyebrow="API Reference"
      footerNext={{ href: '/docs/api/responses', label: 'Response formats' }}
      lead="Canonical endpoint map for OAuth, public auth, social login, and permission-management APIs."
      title="API Endpoints Reference"
    >
      <Stack gap="xl">
        <Box component="section" id="oauth">
          <Title mb="sm" order={2}>OAuth / OIDC</Title>

          <Title mb="xs" order={3}>GET /api/oauth/authorize</Title>
          <Text size="sm">Starts the OAuth authorization-code flow.</Text>
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
          <Text size="sm">Optional parameters currently supported include <code>prompt</code>, <code>provider</code>, and <code>login_hint</code>.</Text>

          <Title mb="xs" mt="lg" order={3}>POST /api/oauth/token</Title>
          <Text size="sm">Exchanges an authorization code or refresh token for new tokens.</Text>
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

          <Title mb="xs" mt="lg" order={3}>GET /api/oauth/userinfo</Title>
          <Text size="sm">Returns OIDC claims for the current access token.</Text>

          <Title mb="xs" mt="lg" order={3}>POST /api/oauth/revoke</Title>
          <Text size="sm">Revokes a token owned by the requesting client.</Text>

          <Title mb="xs" mt="lg" order={3}>GET /.well-known/openid-configuration</Title>
          <Text size="sm">Returns discovery metadata for OIDC clients.</Text>

          <Title mb="xs" mt="lg" order={3}>GET /.well-known/jwks.json</Title>
          <Text size="sm">Returns the public signing keys used for JWT verification.</Text>
        </Box>

        <Box component="section" id="public">
          <Title mb="sm" order={2}>Public Authentication</Title>

          <Title mb="xs" order={3}>POST /api/public/register</Title>
          <Text size="sm">Creates a new public user, or adds a password to an existing social-only account with the same email.</Text>
          <Code block>
            {`POST /api/public/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123",
  "name": "User Name"
}`}
          </Code>

          <Title mb="xs" mt="lg" order={3}>POST /api/public/login</Title>
          <Text size="sm">Authenticates a user with email and password, then sets the <code>public-session</code> cookie.</Text>
          <Code block>
            {`POST /api/public/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPassword123"
}`}
          </Code>
          <Text size="sm">This endpoint is cookie-session based. It does not return OAuth tokens.</Text>

          <Title mb="xs" mt="lg" order={3}>POST /api/public/request-magic-link</Title>
          <Text size="sm">Requests a passwordless magic link for a verified public user account.</Text>
          <Code block>
            {`POST /api/public/request-magic-link
Content-Type: application/json

{
  "email": "user@example.com",
  "redirect_uri": "https://yourapp.com/after-login"
}`}
          </Code>
          <Text size="sm">Response is intentionally generic even when the account does not exist.</Text>

          <Title mb="xs" mt="lg" order={3}>POST /api/public/verify-pin</Title>
          <Text size="sm">Completes a PIN-gated login flow.</Text>

          <Title mb="xs" mt="lg" order={3}>GET /api/public/session</Title>
          <Text size="sm">Validates the <code>public-session</code> cookie and returns sanitized user information.</Text>

          <Title mb="xs" mt="lg" order={3}>GET /api/sso/validate</Title>
          <Text size="sm">Compatibility endpoint for mixed admin/public shared-domain session validation.</Text>
        </Box>

        <Box component="section" id="social">
          <Title mb="sm" order={2}>Social Login</Title>

          <Title mb="xs" order={3}>GET /api/auth/google/login</Title>
          <Title mb="xs" order={3}>GET /api/auth/google/callback</Title>
          <Title mb="xs" order={3}>GET /api/auth/facebook/login</Title>
          <Title mb="xs" order={3}>GET /api/auth/facebook/callback</Title>

          <Text size="sm">
            Social login uses the same hosted SSO flow, with canonical callback-state parsing,
            CSRF binding, and public-session creation. These callbacks can also resume an OAuth flow
            when the login originated inside <code>/api/oauth/authorize</code>.
          </Text>
        </Box>

        <Box component="section" id="permissions">
          <Title mb="sm" order={2}>Permission APIs</Title>

          <Title mb="xs" order={3}>GET /api/users/[userId]/apps/[clientId]/permissions</Title>
          <Text size="sm">Reads a permission record for a user/client pair.</Text>
          <Text size="sm">Allowed via:</Text>
          <List spacing="xs">
            <List.Item>matching user-bound access token for the same client</List.Item>
            <List.Item>matching client token with <code>manage_permissions</code></List.Item>
            <List.Item>admin session</List.Item>
          </List>

          <Title mb="xs" mt="lg" order={3}>PUT /api/users/[userId]/apps/[clientId]/permissions</Title>
          <Text size="sm">Client-managed permission upsert. Requires a bearer token for the same client with <code>manage_permissions</code>.</Text>
          <Code block>
            {`PUT /api/users/{userId}/apps/{clientId}/permissions
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "role": "user",
  "status": "approved"
}`}
          </Code>

          <Title mb="xs" mt="lg" order={3}>DELETE /api/users/[userId]/apps/[clientId]/permissions</Title>
          <Text size="sm">Client-managed revoke for the same client.</Text>

          <Title mb="xs" mt="lg" order={3}>POST /api/users/[userId]/apps/[clientId]/request-access</Title>
          <Text size="sm">Creates a pending access request for the same token subject and same token client.</Text>
          <Code block>
            {`POST /api/users/{userId}/apps/{clientId}/request-access
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "User Name"
}`}
          </Code>

          <Title mb="xs" mt="lg" order={3}>PUT /api/admin/users/[userId]/apps/[clientId]/permissions</Title>
          <Text size="sm">Admin-managed permission update.</Text>
          <Code block>
            {`PUT /api/admin/users/{userId}/apps/{clientId}/permissions
Cookie: admin-session=... or public-session=...
Content-Type: application/json

{
  "role": "admin",
  "status": "approved"
}`}
          </Code>

          <Title mb="xs" mt="lg" order={3}>DELETE /api/admin/users/[userId]/apps/[clientId]/permissions</Title>
          <Text size="sm">Admin-managed revoke. Returns a canonical revoked/none permission shape.</Text>
        </Box>
      </Stack>
    </DocsLayout>
  )
}
