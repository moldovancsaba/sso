/**
 * Public User Registration Page
 *
 * WHY: Provides a self-service registration interface for public users to create accounts
 * WHAT: Mantine-based registration form for email, password, confirm password, and name
 * HOW: Calls POST /api/public/register, handles validation, sets session cookie, redirects
 */

import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Alert,
  Anchor,
  Box,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { AuthShell } from '@doneisbetter/gds-core/server'
import { IconAlertCircle, IconAt, IconLock, IconUser, IconUserPlus } from '@tabler/icons-react'

export async function getServerSideProps(context) {
  const { redirect, oauth_request } = context.query

  return {
    props: {
      initialRedirect: redirect || null,
      initialOAuthRequest: oauth_request || null,
    },
  }
}

export default function RegisterPage({ initialRedirect, initialOAuthRequest }) {
  const router = useRouter()
  const redirect = initialRedirect || router.query.redirect
  const oauthRequest = initialOAuthRequest || router.query.oauth_request
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

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

  const handleChange = (field) => (event) => {
    const value = event.currentTarget.value
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
    setServerError('')
  }

  const validate = () => {
    const nextErrors = {}

    if (!formData.email) {
      nextErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Please enter a valid email address'
    }

    if (!formData.name) {
      nextErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    setLoading(true)
    setServerError('')

    try {
      const res = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          name: formData.name.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        if (oauthRequest) {
          try {
            const base64 = oauthRequest.replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))))
            const params = new URLSearchParams({
              response_type: decoded.response_type,
              client_id: decoded.client_id,
              redirect_uri: decoded.redirect_uri,
              scope: decoded.scope,
              state: decoded.state,
            })

            if (decoded.code_challenge) {
              params.set('code_challenge', decoded.code_challenge)
              params.set('code_challenge_method', decoded.code_challenge_method || 'S256')
            }

            window.location.href = `/api/oauth/authorize?${params.toString()}`
            return
          } catch (err) {
            console.error('[Register] Failed to decode oauth_request:', err)
          }
        }

        if (redirect && isValidRedirectUrl(decodeURIComponent(redirect))) {
          window.location.href = decodeURIComponent(redirect)
        } else {
          window.location.href = '/account'
        }
      } else if (res.status === 409) {
        setErrors({ email: 'This email is already registered' })
      } else {
        setServerError(data.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      console.error('[Register] Registration error:', err)
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loginHref = oauthRequest
    ? `/login?oauth_request=${encodeURIComponent(oauthRequest)}`
    : redirect
      ? `/login?redirect=${encodeURIComponent(redirect)}`
      : '/login'

  return (
    <>
      <Head>
        <title>Register - SSO Service</title>
        <meta name="description" content="Create your SSO account" />
      </Head>

      <Box maw={560} mx="auto">
        <AuthShell
          brand={(
            <Box
              bg="var(--mantine-color-brand-light)"
              c="var(--mantine-color-brand-filled)"
              component="span"
              display="inline-flex"
              h={56}
              style={{ borderRadius: '9999px', alignItems: 'center', justifyContent: 'center' }}
              w={56}
            >
              <IconUserPlus size={28} stroke={1.8} />
            </Box>
          )}
          description="Create your account to continue into the SSO service."
          title="Create Account"
        >
        <Stack gap="lg">
          {serverError ? (
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="Registration failed">
              {serverError}
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                autoComplete="name"
                disabled={loading}
                error={errors.name}
                label="Full name"
                leftSection={<IconUser size={16} stroke={1.8} />}
                onChange={handleChange('name')}
                placeholder="Enter your full name"
                value={formData.name}
              />
              <TextInput
                autoComplete="email"
                disabled={loading}
                error={errors.email}
                label="Email address"
                leftSection={<IconAt size={16} stroke={1.8} />}
                onChange={handleChange('email')}
                placeholder="Enter your email"
                type="email"
                value={formData.email}
              />
              <PasswordInput
                autoComplete="new-password"
                disabled={loading}
                error={errors.password}
                label="Password"
                leftSection={<IconLock size={16} stroke={1.8} />}
                onChange={handleChange('password')}
                placeholder="Create a strong password"
                value={formData.password}
              />
              <PasswordInput
                autoComplete="new-password"
                disabled={loading}
                error={errors.confirmPassword}
                label="Confirm password"
                leftSection={<IconLock size={16} stroke={1.8} />}
                onChange={handleChange('confirmPassword')}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
              />
              <Button fullWidth loading={loading} type="submit">
                Create Account
              </Button>
            </Stack>
          </form>

          <Stack align="center" gap={4}>
            <Text c="dimmed" size="sm">
              Already have an account?{' '}
              <Anchor component={Link} href={loginHref} fw={600}>
                Sign in
              </Anchor>
            </Text>
            <Anchor component={Link} href="/" size="sm">
              Back to home
            </Anchor>
          </Stack>
        </Stack>
        </AuthShell>
      </Box>
    </>
  )
}
