import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

/**
 * Admin OAuth Callback
 * 
 * WHAT: Handles OAuth authorization code callback for admin dashboard
 * WHY: Complete the OAuth flow after user authorizes admin access
 * HOW: Exchange code for token, store session, redirect to dashboard
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

    // WHAT: Code received - redirect to dashboard
    // WHY: OAuth flow complete, user is authorized
    // NOTE: The OAuth endpoint already created the session
    router.push('/admin/dashboard')
  }, [router.query])

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
