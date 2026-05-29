import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Code,
  Container,
  CopyButton,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconCircleCheck,
  IconCopy,
  IconLogout,
  IconPlus,
} from '@tabler/icons-react'
import { ResponsiveDataView } from '@doneisbetter/gds-admin/client'
import { PageHeader } from '@doneisbetter/gds-admin/server'
import { fetchAdminJson, isAuthRedirectError } from '../../lib/adminAuthFlow.js'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/oauth-clients', label: 'Clients' },
]

function initialClientForm() {
  return {
    name: '',
    description: '',
    redirect_uris: '',
    allowed_scopes: 'openid profile email offline_access',
    homepage_uri: '',
    logo_uri: '',
    require_pkce: false,
  }
}

function isErrorMessage(message) {
  return message.includes('Error') || message.includes('Failed') || message.includes('Invalid')
}

function ClientForm({ formData, loading, onChange, onSubmit, submitLabel, onCancel }) {
  return (
    <Stack component="form" gap="md" onSubmit={onSubmit}>
      <TextInput
        label="Client Name"
        onChange={(event) => onChange('name', event.currentTarget.value)}
        placeholder="e.g., Narimato"
        required
        value={formData.name}
      />

      <TextInput
        label="Description"
        onChange={(event) => onChange('description', event.currentTarget.value)}
        placeholder="Brief description of the application"
        value={formData.description}
      />

      <Textarea
        autosize
        label="Redirect URIs"
        minRows={4}
        onChange={(event) => onChange('redirect_uris', event.currentTarget.value)}
        placeholder={'https://example.com/auth/callback\nhttps://example.com/api/oauth/callback'}
        required
        value={formData.redirect_uris}
      />

      <TextInput
        label="Allowed Scopes"
        onChange={(event) => onChange('allowed_scopes', event.currentTarget.value)}
        placeholder="openid profile email read:cards write:cards"
        value={formData.allowed_scopes}
      />

      <TextInput
        label="Homepage URL"
        onChange={(event) => onChange('homepage_uri', event.currentTarget.value)}
        placeholder="https://example.com"
        type="url"
        value={formData.homepage_uri}
      />

      <TextInput
        label="Logo URL"
        onChange={(event) => onChange('logo_uri', event.currentTarget.value)}
        placeholder="https://example.com/logo.png"
        type="url"
        value={formData.logo_uri}
      />

      <Checkbox
        checked={formData.require_pkce}
        description="Enable this for public clients such as SPAs or mobile apps."
        label="Require PKCE"
        onChange={(event) => onChange('require_pkce', event.currentTarget.checked)}
      />

      <Group justify="flex-end">
        {onCancel ? (
          <Button onClick={onCancel} type="button" variant="default">
            Cancel
          </Button>
        ) : null}
        <Button loading={loading} type="submit">
          {submitLabel}
        </Button>
      </Group>
    </Stack>
  )
}

export default function OAuthClientsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [clients, setClients] = useState([])
  const [editingClientId, setEditingClientId] = useState(null)
  const [formData, setFormData] = useState(initialClientForm())
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [newClientSecret, setNewClientSecret] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const loadClients = useCallback(async () => {
    const data = await fetchAdminJson('/api/admin/oauth-clients')
    setClients(data.clients || [])
  }, [])

  const initializePage = useCallback(async () => {
    try {
      setLoading(true)
      const sessionData = await fetchAdminJson('/api/admin/session')
      setAdmin(sessionData?.user || null)
      await loadClients()
    } catch (e) {
      if (!isAuthRedirectError(e)) {
        console.error('Session check error:', e)
        setMessage(e.message || 'Failed to load OAuth clients')
      }
    } finally {
      setLoading(false)
    }
  }, [loadClients])

  useEffect(() => {
    initializePage()
  }, [initializePage])

  function updateForm(key, value) {
    setFormData((current) => ({ ...current, [key]: value }))
  }

  function resetEditorState() {
    setEditingClientId(null)
    setShowCreateForm(false)
    setFormData(initialClientForm())
  }

  function parseFormPayload() {
    const redirectUris = formData.redirect_uris
      .split(/[\n,]/)
      .map((uri) => uri.trim())
      .filter(Boolean)

    if (redirectUris.length === 0) {
      throw new Error('At least one redirect URI is required')
    }

    for (const uri of redirectUris) {
      try {
        new URL(uri)
      } catch {
        throw new Error(`Invalid redirect URI: "${uri}"`)
      }
    }

    return {
      name: formData.name.trim(),
      description: formData.description.trim(),
      redirect_uris: redirectUris,
      allowed_scopes: formData.allowed_scopes
        .split(/\s+/)
        .map((scope) => scope.trim())
        .filter(Boolean),
      homepage_uri: formData.homepage_uri.trim() || null,
      logo_uri: formData.logo_uri.trim() || null,
      require_pkce: formData.require_pkce,
    }
  }

  async function handleCreateClient(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setNewClientSecret(null)

    try {
      const data = await fetchAdminJson('/api/admin/oauth-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseFormPayload()),
      })
      setNewClientSecret(data.client_secret)
      setMessage('Client created successfully. Save the secret now.')
      resetEditorState()
      await loadClients()
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage(err.message || 'Failed to create client')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateClient(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await fetchAdminJson(`/api/admin/oauth-clients/${editingClientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parseFormPayload()),
      })
      setMessage('Client updated successfully.')
      resetEditorState()
      await loadClients()
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage(err.message || 'Failed to update client')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteClient(clientId, clientName) {
    if (!confirm(`Are you sure you want to delete "${clientName}"? This will invalidate all tokens.`)) {
      return
    }

    try {
      setLoading(true)
      await fetchAdminJson(`/api/admin/oauth-clients/${clientId}`, {
        method: 'DELETE',
      })
      setMessage(`Client "${clientName}" deleted successfully.`)
      await loadClients()
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage(err.message || 'Failed to delete client')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(clientId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'

    try {
      setLoading(true)
      await fetchAdminJson(`/api/admin/oauth-clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setMessage(`Client status updated to ${newStatus}.`)
      await loadClients()
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage(err.message || 'Failed to update client status')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerateSecret(clientId, clientName) {
    if (!confirm(`Regenerate secret for "${clientName}"? The old secret will stop working immediately.`)) {
      return
    }

    try {
      setLoading(true)
      setMessage('')
      const data = await fetchAdminJson(`/api/admin/oauth-clients/${clientId}/regenerate-secret`, {
        method: 'POST',
      })
      setNewClientSecret(data.client_secret)
      setMessage(`Secret regenerated for "${clientName}". Save it now.`)
      await loadClients()
    } catch (err) {
      if (!isAuthRedirectError(err)) {
        setMessage(err.message || 'Failed to regenerate secret')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleStartEdit(client) {
    setEditingClientId(client.client_id)
    setFormData({
      name: client.name,
      description: client.description || '',
      redirect_uris: client.redirect_uris.join('\n'),
      allowed_scopes: client.allowed_scopes.join(' '),
      homepage_uri: client.homepage_uri || '',
      logo_uri: client.logo_uri || '',
      require_pkce: client.require_pkce || false,
    })
    setShowCreateForm(false)
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' })
      window.location.href = '/admin'
    } catch (logoutError) {
      console.error('Logout error:', logoutError)
      setMessage('Logout failed. Please try again.')
    }
  }

  if (!admin && !loading) {
    return (
      <Container py="xl" size="xl">
        <Stack gap="lg">
          <Paper p="lg">
            <Stack gap="md">
              <PageHeader
                description="Admin login is required for OAuth client management."
                title="OAuth Clients"
              />
              <Group gap="sm" wrap="wrap">
                {adminNavItems.map((item) => (
                  <Button
                    key={item.href}
                    component={Link}
                    href={item.href}
                    variant={router.pathname === item.href ? 'filled' : 'default'}
                  >
                    {item.label}
                  </Button>
                ))}
              </Group>
            </Stack>
          </Paper>
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            Please log in to access OAuth client management.
          </Alert>
        </Stack>
      </Container>
    )
  }

  return (
    <Container py="xl" size="xl">
      <Stack gap="lg">
        <Paper p="lg">
          <Stack gap="md">
            <PageHeader
              description="Create, rotate, suspend, and inspect OAuth client applications."
              primaryAction={(
                <ActionIcon
                  aria-label="Logout"
                  color="gray"
                  onClick={handleLogout}
                  variant="default"
                >
                  <IconLogout size={18} />
                </ActionIcon>
              )}
              secondaryActions={(
                <Group gap="sm" justify="flex-end" wrap="wrap">
                  <Text c="dimmed" size="sm">
                    {admin?.email} ({admin?.role})
                  </Text>
                  {admin?.role === 'admin' ? (
                    <Button
                      leftSection={<IconPlus size={18} />}
                      onClick={() => {
                        setEditingClientId(null)
                        setFormData(initialClientForm())
                        setShowCreateForm((current) => !current)
                      }}
                    >
                      {showCreateForm ? 'Close Create Form' : 'New Client'}
                    </Button>
                  ) : null}
                </Group>
              )}
              title="OAuth Clients"
            />
            <Group gap="sm" wrap="wrap">
              {adminNavItems.map((item) => (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  variant={router.pathname === item.href ? 'filled' : 'default'}
                >
                  {item.label}
                </Button>
              ))}
            </Group>
          </Stack>
        </Paper>

      {message ? (
        <Alert
          color={isErrorMessage(message) ? 'red' : 'blue'}
          icon={isErrorMessage(message) ? <IconAlertCircle size={18} /> : <IconCircleCheck size={18} />}
        >
          {message}
        </Alert>
      ) : null}

      {newClientSecret ? (
        <Alert color="yellow" title="Save client secret now">
          <Stack gap="sm">
            <Text size="sm">This secret will not be shown again.</Text>
            <Group align="center" wrap="nowrap">
              <Code block style={{ flex: 1, whiteSpace: 'pre-wrap' }}>
                {newClientSecret}
              </Code>
              <CopyButton value={newClientSecret}>
                {({ copied, copy }) => (
                  <Button leftSection={<IconCopy size={18} />} onClick={copy} variant="default">
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </CopyButton>
            </Group>
            <Group justify="flex-end">
              <Button onClick={() => setNewClientSecret(null)} variant="default">
                I&apos;ve saved it
              </Button>
            </Group>
          </Stack>
        </Alert>
      ) : null}

      <Modal
        onClose={resetEditorState}
        opened={Boolean(editingClientId)}
        size="lg"
        title="Edit OAuth Client"
      >
        <ClientForm
          formData={formData}
          loading={loading}
          onCancel={resetEditorState}
          onChange={updateForm}
          onSubmit={handleUpdateClient}
          submitLabel="Update Client"
        />
      </Modal>

      {showCreateForm && admin?.role === 'admin' ? (
        <Paper p="lg">
          <Stack gap="md">
            <Title order={2}>Create OAuth Client</Title>
            <ClientForm
              formData={formData}
              loading={loading}
              onCancel={() => setShowCreateForm(false)}
              onChange={updateForm}
              onSubmit={handleCreateClient}
              submitLabel="Create Client"
            />
          </Stack>
        </Paper>
      ) : null}

      <Card>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={2}>Registered Clients</Title>
            <Badge variant="light">{clients.length}</Badge>
          </Group>

          <ResponsiveDataView
            columns={[
              {
                key: 'name',
                label: 'Client',
                render: (client) => (
                  <Stack gap={4}>
                    <Text fw={700}>{client.name}</Text>
                    {client.description ? (
                      <Text c="dimmed" size="sm">
                        {client.description}
                      </Text>
                    ) : null}
                  </Stack>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (client) => (
                  <Group gap="xs">
                    <Badge color={client.status === 'active' ? 'green' : 'yellow'}>
                      {client.status}
                    </Badge>
                    <Badge color={client.require_pkce ? 'blue' : 'gray'} variant="light">
                      {client.require_pkce ? 'PKCE Required' : 'PKCE Optional'}
                    </Badge>
                  </Group>
                ),
              },
              {
                key: 'allowed_scopes',
                label: 'Scopes',
                render: (client) => (
                  <Group gap="xs">
                    {client.allowed_scopes.map((scope) => (
                      <Badge key={scope} variant="light">
                        {scope}
                      </Badge>
                    ))}
                  </Group>
                ),
              },
              {
                key: 'updated_at',
                label: 'Updated',
                render: (client) => new Date(client.updated_at).toLocaleDateString(),
              },
            ]}
            data={clients}
            emptyDescription="Create an OAuth client to register the first integrated application."
            emptyTitle="No OAuth clients registered"
            getRowKey={(client) => client.client_id}
            loading={loading}
            renderCard={(client) => (
              <Paper key={client.client_id} p="lg">
                <ClientCardContent
                  admin={admin}
                  client={client}
                  handleDeleteClient={handleDeleteClient}
                  handleRegenerateSecret={handleRegenerateSecret}
                  handleStartEdit={handleStartEdit}
                  handleToggleStatus={handleToggleStatus}
                />
              </Paper>
            )}
          />
        </Stack>
      </Card>
      </Stack>
    </Container>
  )
}

function ClientCardContent({
  admin,
  client,
  handleDeleteClient,
  handleRegenerateSecret,
  handleStartEdit,
  handleToggleStatus,
}) {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text fw={700} size="lg">
            {client.name}
          </Text>
          {client.description ? (
            <Text c="dimmed" size="sm">
              {client.description}
            </Text>
          ) : null}
          <Group gap="xs">
            <Badge color={client.status === 'active' ? 'green' : 'yellow'}>
              {client.status}
            </Badge>
            <Badge color={client.require_pkce ? 'blue' : 'gray'} variant="light">
              {client.require_pkce ? 'PKCE Required' : 'PKCE Optional'}
            </Badge>
          </Group>
        </Stack>

        {admin?.role === 'admin' ? (
          <Group gap="xs" wrap="wrap">
            <Button onClick={() => handleStartEdit(client)} variant="default">
              Edit
            </Button>
            <Button onClick={() => handleRegenerateSecret(client.client_id, client.name)} variant="default">
              Regenerate Secret
            </Button>
            <Button onClick={() => handleToggleStatus(client.client_id, client.status)} variant="default">
              {client.status === 'active' ? 'Suspend' : 'Activate'}
            </Button>
            <Button color="red" onClick={() => handleDeleteClient(client.client_id, client.name)}>
              Delete
            </Button>
          </Group>
        ) : null}
      </Group>

      <div>
        <Text fw={600} size="sm">Client ID</Text>
        <Group align="center" wrap="nowrap">
          <Code block style={{ flex: 1, whiteSpace: 'pre-wrap' }}>
            {client.client_id}
          </Code>
          <CopyButton value={client.client_id}>
            {({ copied, copy }) => (
              <Button leftSection={<IconCopy size={18} />} onClick={copy} variant="default">
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
          </CopyButton>
        </Group>
      </div>

      <div>
        <Text fw={600} size="sm">Redirect URIs</Text>
        <Stack gap={4} mt="xs">
          {client.redirect_uris.map((uri) => (
            <Code key={uri} block>{uri}</Code>
          ))}
        </Stack>
      </div>

      <div>
        <Text fw={600} size="sm">Allowed Scopes</Text>
        <Group gap="xs" mt="xs">
          {client.allowed_scopes.map((scope) => (
            <Badge key={scope} variant="light">
              {scope}
            </Badge>
          ))}
        </Group>
      </div>

      <Group c="dimmed" gap="md">
        <Text size="sm">Created: {new Date(client.created_at).toLocaleDateString()}</Text>
        <Text size="sm">Updated: {new Date(client.updated_at).toLocaleDateString()}</Text>
      </Group>
    </Stack>
  )
}
