import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Anchor,
  BodyText,
  Button,
  FormField,
  InlineAlert,
  PublicFlowShell,
  Stack,
  TextInput,
} from '@sovereignsquad/gds-core/client'
import { PublicBrandFooter, PublicShell } from '@sovereignsquad/gds-core/server'

const GENERIC_VERIFICATION_MESSAGE = 'If you can access that inbox, a confirmation link will be sent.'

function makeIdempotencyKey() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) return window.crypto.randomUUID()
  if (typeof window === 'undefined' || !window.crypto?.getRandomValues) throw new Error('secure_random_unavailable')
  const bytes = window.crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export default function DataDeletionPage() {
  const router = useRouter()
  const [session, setSession] = useState('loading')
  const [email, setEmail] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [certificateAvailable, setCertificateAvailable] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/public/session', { credentials: 'include', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (active) setSession(result?.isValid && result?.user?.id ? 'authenticated' : 'guest') })
      .catch(() => { if (active) setSession('guest') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (router.isReady && typeof router.query.confirmation_code === 'string') {
      setConfirmationCode(router.query.confirmation_code)
    }
  }, [router.isReady, router.query.confirmation_code])

  async function submitRequest(event) {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    setCertificateAvailable(false)
    try {
      const authenticated = session === 'authenticated'
      const response = await fetch(authenticated
        ? '/api/public/privacy/erasure-request'
        : '/api/public/privacy/erasure-verification', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authenticated ? { 'Idempotency-Key': makeIdempotencyKey() } : {}),
        },
        body: JSON.stringify(authenticated ? {} : { email }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'privacy_request_unavailable')
      if (authenticated && result.confirmation_code) {
        setConfirmationCode(result.confirmation_code)
        setNotice({ severity: 'success', title: 'Request recorded', message: `Your request is awaiting review. Keep this confirmation code: ${result.confirmation_code}` })
      } else {
        setNotice({ severity: 'info', title: 'Check your inbox', message: GENERIC_VERIFICATION_MESSAGE })
        setEmail('')
      }
    } catch (error) {
      const message = error.message === 'authentication_required'
        ? 'Your sign-in session expired. Refresh this page and try again.'
        : error.message === 'invalid_email'
          ? 'Enter the email address you used when sending your photos.'
          : 'The request could not be recorded. Please try again later.'
      setNotice({ severity: 'error', title: 'Request not sent', message })
    } finally {
      setBusy(false)
    }
  }

  async function lookupStatus(event) {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    setCertificateAvailable(false)
    const code = confirmationCode.replaceAll('-', '').trim()
    if (!/^[0-9a-f]{32}$/i.test(code)) {
      setNotice({ severity: 'error', title: 'Check the code', message: 'Enter the 32-character confirmation code from your request receipt.' })
      setBusy(false)
      return
    }
    try {
      const response = await fetch(`/api/public/privacy/deletion-status?confirmation_code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error('not_found')
      const targets = (result.targets || []).map((item) => `${item.target}: ${item.status}`).join(' · ')
      setCertificateAvailable(['completed', 'retained_exception'].includes(result.status))
      setNotice({
        severity: 'info',
        title: `Request status: ${result.status}`,
        message: `${targets || 'Deletion targets are being prepared.'} A request is complete only after every required system and backup receipt has been verified.`,
      })
    } catch {
      setNotice({ severity: 'error', title: 'Request not found', message: 'Check the confirmation code and try again.' })
    } finally {
      setBusy(false)
    }
  }

  const stage = {
    id: 'data-erasure-request',
    title: 'Request deletion of your data',
    description: 'Use your signed-in account or verify control of the email address you used for your photos.',
    status: session === 'loading' ? 'loading' : 'ready',
    body: session === 'loading' ? null : (
      <Stack gap="lg">
        <BodyText>
          No data is deleted by opening this page. After identity is verified, an authorized reviewer checks the request and each product records its own deletion evidence.
        </BodyText>
        <form onSubmit={submitRequest}>
          <Stack gap="md">
            {session === 'authenticated' ? (
              <BodyText>Your current SSO session will be used to identify the account. The request will still be reviewed before deletion begins.</BodyText>
            ) : (
              <FormField
                label="Email address used for your photos"
                description="We send a one-time link to verify that you control this inbox."
              >
                <TextInput
                  autoComplete="email"
                  disabled={busy}
                  id="privacy-email"
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </FormField>
            )}
            <Button disabled={busy} loading={busy} type="submit">
              {session === 'authenticated' ? 'Submit deletion request' : 'Send verification link'}
            </Button>
          </Stack>
        </form>
        {notice ? <InlineAlert title={notice.title} message={notice.message} severity={notice.severity} /> : null}
        {certificateAvailable && confirmationCode ? (
          <Anchor
            download
            href={`/api/public/privacy/deletion-certificate?confirmation_code=${encodeURIComponent(confirmationCode.replaceAll('-', ''))}`}
          >Download the erasure record PDF</Anchor>
        ) : null}
        <form onSubmit={lookupStatus}>
          <Stack gap="md">
            <FormField label="Confirmation code" description="Check the progress of an existing request without signing in.">
              <TextInput
                autoComplete="off"
                disabled={busy}
                id="privacy-confirmation-code"
                onChange={(event) => setConfirmationCode(event.currentTarget.value)}
                value={confirmationCode}
              />
            </FormField>
            <Button disabled={busy} loading={busy} type="submit" variant="outline">Check request status</Button>
          </Stack>
        </form>
        <BodyText>
          Need help? <Anchor href="mailto:support@doneisbetter.com">Contact support</Anchor>. <Anchor component={Link} href="/privacy">Read the privacy policy</Anchor>.
        </BodyText>
      </Stack>
    ),
  }

  return (
    <PublicShell
      brand={<Anchor component={Link} href="/" fw={700} td="none">DoneIsBetter SSO</Anchor>}
      compact
      footer={<PublicBrandFooter brandTitle="DoneIsBetter" compact description="Universal SSO service for shared identity, OAuth, and centralized account access." />}
      maxContentWidth="md"
    >
      <PublicFlowShell eyebrow="Privacy" stage={stage} />
    </PublicShell>
  )
}
