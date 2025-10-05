/**
 * Protected Demo Page
 * 
 * WHY: Demonstrates the SSO public user authentication system in action
 * WHAT: Shows authenticated user info, session details, logout functionality
 * HOW: Uses SSR authentication guard (getServerSideProps) to protect route, redirects unauthenticated users to login
 */

import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getPublicUserFromRequest } from '../lib/publicSessions.mjs'

/**
 * Server-Side Rendering with Authentication Guard
 * 
 * WHY: Prevent unauthenticated access at the server level (no flash of wrong content)
 * WHAT: Validates session cookie, fetches user data before rendering
 * HOW: Returns user props if authenticated, redirects to login if not
 */
export async function getServerSideProps({ req, res }) {
  try {
    // Validate user session
    const user = await getPublicUserFromRequest(req)
    
    if (!user) {
      // No valid session, redirect to login page
      return {
        redirect: {
          destination: '/login',
          permanent: false
        }
      }
    }
    
    // User authenticated, pass user data to page
    return {
      props: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      }
    }
  } catch (error) {
    console.error('[Demo] SSR authentication error:', error)
    // On error, redirect to login
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    }
  }
}

export default function DemoPage({ user }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  // Handle logout
  // WHY: Revoke session and clear cookie before redirecting to home
  const handleLogout = async () => {
    setLoggingOut(true)
    
    try {
      const res = await fetch('/api/public/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (res.ok) {
        // Logout successful, redirect to home
        router.push('/')
      } else {
        console.error('[Demo] Logout failed')
        // Still redirect even if logout failed
        router.push('/')
      }
    } catch (err) {
      console.error('[Demo] Logout error:', err)
      // Still redirect on error
      router.push('/')
    }
  }

  // Format date for display
  // WHY: Make ISO timestamps human-readable
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A'
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  return (
    <>
      <Head>
        <title>Demo - SSO Service</title>
        <meta name="description" content="Protected demo page" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {/* Header */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            padding: '32px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '4px'
                }}>
                  🎉 Welcome, {user.name}!
                </h1>
                <p style={{
                  color: '#666',
                  fontSize: '14px'
                }}>
                  You're successfully authenticated
                </p>
              </div>
              
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  background: loggingOut ? '#999' : 'linear-gradient(135deg, #f44 0%, #c33 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loggingOut ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.1s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(255, 68, 68, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!loggingOut) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.6)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.4)'
                }}
              >
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>

          {/* User Information Card */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            padding: '32px',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '24px'
            }}>
              Your Account Information
            </h2>

            <div style={{
              display: 'grid',
              gap: '20px'
            }}>
              {/* User ID */}
              <div style={{
                padding: '16px',
                background: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  User ID
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#333',
                  fontFamily: 'monospace'
                }}>
                  {user.id}
                </div>
              </div>

              {/* Email */}
              <div style={{
                padding: '16px',
                background: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  Email Address
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#333'
                }}>
                  {user.email}
                </div>
              </div>

              {/* Full Name */}
              <div style={{
                padding: '16px',
                background: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  Full Name
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#333'
                }}>
                  {user.name}
                </div>
              </div>

              {/* Role & Status */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div style={{
                  padding: '16px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}>
                    Role
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#333',
                    textTransform: 'capitalize'
                  }}>
                    {user.role}
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px'
                  }}>
                    Status
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    background: user.status === 'active' ? '#efe' : '#fee',
                    border: `1px solid ${user.status === 'active' ? '#8e8' : '#fcc'}`,
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: user.status === 'active' ? '#2a2' : '#c33',
                    textTransform: 'capitalize'
                  }}>
                    {user.status}
                  </div>
                </div>
              </div>

              {/* Account Created */}
              <div style={{
                padding: '16px',
                background: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  Account Created
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#333'
                }}>
                  {formatDate(user.createdAt)}
                </div>
              </div>

              {/* Last Login */}
              <div style={{
                padding: '16px',
                background: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px'
                }}>
                  Last Login
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#333'
                }}>
                  {formatDate(user.lastLoginAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            padding: '32px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '16px'
            }}>
              🚀 SSO Authentication Success!
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              You've successfully registered and logged in using our SSO service. This demonstrates that the public user authentication system is working correctly.
            </p>
            <p style={{
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              Your session is secured with:
            </p>
            <ul style={{
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.8',
              paddingLeft: '24px',
              marginBottom: '24px'
            }}>
              <li>HttpOnly cookies (JavaScript cannot access your session token)</li>
              <li>Bcrypt password hashing (12 salt rounds)</li>
              <li>SHA-256 session token hashing in database</li>
              <li>Server-side authentication guards (SSR)</li>
              <li>7-day session lifetime with automatic cleanup</li>
            </ul>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <Link href="/" style={{
                display: 'inline-block',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'transform 0.1s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}>
                Back to Home
              </Link>
              
              <Link href="/admin" style={{
                display: 'inline-block',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#667eea',
                background: 'white',
                border: '2px solid #667eea',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'transform 0.1s'
              }}>
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
