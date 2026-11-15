import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Modal,
  NativeSelect,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconLogout,
  IconPlayerPlay,
  IconRefresh,
  IconX,
} from '@tabler/icons-react'
import { DataToolbar, StateBlock } from '@sovereignsquad/gds-core/server'
import { ResponsiveDataView } from '@sovereignsquad/gds-admin/client'
import { PageHeader } from '@sovereignsquad/gds-admin/server'
import { fetchAdminJson, isAuthRedirectError, logoutAdmin } from '../../lib/adminAuthFlow.js'

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/oauth-clients', label: 'Clients' },
  { href: '/admin/privacy-erasure', label: 'Privacy erasure' },
]

function stateBadgeColor(state) {
  switch (state) {
    case 'completed':
      return 'green'
    case 'deleting':
      return 'blue'
    case 'needs_review':
    case 'partially_failed':
      return 'orange'
    case 'rejected':
      return 'red'
    case 'submitted':
    default:
      return 'gray'
  }
}

function formatDate(isoString) {
  if (!isoString) return '—'
  try {
    const date = new Date(isoString)
    return Number.isNaN(date.getTime()) ? String(isoString) : date.toLocaleString()
  } catch {
    return String(isoString)
  }
}

export default function AdminPrivacyErasurePage({ initialAdmin }) {
  const router = useRouter()
  const [admin, setAdmin] = useState(initialAdmin || null)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState('all')
  const [selectedCase, setSelectedCase] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)
  const [submittingAction, setSubmittingAction] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const handleLogout = async () => {
    try {
      await logoutAdmin()
    } catch (logoutError) {
      console.error('Logout error:', logoutError)
      setActionNotice({ type: 'error', message: 'Logout failed. Please try again.' })
    }
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const adminData = await fetchAdminJson('/api/admin/check-access')
      if (adminData?.user) {
        setAdmin(adminData.user)
      }

      const url = filterState && filterState !== 'all'
        ? `/api/internal/privacy/requests?limit=100&state=${encodeURIComponent(filterState)}`
        : '/api/internal/privacy/requests?limit=100'
      const response = await fetchAdminJson(url)
      setCases(Array.isArray(response?.cases) ? response.cases : [])
    } catch (error) {
      if (!isAuthRedirectError(error)) {
        setActionNotice({ type: 'error', message: error?.message || 'Could not load privacy erasure cases.' })
      }
    } finally {
      setLoading(false)
    }
  }, [filterState])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function handleApprove(requestId) {
    setSubmittingAction(true)
    setActionNotice(null)
    try {
      await fetchAdminJson(`/api/internal/privacy/requests/${requestId}/decision`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ outcome: 'approved' }),
      })
      setActionNotice({ type: 'success', message: `Case ${requestId} approved successfully.` })
      setSelectedCase(null)
      await loadData()
    } catch (error) {
      setActionNotice({ type: 'error', message: error?.message || 'Failed to approve case.' })
    } finally {
      setSubmittingAction(false)
    }
  }

  async function handleReject(requestId) {
    if (!rejectReason.trim()) {
      setActionNotice({ type: 'error', message: 'A refusal reason is required to reject a case.' })
      return
    }
    setSubmittingAction(true)
    setActionNotice(null)
    try {
      await fetchAdminJson(`/api/internal/privacy/requests/${requestId}/decision`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ outcome: 'rejected', refusalReason: rejectReason.trim() }),
      })
      setActionNotice({ type: 'success', message: `Case ${requestId} rejected.` })
      setShowRejectInput(false)
      setRejectReason('')
      setSelectedCase(null)
      await loadData()
    } catch (error) {
      setActionNotice({ type: 'error', message: error?.message || 'Failed to reject case.' })
    } finally {
      setSubmittingAction(false)
    }
  }

  async function handleResume(requestId) {
    setSubmittingAction(true)
    setActionNotice(null)
    try {
      await fetchAdminJson(`/api/internal/privacy/requests/${requestId}/resume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reasonCode: 'operator_override' }),
      })
      setActionNotice({ type: 'success', message: `Coordinator resumed for case ${requestId}.` })
      setSelectedCase(null)
      await loadData()
    } catch (error) {
      setActionNotice({ type: 'error', message: error?.message || 'Failed to resume coordinator.' })
    } finally {
      setSubmittingAction(false)
    }
  }

  const filteredCases = cases.filter((c) => {
    if (!search.trim()) return true
    const term = search.trim().toLowerCase()
    return (
      (c.requestId && c.requestId.toLowerCase().includes(term)) ||
      (c.confirmationCode && c.confirmationCode.toLowerCase().includes(term)) ||
      (c.source && c.source.toLowerCase().includes(term))
    )
  })

  const tableColumns = [
    { key: 'requestId', label: 'Request ID', render: (row) => <Text size="sm" ff="monospace">{row.requestId}</Text> },
    { key: 'source', label: 'Source', render: (row) => <Text size="sm">{row.source}</Text> },
    {
      key: 'state',
      label: 'State',
      render: (row) => <Badge color={stateBadgeColor(row.state)} size="sm">{row.state}</Badge>,
    },
    { key: 'createdAt', label: 'Created', render: (row) => <Text size="sm">{formatDate(row.createdAt)}</Text> },
    {
      key: 'decision',
      label: 'Decision',
      render: (row) => <Text size="sm">{row.decision?.outcome || 'pending'}</Text>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button size="xs" variant="default" onClick={() => setSelectedCase(row)}>
          Details
        </Button>
      ),
    },
  ]

  return (
    <>
      <Head>
        <title>Privacy Erasure Console - Admin</title>
      </Head>
      <Container size="xl" py="lg">
        <Stack gap="lg">
          <Paper p="lg">
            <Stack gap="md">
              <PageHeader
                description="Inspect, approve, monitor, and recover cross-product privacy erasure cases."
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
                    <Button
                      leftSection={<IconRefresh size={16} />}
                      loading={loading}
                      size="xs"
                      variant="default"
                      onClick={() => void loadData()}
                    >
                      Refresh
                    </Button>
                    {admin && (
                      <Text c="dimmed" size="sm">
                        {admin.email} ({admin.role})
                      </Text>
                    )}
                  </Group>
                )}
                title="Privacy Erasure Console"
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

          {actionNotice && (
            <Alert
              color={actionNotice.type === 'error' ? 'red' : 'green'}
              icon={actionNotice.type === 'error' ? <IconAlertCircle size={16} /> : <IconCircleCheck size={16} />}
              onClose={() => setActionNotice(null)}
              withCloseButton
            >
              {actionNotice.message}
            </Alert>
          )}

          <Card>
            <Stack gap="md">
              <Group align="flex-start" justify="space-between">
                <Stack gap={4}>
                  <Text fw={700} size="lg">
                    Erasure Filters
                  </Text>
                  <Text c="dimmed" size="sm">
                    Showing {filteredCases.length} of {cases.length} privacy cases.
                  </Text>
                </Stack>
                <Badge variant="light">{filteredCases.length}</Badge>
              </Group>
              <DataToolbar />
              <Group gap="sm" wrap="wrap">
                <TextInput
                  aria-label="Search cases by ID or confirmation code"
                  placeholder="Search by Request ID..."
                  size="sm"
                  style={{ flex: 1, minWidth: 200 }}
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                />
                <NativeSelect
                  aria-label="Filter by case state"
                  data={[
                    { value: 'all', label: 'All states' },
                    { value: 'submitted', label: 'Submitted (pending decision)' },
                    { value: 'deleting', label: 'Deleting' },
                    { value: 'needs_review', label: 'Needs review' },
                    { value: 'partially_failed', label: 'Partially failed' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                  size="sm"
                  value={filterState}
                  onChange={(e) => setFilterState(e.currentTarget.value)}
                />
              </Group>
            </Stack>
          </Card>

          {loading && cases.length === 0 ? (
            <StateBlock
              description="Fetching active privacy requests..."
              title="Loading cases"
              variant="loading"
            />
          ) : filteredCases.length === 0 ? (
            <StateBlock
              description="No privacy requests match the current filters."
              title="No cases found"
              variant="empty"
            />
          ) : (
            <Paper p="md" radius="sm" withBorder>
              <ResponsiveDataView
                columns={tableColumns}
                data={filteredCases}
                keyField="requestId"
                renderCard={(row) => (
                  <Card key={row.requestId} p="sm" radius="sm" withBorder>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Badge color={stateBadgeColor(row.state)} size="sm">{row.state}</Badge>
                        <Text c="dimmed" size="xs">{formatDate(row.createdAt)}</Text>
                      </Group>
                      <Text ff="monospace" fw={600} size="sm">{row.requestId}</Text>
                      <Group gap="xs">
                        <Text c="dimmed" size="xs">Source: {row.source}</Text>
                        <Text c="dimmed" size="xs">Decision: {row.decision?.outcome || 'pending'}</Text>
                      </Group>
                      <Button fullWidth size="xs" variant="default" onClick={() => setSelectedCase(row)}>
                        View details
                      </Button>
                    </Stack>
                  </Card>
                )}
              />
            </Paper>
          )}
        </Stack>
      </Container>

      <Modal
        opened={Boolean(selectedCase)}
        size="lg"
        title={<Title order={4}>Privacy Case Details</Title>}
        onClose={() => {
          setSelectedCase(null)
          setShowRejectInput(false)
          setRejectReason('')
        }}
      >
        {selectedCase && (
          <Stack gap="md">
            <SimpleGrid cols={2}>
              <div>
                <Text c="dimmed" size="xs">Request ID</Text>
                <Text ff="monospace" fw={600} size="sm">{selectedCase.requestId}</Text>
              </div>
              <div>
                <Text c="dimmed" size="xs">State</Text>
                <Badge color={stateBadgeColor(selectedCase.state)} size="sm">{selectedCase.state}</Badge>
              </div>
              <div>
                <Text c="dimmed" size="xs">Source</Text>
                <Text size="sm">{selectedCase.source}</Text>
              </div>
              <div>
                <Text c="dimmed" size="xs">Confirmation Code</Text>
                <Text ff="monospace" size="sm">{selectedCase.confirmationCode || '—'}</Text>
              </div>
              <div>
                <Text c="dimmed" size="xs">Created</Text>
                <Text size="sm">{formatDate(selectedCase.createdAt)}</Text>
              </div>
              <div>
                <Text c="dimmed" size="xs">Updated</Text>
                <Text size="sm">{formatDate(selectedCase.updatedAt)}</Text>
              </div>
            </SimpleGrid>

            {selectedCase.decision && (
              <>
                <Divider label="Decision" labelPosition="left" />
                <Paper p="sm" radius="xs" withBorder>
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>Outcome: {selectedCase.decision.outcome}</Text>
                      <Text c="dimmed" size="xs">{formatDate(selectedCase.decision.decidedAt)}</Text>
                    </Group>
                    {selectedCase.decision.decidedBy && (
                      <Text size="xs" c="dimmed">Decided by: {selectedCase.decision.decidedBy}</Text>
                    )}
                    {selectedCase.decision.refusalReason && (
                      <Text size="xs" c="red">Refusal reason: {selectedCase.decision.refusalReason}</Text>
                    )}
                  </Stack>
                </Paper>
              </>
            )}

            {selectedCase.coordinator && (
              <>
                <Divider label="Coordinator Fan-out" labelPosition="left" />
                <Paper p="sm" radius="xs" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>Status: {selectedCase.coordinator.status}</Text>
                      {selectedCase.coordinator.blocked && <Badge color="red" size="sm">Blocked</Badge>}
                    </Group>
                    {selectedCase.coordinator.activeReasonCode && (
                      <Text size="xs" c="dimmed">Reason: {selectedCase.coordinator.activeReasonCode}</Text>
                    )}
                    {Array.isArray(selectedCase.coordinator.downstreams) && selectedCase.coordinator.downstreams.length > 0 && (
                      <Stack gap={4} mt="xs">
                        <Text size="xs" fw={600}>Downstream targets:</Text>
                        {selectedCase.coordinator.downstreams.map((d) => (
                          <Group key={d.target} justify="space-between">
                            <Text size="xs">{d.target}</Text>
                            <Group gap="xs">
                              <Badge size="xs" variant="light">{d.status}</Badge>
                              {d.attempts > 1 && <Text size="xs" c="dimmed">({d.attempts} attempts)</Text>}
                            </Group>
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              </>
            )}

            {selectedCase.certificate && (
              <>
                <Divider label="Deletion Certificate" labelPosition="left" />
                <Paper p="sm" radius="xs" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" c="dimmed">Certificate ID</Text>
                      <Text size="xs" ff="monospace">{selectedCase.certificate.certificateId}</Text>
                    </div>
                    {selectedCase.certificate.downloadUrl && (
                      <Button
                        component="a"
                        download
                        href={selectedCase.certificate.downloadUrl}
                        size="xs"
                        variant="light"
                      >
                        Download PDF
                      </Button>
                    )}
                  </Group>
                </Paper>
              </>
            )}

            <Divider />

            <Group justify="flex-end" gap="sm">
              {selectedCase.state === 'submitted' && (
                <>
                  {!showRejectInput ? (
                    <>
                      <Button
                        color="red"
                        leftSection={<IconX size={16} />}
                        loading={submittingAction}
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRejectInput(true)}
                      >
                        Reject
                      </Button>
                      <Button
                        color="green"
                        leftSection={<IconCheck size={16} />}
                        loading={submittingAction}
                        size="sm"
                        onClick={() => void handleApprove(selectedCase.requestId)}
                      >
                        Approve
                      </Button>
                    </>
                  ) : (
                    <Stack gap="xs" style={{ width: '100%' }}>
                      <TextInput
                        label="Refusal reason"
                        placeholder="e.g. Legal obligation to retain audit trail"
                        required
                        size="xs"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.currentTarget.value)}
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button size="xs" variant="default" onClick={() => setShowRejectInput(false)}>
                          Cancel
                        </Button>
                        <Button
                          color="red"
                          loading={submittingAction}
                          size="xs"
                          onClick={() => void handleReject(selectedCase.requestId)}
                        >
                          Confirm rejection
                        </Button>
                      </Group>
                    </Stack>
                  )}
                </>
              )}

              {(selectedCase.coordinator?.blocked || selectedCase.coordinator?.status === 'needs_review') && (
                <Button
                  color="blue"
                  leftSection={<IconPlayerPlay size={16} />}
                  loading={submittingAction}
                  size="sm"
                  onClick={() => void handleResume(selectedCase.requestId)}
                >
                  Resume coordinator
                </Button>
              )}

              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setSelectedCase(null)
                  setShowRejectInput(false)
                  setRejectReason('')
                }}
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  )
}

export async function getServerSideProps(context) {
  const { resolveAdminIdentity } = await import('../../lib/auth.mjs')

  const identity = await resolveAdminIdentity(context.req)

  if (!identity) {
    return {
      redirect: {
        destination: '/admin?redirect=/admin/privacy-erasure',
        permanent: false,
      },
    }
  }

  return {
    props: {
      initialAdmin: {
        id: identity.user.id,
        email: identity.user.email,
        role: identity.user.role,
      },
    },
  }
}
