import { useState } from 'react'
import Head from 'next/head'
import { Alert, Button, Code, Stack, Text } from '@mantine/core'
import { IconAlertCircle, IconBug, IconCheck } from '@tabler/icons-react'
import PublicPageLayout from '../components/PublicPageLayout'

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
      <PublicPageLayout subtitle="Diagnostic endpoint check for the public login API." title="Fetch Test">
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
      </PublicPageLayout>
    </>
  )
}
