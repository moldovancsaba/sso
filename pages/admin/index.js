import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('sso@doneisbetter.com')
  const [password, setPassword] = useState('') // 32-hex admin token
  const isDevBypass = process.env.NEXT_PUBLIC_ADMIN_DEV_BYPASS === 'true'
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [admin, setAdmin] = useState(null)
  const [lastStatus, setLastStatus] = useState(null)
  const [lastBody, setLastBody] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)

  async function checkSession() {
    try {
      const res = await fetch('/api/sso/validate', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data?.isValid) {
          setAdmin(data.user)
          setMessage('Admin session active')
        } else {
          setAdmin(null)
          setMessage('No active admin session')
        }
      } else {
        setAdmin(null)
        setMessage(`Session check failed (${res.status})`)
      }
    } catch (e) {
      setAdmin(null)
      setMessage(`Session check error: ${e?.message || 'unknown'}`)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

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
    // In dev bypass mode, only email is required
    if (!email.trim()) {
      setMessage('Please enter email')
      return
    }
    // In normal mode, both email and password are required
    if (!isDevBypass && !password.trim()) {
      setMessage('Please enter password')
      return
    }
    setLoading(true)
    setMessage('')
    setLastStatus(null)
    setLastBody('')
    try {
      const endpoint = isDevBypass ? '/api/admin/dev-login' : '/api/admin/login'
      const payload = isDevBypass
        ? { email: email.trim().toLowerCase() }
        : { email: email.trim().toLowerCase(), password: password.trim() }
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleLogout} disabled={loading} style={{ padding: '0.5rem 0.75rem', background: '#24306b', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>Logout</button>
              <Link href="/admin/oauth-clients" style={{ padding: '0.5rem 0.75rem', background: '#4054d6', color: 'white', borderRadius: 6, textDecoration: 'none' }}>OAuth Clients</Link>
              <Link href="/docs" style={{ padding: '0.5rem 0.75rem', background: '#1e895a', color: 'white', borderRadius: 6 }}>Docs</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ marginTop: '1rem', display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Email</span>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="sso@doneisbetter.com" style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6 }} />
            </label>
            {!isDevBypass && (
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Admin Token (32‑hex)</span>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="e.g. 4f39c1..." style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6 }} />
              </label>
            )}
            <button type="submit" disabled={loading} style={{ padding: '0.65rem 0.75rem', background: '#4054d6', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>{loading ? 'Signing in…' : (isDevBypass ? 'Dev Sign In' : 'Sign In')}</button>
            
            {!isDevBypass && (
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

                {/* Forgot Password Link */}
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Link href="/admin/forgot-password" style={{ fontSize: 12, color: '#8b9dc3', textDecoration: 'none' }}>
                    Forgot password?
                  </Link>
                </div>
              </>
            )}
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

        {isDevBypass && (
          <div style={{ marginTop: 12, padding: 8, border: '1px dashed #8a6d3b', borderRadius: 6, background: '#211a0b', color: '#e6e8f2' }}>
            Dev bypass is enabled (no password). Do not use in production.
          </div>
        )}
        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.8 }}>
          <Link href="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
