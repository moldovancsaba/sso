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

  // WHAT: App Permissions state management
  // WHY: Separating loading/error for list vs. per-app actions provides fine-grained UX
  const [appPermissions, setAppPermissions] = useState([])
  const [appPermissionsLoading, setAppPermissionsLoading] = useState(false)
  const [appPermissionsError, setAppPermissionsError] = useState('')
  const [appActionLoading, setAppActionLoading] = useState({}) // clientId -> boolean
  const [selectedRoles, setSelectedRoles] = useState({}) // clientId -> 'user'|'admin'
  const [permissionSuccess, setPermissionSuccess] = useState('')

  // Fetch users
  useEffect(() => {
    fetchUsers()
  }, [filter, sortBy, sortOrder])

  // WHAT: Lifecycle management for app permissions
  // WHY: Fetch on modal open, clear on close to prevent stale/cross-user state
  useEffect(() => {
    if (showDetails && selectedUser?.id) {
      // WHAT: Fetch app permissions when user details modal opens
      fetchAppPermissions(selectedUser.id)
    } else if (!showDetails) {
      // WHAT: Clear app permissions state when modal closes
      // WHY: Prevent leaking previous user's permissions to next user
      setAppPermissions([])
      setAppPermissionsError('')
      setAppPermissionsLoading(false)
      setAppActionLoading({})
      setSelectedRoles({})
      setPermissionSuccess('')
    }
  }, [showDetails, selectedUser?.id])

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

  // WHAT: Fetch user's app permissions for all integrated applications
  // WHY: SSO admin needs to view and manage user access across all OAuth apps
  // HOW: GET /api/admin/app-permissions/[userId] returns merged list of all apps with permission status
  const fetchAppPermissions = async (userId) => {
    setAppPermissionsLoading(true)
    setAppPermissionsError('')
    setPermissionSuccess('')
    
    try {
      const res = await fetch(`/api/admin/app-permissions/${userId}`, {
        credentials: 'include'
      })
      
      // WHAT: Handle authentication errors
      // WHY: Admin session may have expired
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin'
        return
      }
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAppPermissionsError(data.error?.message || 'Failed to load app permissions')
        setAppPermissions([])
        return
      }
      
      const data = await res.json()
      
      // WHAT: Initialize app permissions and role selectors
      // WHY: UI needs default role selection for grant actions
      setAppPermissions(data.apps || [])
      
      // WHAT: Build selectedRoles map with defaults
      // WHY: When role is 'none', default selector to 'user' for grant action
      const roles = {}
      for (const app of data.apps || []) {
        roles[app.clientId] = (app.role === 'admin' || app.role === 'user') ? app.role : 'user'
      }
      setSelectedRoles(roles)
    } catch (err) {
      console.error('Failed to fetch app permissions:', err)
      setAppPermissionsError('Connection error. Please check your internet and try again.')
      setAppPermissions([])
    } finally {
      setAppPermissionsLoading(false)
    }
  }

  // WHAT: Grant or approve user access to an application
  // WHY: POST creates/approves permission (none/pending → approved transition)
  // HOW: POST /api/admin/app-permissions/[userId] with clientId, role, status='approved'
  const handleGrantAccess = async (userId, clientId, role) => {
    setAppActionLoading(prev => ({ ...prev, [clientId]: true }))
    setAppPermissionsError('')
    setPermissionSuccess('')
    
    try {
      const res = await fetch(`/api/admin/app-permissions/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientId, role, status: 'approved' })
      })
      
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin'
        return
      }
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAppPermissionsError(data.error?.message || 'Failed to grant access')
        return
      }
      
      setPermissionSuccess(`Access granted as ${role}`)
      setTimeout(() => setPermissionSuccess(''), 3000)
      await fetchAppPermissions(userId)
    } catch (err) {
      console.error('Failed to grant access:', err)
      setAppPermissionsError('Connection error. Please try again.')
    } finally {
      setAppActionLoading(prev => ({ ...prev, [clientId]: false }))
    }
  }

  // WHAT: Revoke user access to an application
  // WHY: DELETE marks permission as revoked (approved → revoked transition)
  // HOW: DELETE /api/admin/app-permissions/[userId] with clientId
  const handleRevokeAccess = async (userId, clientId, appName) => {
    // WHAT: Confirmation before destructive action
    // WHY: Prevent accidental revocations
    if (!confirm(`Revoke user's access to ${appName}? They will no longer be able to log in to this application.`)) {
      return
    }
    
    setAppActionLoading(prev => ({ ...prev, [clientId]: true }))
    setAppPermissionsError('')
    setPermissionSuccess('')
    
    try {
      const res = await fetch(`/api/admin/app-permissions/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientId })
      })
      
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin'
        return
      }
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAppPermissionsError(data.error?.message || 'Failed to revoke access')
        return
      }
      
      setPermissionSuccess('Access revoked successfully')
      setTimeout(() => setPermissionSuccess(''), 3000)
      await fetchAppPermissions(userId)
    } catch (err) {
      console.error('Failed to revoke access:', err)
      setAppPermissionsError('Connection error. Please try again.')
    } finally {
      setAppActionLoading(prev => ({ ...prev, [clientId]: false }))
    }
  }

  // WHAT: Change user's role within an application
  // WHY: PATCH updates role without changing status (user ↔ admin)
  // HOW: PATCH /api/admin/app-permissions/[userId] with clientId, role
  const handleChangeRole = async (userId, clientId, newRole) => {
    setAppActionLoading(prev => ({ ...prev, [clientId]: true }))
    setAppPermissionsError('')
    setPermissionSuccess('')
    
    try {
      const res = await fetch(`/api/admin/app-permissions/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientId, role: newRole })
      })
      
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin'
        return
      }
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setAppPermissionsError(data.error?.message || 'Failed to change role')
        return
      }
      
      setPermissionSuccess(`Role changed to ${newRole}`)
      setTimeout(() => setPermissionSuccess(''), 3000)
      await fetchAppPermissions(userId)
    } catch (err) {
      console.error('Failed to change role:', err)
      setAppPermissionsError('Connection error. Please try again.')
    } finally {
      setAppActionLoading(prev => ({ ...prev, [clientId]: false }))
    }
  }

  // WHAT: Handle role selector change
  // WHY: Track selected role for pending grant actions
  const handleRoleSelectChange = (clientId, newRole) => {
    setSelectedRoles(prev => ({ ...prev, [clientId]: newRole }))
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

            {/* WHAT: App Permissions Management Section */}
            {/* WHY: SSO admins assign app-level roles (user/admin within apps), distinct from SSO admin role */}
            {/* HOW: Permission lifecycle: none → pending → approved → revoked */}
            <div style={{ marginBottom: '1.5rem', borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem' }}>
              <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>Application Access</h3>
              <p style={{ margin: 0, marginBottom: '12px', fontSize: '13px', color: '#666' }}>
                Manage this user's access to integrated OAuth applications
              </p>
              <div style={{
                background: '#f5f7fa',
                border: '1px solid #d0d7de',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '12px',
                color: '#666'
              }}>
                ℹ️ <strong>Note:</strong> You are acting as an SSO administrator. The role you assign here (‘user’ vs ‘admin’) applies within the selected application, not the SSO system.
              </div>

              {/* Success Message */}
              {permissionSuccess && (
                <div style={{
                  background: '#e8f5e9',
                  border: '1px solid #81c784',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#2e7d32'
                }}>
                  ✓ {permissionSuccess}
                </div>
              )}

              {/* Error Message */}
              {appPermissionsError && (
                <div style={{
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#c33',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{appPermissionsError}</span>
                  <button
                    onClick={() => fetchAppPermissions(selectedUser.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      background: 'white',
                      border: '1px solid #c33',
                      borderRadius: '4px',
                      color: '#c33',
                      cursor: 'pointer'
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Loading State */}
              {appPermissionsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                  <div style={{ fontSize: '13px' }}>Loading app permissions...</div>
                </div>
              ) : appPermissions.length === 0 && !appPermissionsError ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#999', fontSize: '13px' }}>
                  No integrated applications available
                </div>
              ) : (
                /* Apps Grid */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '12px'
                }}>
                  {appPermissions.map(app => {
                    const isLoading = appActionLoading[app.clientId]
                    const isApproved = app.status === 'approved'
                    const isPending = app.status === 'pending'
                    const isRevoked = app.status === 'revoked' || app.role === 'none'
                    const currentRole = selectedRoles[app.clientId] || 'user'

                    // WHAT: Status badge colors
                    // WHY: Visual differentiation of permission states
                    const statusColors = {
                      approved: { bg: '#e8f5e9', text: '#2e7d32' },
                      pending: { bg: '#fff3e0', text: '#f57c00' },
                      revoked: { bg: '#fee', text: '#c33' }
                    }
                    const statusColor = statusColors[app.status] || statusColors.revoked

                    return (
                      <div
                        key={app.clientId}
                        style={{
                          background: '#fff',
                          border: '1px solid #f0f0f0',
                          borderRadius: '8px',
                          padding: '12px'
                        }}
                      >
                        {/* App Name */}
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                            {app.name}
                          </div>
                          {app.description && (
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                              {app.description}
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: statusColor.bg,
                            color: statusColor.text
                          }}>
                            {app.status}
                          </span>
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                            Role: <strong>{app.role}</strong>
                          </span>
                        </div>

                        {/* Actions based on status */}
                        {isRevoked ? (
                          /* Grant Access UI */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <select
                              value={currentRole}
                              onChange={(e) => handleRoleSelectChange(app.clientId, e.target.value)}
                              disabled={isLoading}
                              aria-label={`Select role for ${app.name}`}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '13px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                background: 'white'
                              }}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleGrantAccess(selectedUser.id, app.clientId, currentRole)}
                              disabled={isLoading || appPermissionsLoading}
                              aria-label={`Grant access to ${app.name}`}
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'white',
                                background: (isLoading || appPermissionsLoading) ? '#999' : '#667eea',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (isLoading || appPermissionsLoading) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {isLoading ? 'Granting...' : 'Grant Access'}
                            </button>
                          </div>
                        ) : isPending ? (
                          /* Approve Access UI */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <select
                              value={currentRole}
                              onChange={(e) => handleRoleSelectChange(app.clientId, e.target.value)}
                              disabled={isLoading}
                              aria-label={`Select role for ${app.name}`}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '13px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                background: 'white'
                              }}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleGrantAccess(selectedUser.id, app.clientId, currentRole)}
                              disabled={isLoading || appPermissionsLoading}
                              aria-label={`Approve access to ${app.name}`}
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'white',
                                background: (isLoading || appPermissionsLoading) ? '#999' : '#667eea',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (isLoading || appPermissionsLoading) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {isLoading ? 'Approving...' : 'Approve'}
                            </button>
                          </div>
                        ) : (
                          /* Manage Active Access */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <select
                              value={app.role}
                              onChange={(e) => handleChangeRole(selectedUser.id, app.clientId, e.target.value)}
                              disabled={isLoading || appPermissionsLoading}
                              aria-label={`Change role for ${app.name}`}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '13px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                background: 'white'
                              }}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRevokeAccess(selectedUser.id, app.clientId, app.name)}
                              disabled={isLoading || appPermissionsLoading}
                              aria-label={`Revoke access to ${app.name}`}
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'white',
                                background: (isLoading || appPermissionsLoading) ? '#999' : '#d32f2f',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: (isLoading || appPermissionsLoading) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {isLoading ? 'Revoking...' : 'Revoke Access'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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
