import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

/**
 * Admin OAuth Callback
 * 
 * WHAT: Handles OAuth authorization code callback for admin dashboard
 * WHY: Complete the OAuth flow after user authorizes admin access
 * HOW: Exchange code for token, create public session, redirect to dashboard
 * 
 * CRITICAL: This creates a public session cookie so the homepage
 * can check admin status and show the SSO Admin button.
 */

export default function AdminCallbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const { code, error: oauthError, error_description } = router.query

    if (oauthError) {
      setError(error_description || oauthError)
      setLoading(false)
      return
    }

    if (!code) {
      // Still loading query params
      return
    }

    // WHAT: Exchange authorization code for session
    // WHY: Need to create public session cookie for homepage integration
    // HOW: Call our backend endpoint that handles token exchange + session creation
    async function completeLogin() {
      try {
        console.log('[Admin Callback] Starting login completion with code:', code.substring(0, 8) + '...')
        
        const response = await fetch('/api/admin/complete-oauth-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          credentials: 'include', // Important: include cookies
        })

        console.log('[Admin Callback] Response status:', response.status)

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[Admin Callback] Error response:', data)
          setError(data.error || `Failed to complete login (${response.status})`)
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log('[Admin Callback] Success:', data)

        // Session created successfully - redirect to dashboard
        console.log('[Admin Callback] Redirecting to dashboard')
        router.push('/admin/dashboard')
      } catch (err) {
        console.error('[Admin Callback] Exception:', err)
        setError('Network error: ' + err.message)
        setLoading(false)
      }
    }

    completeLogin()
  }, [router.query, router])

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '2rem', color: '#e6e8f2' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>❌</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', textAlign: 'center' }}>Access Denied</h1>
          <p style={{ marginTop: '1rem', opacity: 0.8 }}>{error}</p>
          <Link 
            href="/"
            style={{
              display: 'block',
              marginTop: '1.5rem',
              padding: '0.75rem',
              background: '#4054d6',
              color: 'white',
              borderRadius: 6,
              textDecoration: 'none',
              textAlign: 'center'
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '2rem', color: '#e6e8f2', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔐</div>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>SSO Admin</h1>
        <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>Completing authorization...</p>
      </div>
    </div>
  )
}
