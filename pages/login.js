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
import {
  Alert,
  Anchor,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconBrandFacebook,
  IconCircleCheck,
  IconLink,
  IconLock,
} from '@tabler/icons-react'
import AuthSurface from '../components/AuthSurface'

// WHAT: Make page server-rendered to ensure query params are available immediately
// WHY: useRouter().query can be empty on first render, causing OAuth params to be lost
// HOW: Extract query params in getServerSideProps and pass as props
export async function getServerSideProps(context) {
  const { redirect, oauth_request } = context.query
  
  return {
    props: {
      initialRedirect: redirect || null,
      initialOAuthRequest: oauth_request || null,
      googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      facebookEnabled: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    },
  }
}

export default function LoginPage({
  initialRedirect,
  initialOAuthRequest,
  googleEnabled,
  facebookEnabled,
}) {
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
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [pinRequired, setPinRequired] = useState(false)
  const [pin, setPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinEmailSent, setPinEmailSent] = useState(false)
  const [resendingPin, setResendingPin] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)

  const subtitle = redirect ? (() => {
    try {
      return `Logging in to access ${new URL(decodeURIComponent(redirect)).hostname}`
    } catch {
      return 'Sign in to your account'
    }
  })() : 'Sign in to your account'
  
  // WHAT: Log OAuth-related params when the page loads
  // WHY: Helpful when tracing public login continuation into OAuth authorization
  useEffect(() => {
    if (oauth_request) {
      console.log('[Login] Page loaded with oauth_request:', oauth_request)
    }
    if (redirect) {
      console.log('[Login] Page loaded with redirect:', redirect)
    }
  }, [oauth_request, redirect])

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

            if (decoded.nonce) {
              params.set('nonce', decoded.nonce)
            }
            
            // WHAT: Only add code_challenge if it exists
            // WHY: LaunchMass might send code_challenge_method without code_challenge
            if (decoded.code_challenge) {
              params.set('code_challenge', decoded.code_challenge)
              params.set('code_challenge_method', decoded.code_challenge_method || 'S256')
            }

            if (decoded.prompt) {
              params.set('prompt', decoded.prompt)
            }
            if (decoded.provider) {
              params.set('provider', decoded.provider)
            }
            if (decoded.login_hint) {
              params.set('login_hint', decoded.login_hint)
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

            if (decoded.nonce) {
              params.set('nonce', decoded.nonce)
            }
            
            // WHAT: Only add code_challenge if it exists
            // WHY: LaunchMass might send code_challenge_method without code_challenge
            if (decoded.code_challenge) {
              params.set('code_challenge', decoded.code_challenge)
              params.set('code_challenge_method', decoded.code_challenge_method || 'S256')
            }

            if (decoded.prompt) {
              params.set('prompt', decoded.prompt)
            }
            if (decoded.provider) {
              params.set('provider', decoded.provider)
            }
            if (decoded.login_hint) {
              params.set('login_hint', decoded.login_hint)
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

  const handleSocialLogin = (provider) => {
    const basePath = provider === 'facebook' ? '/api/auth/facebook/login' : '/api/auth/google/login'
    const url = oauth_request
      ? `${basePath}?oauth_request=${encodeURIComponent(oauth_request)}`
      : basePath

    window.location.href = url
  }

  return (
    <>
      <Head>
        <title>Login - SSO Service</title>
        <meta name="description" content="Sign in to your SSO account" />
      </Head>

      <AuthSurface
        icon={IconLock}
        title="Welcome Back"
        description={subtitle}
      >
        <Stack gap="lg">
          {loginSuccess && (
            <Alert color="green" icon={<IconCircleCheck size={18} />} radius="md" variant="light">
              <strong>Login successful.</strong> Redirecting now.
            </Alert>
          )}

          {magicLinkSent && !loginSuccess && (
            <Alert color="green" icon={<IconLink size={18} />} radius="md" variant="light">
              Magic link sent. Check your email and follow the sign-in link.
            </Alert>
          )}

          {serverError && (
            <Alert color="red" icon={<IconAlertCircle size={18} />} radius="md" variant="light">
              {serverError}
            </Alert>
          )}

          <Paper withBorder p="lg" radius="lg">
            <Stack gap="md">
              <TextInput
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
                error={errors.email || null}
                size="md"
              />

              <PasswordInput
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
                error={errors.password || null}
                size="md"
              />

              <Button fullWidth size="md" onClick={handleSubmit} loading={loading}>
                Sign In
              </Button>

              <Divider label="OR" labelPosition="center" />

              <Button
                fullWidth
                size="md"
                variant="default"
                onClick={handleMagicLink}
                loading={magicLinkLoading}
                leftSection={<IconLink size={18} />}
                disabled={loading}
              >
                Login with Magic Link
              </Button>

              {facebookEnabled ? (
                <Button
                  fullWidth
                  size="md"
                  color="dark"
                  leftSection={<IconBrandFacebook size={18} />}
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={loading}
                >
                  Continue with Facebook
                </Button>
              ) : null}

              {googleEnabled ? (
                <Button
                  fullWidth
                  size="md"
                  variant="default"
                  leftSection={(
                    <Box component="span" aria-hidden="true" style={{ display: 'inline-flex' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </Box>
                  )}
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                >
                  Continue with Google
                </Button>
              ) : null}

              <Anchor component={Link} href="/forgot-password" ta="center" size="sm">
                Forgot password?
              </Anchor>
            </Stack>
          </Paper>

          <Text c="dimmed" size="sm" ta="center">
            Don&apos;t have an account?{' '}
            <Anchor
              component={Link}
              href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
              fw={600}
            >
              Create one
            </Anchor>
          </Text>

          <Anchor component={Link} href="/" ta="center" size="xs" c="dimmed">
            Back to home
          </Anchor>
        </Stack>

        <Modal
          opened={pinRequired}
          onClose={() => {
            if (pinLoading) return
            setPinRequired(false)
            setPin('')
            setPinError('')
            setPinEmailSent(false)
          }}
          title="Verify Your Identity"
          centered
          closeOnEscape={!pinLoading}
          closeOnClickOutside={!pinLoading}
          withCloseButton={!pinLoading}
          radius="lg"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              For additional security, we sent a 6-digit PIN to:
            </Text>

            <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-gray-0)">
              <Text ff="monospace" fw={600} ta="center">
                {formData.email.toLowerCase().trim()}
              </Text>
            </Paper>

            <Text size="xs" c="dimmed">
              Enter the code below. The PIN expires in 5 minutes.
            </Text>

            {pinEmailSent && (
              <Alert color="green" icon={<IconCircleCheck size={18} />} radius="md" variant="light">
                PIN sent to your email.
              </Alert>
            )}

            {pinError && (
              <Alert color="red" icon={<IconAlertCircle size={18} />} radius="md" variant="light">
                {pinError}
              </Alert>
            )}

            <TextInput
              label="Enter PIN"
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
              error={pinError ? ' ' : null}
              inputMode="numeric"
              styles={{
                input: {
                  textAlign: 'center',
                  letterSpacing: '0.3em',
                  fontFamily: 'monospace',
                  fontSize: '1.125rem',
                },
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length === 6) {
                  handlePinVerify()
                }
              }}
            />

            <Button fullWidth onClick={handlePinVerify} loading={pinLoading} disabled={pin.length !== 6}>
              Verify PIN
            </Button>

            <Button
              fullWidth
              variant="default"
              onClick={() => {
                setPinRequired(false)
                setPin('')
                setPinError('')
                setPinEmailSent(false)
              }}
              disabled={pinLoading}
            >
              Cancel
            </Button>

            <Group justify="center">
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={handleResendPin}
                loading={resendingPin}
                disabled={pinLoading}
              >
                Didn&apos;t receive the PIN? Resend it
              </Button>
            </Group>
          </Stack>
        </Modal>
      </AuthSurface>
    </>
  )
}
