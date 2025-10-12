/**
 * Universal Logout Page
 * 
 * WHY: Provides a single logout endpoint for all applications using SSO
 * WHAT: Logs out both public and admin sessions, then redirects back to the application
 * HOW: Calls both logout endpoints, clears cookies, handles redirect parameter
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function LogoutPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Logging out...')
  const { redirect } = router.query

  useEffect(() => {
    const performLogout = async () => {
      try {
        // WHY: Call both logout endpoints to ensure all session types are cleared
        // WHAT: Public users have user-session cookie, admins have admin-session cookie
        // HOW: Both endpoints are idempotent, so calling both is safe
        
        // Logout public user session
        await fetch('/api/public/logout', {
          method: 'POST',
          credentials: 'include'
        }).catch(err => {
          console.error('[Logout] Public logout error:', err)
        })
        
        // Logout admin session (legacy)
        await fetch('/api/users/logout', {
          method: 'POST',
          credentials: 'include'
        }).catch(err => {
          console.error('[Logout] Admin logout error:', err)
        })
        
        // Small delay to ensure cookies are cleared
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setStatus('Logged out successfully')
        
        // WHY: Redirect back to the application or SSO homepage
        // WHAT: Validate redirect URL to prevent open redirect attacks
        if (redirect) {
          const redirectUrl = decodeURIComponent(redirect)
          if (isValidRedirectUrl(redirectUrl)) {
            window.location.href = redirectUrl
            return
          }
        }
        
        // WHAT: Use window.location.href to force full page reload
        // WHY: router.push() doesn't reload, so homepage won't re-check session
        // HOW: Full reload triggers session check on homepage mount
        window.location.href = '/'
      } catch (err) {
        console.error('[Logout] Logout error:', err)
        setStatus('Logout failed. Redirecting...')
        
        // Still redirect even if logout failed
        setTimeout(() => {
          if (redirect && isValidRedirectUrl(decodeURIComponent(redirect))) {
            window.location.href = decodeURIComponent(redirect)
          } else {
            window.location.href = '/'
          }
        }, 1000)
      }
    }
    
    performLogout()
  }, [redirect, router])

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

  return (
    <>
      <Head>
        <title>Logging out - SSO Service</title>
        <meta name="description" content="Logging out of SSO" />
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
          width: '100%',
          textAlign: 'center'
        }}>
          {/* Logo */}
          <div style={{
            marginBottom: '24px'
          }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>
              {status}
            </h1>
            <p style={{
              color: '#666',
              fontSize: '14px'
            }}>
              Please wait...
            </p>
          </div>

          {/* Loading Spinner */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e0e0e0',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>

          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </>
  )
}
