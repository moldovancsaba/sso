import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Alert, Anchor, Box, Button, Code, Group, Stack, Text } from '@mantine/core'
import { ArticleShell, PublicBrandFooter, PublicShell } from '@doneisbetter/gds-core/server'
import { IconAlertCircle, IconBug, IconCheck } from '@tabler/icons-react'

export default function TestFetch() {
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const testLogin = async () => {
    setResult('Testing...')
    setError('')

    try {
      const res = await fetch('/api/public/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpass123',
        }),
      })

      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setError(`Error: ${err.message}\nType: ${err.constructor.name}\nStack: ${err.stack}`)
    }
  }

  return (
    <>
      <Head>
        <title>Fetch Test</title>
      </Head>
      <PublicShell
        brand={
          <Anchor component={Link} href="/" fw={700} td="none">
            DoneIsBetter SSO
          </Anchor>
        }
        compact
        footer={
          <PublicBrandFooter
            brandTitle="DoneIsBetter"
            compact
            description="Universal SSO service for shared identity, OAuth, and centralized account access."
            legal={<Text c="dimmed" size="xs">© 2025 DoneIsBetter. All rights reserved.</Text>}
            secondary={
              <Group gap="md">
                <Anchor component={Link} href="/" size="xs">Home</Anchor>
                <Anchor component={Link} href="/docs" size="xs">Documentation</Anchor>
                <Anchor component={Link} href="/privacy" size="xs">Privacy Policy</Anchor>
              </Group>
            }
          />
        }
        maxContentWidth="md"
      >
        <Box py="xl">
          <ArticleShell
            eyebrow="Diagnostics"
            lead="Diagnostic endpoint check for the public login API."
            title="Fetch Test"
          >
        <Stack gap="lg">
          <Button leftSection={<IconBug size={16} />} onClick={testLogin} w="fit-content">
            Test Login API
          </Button>

          {result ? (
            <Alert color="green" icon={<IconCheck size={16} />} title="Success">
              <Code block>{result}</Code>
            </Alert>
          ) : null}

          {error ? (
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error">
              <Code block>{error}</Code>
            </Alert>
          ) : null}

          {!result && !error ? (
            <Text c="dimmed" size="sm">
              Run the request to inspect the API response payload in this environment.
            </Text>
          ) : null}
        </Stack>
          </ArticleShell>
        </Box>
      </PublicShell>
    </>
  )
}
