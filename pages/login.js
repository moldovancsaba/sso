/**
 * Public User Login Page
 * 
 * WHY: Provides a login interface for public users to access their accounts
 * WHAT: Beautiful form with email and password fields, link to registration
 * HOW: Calls POST /api/public/login, handles authentication, sets session cookie, redirects
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

// Make page server-rendered to ensure query params are available
export async function getServerSideProps(context) {
  // Just return empty props - we only need this to force server rendering
  return { props: {} }
}

export default function LoginPage() {
  const router = useRouter()
  const { redirect, oauth_request } = router.query
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [redirectAttempted, setRedirectAttempted] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [pinRequired, setPinRequired] = useState(false)
  const [pin, setPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  
  // WHAT: Track when component is mounted
  // WHY: Prevent redirects during SSR/hydration to avoid React errors
  useEffect(() => {
    setMounted(true)
  }, [])

  // REMOVED: Automatic session check was interfering with form submission
  // Users who are already logged in can just manually go to /demo

  // WHAT: Validate redirect URL to prevent open redirect attacks
  // WHY: Only allow redirects to *.doneisbetter.com subdomains and localhost (dev)
  const isValidRedirectUrl = (url) => {
    try {
      const parsed = new URL(url)
      // Allow localhost for development
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return true
      }
      // Allow *.doneisbetter.com subdomains
      if (parsed.hostname.endsWith('.doneisbetter.com') || parsed.hostname === 'doneisbetter.com') {
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    setServerError('')
  }

  // Client-side validation
  // WHY: Provide immediate feedback before sending request to server
  const validate = () => {
    const newErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle magic link request
  const handleMagicLink = async () => {
    // Validate email only
    if (!formData.email) {
      setErrors({ email: 'Email is required for magic link' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrors({ email: 'Please enter a valid email address' })
      return
    }

    setMagicLinkLoading(true)
    setServerError('')
    setMagicLinkSent(false)

    try {
      const res = await fetch('/api/public/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim()
        })
      })

      const data = await res.json()

      if (res.ok) {
        setMagicLinkSent(true)
        setFormData({ email: '', password: '' })
      } else {
        setServerError(data.message || 'Failed to send magic link. Please try again.')
      }
    } catch (err) {
      console.error('[Login] Magic link error:', err)
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setMagicLinkLoading(false)
    }
  }

  // Handle PIN verification
  const handlePinVerify = async () => {
    if (!pin || pin.length !== 6) {
      setPinError('Please enter a 6-digit PIN')
      return
    }

    setPinLoading(true)
    setPinError('')

    try {
      const res = await fetch('/api/public/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          pin: pin.trim(),
        })
      })

      const data = await res.json()

      if (res.ok) {
        // PIN verified successfully - redirect
        console.log('[Login] PIN verified, redirecting')
        if (redirect) {
          const decodedRedirect = decodeURIComponent(redirect)
          if (isValidRedirectUrl(decodedRedirect)) {
            setTimeout(() => {
              window.location.href = decodedRedirect
            }, 100)
            return
          }
        }
        // WHAT: PIN verified, redirect to homepage or specified URL
        // WHY: Demo page was for testing only
        router.push('/')
      } else {
        setPinError(data.error || 'Invalid PIN')
      }
    } catch (err) {
      console.error('[Login] PIN verification error:', err)
      setPinError('An unexpected error occurred')
    } finally {
      setPinLoading(false)
    }
  }

  // Handle form submission - CHANGED: Now works as button click handler, not form submit
  const handleSubmit = async (e) => {
    // e.preventDefault() not needed for button type="button"
    console.log('[Login] Button clicked')
    
    if (!validate()) {
      console.log('[Login] Validation failed')
      return
    }

    setLoading(true)
    setServerError('')
    
    console.log('[Login] Starting fetch to /api/public/login')
    console.log('[Login] Email:', formData.email)

    try {
      // WHAT: Use absolute URL to see if relative URL is the issue
      const url = `${window.location.origin}/api/public/login`
      console.log('[Login] Full URL:', url)
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        })
      })
      
      console.log('[Login] Fetch completed, status:', res.status)

      const data = await res.json()

      if (res.ok) {
        // Check if PIN is required
        if (data.requiresPin) {
          console.log('[Login] PIN required')
          setPinRequired(true)
          setServerError('')
          setLoading(false)
          return
        }

        // WHAT: Check if this is an OAuth flow login
        // WHY: OAuth clients need to continue to consent/authorization, not demo page
        // HOW: Decode oauth_request and reconstruct the authorize URL with original params
        if (oauth_request) {
          console.log('[Login] OAuth flow detected, continuing authorization')
          try {
            // WHAT: Decode base64url in browser (Buffer doesn't exist in browser)
            // WHY: Node.js Buffer API is not available in client-side JavaScript
            // HOW: Convert base64url to base64, then use atob() to decode
            const base64 = oauth_request.replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))))
            // Reconstruct the authorize URL with original parameters
            const params = new URLSearchParams({
              response_type: decoded.response_type,
              client_id: decoded.client_id,
              redirect_uri: decoded.redirect_uri,
              scope: decoded.scope,
              state: decoded.state,
            })
            if (decoded.code_challenge) {
              params.set('code_challenge', decoded.code_challenge)
              params.set('code_challenge_method', decoded.code_challenge_method)
            }
            // Redirect back to authorize endpoint - now with valid session
            setTimeout(() => {
              window.location.href = `/api/oauth/authorize?${params.toString()}`
            }, 100)
            return
          } catch (err) {
            console.error('[Login] Failed to decode oauth_request:', err)
            // Fall through to normal redirect logic
          }
        }

        // Login successful, redirect to requested page or demo
        console.log('[Login] Login successful, redirect param:', redirect)
        console.log('[Login] Full query:', router.query)
        if (redirect) {
          const decodedRedirect = decodeURIComponent(redirect)
          console.log('[Login] Decoded redirect:', decodedRedirect)
          const isValid = isValidRedirectUrl(decodedRedirect)
          console.log('[Login] Is valid redirect URL:', isValid)
          if (isValid) {
            console.log('[Login] Redirecting to:', decodedRedirect)
            // Use a small delay to ensure cookie is set
            setTimeout(() => {
              window.location.href = decodedRedirect
            }, 100)
            return
          } else {
            console.error('[Login] Redirect URL failed validation:', decodedRedirect)
          }
        }
        // WHAT: No redirect specified, go to homepage
        // WHY: Demo page was for testing only, users should see main SSO page
        console.log('[Login] No valid redirect, going to homepage')
        router.push('/')
      } else {
        // Handle server errors
        if (res.status === 401) {
          setServerError('Invalid email or password')
        } else if (res.status === 403) {
          setServerError('Your account has been disabled. Please contact support.')
        } else {
          setServerError(data.message || 'Login failed. Please try again.')
        }
      }
    } catch (err) {
      console.error('[Login] Login error:', err)
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Login - SSO Service</title>
        <meta name="description" content="Sign in to your SSO account" />
      </Head>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '48px',
          maxWidth: '440px',
          width: '100%'
        }}>
          {/* Logo */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              Welcome Back
            </h1>
            <p style={{
              color: '#666',
              fontSize: '14px'
            }}>
              {redirect ? (() => {
                try {
                  return `Logging in to access ${new URL(decodeURIComponent(redirect)).hostname}`
                } catch {
                  return 'Sign in to your account'
                }
              })() : 'Sign in to your account'}
            </p>
          </div>

          {/* Magic Link Success */}
          {magicLinkSent && (
            <div style={{
              background: '#e8f5e9',
              border: '1px solid #81c784',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              color: '#2e7d32',
              fontSize: '14px'
            }}>
              🔗 Magic link sent! Check your email and click the link to sign in instantly.
            </div>
          )}

          {/* Server Error */}
          {serverError && (
            <div style={{
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              color: '#c33',
              fontSize: '14px'
            }}>
              {serverError}
            </div>
          )}

          {/* Login Form - CHANGED: Removed form wrapper to test if form submission is causing fetch to fail */}
          <div>
            {/* Email Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333'
              }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: errors.email ? '2px solid #f44' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = errors.email ? '#f44' : '#e0e0e0'}
              />
              {errors.email && (
                <p style={{
                  marginTop: '6px',
                  fontSize: '13px',
                  color: '#f44'
                }}>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333'
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: errors.password ? '2px solid #f44' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = errors.password ? '#f44' : '#e0e0e0'}
              />
              {errors.password && (
                <p style={{
                  marginTop: '6px',
                  fontSize: '13px',
                  color: '#f44'
                }}>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button - CHANGED: Changed to button type and added onClick handler */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                background: loading ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.1s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Divider */}
            <div style={{
              marginTop: '24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
              <span style={{ fontSize: '12px', color: '#999', fontWeight: '500' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
            </div>

            {/* Magic Link Button */}
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicLinkLoading || loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#667eea',
                background: 'white',
                border: '2px solid #667eea',
                borderRadius: '8px',
                cursor: (magicLinkLoading || loading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: (magicLinkLoading || loading) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!magicLinkLoading && !loading) {
                  e.target.style.background = '#f5f7ff'
                  e.target.style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              {magicLinkLoading ? '✉️ Sending...' : '🔗 Login with Magic Link'}
            </button>

            {/* Forgot Password Link */}
            <div style={{
              marginTop: '16px',
              textAlign: 'center'
            }}>
              <Link href="/forgot-password" style={{
                fontSize: '13px',
                color: '#667eea',
                textDecoration: 'none'
              }}>
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Register Link */}
          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#666'
          }}>
            Don't have an account?{' '}
            <Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'} style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600'
            }}>
              Create one
            </Link>
          </div>

          {/* Back to Home */}
          <div style={{
            marginTop: '16px',
            textAlign: 'center'
          }}>
            <Link href="/" style={{
              fontSize: '13px',
              color: '#999',
              textDecoration: 'none'
            }}>
              ← Back to home
            </Link>
          </div>
        </div>

        {/* PIN Verification Modal */}
        {pinRequired && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>
              <h2 style={{
                margin: 0,
                marginBottom: '8px',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                🔒 Verify Your Identity
              </h2>
              <p style={{
                margin: 0,
                marginBottom: '24px',
                fontSize: '14px',
                color: '#666'
              }}>
                We've sent a 6-digit PIN to your email for additional security.
              </p>

              {/* PIN Error */}
              {pinError && (
                <div style={{
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  color: '#c33',
                  fontSize: '14px'
                }}>
                  {pinError}
                </div>
              )}

              {/* PIN Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  Enter PIN
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setPin(value)
                    setPinError('')
                  }}
                  placeholder="123456"
                  maxLength={6}
                  disabled={pinLoading}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '20px',
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    border: pinError ? '2px solid #f44' : '2px solid #e0e0e0',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && pin.length === 6) {
                      handlePinVerify()
                    }
                  }}
                />
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={handlePinVerify}
                disabled={pinLoading || pin.length !== 6}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  background: (pinLoading || pin.length !== 6) ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (pinLoading || pin.length !== 6) ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.1s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  marginBottom: '12px'
                }}
                onMouseEnter={(e) => {
                  if (!pinLoading && pin.length === 6) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
              >
                {pinLoading ? 'Verifying...' : 'Verify PIN'}
              </button>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={() => {
                  setPinRequired(false)
                  setPin('')
                  setPinError('')
                }}
                disabled={pinLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#666',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: pinLoading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
