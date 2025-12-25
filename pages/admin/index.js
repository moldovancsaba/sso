import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

/**
 * Unified Admin Login Page
 * 
 * WHAT: Checks if user is logged in via public session and has admin permissions
 * WHY: Unify admin and public authentication - treat SSO Admin as OAuth client
 * HOW: Check public session → verify admin permission → redirect to dashboard or /
 */

export default function AdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(null)
  const [error, setError] = useState(null)

  async function checkAdminAccess() {
    try {
      // WHAT: Check if user has admin access via new unified endpoint
      // WHY: This validates public session + checks appPermissions for SSO Admin
      const res = await fetch('/api/admin/check-access', { credentials: 'include' })
      
      if (res.ok) {
        const data = await res.json()
        setAdmin(data.user)
        setError(null)
        
        // Redirect to dashboard if has access
        if (!router.query.oauth_request) {
          router.push('/admin/dashboard')
        }
      } else if (res.status === 401) {
        // Not logged in or no admin access
        setAdmin(null)
        setError(null)
      } else {
        setError('Failed to check admin access')
      }
    } catch (e) {
      console.error('Admin access check error:', e)
      setError('Failed to check admin access')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAdminAccess()
  }, [])

  // WHAT: Redirect to OAuth authorize endpoint if oauth_request param exists
  // WHY: User was redirected here during OAuth flow, complete authorization after login
  useEffect(() => {
    const oauthRequest = router.query.oauth_request
    if (admin && oauthRequest) {
      window.location.href = `/api/oauth/authorize?oauth_request=${encodeURIComponent(oauthRequest)}`
    }
  }, [admin, router.query.oauth_request])

  // WHAT: Show loading state while checking admin access
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '2rem', color: '#e6e8f2', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>SSO Admin</h1>
          <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>Checking admin access...</p>
        </div>
      </div>
    )
  }

  // WHAT: Show admin dashboard link if already logged in with admin access
  if (admin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
        <div style={{ width: '100%', maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem', color: '#e6e8f2' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Welcome back, {admin.name}!</h1>
          <p style={{ marginTop: '0.5rem', opacity: 0.8, marginBottom: '1.5rem' }}>
            Role: <strong>{admin.role}</strong>
          </p>
          
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/admin/dashboard" style={{ padding: '0.65rem 1rem', background: '#4054d6', color: 'white', borderRadius: 6, textDecoration: 'none', fontWeight: '600', flex: 1, textAlign: 'center' }}>
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // WHAT: Show login prompt if not logged in or no admin access
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '2rem', color: '#e6e8f2' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', marginBottom: '0.5rem' }}>SSO Admin Dashboard</h1>
          <p style={{ opacity: 0.8, margin: 0 }}>Please sign in to access the admin panel</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: '#3d1f1f', border: '1px solid #6b2424', borderRadius: 6, marginBottom: '1.5rem', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1a2140', border: '1px solid #2d3a5f', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', opacity: 0.9 }}>ℹ️ How to access Admin Dashboard:</h3>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6, opacity: 0.8 }}>
            <li>Sign in at the main SSO page</li>
            <li>Contact a super-admin to grant you admin access</li>
            <li>Return here to access the dashboard</li>
          </ol>
        </div>

        <Link 
          href="/"
          style={{
            display: 'block',
            padding: '0.75rem 1rem',
            background: '#4054d6',
            color: 'white',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '1rem'
          }}
        >
          Sign In at SSO →
        </Link>

        <Link 
          href="/"
          style={{
            display: 'block',
            padding: '0.5rem',
            color: '#8b9dc3',
            textDecoration: 'none',
            textAlign: 'center',
            fontSize: '0.875rem'
          }}
        >
          ← Back to Home
        </Link>

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #22284a', fontSize: '0.75rem', opacity: 0.6, textAlign: 'center' }}>
          SSO v 5.29.0 | <Link href="/docs" style={{ color: 'inherit' }}>Docs</Link> | <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
        </div>
      </div>
    </div>
  )
}
