import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Alert, Button, Loader, Stack, Text } from '@mantine/core'
import { IconAlertCircle, IconLock } from '@tabler/icons-react'
import { decodeAdminLoginState, sanitizeAdminRedirectPath } from '../../lib/adminAuthFlow.js'
import AuthSurface from '../../components/AuthSurface'

/**
 * Admin OAuth Callback
 * 
 * WHAT: Handles OAuth authorization code callback for admin dashboard
 * WHY: Complete the OAuth flow after user authorizes admin access
 * HOW: Exchange code for token, create public session, redirect to dashboard
 * 
 * CRITICAL: This creates a public session cookie so the homepage
 * can check admin status and show the SSO Admin button.
 */

export default function AdminCallbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const { code, error: oauthError, error_description, state } = router.query

    if (oauthError) {
      setError(error_description || oauthError)
      setLoading(false)
      return
    }

    if (!code) {
      // Still loading query params
      return
    }

    // WHAT: Exchange authorization code for session
    // WHY: Need to create public session cookie for homepage integration
    // HOW: Call our backend endpoint that handles token exchange + session creation
    async function completeLogin() {
      try {
        console.log('[Admin Callback] Starting login completion with code:', code.substring(0, 8) + '...')
        
        const response = await fetch('/api/admin/complete-oauth-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          credentials: 'include', // Important: include cookies
        })

        console.log('[Admin Callback] Response status:', response.status)

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[Admin Callback] Error response:', data)
          setError(data.error || `Failed to complete login (${response.status})`)
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log('[Admin Callback] Success:', data)

        const decodedState = decodeAdminLoginState(Array.isArray(state) ? state[0] : state)
        const redirectPath = sanitizeAdminRedirectPath(decodedState?.redirectPath)

        console.log('[Admin Callback] Redirecting to:', redirectPath)
        router.push(redirectPath)
      } catch (err) {
        console.error('[Admin Callback] Exception:', err)
        setError('Network error: ' + err.message)
        setLoading(false)
      }
    }

    completeLogin()
  }, [router.query, router])

  if (error) {
    return (
      <AuthSurface
        description="The admin authorization flow could not be completed."
        icon={<IconAlertCircle size={28} stroke={1.8} />}
        title="Access Denied"
      >
        <Stack gap="md">
          <Alert color="red" icon={<IconAlertCircle size={18} />} title="Authorization failed" variant="light">
            {error}
          </Alert>
          <Button component="a" href="/" variant="filled">
            Back to Home
          </Button>
        </Stack>
      </AuthSurface>
    )
  }

  return (
    <AuthSurface
      description="Finalizing admin authorization and restoring your dashboard session."
      icon={<IconLock size={28} stroke={1.8} />}
      title="SSO Admin"
    >
      <Stack align="center" gap="sm">
        <Loader color="brand" type="dots" />
        <Text c="dimmed" size="sm">
          Completing authorization...
        </Text>
      </Stack>
    </AuthSurface>
  )
}
