import Link from 'next/link'
import { Anchor, Box, List, Stack, Text, Title } from '@mantine/core'
import { AccentPanel, DocsPageShell, PublicShell } from '@doneisbetter/gds-core/server'
import { createDocsVersionMeta, getDocsShellProps } from '../../../lib/docs-shell-config'

export default function ApiDocs() {
  return (
    <PublicShell {...getDocsShellProps('/docs/api')}>
      <DocsPageShell
        eyebrow="API Reference"
        footerNext={{ href: '/docs/api/endpoints', label: 'Endpoint reference' }}
        lead="Reference surface for OAuth, hosted auth, public sessions, and permission-management contracts."
        meta={createDocsVersionMeta('API Version')}
        title="SSO API Reference"
      >
      <Stack gap="xl">
        <Box>
          <Title mb="sm" order={2}>Overview</Title>
          <Text size="sm">
            The SSO API combines OAuth 2.0 / OpenID Connect endpoints, public-user authentication,
            session-validation endpoints, and permission-management APIs.
          </Text>
        </Box>

        <AccentPanel title="Current contract" tone="amber" variant="soft-outline">
          <Text size="sm">
            OAuth token issuance happens through <code>/api/oauth/*</code>. Public login endpoints set
            a cookie-backed session and do not replace the OAuth token flow.
          </Text>
        </AccentPanel>

        <Box>
          <Title mb="sm" order={2}>API Areas</Title>

          <Title mb="xs" order={3}>OAuth / OIDC</Title>
          <List spacing="xs">
            <List.Item><code>GET /api/oauth/authorize</code> - start authorization-code flow</List.Item>
            <List.Item><code>POST /api/oauth/token</code> - exchange code or refresh token</List.Item>
            <List.Item><code>GET /api/oauth/userinfo</code> - get user claims from access token</List.Item>
            <List.Item><code>POST /api/oauth/revoke</code> - revoke token</List.Item>
            <List.Item><code>GET /api/oauth/logout</code> - logout from the hosted SSO session</List.Item>
            <List.Item><code>GET /.well-known/openid-configuration</code> - OIDC discovery document</List.Item>
            <List.Item><code>GET /.well-known/jwks.json</code> - JWKS for token verification</List.Item>
          </List>

          <Title mb="xs" mt="lg" order={3}>Public Authentication</Title>
          <List spacing="xs">
            <List.Item><code>POST /api/public/register</code> - create account or add password to a social-only account</List.Item>
            <List.Item><code>POST /api/public/login</code> - password login, sets <code>public-session</code></List.Item>
            <List.Item><code>POST /api/public/request-magic-link</code> - request email magic link</List.Item>
            <List.Item><code>GET /api/public/magic-login</code> - consume magic-link token</List.Item>
            <List.Item><code>POST /api/public/verify-pin</code> - complete a PIN-gated login</List.Item>
            <List.Item><code>GET /api/public/session</code> - validate public session cookie</List.Item>
          </List>

          <Title mb="xs" mt="lg" order={3}>Social Login</Title>
          <List spacing="xs">
            <List.Item><code>GET /api/auth/google/login</code></List.Item>
            <List.Item><code>GET /api/auth/google/callback</code></List.Item>
            <List.Item><code>GET /api/auth/facebook/login</code></List.Item>
            <List.Item><code>GET /api/auth/facebook/callback</code></List.Item>
          </List>

          <Title mb="xs" mt="lg" order={3}>Permission APIs</Title>
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
          <Title mb="sm" order={2}>Important Behavior</Title>
          <List spacing="xs">
            <List.Item>Canonical permission roles are <code>none</code>, <code>user</code>, and <code>admin</code>.</List.Item>
            <List.Item>Canonical permission statuses are <code>pending</code>, <code>approved</code>, and <code>revoked</code>.</List.Item>
            <List.Item>Public session validation is cookie-based.</List.Item>
            <List.Item>OAuth-protected permission writes require a client token with <code>manage_permissions</code>.</List.Item>
            <List.Item>Access-request creation requires a user-bound token whose subject and client both match the request target.</List.Item>
          </List>
        </Box>

        <Box>
          <Title mb="sm" order={2}>See Also</Title>
          <List spacing="xs">
            <List.Item><Anchor component={Link} href="/docs/api/endpoints">Endpoint reference</Anchor></List.Item>
            <List.Item><Anchor component={Link} href="/docs/api/responses">Response formats</Anchor></List.Item>
            <List.Item><Anchor component={Link} href="/docs/api/errors">Error reference</Anchor></List.Item>
            <List.Item><Anchor component={Link} href="/docs/authentication">Authentication guide</Anchor></List.Item>
          </List>
        </Box>
      </Stack>
      </DocsPageShell>
    </PublicShell>
  )
}
