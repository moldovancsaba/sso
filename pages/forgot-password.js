import { useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Anchor,
  Button,
  List,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core'
import { IconAlertCircle, IconCheck, IconKey, IconMail } from '@tabler/icons-react'
import AuthSurface from '../components/AuthSurface'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!email.trim()) {
      setMessage('Please enter your email address')
      return
    }

    setLoading(true)
    setMessage('')
    setSuccess(false)

    try {
      const res = await fetch('/api/public/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setMessage(data.message || 'Check your email for your new password')
        setEmail('')
      } else {
        setMessage(data.error || 'An error occurred. Please try again.')
      }
    } catch {
      setMessage('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSurface
      description="No worries. Enter your email and we will send a replacement password if the account exists."
      icon={IconKey}
      maxWidth={520}
      title="Forgot Password?"
    >
      <Stack gap="lg">
        {!success ? (
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                autoComplete="email"
                disabled={loading}
                label="Email address"
                leftSection={<IconMail size={16} stroke={1.8} />}
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
              <Button fullWidth loading={loading} type="submit">
                Reset Password
              </Button>
            </Stack>
          </form>
        ) : (
          <Alert color="green" icon={<IconCheck size={16} />} title="Check your email">
            If an account exists with this email, you will receive a new password shortly.
          </Alert>
        )}

        {message && !success ? (
          <Alert color="yellow" icon={<IconAlertCircle size={16} />} title="Unable to send reset">
            {message}
          </Alert>
        ) : null}

        <Alert color="gray" title="What happens next">
          <List
            spacing="xs"
            icon={
              <ThemeIcon color="brand" radius="xl" size={18} variant="light">
                <IconCheck size={12} stroke={2} />
              </ThemeIcon>
            }
          >
            <List.Item>We email a secure, auto-generated password.</List.Item>
            <List.Item>Use it to sign in immediately.</List.Item>
            <List.Item>Change it after login to something memorable.</List.Item>
            <List.Item>Keep the replacement password private.</List.Item>
          </List>
        </Alert>

        <Stack align="center" gap={4}>
          <Text c="dimmed" size="sm">
            Remember your password?{' '}
            <Anchor component={Link} href="/login" fw={600}>
              Sign in
            </Anchor>
          </Text>
          <Anchor component={Link} href="/" size="sm">
            Back to home
          </Anchor>
        </Stack>
      </Stack>
    </AuthSurface>
  )
}
