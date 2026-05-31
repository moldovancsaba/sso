import {
  Stack,
  Title,
  Text,
  Box,
} from '@mantine/core'
import { DocsPageShell, PublicShell } from '@doneisbetter/gds-core/server'
import { createDocsVersionMeta, getDocsShellProps } from '../../../lib/docs-shell-config'

export default function ApiErrors() {
  return (
    <PublicShell {...getDocsShellProps('/docs/api/errors')}>
      <DocsPageShell
        eyebrow="API Reference"
        footerNext={{ href: '/docs/api/responses', label: 'Response formats' }}
        lead="Error taxonomy for OAuth, public authentication, permissions, and social login flows."
        meta={createDocsVersionMeta('API Version')}
        title="API Error Reference"
      >
      <Stack gap="xl">
        <Box>
          <Title mb="sm" order={2}>OAuth Errors</Title>
          <Text size="sm">Authorization and token endpoints use standard OAuth-style error responses.</Text>

          <Title mb="xs" order={3}><code>invalid_request</code></Title>
          <Text size="sm">Missing required parameters or malformed input.</Text>

          <Title mb="xs" mt="lg" order={3}><code>invalid_client</code></Title>
          <Text size="sm">Unknown client, suspended client, or invalid client authentication.</Text>

          <Title mb="xs" mt="lg" order={3}><code>invalid_scope</code></Title>
          <Text size="sm">Requested scope is not allowed for the client.</Text>

          <Title mb="xs" mt="lg" order={3}><code>invalid_grant</code></Title>
          <Text size="sm">Expired, reused, or invalid authorization code or refresh token.</Text>

          <Title mb="xs" mt="lg" order={3}><code>access_denied</code></Title>
          <Text size="sm">User denied the flow or the authorization request could not proceed.</Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Public Authentication Errors</Title>

          <Title mb="xs" order={3}><code>401 Invalid email or password</code></Title>
          <Text size="sm">Standard password-login failure.</Text>

          <Title mb="xs" mt="lg" order={3}><code>401 Password not set</code></Title>
          <Text size="sm">The account exists but only has social login methods linked.</Text>

          <Title mb="xs" mt="lg" order={3}><code>403 Please verify your email address before logging in</code></Title>
          <Text size="sm">The public user exists but email verification is not complete.</Text>

          <Title mb="xs" mt="lg" order={3}><code>401 No active session found</code></Title>
          <Text size="sm">Returned by <code>GET /api/public/session</code> when the cookie is missing or invalid.</Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Permission and Access Errors</Title>

          <Title mb="xs" order={3}><code>403 Forbidden</code></Title>
          <Text size="sm">Returned when the bearer token is valid but is not authorized for the requested user/client combination.</Text>

          <Title mb="xs" mt="lg" order={3}><code>404 No permission record found</code></Title>
          <Text size="sm">Returned by permission reads when no record exists for the specified user/client pair.</Text>

          <Title mb="xs" mt="lg" order={3}><code>404 Client not found</code></Title>
          <Text size="sm">Returned when the target OAuth client does not exist.</Text>

          <Title mb="xs" mt="lg" order={3}><code>400 Invalid role</code></Title>
          <Text size="sm">Role must be one of <code>none</code>, <code>user</code>, <code>admin</code>.</Text>

          <Title mb="xs" mt="lg" order={3}><code>400 Invalid status</code></Title>
          <Text size="sm">Status must be one of <code>pending</code>, <code>approved</code>, <code>revoked</code>.</Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Social Login Errors</Title>

          <Title mb="xs" order={3}><code>google_invalid_state</code> / <code>facebook_invalid_state</code></Title>
          <Text size="sm">Callback state is missing, malformed, expired, or no longer matches the CSRF cookie.</Text>

          <Title mb="xs" mt="lg" order={3}><code>google_callback_failed</code> / <code>facebook_callback_failed</code></Title>
          <Text size="sm">Provider callback failed after redirect.</Text>

          <Title mb="xs" mt="lg" order={3}><code>google_no_email</code> / <code>facebook_no_email</code></Title>
          <Text size="sm">The provider account did not supply a usable email claim for account linking.</Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Rate Limits and Retry Behavior</Title>
          <Text size="sm">Some endpoints return HTTP <code>429</code> with retry guidance. Authentication clients should treat 429 responses as transient and retry later.</Text>
        </Box>
      </Stack>
      </DocsPageShell>
    </PublicShell>
  )
}
