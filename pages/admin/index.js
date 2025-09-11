import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('sso@doneisbetter.com')
  const [password, setPassword] = useState('') // 32-hex admin token
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [admin, setAdmin] = useState(null)

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
        }
      } else {
        setAdmin(null)
      }
    } catch {
      setAdmin(null)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setMessage('Please enter email and token')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Login failed')
      }
      await checkSession()
      setMessage('Login successful')
      setPassword('')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' })
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
              <Link href="/docs" style={{ padding: '0.5rem 0.75rem', background: '#1e895a', color: 'white', borderRadius: 6 }}>Docs</Link>
            </div>
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
          </form>
        )}

        {message ? (
          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>{message}</div>
        ) : null}

        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.8 }}>
          <Link href="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
