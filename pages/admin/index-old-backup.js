import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('sso@doneisbetter.com')
  const [password, setPassword] = useState('') // 32-hex admin token
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [admin, setAdmin] = useState(null)
  const [lastStatus, setLastStatus] = useState(null)
  const [lastBody, setLastBody] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [pinEnabled, setPinEnabled] = useState(null) // null = loading, true/false = state
  const [pinToggleLoading, setPinToggleLoading] = useState(false)
  const [pinMessage, setPinMessage] = useState('')

  async function checkSession() {
    try {
      const res = await fetch('/api/sso/validate', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data?.isValid) {
          setAdmin(data.user)
          setMessage('Admin session active')
          // Fetch PIN verification setting if super-admin
          if (data.user.role === 'super-admin') {
            fetchPinStatus()
          }
        } else {
          setAdmin(null)
          // Don't show error message - this is normal when not logged in
        }
      } else if (res.status === 401) {
        setAdmin(null)
        // 401 is expected when not logged in - don't show error
      } else {
        setAdmin(null)
        setMessage(`Session check failed (${res.status})`)
      }
    } catch (e) {
      setAdmin(null)
      // Don't show error on initial load - only show if there's a real error
      if (e.message !== 'Failed to fetch') {
        setMessage(`Session check error: ${e?.message || 'unknown'}`)
      }
    }
  }

  async function fetchPinStatus() {
    try {
      const res = await fetch('/api/admin/settings/pin-verification', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setPinEnabled(data.enabled)
      }
    } catch (e) {
      console.error('Failed to fetch PIN status:', e)
    }
  }

  async function togglePin() {
    setPinToggleLoading(true)
    setPinMessage('')
    try {
      const res = await fetch('/api/admin/settings/pin-verification', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !pinEnabled })
      })
      const data = await res.json()
      if (res.ok) {
        setPinEnabled(data.enabled)
        setPinMessage(`PIN verification ${data.enabled ? 'enabled' : 'disabled'}`)
        setTimeout(() => setPinMessage(''), 3000)
      } else {
        setPinMessage(data.error?.message || 'Failed to toggle PIN verification')
      }
    } catch (e) {
      setPinMessage(`Error: ${e.message}`)
    } finally {
      setPinToggleLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (admin && !router.query.oauth_request) {
      router.push('/admin/dashboard')
    }
  }, [admin, router.query.oauth_request])

  // WHAT: Check if there's an oauth_request parameter after login
  // WHY: When users are redirected to admin login during OAuth flow, 
  //      we need to continue the OAuth authorization after they log in
  useEffect(() => {
    const oauthRequest = router.query.oauth_request
    if (admin && oauthRequest) {
      // User is now logged in and we have an OAuth request to complete
      setMessage('Redirecting to complete OAuth authorization...')
      // Redirect back to the OAuth authorize endpoint with the original request
      window.location.href = `/api/oauth/authorize?oauth_request=${encodeURIComponent(oauthRequest)}`
    }
  }, [admin, router.query.oauth_request])

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim()) {
      setMessage('Please enter email')
      return
    }
    if (!password.trim()) {
      setMessage('Please enter password')
      return
    }
    setLoading(true)
    setMessage('')
    setLastStatus(null)
    setLastBody('')
    try {
      const endpoint = '/api/admin/login'
      const payload = { email: email.trim().toLowerCase(), password: password.trim() }
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      setLastStatus(res.status)
      let data
      try {
        data = await res.json()
      } catch {
        const text = await res.text()
        setLastBody(text?.slice(0, 300) || '')
        if (!res.ok) throw new Error(`Login failed (${res.status})`)
      }
      if (data) setLastBody(JSON.stringify(data).slice(0, 300))

      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Login failed (${res.status})`)
      }

      await checkSession()
      setMessage('Login successful')
      setPassword('')
    } catch (err) {
      setMessage(err.message || 'Login error')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    // Validate email
    if (!email.trim()) {
      setMessage('Please enter email for magic link')
      return
    }

    setMagicLinkLoading(true)
    setMessage('')
    setMagicLinkSent(false)
    setLastStatus(null)
    setLastBody('')

    try {
      const res = await fetch('/api/admin/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      })

      setLastStatus(res.status)
      const data = await res.json()
      setLastBody(JSON.stringify(data).slice(0, 300))

      if (res.ok) {
        setMagicLinkSent(true)
        setMessage('Magic link sent! Check your email.')
        setEmail('')
        setPassword('')
      } else {
        setMessage(data.message || 'Failed to send magic link')
      }
    } catch (err) {
      setMessage(err.message || 'Magic link error')
    } finally {
      setMagicLinkLoading(false)
    }
  }

  async function handleLogout() {
    setLoading(true)
    setMessage('')
    setLastStatus(null)
    setLastBody('')
    try {
      const res = await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' })
      setLastStatus(res.status)
      if (!res.ok) throw new Error('Logout failed')
      setAdmin(null)
      setMessage('Logged out')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem', color: '#e6e8f2' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Admin Login</h1>
        <p style={{ marginTop: '0.25rem', opacity: 0.8 }}>Use your admin email and 32‑hex token.</p>

        {admin ? (
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#0e1733', border: '1px solid #24306b', borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>Logged in as <strong>{admin.email}</strong> ({admin.role})</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/admin/users" style={{ padding: '0.5rem 0.75rem', background: '#c77700', color: 'white', borderRadius: 6, textDecoration: 'none', fontWeight: '600' }}>👥 Users</Link>
              <Link href="/admin/activity" style={{ padding: '0.5rem 0.75rem', background: '#6a1b9a', color: 'white', borderRadius: 6, textDecoration: 'none' }}>📊 Activity</Link>
              <Link href="/admin/oauth-clients" style={{ padding: '0.5rem 0.75rem', background: '#4054d6', color: 'white', borderRadius: 6, textDecoration: 'none' }}>OAuth Clients</Link>
              {admin.role === 'super-admin' && (
                <Link href="/admin/style-editor" style={{ padding: '0.5rem 0.75rem', background: '#e91e63', color: 'white', borderRadius: 6, textDecoration: 'none' }}>🎨 Style Editor</Link>
              )}
              <Link href="/docs" style={{ padding: '0.5rem 0.75rem', background: '#1e895a', color: 'white', borderRadius: 6, textDecoration: 'none' }}>Docs</Link>
              <button onClick={handleLogout} disabled={loading} style={{ padding: '0.5rem 0.75rem', background: '#24306b', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>Logout</button>
            </div>
            
            {/* PIN Verification Toggle (super-admin only) */}
            {admin.role === 'super-admin' && pinEnabled !== null && (
              <div style={{ marginTop: 12, padding: '0.75rem', background: '#1a2140', border: '1px solid #2d3a5f', borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: 4 }}>🔐 PIN Verification</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Require PIN code on 5th-10th login</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={pinEnabled} 
                      onChange={togglePin}
                      disabled={pinToggleLoading}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: '500' }}>{pinEnabled ? 'Enabled' : 'Disabled'}</span>
                  </label>
                </div>
                {pinMessage && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#81c784' }}>{pinMessage}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ marginTop: '1rem', display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Email</span>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="sso@doneisbetter.com" style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Admin Token (32‑hex)</span>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="e.g. 4f39c1..." style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6 }} />
            </label>
            <button type="submit" disabled={loading} style={{ padding: '0.65rem 0.75rem', background: '#4054d6', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>{loading ? 'Signing in…' : 'Sign In'}</button>
            
            {/* Magic Link and Forgot Password Options */}
            <>
                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, height: 1, background: '#22284a' }} />
                  <span style={{ fontSize: 11, color: '#8b9dc3', opacity: 0.7 }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: '#22284a' }} />
                </div>

                {/* Magic Link Button */}
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={magicLinkLoading || loading}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    background: 'transparent',
                    color: '#8b9dc3',
                    border: '1px solid #4054d6',
                    borderRadius: 6,
                    cursor: (magicLinkLoading || loading) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: (magicLinkLoading || loading) ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!magicLinkLoading && !loading) {
                      e.target.style.background = '#1a2140'
                      e.target.style.color = '#a0b0d6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent'
                    e.target.style.color = '#8b9dc3'
                  }}
                >
                  {magicLinkLoading ? '✉️ Sending...' : '🔗 Login with Magic Link'}
                </button>

                {/* Google Login Button */}
                <button
                  type="button"
                  onClick={() => {
                    const state = btoa(JSON.stringify({ csrf: Math.random().toString(36), admin_login: true })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
                    window.location.href = `/api/auth/google/login?state=${state}`
                  }}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    background: 'white',
                    color: '#444',
                    border: '1px solid #dadce0',
                    borderRadius: 6,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Forgot Password Link */}
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Link href="/admin/forgot-password" style={{ fontSize: 12, color: '#8b9dc3', textDecoration: 'none' }}>
                    Forgot password?
                  </Link>
                </div>

                {/* Dev Login Button (only in development) */}
                {process.env.NEXT_PUBLIC_ADMIN_DEV_BYPASS === 'true' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                      <div style={{ flex: 1, height: 1, background: '#22284a' }} />
                      <span style={{ fontSize: 11, color: '#8b9dc3', opacity: 0.7 }}>DEV MODE</span>
                      <div style={{ flex: 1, height: 1, background: '#22284a' }} />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true)
                        setMessage('Using dev bypass...')
                        try {
                          const res = await fetch('/api/admin/dev-login', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email || 'dev@admin.local' })
                          })
                          if (res.ok) {
                            setMessage('Dev login successful! Refreshing...')
                            // Reload page to show admin dashboard
                            setTimeout(() => window.location.reload(), 500)
                          } else {
                            const data = await res.json()
                            setMessage(data.error || 'Dev login failed')
                          }
                        } catch (err) {
                          setMessage(err.message)
                        } finally {
                          setLoading(false)
                        }
                      }}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.75rem',
                        background: '#2d5016',
                        color: '#b8e986',
                        border: '1px solid #4a7c27',
                        borderRadius: 6,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        opacity: loading ? 0.5 : 1
                      }}
                    >
                      🔓 Dev Login (Super Admin)
                    </button>
                  </>
                )}
            </>
          </form>
        )}

        {/* Magic Link Success */}
        {magicLinkSent && (
          <div style={{ marginTop: 12, padding: 12, background: '#0e3a1f', border: '1px solid #1e7d47', borderRadius: 8, color: '#81c784', fontSize: 13 }}>
            🔗 Magic link sent! Check your email and click the link to sign in instantly.
          </div>
        )}

        {/* Visible status / error details */}
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>
          {message && <div style={{ marginBottom: 6 }}>{message}</div>}
          {lastStatus !== null && (
            <div style={{ marginTop: 6, opacity: 0.85 }}>HTTP Status: {lastStatus}</div>
          )}
          {lastBody && (
            <pre style={{ marginTop: 6, maxHeight: 180, overflow: 'auto', background: '#0b1021', padding: 8, borderRadius: 6, border: '1px solid #22284a' }}>{lastBody}</pre>
          )}
        </div>

        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.8 }}>
          <Link href="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
