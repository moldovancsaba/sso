import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPassword() {
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
      const res = await fetch('/api/public/forgot-password', {
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 16, padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#1a202c' }}>Forgot Password?</h1>
        <p style={{ marginTop: '0.5rem', color: '#4a5568', fontSize: 14 }}>
          No worries! Enter your email and we'll send you a new password.
        </p>

        {!success ? (
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'grid', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#2d3748' }}>
                Email Address
              </label>
              <input 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                type="email" 
                placeholder="you@example.com" 
                style={{ 
                  width: '100%', 
                  padding: '0.65rem 0.75rem', 
                  border: '2px solid #e2e8f0', 
                  borderRadius: 8, 
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }} 
                disabled={loading}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              style={{ 
                padding: '0.75rem', 
                background: loading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: 'white', 
                border: 0, 
                borderRadius: 8, 
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {loading ? 'Sending...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 8 }}>
            <div style={{ fontSize: 16, marginBottom: 8, color: '#166534' }}>✅ Check Your Email!</div>
            <div style={{ fontSize: 14, color: '#15803d' }}>
              If an account exists with this email, you'll receive a new password shortly. Check your inbox!
            </div>
          </div>
        )}

        {message && !success && (
          <div style={{ marginTop: 12, padding: '0.75rem', background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: 8, fontSize: 13, color: '#78350f' }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: 20, fontSize: 14, color: '#4a5568', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <span>Remember your password?</span>
          <Link href="/login" style={{ color: '#667eea', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>

        <div style={{ marginTop: 24, padding: '1rem', background: '#f7fafc', borderRadius: 8, fontSize: 13, color: '#4a5568' }}>
          <strong style={{ color: '#2d3748' }}>What happens next:</strong>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>We'll email you a secure, auto-generated password</li>
            <li>Use it to log in right away</li>
            <li>Change it to something you'll remember</li>
            <li>Keep your password safe and private</li>
          </ul>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#718096' }}>
          <Link href="/" style={{ color: '#667eea', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
