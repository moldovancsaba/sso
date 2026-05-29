import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { Box, Loader, Stack, Text, ThemeIcon } from '@mantine/core'
import { AuthShell } from '@doneisbetter/gds-core/server'
import { IconLock } from '@tabler/icons-react'
import { encodeAdminLoginState, sanitizeAdminRedirectPath } from '../../lib/adminAuthFlow.js'

/**
 * Admin Login Page - OAuth Flow
 * 
 * WHAT: Redirects to SSO OAuth authorization for admin dashboard access
 * WHY: Treat admin like any other OAuth client app - rock solid and consistent
 * HOW: Redirect to /api/oauth/authorize with sso-admin-dashboard client
 */

export default function AdminLoginPage() {
  const router = useRouter()
  const reauthRequired = router.query.reauth === '1'

  useEffect(() => {
    if (!router.isReady) {
      return
    }

    // WHAT: Build OAuth authorization URL for SSO Admin Dashboard
    // WHY: Use the same OAuth flow that all other apps use - it WORKS!
    const redirectPath = sanitizeAdminRedirectPath(
      Array.isArray(router.query.redirect) ? router.query.redirect[0] : router.query.redirect
    )
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'sso-admin-dashboard',
      redirect_uri: `${window.location.origin}/admin/callback`,
      scope: 'openid profile email',
      state: encodeAdminLoginState({ redirectPath }),
    })
    
    // WHAT: Redirect to OAuth authorize endpoint
    // WHY: This will check if user is logged in, has permission, and redirect back
    window.location.href = `/api/oauth/authorize?${params.toString()}`
  }, [router.isReady, router.query.redirect])

  // WHAT: Show loading while redirecting to OAuth
  return (
    <Box maw={520} mx="auto">
      <AuthShell
        brand={
          <ThemeIcon color="brand" radius="xl" size={56} variant="light">
            <IconLock size={28} stroke={1.8} />
          </ThemeIcon>
        }
        description={
          reauthRequired
            ? 'Recent authentication is required before continuing to the admin dashboard.'
            : 'Redirecting to the admin authorization flow.'
        }
        title="SSO Admin"
      >
      <Stack align="center" gap="sm">
        <Loader color="brand" type="dots" />
        <Text c="dimmed" size="sm">
          {reauthRequired ? 'Re-authenticating...' : 'Preparing sign-in...'}
        </Text>
      </Stack>
      </AuthShell>
    </Box>
  )
}
