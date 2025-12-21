/**
 * Admin Activity Dashboard
 * 
 * WHAT: Cross-app activity monitoring and access log viewer
 * WHY: Admins need visibility into user access attempts, permission changes, and login events
 * HOW: Filterable timeline view with real-time data from appAccessLogs collection
 */

import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../../styles/home.module.css'

// Server-side admin authentication check
export async function getServerSideProps(context) {
  const { getAdminUser } = await import('../../lib/auth.mjs')
  
  const admin = await getAdminUser(context.req)
  
  if (!admin) {
    return {
      redirect: {
        destination: '/admin?redirect=/admin/activity',
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

export default function ActivityDashboard({ admin }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [eventType, setEventType] = useState('all')
  const [pagination, setPagination] = useState({ total: 0, hasMore: false })
  const [skip, setSkip] = useState(0)
  const [expandedLog, setExpandedLog] = useState(null)

  // WHAT: Fetch activity logs with current filters
  useEffect(() => {
    fetchLogs()
  }, [timeRange, eventType, skip])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeRange,
        eventType,
        limit: '50',
        skip: skip.toString()
      })

      const res = await fetch(`/api/admin/activity?${params}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setPagination(data.pagination || { total: 0, hasMore: false })
      } else {
        console.error('Failed to load activity logs')
      }
    } catch (err) {
      console.error('Activity fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // WHAT: Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // WHAT: Get badge color based on event type
  const getEventBadgeColor = (eventType, accessGranted) => {
    switch (eventType) {
      case 'access_granted':
        return '#4caf50' // Green
      case 'access_revoked':
        return '#f44336' // Red
      case 'role_changed':
        return '#2196f3' // Blue
      case 'access_attempt':
        return accessGranted ? '#4caf50' : '#ff9800' // Green if granted, orange if denied
      default:
        return '#999' // Gray
    }
  }

  // WHAT: Get human-readable event label
  const getEventLabel = (eventType) => {
    const labels = {
      access_attempt: 'Access Attempt',
      access_granted: 'Access Granted',
      access_revoked: 'Access Revoked',
      role_changed: 'Role Changed',
      login_success: 'Login Success',
      login_failed: 'Login Failed'
    }
    return labels[eventType] || eventType
  }

  return (
    <>
      <Head>
        <title>Activity Dashboard - SSO Admin</title>
      </Head>

      <div className={styles.container} style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
              📊 Activity Dashboard
            </h1>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Cross-app user access attempts, permission changes, and login events
            </p>
            <Link href="/admin" style={{ fontSize: '13px', color: '#667eea', textDecoration: 'none' }}>
              ← Back to Admin
            </Link>
          </div>

          {/* Filters */}
          <div className={styles.apiCard} style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              {/* Time Range Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => {
                    setTimeRange(e.target.value)
                    setSkip(0) // Reset pagination
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>

              {/* Event Type Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600' }}>
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value)
                    setSkip(0) // Reset pagination
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="all">All Events</option>
                  <option value="access_attempts">Access Attempts</option>
                  <option value="permission_changes">Permission Changes</option>
                  <option value="login_events">Login Events</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '13px', color: '#666' }}>
              Showing {logs.length} of {pagination.total} total events
            </div>
          </div>

          {/* Timeline View */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
              Loading activity logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
              No activity logs found for selected filters
            </div>
          ) : (
            <div>
              {logs.map((log) => (
                <div
                  key={log._id}
                  className={styles.apiCard}
                  style={{
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    borderLeft: `4px solid ${getEventBadgeColor(log.eventType, log.accessGranted)}`
                  }}
                  onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                >
                  {/* Log Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      {/* Event Badge and Type */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'white',
                            background: getEventBadgeColor(log.eventType, log.accessGranted)
                          }}
                        >
                          {getEventLabel(log.eventType)}
                        </span>
                        {log.accessGranted === false && (
                          <span style={{ fontSize: '12px', color: '#f44336', fontWeight: '600' }}>
                            DENIED
                          </span>
                        )}
                      </div>

                      {/* User and App Info */}
                      <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                        <strong>{log.userName || log.userEmail}</strong>
                        {' → '}
                        <span style={{ color: '#667eea' }}>{log.appName}</span>
                      </div>

                      {/* Role Changes */}
                      {log.eventType === 'role_changed' && (
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          Role: {log.previousRole} → {log.newRole}
                        </div>
                      )}

                      {/* Message */}
                      {log.message && (
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                          {log.message}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{ fontSize: '12px', color: '#999', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLog === log._id && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #eee',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', color: '#666' }}>
                        <div><strong>User ID:</strong></div>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.userId}</div>
                        
                        <div><strong>User Email:</strong></div>
                        <div>{log.userEmail}</div>
                        
                        <div><strong>Client ID:</strong></div>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.clientId}</div>
                        
                        {log.currentRole && (
                          <>
                            <div><strong>Role:</strong></div>
                            <div>{log.currentRole}</div>
                          </>
                        )}
                        
                        {log.changedBy && (
                          <>
                            <div><strong>Changed By:</strong></div>
                            <div>{log.changedBy}</div>
                          </>
                        )}
                        
                        {log.ip && (
                          <>
                            <div><strong>IP Address:</strong></div>
                            <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.ip}</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {pagination.hasMore && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <button
                    onClick={() => setSkip(skip + 50)}
                    disabled={loading}
                    style={{
                      padding: '12px 32px',
                      fontSize: '14px',
                      color: 'white',
                      background: loading ? '#999' : '#667eea',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
