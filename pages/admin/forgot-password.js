import { useState } from 'react'
import Link from 'next/link'
import {
  Alert,
  Anchor,
  Button,
  List,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'
import AuthSurface from '../../components/AuthSurface'

export async function getServerSideProps() {
  return { props: {} }
}

export default function AdminForgotPassword() {
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
      const res = await fetch('/api/admin/forgot-password', {
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
      description="Request a new admin password for the SSO control plane."
      title="Forgot Password"
    >
      <Paper p="lg">
        <Stack component="form" gap="md" onSubmit={handleSubmit}>
          {success ? (
            <Alert color="green" icon={<IconCircleCheck size={18} />}>
              {message}
            </Alert>
          ) : null}

          {message && !success ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />}>
              {message}
            </Alert>
          ) : null}

          {!success ? (
            <>
              <TextInput
                autoComplete="email"
                disabled={loading}
                label="Email Address"
                onChange={(event) => setEmail(event.currentTarget.value)}
                placeholder="admin or sso@doneisbetter.com"
                type="email"
                value={email}
              />
              <Button loading={loading} type="submit">
                Send New Password
              </Button>
            </>
          ) : (
            <Text c="dimmed" size="sm">
              If an admin account exists with this email, a replacement password will arrive shortly.
            </Text>
          )}

          <Anchor component={Link} href="/admin" size="sm">
            Back to Login
          </Anchor>
        </Stack>
      </Paper>

      <Paper p="lg">
        <Stack gap="sm">
          <Text fw={600}>Security Note</Text>
          <List size="sm">
            <List.Item>You&apos;ll receive a new auto-generated password via email.</List.Item>
            <List.Item>Use it to sign in immediately.</List.Item>
            <List.Item>Change it to something memorable after logging in.</List.Item>
            <List.Item>Never share your password with anyone.</List.Item>
          </List>
        </Stack>
      </Paper>
    </AuthSurface>
  )
}
