import { useEffect } from 'react'
import { useRouter } from 'next/router'

/**
 * Admin Login Page - OAuth Flow
 * 
 * WHAT: Redirects to SSO OAuth authorization for admin dashboard access
 * WHY: Treat admin like any other OAuth client app - rock solid and consistent
 * HOW: Redirect to /api/oauth/authorize with sso-admin-dashboard client
 */

export default function AdminLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // WHAT: Build OAuth authorization URL for SSO Admin Dashboard
    // WHY: Use the same OAuth flow that all other apps use - it WORKS!
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'sso-admin-dashboard',
      redirect_uri: `${window.location.origin}/admin/callback`,
      scope: 'openid profile email',
      state: Math.random().toString(36).substring(7),
    })
    
    // WHAT: Redirect to OAuth authorize endpoint
    // WHY: This will check if user is logged in, has permission, and redirect back
    window.location.href = `/api/oauth/authorize?${params.toString()}`
  }, [])

  // WHAT: Show loading while redirecting to OAuth
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '2rem', color: '#e6e8f2', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔐</div>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>SSO Admin</h1>
        <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>Redirecting to login...</p>
      </div>
    </div>
  )
}
