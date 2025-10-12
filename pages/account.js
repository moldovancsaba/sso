/**
 * User Account Management Page
 * 
 * WHAT: Comprehensive dashboard for users to manage their SSO account
 * WHY: Users need to see connected services, change password, update profile, and delete account
 * HOW: Fetch user data and authorizations, provide forms for updates, handle all account operations
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from '../styles/home.module.css'

// WHAT: Server-side session validation before page renders
// WHY: Ensure user is authenticated before showing account page
export async function getServerSideProps(context) {
  const { getPublicUserFromRequest } = await import('../lib/publicSessions.mjs')
  
  try {
    const user = await getPublicUserFromRequest(context.req)
    
    if (!user) {
      // Not logged in, redirect to login with return URL
      return {
        redirect: {
          destination: '/login?redirect=' + encodeURIComponent('/account'),
          permanent: false
        }
      }
    }
    
    // Pass user data to page
    return {
      props: {
        initialUser: {
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role || 'user',
          status: user.status,
          emailVerified: user.emailVerified !== false
        }
      }
    }
  } catch (error) {
    console.error('Account page session check error:', error)
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    }
  }
}

export default function AccountPage({ initialUser }) {
  const router = useRouter()
  const [user, setUser] = useState(initialUser)
  const [loading, setLoading] = useState(false)
  const [authorizations, setAuthorizations] = useState([])
  const [authsLoading, setAuthsLoading] = useState(true)
  
  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({ name: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)
  
  // Password change
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // WHAT: Initialize profile data from server-provided user
  // WHY: Server already validated session, no need to check again
  useEffect(() => {
    if (initialUser) {
      setProfileData({ name: initialUser.name || '' })
    }
  }, [initialUser])

  // Fetch user's OAuth authorizations
  useEffect(() => {
    if (!user) return
    
    (async () => {
      try {
        const res = await fetch('/api/public/authorizations', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setAuthorizations(data.authorizations || [])
        }
      } catch (err) {
        console.error('Failed to fetch authorizations:', err)
      } finally {
        setAuthsLoading(false)
      }
    })()
  }, [user])

  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess(false)

    try {
      const res = await fetch('/api/public/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData)
      })

      const data = await res.json()

      if (res.ok) {
        setUser({ ...user, name: profileData.name })
        setProfileSuccess(true)
        setTimeout(() => {
          setEditingProfile(false)
          setProfileSuccess(false)
        }, 2000)
      } else {
        setProfileError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      console.error('Profile update error:', err)
      setProfileError('An unexpected error occurred')
    } finally {
      setProfileLoading(false)
    }
  }

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess(false)

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      setPasswordLoading(false)
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      setPasswordLoading(false)
      return
    }

    try {
      const res = await fetch('/api/public/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      const data = await res.json()

      if (res.ok) {
        setPasswordSuccess(true)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => {
          setChangingPassword(false)
          setPasswordSuccess(false)
        }, 2000)
      } else {
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch (err) {
      console.error('Password change error:', err)
      setPasswordError('An unexpected error occurred')
    } finally {
      setPasswordLoading(false)
    }
  }

  // Handle service revocation
  const handleRevokeService = async (authId, clientName) => {
    if (!confirm(`Are you sure you want to revoke access for "${clientName}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/public/authorizations/${authId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        setAuthorizations(authorizations.filter(auth => auth._id !== authId))
      } else {
        alert('Failed to revoke access')
      }
    } catch (err) {
      console.error('Revoke error:', err)
      alert('An unexpected error occurred')
    }
  }

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail.toLowerCase().trim() !== user.email.toLowerCase()) {
      setDeleteError('Email does not match')
      return
    }

    setDeleteLoading(true)
    setDeleteError('')

    try {
      const res = await fetch('/api/public/account', {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        // Account deleted, redirect to homepage
        window.location.href = '/?deleted=true'
      } else {
        const data = await res.json()
        setDeleteError(data.error || 'Failed to delete account')
      }
    } catch (err) {
      console.error('Delete account error:', err)
      setDeleteError('An unexpected error occurred')
    } finally {
      setDeleteLoading(false)
    }
  }

  // User is guaranteed to exist because of server-side validation
  if (!user) {
    return null
  }

  return (
    <>
      <Head>
        <title>My Account - SSO Service</title>
        <meta name="description" content="Manage your SSO account" />
      </Head>

      <div className={styles.container} style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>My Account</h1>
            <p style={{ color: '#666', fontSize: '14px' }}>Manage your SSO profile and connected services</p>
            <Link href="/" style={{ fontSize: '13px', color: '#667eea', textDecoration: 'none' }}>
              ← Back to home
            </Link>
          </div>

          {/* Profile Section */}
          <div className={styles.apiCard} style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, marginBottom: '4px' }}>👤 Profile</h2>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Your basic account information</p>
              </div>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    color: '#667eea',
                    background: 'white',
                    border: '1px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={handleProfileUpdate}>
                {profileError && (
                  <div style={{ background: '#fee', border: '1px solid #fcc', borderRadius: '6px', padding: '10px', marginBottom: '1rem', color: '#c33', fontSize: '14px' }}>
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div style={{ background: '#e8f5e9', border: '1px solid #81c784', borderRadius: '6px', padding: '10px', marginBottom: '1rem', color: '#2e7d32', fontSize: '14px' }}>
                    ✅ Profile updated successfully!
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', background: '#f5f5f5', color: '#999', boxSizing: 'border-box' }}
                  />
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Email cannot be changed</p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      color: 'white',
                      background: profileLoading ? '#999' : '#667eea',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: profileLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(false)
                      setProfileData({ name: user.name || '' })
                      setProfileError('')
                    }}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      color: '#666',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <p style={{ margin: 0, marginBottom: '8px' }}><strong>Name:</strong> {user.name || 'Not set'}</p>
                <p style={{ margin: 0 }}><strong>Email:</strong> {user.email}</p>
              </div>
            )}
          </div>

          {/* Connected Services Section */}
          <div className={styles.apiCard} style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, marginBottom: '4px' }}>🔗 Connected Services</h2>
            <p style={{ margin: 0, marginBottom: '1rem', fontSize: '14px', color: '#666' }}>
              Services that have access to your SSO account
            </p>

            {authsLoading ? (
              <p style={{ fontSize: '14px', color: '#999' }}>Loading services...</p>
            ) : authorizations.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#999' }}>No connected services yet</p>
            ) : (
              <div>
                {authorizations.map((auth) => (
                  <div
                    key={auth._id}
                    style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{auth.clientName || auth.clientId}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                        Granted: {new Date(auth.createdAt).toLocaleDateString()}
                      </p>
                      {auth.scope && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Scopes: {auth.scope}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRevokeService(auth._id, auth.clientName || auth.clientId)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        color: '#d32f2f',
                        background: 'white',
                        border: '1px solid #d32f2f',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security Section */}
          <div className={styles.apiCard} style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, marginBottom: '4px' }}>🔒 Security</h2>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Change your password</p>
              </div>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    color: '#667eea',
                    background: 'white',
                    border: '1px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Change Password
                </button>
              )}
            </div>

            {changingPassword && (
              <form onSubmit={handlePasswordChange}>
                {passwordError && (
                  <div style={{ background: '#fee', border: '1px solid #fcc', borderRadius: '6px', padding: '10px', marginBottom: '1rem', color: '#c33', fontSize: '14px' }}>
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div style={{ background: '#e8f5e9', border: '1px solid #81c784', borderRadius: '6px', padding: '10px', marginBottom: '1rem', color: '#2e7d32', fontSize: '14px' }}>
                    ✅ Password changed successfully!
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      color: 'white',
                      background: passwordLoading ? '#999' : '#667eea',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: passwordLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {passwordLoading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPassword(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      setPasswordError('')
                    }}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      color: '#666',
                      background: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Danger Zone */}
          <div className={styles.apiCard} style={{ borderColor: '#d32f2f' }}>
            <h2 style={{ margin: 0, marginBottom: '4px', color: '#d32f2f' }}>⚠️ Danger Zone</h2>
            <p style={{ margin: 0, marginBottom: '1rem', fontSize: '14px', color: '#666' }}>
              Permanently delete your account and all associated data
            </p>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                color: 'white',
                background: '#d32f2f',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ margin: 0, marginBottom: '8px', color: '#d32f2f' }}>⚠️ Delete Account</h2>
            <p style={{ margin: 0, marginBottom: '16px', fontSize: '14px', color: '#666' }}>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
            </p>
            <ul style={{ marginBottom: '16px', fontSize: '14px', color: '#666', paddingLeft: '20px' }}>
              <li>Your profile information</li>
              <li>All active sessions</li>
              <li>Connected services authorizations</li>
              <li>Account history</li>
            </ul>

            {deleteError && (
              <div style={{ background: '#fee', border: '1px solid #fcc', borderRadius: '6px', padding: '10px', marginBottom: '16px', color: '#c33', fontSize: '14px' }}>
                {deleteError}
              </div>
            )}

            <p style={{ margin: 0, marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
              Type your email <strong>{user.email}</strong> to confirm:
            </p>
            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => {
                setDeleteConfirmEmail(e.target.value)
                setDeleteError('')
              }}
              placeholder="Enter your email"
              style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '16px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmEmail.toLowerCase().trim() !== user.email.toLowerCase()}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  color: 'white',
                  background: (deleteLoading || deleteConfirmEmail.toLowerCase().trim() !== user.email.toLowerCase()) ? '#999' : '#d32f2f',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (deleteLoading || deleteConfirmEmail.toLowerCase().trim() !== user.email.toLowerCase()) ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete My Account'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmEmail('')
                  setDeleteError('')
                }}
                disabled={deleteLoading}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  color: '#666',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
