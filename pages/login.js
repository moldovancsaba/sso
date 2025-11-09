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
import styles from '../styles/login.module.css'

// WHAT: Make page server-rendered to ensure query params are available immediately
// WHY: useRouter().query can be empty on first render, causing OAuth params to be lost
// HOW: Extract query params in getServerSideProps and pass as props
export async function getServerSideProps(context) {
  const { redirect, oauth_request } = context.query
  
  return {
    props: {
      initialRedirect: redirect || null,
      initialOAuthRequest: oauth_request || null,
    },
  }
}

export default function LoginPage({ initialRedirect, initialOAuthRequest }) {
  const router = useRouter()
  // WHAT: Use props as primary source, fallback to router.query
  // WHY: Props from getServerSideProps are reliable, router.query can be empty initially
  const redirect = initialRedirect || router.query.redirect
  const oauth_request = initialOAuthRequest || router.query.oauth_request
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
  const [pinEmailSent, setPinEmailSent] = useState(false)
  const [resendingPin, setResendingPin] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  
  // WHAT: Track when component is mounted and log OAuth params
  // WHY: Prevent redirects during SSR/hydration to avoid React errors, debug OAuth flow
  useEffect(() => {
    setMounted(true)
    if (oauth_request) {
      console.log('[Login] Page loaded with oauth_request:', oauth_request)
    }
    if (redirect) {
      console.log('[Login] Page loaded with redirect:', redirect)
    }
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

  // Handle PIN resend
  const handleResendPin = async () => {
    setResendingPin(true)
    setPinError('')

    try {
      // Re-login to trigger new PIN
      const res = await fetch('/api/public/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        })
      })

      const data = await res.json()

      if (res.ok && data.requiresPin) {
        setPinEmailSent(true)
        setTimeout(() => setPinEmailSent(false), 3000) // Hide success message after 3s
      } else {
        setPinError('Failed to resend PIN. Please try again.')
      }
    } catch (err) {
      console.error('[Login] PIN resend error:', err)
      setPinError('Failed to resend PIN')
    } finally {
      setResendingPin(false)
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

      if (res.ok && data.success) {
        // PIN verified successfully
        console.log('[Login] PIN verified successfully')
        console.log('[Login] Session should now be active')
        
        // Close the PIN modal
        setPinRequired(false)
        setPin('')
        setPinError('')
        setPinLoading(false)
        
        // WHAT: Check if OAuth flow - redirect IMMEDIATELY without delay or success message
        // WHY: OAuth users need seamless flow back to LaunchMass
        if (oauth_request) {
          console.log('[Login] OAuth flow detected after PIN, redirecting immediately')
          console.log('[Login] oauth_request:', oauth_request)
          try {
            const base64 = oauth_request.replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))))
            console.log('[Login] Decoded OAuth request after PIN:', decoded)
            
            const params = new URLSearchParams({
              response_type: decoded.response_type,
              client_id: decoded.client_id,
              redirect_uri: decoded.redirect_uri,
              scope: decoded.scope,
              state: decoded.state,
            })
            
            // WHAT: Only add code_challenge if it exists
            // WHY: LaunchMass might send code_challenge_method without code_challenge
            if (decoded.code_challenge) {
              params.set('code_challenge', decoded.code_challenge)
              params.set('code_challenge_method', decoded.code_challenge_method || 'S256')
            }
            
            const authorizeUrl = `/api/oauth/authorize?${params.toString()}`
            console.log('[Login] After PIN, redirecting to:', authorizeUrl)
            
            // Immediate redirect for OAuth flow
            window.location.href = authorizeUrl
            return
          } catch (err) {
            console.error('[Login] Failed to decode oauth_request after PIN:', err)
            console.error('[Login] Error details:', err.message, err.stack)
            // Fall through to normal flow
          }
        }
        
        // For non-OAuth flows, show success message briefly
        setLoginSuccess(true)
        
        // Redirect after showing success (only for non-OAuth flows)
        setTimeout(() => {
          // Check for redirect parameter
          if (redirect) {
            const decodedRedirect = decodeURIComponent(redirect)
            if (isValidRedirectUrl(decodedRedirect)) {
              console.log('[Login] Redirecting to:', decodedRedirect)
              window.location.href = decodedRedirect
              return
            }
          }
          
          // WHAT: Redirect to account page after PIN verification
          // WHY: Users want to see their account dashboard after login
          console.log('[Login] PIN verified, going to account page')
          window.location.href = '/account'
        }, 800) // Give user time to see success message
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
          setPinEmailSent(true) // Show confirmation that email was sent
          setServerError('')
          setLoading(false)
          // Hide email sent confirmation after 5 seconds
          setTimeout(() => setPinEmailSent(false), 5000)
          return
        }

        // WHAT: Check if this is an OAuth flow login - REDIRECT IMMEDIATELY
        // WHY: OAuth clients need seamless flow back to LaunchMass, no delays or account page visits
        // HOW: Decode oauth_request and redirect instantly to authorization endpoint
        if (oauth_request) {
          console.log('[Login] OAuth flow detected, continuing authorization immediately')
          console.log('[Login] oauth_request:', oauth_request)
          try {
            // WHAT: Decode base64url in browser (Buffer doesn't exist in browser)
            // WHY: Node.js Buffer API is not available in client-side JavaScript
            // HOW: Convert base64url to base64, then use atob() to decode
            const base64 = oauth_request.replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))))
            console.log('[Login] Decoded OAuth request:', decoded)
            
            // Reconstruct the authorize URL with original parameters
            const params = new URLSearchParams({
              response_type: decoded.response_type,
              client_id: decoded.client_id,
              redirect_uri: decoded.redirect_uri,
              scope: decoded.scope,
              state: decoded.state,
            })
            
            // WHAT: Only add code_challenge if it exists
            // WHY: LaunchMass might send code_challenge_method without code_challenge
            if (decoded.code_challenge) {
              params.set('code_challenge', decoded.code_challenge)
              params.set('code_challenge_method', decoded.code_challenge_method || 'S256')
            }
            
            const authorizeUrl = `/api/oauth/authorize?${params.toString()}`
            console.log('[Login] Redirecting to:', authorizeUrl)
            
            // WHAT: Verify session is set before redirect
            // WHY: Need to debug why OAuth authorize sees no session
            // HOW: Quick check to /api/sso/validate then redirect
            setTimeout(async () => {
              try {
                const validateRes = await fetch('/api/sso/validate', {
                  credentials: 'include'
                })
                const validateData = await validateRes.json()
                console.log('[Login] Session validation before OAuth redirect:', validateRes.status, validateData)
              } catch (err) {
                console.error('[Login] Session validation error:', err)
              }
              console.log('[Login] Now redirecting to OAuth authorize...')
              window.location.href = authorizeUrl
            }, 150)
            return // Stop execution, don't set success state or show messages
          } catch (err) {
            console.error('[Login] Failed to decode oauth_request:', err)
            console.error('[Login] Error details:', err.message, err.stack)
            // Fall through to normal redirect logic
          }
        }

        // Login successful for non-OAuth flows
        console.log('[Login] Login successful, redirect param:', redirect)
        console.log('[Login] Full query:', router.query)
        console.log('[Login] Session cookie should now be set')
        
        // Show success message briefly
        setLoginSuccess(true)
        setLoading(false)
        
        // Redirect after showing success (only for non-OAuth flows)
        setTimeout(() => {
          if (redirect) {
            const decodedRedirect = decodeURIComponent(redirect)
            console.log('[Login] Decoded redirect:', decodedRedirect)
            const isValid = isValidRedirectUrl(decodedRedirect)
            console.log('[Login] Is valid redirect URL:', isValid)
            if (isValid) {
              console.log('[Login] Redirecting to:', decodedRedirect)
              // Use window.location.href for full page reload
              window.location.href = decodedRedirect
              return
            } else {
              console.error('[Login] Redirect URL failed validation:', decodedRedirect)
            }
          }
          // WHAT: Redirect to account page after successful login
          // WHY: Users want to see their account dashboard, not homepage  
          console.log('[Login] No valid redirect, going to account page')
          window.location.href = '/account'
        }, 800) // Give user time to see success message
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

      <div className={styles.pageContainer}>
        <div className={styles.loginCard}>
          {/* Logo */}
          <div className={styles.header}>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>
              {redirect ? (() => {
                try {
                  return `Logging in to access ${new URL(decodeURIComponent(redirect)).hostname}`
                } catch {
                  return 'Sign in to your account'
                }
              })() : 'Sign in to your account'}
            </p>
          </div>

          {/* Login Success */}
          {loginSuccess && (
            <div className={styles.successBox}>
              ✅ <strong>Login successful!</strong> Redirecting...
            </div>
          )}

          {/* Magic Link Success */}
          {magicLinkSent && !loginSuccess && (
            <div className={styles.successBox}>
              🔗 Magic link sent! Check your email and click the link to sign in instantly.
            </div>
          )}

          {/* Server Error */}
          {serverError && (
            <div className={styles.errorBox}>
              {serverError}
            </div>
          )}

          {/* Login Form - CHANGED: Removed form wrapper to test if form submission is causing fetch to fail */}
          <div>
            {/* Email Field */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
                className={`${styles.input} ${errors.email ? styles.error : ''}`}
              />
              {errors.email && (
                <p className={styles.errorText}>{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
                className={`${styles.input} ${errors.password ? styles.error : ''}`}
              />
              {errors.password && (
                <p className={styles.errorText}>{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={styles.primaryButton}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Divider */}
            <div className={styles.divider}>
              <div className={styles.dividerLine} />
              <span className={styles.dividerText}>OR</span>
              <div className={styles.dividerLine} />
            </div>

            {/* Magic Link Button */}
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicLinkLoading || loading}
              className={styles.secondaryButton}
            >
              {magicLinkLoading ? '✉️ Sending...' : '🔗 Login with Magic Link'}
            </button>

            {/* Facebook Login Button */}
            <button
              type="button"
              onClick={() => {
                // WHAT: Redirect to Facebook OAuth login with oauth_request if present
                // WHY: Preserve OAuth flow context through Facebook authentication
                const fbLoginUrl = oauth_request 
                  ? `/api/auth/facebook/login?oauth_request=${encodeURIComponent(oauth_request)}`
                  : '/api/auth/facebook/login'
                window.location.href = fbLoginUrl
              }}
              disabled={loading}
              className={styles.facebookButton}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                style={{ marginRight: '8px' }}
              >
                <path d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" />
              </svg>
              Continue with Facebook
            </button>

            {/* Forgot Password Link */}
            <div className={styles.linkContainer}>
              <Link href="/forgot-password" className={styles.link}>
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Register Link */}
          <div className={styles.textContainer}>
            Don't have an account?{' '}
            <Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'} className={styles.textContainerLink}>
              Create one
            </Link>
          </div>

          {/* Back to Home */}
          <div className={styles.linkContainer}>
            <Link href="/" className={styles.linkSmall}>
              ← Back to home
            </Link>
          </div>
        </div>

        {/* PIN Verification Modal */}
        {pinRequired && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>🔒 Verify Your Identity</h2>
              <p className={styles.modalDescription}>
                For additional security, we've sent a 6-digit PIN to:
              </p>
              <p className={styles.emailDisplay}>
                <strong>{formData.email.toLowerCase().trim()}</strong>
              </p>
              <p className={styles.modalSubtext}>
                Please check your email and enter the PIN below. The code expires in 5 minutes.
              </p>

              {/* Email Sent Confirmation */}
              {pinEmailSent && (
                <div className={styles.successBox}>
                  ✓ PIN sent to your email
                </div>
              )}

              {/* PIN Error */}
              {pinError && (
                <div className={styles.errorBox}>
                  {pinError}
                </div>
              )}

              {/* PIN Input */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Enter PIN</label>
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
                  className={`${styles.pinInput} ${pinError ? styles.error : ''}`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && pin.length === 6) {
                      handlePinVerify()
                    }
                  }}
                />
              </div>

              <div className={styles.buttonGroup}>
                {/* Verify Button */}
                <button
                  type="button"
                  onClick={handlePinVerify}
                  disabled={pinLoading || pin.length !== 6}
                  className={styles.primaryButton}
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
                    setPinEmailSent(false)
                  }}
                  disabled={pinLoading}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>

              {/* Resend PIN Link */}
              <div className={styles.resendContainer}>
                <button
                  type="button"
                  onClick={handleResendPin}
                  disabled={resendingPin || pinLoading}
                  className={styles.resendLink}
                >
                  {resendingPin ? 'Sending...' : 'Didn\'t receive the PIN? Resend it'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
