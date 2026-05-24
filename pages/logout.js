import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Loader, Stack, Text } from '@mantine/core'
import { IconLogout } from '@tabler/icons-react'
import AuthSurface from '../components/AuthSurface'

export default function LogoutPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Logging out...')
  const { redirect } = router.query

  useEffect(() => {
    const performLogout = async () => {
      try {
        await fetch('/api/public/logout', {
          method: 'POST',
          credentials: 'include',
        }).catch((err) => {
          console.error('[Logout] Public logout error:', err)
        })

        await fetch('/api/users/logout', {
          method: 'POST',
          credentials: 'include',
        }).catch((err) => {
          console.error('[Logout] Admin logout error:', err)
        })

        await new Promise((resolve) => setTimeout(resolve, 500))
        setStatus('Logged out successfully')

        if (redirect) {
          const redirectUrl = decodeURIComponent(redirect)
          if (isValidRedirectUrl(redirectUrl)) {
            window.location.href = redirectUrl
            return
          }
        }

        window.location.href = '/'
      } catch (err) {
        console.error('[Logout] Logout error:', err)
        setStatus('Logout failed. Redirecting...')

        setTimeout(() => {
          if (redirect && isValidRedirectUrl(decodeURIComponent(redirect))) {
            window.location.href = decodeURIComponent(redirect)
          } else {
            window.location.href = '/'
          }
        }, 1000)
      }
    }

    performLogout()
  }, [redirect])

  const isValidRedirectUrl = (url) => {
    try {
      const parsed = new URL(url)
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return true
      }
      if (parsed.hostname.endsWith('.doneisbetter.com') || parsed.hostname === 'doneisbetter.com') {
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return (
    <>
      <Head>
        <title>Logging out - SSO Service</title>
        <meta name="description" content="Logging out of SSO" />
      </Head>

      <AuthSurface
        description="Please wait while we clear your active sessions and return you to a safe destination."
        icon={IconLogout}
        title={status}
      >
        <Stack align="center" gap="md" py="sm">
          <Loader size="lg" />
          <Text c="dimmed" size="sm">
            Please wait...
          </Text>
        </Stack>
      </AuthSurface>
    </>
  )
}
