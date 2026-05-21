import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconAlertCircle, IconCheck, IconShieldCheck } from '@tabler/icons-react'

// WHAT: Server-side render to ensure request param is immediately available
// WHY: useRouter().query can be empty on first render, breaking OAuth flow
export async function getServerSideProps(context) {
  const { request } = context.query
  return {
    props: {
      initialRequest: request || null,
    },
  }
}

export default function ConsentPage({ initialRequest }) {
  const router = useRouter()
  const requestParam = initialRequest || router.query.request
  const [authRequest, setAuthRequest] = useState(null)
  const [scopeDetails, setScopeDetails] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const fetchScopeDetails = useCallback(async (scopes) => {
    const scopeMap = {
      openid: { name: 'OpenID', description: 'Required for authentication. Provides your user ID.', category: 'authentication' },
      profile: { name: 'Profile', description: 'Access to your basic profile information (name, picture).', category: 'user_info' },
      email: { name: 'Email', description: 'Access to your email address.', category: 'user_info' },
      offline_access: { name: 'Offline Access', description: 'Keep you signed in across sessions (refresh token).', category: 'authentication' },
      'read:cards': { name: 'Read Cards', description: 'View your card collection and rankings.', category: 'narimato' },
      'write:cards': { name: 'Manage Cards', description: 'Create, update, and delete cards in your collection.', category: 'narimato' },
      'read:rankings': { name: 'Read Rankings', description: 'View global and personal card rankings.', category: 'narimato' },
      'read:decks': { name: 'Read Decks', description: 'View your card decks.', category: 'cardmass' },
      'write:decks': { name: 'Manage Decks', description: 'Create, update, and delete your card decks.', category: 'cardmass' },
      'read:games': { name: 'Read Games', description: 'View your game history and statistics.', category: 'playmass' },
      'write:games': { name: 'Manage Games', description: 'Create and update game sessions.', category: 'playmass' },
    }

    return scopes.map((scope) => (
      scopeMap[scope] || { name: scope, description: scope, category: 'other' }
    ))
  }, [])

  const checkSessionAndLoadRequest = useCallback(async () => {
    try {
      const res = await fetch('/api/sso/validate', { credentials: 'include' })
      if (!res.ok) {
        router.push(requestParam ? `/login?oauth_request=${encodeURIComponent(requestParam)}` : '/login')
        return
      }

      const data = await res.json()
      if (!data?.isValid) {
        router.push(requestParam ? `/login?oauth_request=${encodeURIComponent(requestParam)}` : '/login')
        return
      }

      setUser(data.user)

      if (!requestParam) {
        setError('Missing authorization request')
        setLoading(false)
        return
      }

      try {
        const base64 = requestParam.replace(/-/g, '+').replace(/_/g, '/')
        const jsonString = atob(base64)
        const decodedRequest = JSON.parse(jsonString)
        setAuthRequest(decodedRequest)

        const scopes = decodedRequest.scope.split(' ')
        const details = await fetchScopeDetails(scopes)
        setScopeDetails(details)
      } catch {
        setError('Invalid authorization request')
      }

      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [fetchScopeDetails, requestParam, router])

  useEffect(() => {
    checkSessionAndLoadRequest()
  }, [checkSessionAndLoadRequest])

  async function handleApprove() {
    if (!authRequest || !user) return

    setSubmitting(true)
    setError(null)

    try {
      const consentRes = await fetch('/api/oauth/consent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: authRequest.client_id,
          scope: authRequest.scope,
          approved: true,
        }),
      })

      if (!consentRes.ok) {
        const data = await consentRes.json()
        throw new Error(data.error || 'Failed to store consent')
      }

      const codeRes = await fetch('/api/oauth/authorize/approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: authRequest.client_id,
          redirect_uri: authRequest.redirect_uri,
          scope: authRequest.scope,
          state: authRequest.state,
          code_challenge: authRequest.code_challenge,
          code_challenge_method: authRequest.code_challenge_method,
        }),
      })

      if (!codeRes.ok) {
        const data = await codeRes.json()
        throw new Error(data.error || 'Failed to generate authorization code')
      }

      const codeData = await codeRes.json()
      const redirectUrl = new URL(authRequest.redirect_uri)
      redirectUrl.searchParams.set('code', codeData.code)
      redirectUrl.searchParams.set('state', authRequest.state)
      window.location.href = redirectUrl.toString()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  function handleDeny() {
    if (!authRequest) return

    const redirectUrl = new URL(authRequest.redirect_uri)
    redirectUrl.searchParams.set('error', 'access_denied')
    redirectUrl.searchParams.set('error_description', 'User denied authorization')
    redirectUrl.searchParams.set('state', authRequest.state)
    window.location.href = redirectUrl.toString()
  }

  async function handleSwitchAccount() {
    if (!authRequest || !requestParam) return

    setSubmitting(true)
    setError(null)

    try {
      await fetch('/api/public/logout', {
        method: 'POST',
        credentials: 'include',
      })

      window.location.href = `/login?oauth_request=${encodeURIComponent(requestParam)}`
    } catch {
      setError('Failed to switch account')
      setSubmitting(false)
    }
  }

  const groupedScopes = scopeDetails.reduce((acc, scope) => {
    const category = scope.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(scope)
    return acc
  }, {})

  const categoryNames = {
    authentication: 'Authentication',
    user_info: 'User Information',
    narimato: 'Narimato',
    cardmass: 'CardMass',
    playmass: 'PlayMass',
    other: 'Other Permissions',
  }

  if (loading) {
    return (
      <Center mih="100vh" px="md" py="xl" bg="gray.0">
        <Stack align="center" gap="sm">
          <Loader color="brand" type="dots" />
          <Text c="dimmed" size="sm">
            Loading authorization request...
          </Text>
        </Stack>
      </Center>
    )
  }

  if (error || !authRequest) {
    return (
      <Center mih="100vh" px="md" py="xl" bg="gray.0">
        <Container size={560} w="100%">
          <Paper p="xl" radius="xl" shadow="lg" withBorder>
            <Stack gap="md">
              <Group gap="sm">
                <IconAlertCircle color="var(--mantine-color-red-6)" size={28} />
                <Title c="red.7" order={1}>
                  Authorization Error
                </Title>
              </Group>
              <Alert color="red" icon={<IconAlertCircle size={18} />} title="Request could not be loaded" variant="light">
                {error || 'Invalid authorization request'}
              </Alert>
              <Text c="dimmed" size="sm">
                This authorization link is invalid or has expired. Return to the application you were trying to access and start the flow again.
              </Text>
            </Stack>
          </Paper>
        </Container>
      </Center>
    )
  }

  return (
    <Center mih="100vh" px="md" py="xl" bg="gray.0">
      <Container size={680} w="100%">
        <Paper p="xl" radius="xl" shadow="lg" withBorder>
          <Stack gap="xl">
            <Stack align="center" gap="sm">
              {authRequest.client_logo ? (
                // Third-party client logos are runtime-provided URLs, so the native img element is intentional here.
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={authRequest.client_name} src={authRequest.client_logo} style={{ width: 64, height: 64 }} />
              ) : (
                <Box>
                  <IconShieldCheck color="var(--mantine-color-brand-6)" size={40} stroke={1.8} />
                </Box>
              )}
              <Stack align="center" gap={4}>
                <Title order={1} ta="center">
                  Authorize Access
                </Title>
                <Text c="dimmed" ta="center">
                  <Text component="span" fw={600}>
                    {authRequest.client_name}
                  </Text>{' '}
                  is requesting access to your account.
                </Text>
                {authRequest.client_homepage ? (
                  <Anchor href={authRequest.client_homepage} rel="noopener noreferrer" size="sm" target="_blank">
                    {authRequest.client_homepage}
                  </Anchor>
                ) : null}
              </Stack>
            </Stack>

            {user ? (
              <Paper bg="gray.0" p="md" radius="lg" withBorder>
                <Stack gap="xs">
                  <Text size="sm">
                    Logged in as <Text component="span" fw={600}>{user.email}</Text>
                  </Text>
                  <Anchor
                    component="button"
                    disabled={submitting}
                    onClick={handleSwitchAccount}
                    size="sm"
                    type="button"
                  >
                    Not you? Switch account
                  </Anchor>
                </Stack>
              </Paper>
            ) : null}

            <Stack gap="md">
              <Title order={2}>This application will be able to:</Title>
              {Object.entries(groupedScopes).map(([category, scopes]) => (
                <Stack gap="xs" key={category}>
                  <Badge color="brand" radius="sm" variant="light" w="fit-content">
                    {categoryNames[category] || category}
                  </Badge>
                  <Stack gap="xs">
                    {scopes.map((scope, idx) => (
                      <Paper key={idx} p="md" radius="lg" withBorder>
                        <Group align="flex-start" gap="sm" wrap="nowrap">
                          <IconCheck color="var(--mantine-color-green-6)" size={20} style={{ marginTop: 2 }} />
                          <Stack flex={1} gap={2}>
                            <Text fw={600}>{scope.name}</Text>
                            <Text c="dimmed" size="sm">
                              {scope.description}
                            </Text>
                          </Stack>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>

            {error ? (
              <Alert color="red" icon={<IconAlertCircle size={18} />} title="Authorization failed" variant="light">
                {error}
              </Alert>
            ) : null}

            <Group grow>
              <Button loading={submitting} onClick={handleApprove} size="md">
                Authorize
              </Button>
              <Button color="gray" disabled={submitting} onClick={handleDeny} size="md" variant="default">
                Deny
              </Button>
            </Group>

            <Text c="dimmed" size="sm">
              By authorizing, you allow this application to access the information listed above. You can revoke access later from your account settings.
            </Text>
          </Stack>
        </Paper>
      </Container>
    </Center>
  )
}
