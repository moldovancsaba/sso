import {
  Stack,
  Title,
  Text,
  Code,
  Box,
} from '@mantine/core'
import { DocsPageShell, PublicShell } from '@doneisbetter/gds-core/server'
import { createDocsVersionMeta, getDocsShellProps } from '../../../lib/docs-shell-config'

export default function ApiResponses() {
  return (
    <PublicShell {...getDocsShellProps('/docs/api/responses')}>
      <DocsPageShell
        eyebrow="API Reference"
        footerNext={{ href: '/docs/api/errors', label: 'Error reference' }}
        lead="Canonical response shapes for tokens, sessions, registration, permissions, and errors."
        meta={createDocsVersionMeta('API Version')}
        title="API Response Formats"
      >
      <Stack gap="xl">
        <Box>
          <Title mb="sm" order={2}>OAuth Token Response</Title>
          <Code block>
            {`{
  "access_token": "JWT_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "REFRESH_TOKEN",
  "id_token": "JWT_ID_TOKEN"
}`}
          </Code>
          <Text size="sm">
            <code>access_token</code> is used for API authorization. <code>id_token</code> carries identity claims.
            <code>refresh_token</code> is used to obtain a new access token without re-authentication.
          </Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>ID Token Claims</Title>
          <Code block>
            {`{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "email_verified": true,
  "iss": "https://sso.doneisbetter.com",
  "aud": "YOUR_CLIENT_ID",
  "exp": 1234567890,
  "iat": 1234560000
}`}
          </Code>
          <Text size="sm">
            App-level permission state is not the same thing as public-user authentication state.
            If your app depends on per-app access or per-app role, also read the permission APIs.
          </Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Public Session Validation</Title>
          <Code block>
            {`{
  "isValid": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "status": "active",
    "emailVerified": true,
    "loginMethods": ["password", "google"]
  }
}`}
          </Code>
          <Text size="sm">This is the response shape for <code>GET /api/public/session</code>.</Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Registration Response</Title>
          <Code block>
            {`{
  "success": true,
  "message": "Registration successful",
  "isAccountLinking": false,
  "loginMethods": ["password"],
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "createdAt": "2026-05-11T10:00:00.000Z"
  }
}`}
          </Code>
          <Text size="sm">If the email already belongs to a social-only account, the endpoint can return a successful password-linking response instead of creating a new record.</Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Permission Record Response</Title>
          <Code block>
            {`{
  "userId": "user-uuid",
  "clientId": "client-uuid",
  "appName": "Launchmass",
  "hasAccess": true,
  "status": "approved",
  "role": "admin",
  "requestedAt": "2026-05-11T10:00:00.000Z",
  "grantedAt": "2026-05-11T10:05:00.000Z",
  "grantedBy": "admin-uuid",
  "createdAt": "2026-05-11T10:00:00.000Z",
  "updatedAt": "2026-05-11T10:05:00.000Z"
}`}
          </Code>
          <Text size="sm">Canonical permission roles are <code>none</code>, <code>user</code>, <code>admin</code>. Canonical statuses are <code>pending</code>, <code>approved</code>, <code>revoked</code>.</Text>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Access Request Response</Title>
          <Code block>
            {`{
  "message": "Access request created",
  "permission": {
    "userId": "user-uuid",
    "clientId": "client-uuid",
    "appName": "Launchmass",
    "hasAccess": false,
    "status": "pending",
    "role": "none",
    "requestedAt": "2026-05-11T10:00:00.000Z"
  }
}`}
          </Code>
        </Box>

        <Box>
          <Title mb="sm" order={2}>Error Shapes</Title>
          <Text size="sm">OAuth endpoints use RFC-style errors:</Text>
          <Code block>
            {`{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or invalid"
}`}
          </Code>
          <Text size="sm">Application endpoints usually use simple JSON error messages:</Text>
          <Code block>
            {`{
  "error": "Forbidden",
  "message": "Access token client does not match requested client"
}`}
          </Code>
        </Box>
      </Stack>
      </DocsPageShell>
    </PublicShell>
  )
}
