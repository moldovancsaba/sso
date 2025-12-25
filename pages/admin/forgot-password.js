import { useState } from 'react'
import Link from 'next/link'

// WHAT: Disable SSG for this page to prevent NextRouter errors during build
// WHY: Admin pages should be server-rendered for security and dynamic content
export async function getServerSideProps() {
  return { props: {} }
}

export default function AdminForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!email.trim()) {
      setMessage('Please enter your email address')
      return
    }

    setLoading(true)
    setMessage('')
    setSuccess(false)

    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setMessage(data.message || 'Check your email for your new password')
        setEmail('')
      } else {
        setMessage(data.error || 'An error occurred. Please try again.')
      }
    } catch (err) {
      setMessage('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem', color: '#e6e8f2' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Forgot Password</h1>
        <p style={{ marginTop: '0.5rem', opacity: 0.8, fontSize: 14 }}>
          Enter your admin email address and we'll send you a new password.
        </p>

        {!success ? (
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Email Address</span>
              <input 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                type="email" 
                placeholder="admin or sso@doneisbetter.com" 
                style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6 }} 
                disabled={loading}
              />
            </label>

            <button 
              type="submit" 
              disabled={loading} 
              style={{ padding: '0.65rem 0.75rem', background: '#4054d6', color: 'white', border: 0, borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Sending...' : 'Send New Password'}
            </button>
          </form>
        ) : (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#0e3320', border: '1px solid #1e895a', borderRadius: 8 }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>✅ Email Sent!</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>
              If an admin account exists with this email, you will receive a new password shortly.
            </div>
          </div>
        )}

        {message && !success && (
          <div style={{ marginTop: 12, padding: '0.75rem', background: '#2b1a0b', border: '1px solid #8a6d3b', borderRadius: 6, fontSize: 13 }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.8, display: 'flex', gap: 16 }}>
          <Link href="/admin">← Back to Login</Link>
        </div>

        <div style={{ marginTop: 24, padding: '1rem', background: '#0e1733', border: '1px solid #24306b', borderRadius: 8, fontSize: 13, opacity: 0.9 }}>
          <strong>Security Note:</strong>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>You'll receive a new auto-generated password via email</li>
            <li>Use it to log in immediately</li>
            <li>Change it to something memorable after logging in</li>
            <li>Never share your password with anyone</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
