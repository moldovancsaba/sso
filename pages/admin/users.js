/**
 * Admin Users Management Dashboard
 * 
 * WHAT: Comprehensive admin interface to view and manage all public SSO users
 * WHY: Admins need visibility into registered users and ability to manage accounts
 * HOW: Server-side auth check, fetch users list, provide admin actions
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from '../../styles/home.module.css'

// Server-side admin authentication check
export async function getServerSideProps(context) {
  const { getAdminUser } = await import('../../lib/auth.mjs')
  
  const admin = await getAdminUser(context.req)
  
  if (!admin) {
    return {
      redirect: {
        destination: '/admin?redirect=/admin/users',
        permanent: false
      }
    }
  }
  
  return {
    props: {
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      }
    }
  }
}

export default function AdminUsersPage({ admin }) {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all, active, disabled
  const [sortBy, setSortBy] = useState('createdAt') // createdAt, email, lastLoginAt
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Fetch users
  useEffect(() => {
    fetchUsers()
  }, [filter, sortBy, sortOrder])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        filter,
        sortBy,
        sortOrder
      })
      
      const res = await fetch(`/api/admin/public-users?${params}`, {
        credentials: 'include'
      })
      
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      } else {
        setMessage({ type: 'error', text: 'Failed to load users' })
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  // Filter users by search
  const filteredUsers = users.filter(user => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.id?.toLowerCase().includes(searchLower)
    )
  })

  // Handle user actions
  const handleDisableUser = async (userId) => {
    if (!confirm('Disable this user account? They will not be able to log in.')) return
    
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/public-users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'disabled' })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'User disabled successfully' })
        fetchUsers()
        setShowDetails(false)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to disable user' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnableUser = async (userId) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/public-users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'active' })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'User enabled successfully' })
        fetchUsers()
        setShowDetails(false)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to enable user' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`PERMANENTLY DELETE user ${userEmail}? This action cannot be undone and will remove all associated data.`)) return
    
    const confirmation = prompt(`Type "${userEmail}" to confirm deletion:`)
    if (confirmation !== userEmail) {
      alert('Confirmation failed. User not deleted.')
      return
    }
    
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/public-users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'User deleted successfully' })
        fetchUsers()
        setShowDetails(false)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  return (
    <>
      <Head>
        <title>User Management - SSO Admin</title>
      </Head>

      <div className={styles.container} style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>User Management</h1>
            <p style={{ color: '#666', fontSize: '14px' }}>Manage all public users registered in the SSO system</p>
            <Link href="/admin" style={{ fontSize: '13px', color: '#667eea', textDecoration: 'none' }}>
              ← Back to Admin
            </Link>
          </div>

          {/* Message */}
          {message && (
            <div style={{
              background: message.type === 'error' ? '#fee' : '#e8f5e9',
              border: `1px solid ${message.type === 'error' ? '#fcc' : '#81c784'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '1.5rem',
              color: message.type === 'error' ? '#c33' : '#2e7d32',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
          )}

          {/* Filters */}
          <div className={styles.apiCard} style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Search */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Email, name, or ID..."
                  style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>Status Filter</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                >
                  <option value="all">All Users</option>
                  <option value="active">Active Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Sort By */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                >
                  <option value="createdAt">Registration Date</option>
                  <option value="email">Email</option>
                  <option value="lastLoginAt">Last Login</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box' }}
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className={styles.apiCard}>
            <h2 style={{ margin: 0, marginBottom: '1rem' }}>
              Users ({filteredUsers.length})
            </h2>

            {loading ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>No users found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Email</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Registered</th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600' }}>Last Login</th>
                      <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: '600' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px 8px' }}>{user.email}</td>
                        <td style={{ padding: '12px 8px' }}>{user.name || '-'}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: user.status === 'active' ? '#e8f5e9' : '#fee',
                            color: user.status === 'active' ? '#2e7d32' : '#c33'
                          }}>
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '13px', color: '#666' }}>
                          {formatDate(user.createdAt)}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '13px', color: '#666' }}>
                          {formatDate(user.lastLoginAt)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setShowDetails(true)
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '13px',
                              color: '#667eea',
                              background: 'white',
                              border: '1px solid #667eea',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showDetails && selectedUser && (
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ margin: 0, marginBottom: '1.5rem' }}>User Details</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>ID:</strong> <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{selectedUser.id}</code></p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>Email:</strong> {selectedUser.email}</p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>Name:</strong> {selectedUser.name || 'Not set'}</p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>Status:</strong> {selectedUser.status || 'active'}</p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>Email Verified:</strong> {selectedUser.emailVerified !== false ? 'Yes' : 'No'}</p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>Created:</strong> {formatDate(selectedUser.createdAt)}</p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>Last Login:</strong> {formatDate(selectedUser.lastLoginAt)}</p>
              <p style={{ margin: '8px 0', fontSize: '14px' }}><strong>Login Count:</strong> {selectedUser.loginCount || 0}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedUser.status !== 'disabled' ? (
                <button
                  onClick={() => handleDisableUser(selectedUser.id)}
                  disabled={actionLoading}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    color: '#f57c00',
                    background: 'white',
                    border: '1px solid #f57c00',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Disable Account'}
                </button>
              ) : (
                <button
                  onClick={() => handleEnableUser(selectedUser.id)}
                  disabled={actionLoading}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    color: '#2e7d32',
                    background: 'white',
                    border: '1px solid #2e7d32',
                    borderRadius: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Enable Account'}
                </button>
              )}

              <button
                onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  color: 'white',
                  background: actionLoading ? '#999' : '#d32f2f',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Processing...' : 'Delete User Permanently'}
              </button>

              <button
                onClick={() => {
                  setShowDetails(false)
                  setSelectedUser(null)
                }}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  color: '#666',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  marginTop: '8px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
