import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Anchor, BodyText, Button, InlineAlert, PublicFlowShell, Stack } from '@sovereignsquad/gds-core/client'
import { PublicBrandFooter, PublicShell } from '@sovereignsquad/gds-core/server'

export default function VerifyErasureRequestPage() {
  const [status, setStatus] = useState('loading')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) {
      setStatus('error')
      setError('This verification link is incomplete or has expired. Request a new link to continue.')
      return () => { active = false }
    }
    fetch('/api/public/privacy/confirm-erasure-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error('verification_failed')
      if (!active) return
      setConfirmationCode(result.confirmation_code || '')
      setStatus('complete')
    }).catch(() => {
      if (!active) return
      setStatus('error')
      setError('This verification link is invalid, expired, or already used. You can request a new link.')
    })
    return () => { active = false }
  }, [])

  const stage = {
    id: 'verify-erasure-request',
    title: status === 'complete' ? 'Request confirmed' : 'Confirm your deletion request',
    description: 'Confirm control of your email inbox to record the request.',
    status: status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'complete',
    body: status === 'complete' ? (
      <Stack gap="md">
        <InlineAlert
          title="Email verified"
          message="Your request is recorded and awaiting review. No images or account records have been deleted yet."
          severity="success"
        />
        <BodyText>Confirmation code: <strong>{confirmationCode}</strong></BodyText>
        <BodyText>Save this code to check the request status. Deletion is complete only after every required system and backup receipt is verified.</BodyText>
      </Stack>
    ) : status === 'error' ? (
      <Stack gap="md">
        <InlineAlert title="Unable to verify" message={error} severity="error" />
        <Button component={Link} href="/data-deletion">Request a new verification link</Button>
      </Stack>
    ) : <BodyText>Verifying the link…</BodyText>,
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
