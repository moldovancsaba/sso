import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClients: 0,
    recentActivity: [],
  })

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const res = await fetch('/api/sso/validate', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data?.isValid) {
          setAdmin(data.user)
          loadStats()
        } else {
          router.push('/admin')
        }
      } else {
        router.push('/admin')
      }
    } catch (e) {
      console.error('Session check error:', e)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      // Load basic stats from APIs
      const [usersRes, clientsRes] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/oauth-clients', { credentials: 'include' }),
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setStats(prev => ({ ...prev, totalUsers: usersData.users?.length || 0 }))
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        setStats(prev => ({ ...prev, totalClients: clientsData.clients?.length || 0 }))
      }
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' })
      router.push('/admin')
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1021' }}>
        <div style={{ color: '#e6e8f2' }}>Loading...</div>
      </div>
    )
  }

  if (!admin) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b1021', color: '#e6e8f2' }}>
      {/* Navigation Header */}
      <nav style={{ background: '#12172b', borderBottom: '1px solid #22284a', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Link href="/admin/dashboard" style={{ fontSize: '1.25rem', fontWeight: '600', color: '#e6e8f2', textDecoration: 'none' }}>
              SSO Admin
            </Link>
            <div style={{ display: 'flex', gap: 16 }}>
              <Link href="/admin/dashboard" style={{ padding: '0.5rem 0.75rem', background: '#4054d6', color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
                Dashboard
              </Link>
              <Link href="/admin/users" style={{ padding: '0.5rem 0.75rem', background: '#c77700', color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
                Users
              </Link>
              <Link href="/admin/activity" style={{ padding: '0.5rem 0.75rem', background: '#6a1b9a', color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
                Activity
              </Link>
              <Link href="/admin/oauth-clients" style={{ padding: '0.5rem 0.75rem', background: '#1e895a', color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
                Clients
              </Link>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, opacity: 0.8 }}>
              {admin.email} ({admin.role})
            </span>
            <button onClick={handleLogout} style={{ padding: '0.5rem 0.75rem', background: '#24306b', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '2rem' }}>Admin Dashboard</h1>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: '2rem' }}>
          <Link href="/admin/users" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4054d6'}
                 onMouseLeave={(e) => e.currentTarget.style.borderColor = '#22284a'}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8, color: '#e6e8f2' }}>Total Users</div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: '#e6e8f2' }}>{stats.totalUsers}</div>
            </div>
          </Link>

          <Link href="/admin/oauth-clients" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1e895a'}
                 onMouseLeave={(e) => e.currentTarget.style.borderColor = '#22284a'}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8, color: '#e6e8f2' }}>OAuth Clients</div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: '#e6e8f2' }}>{stats.totalClients}</div>
            </div>
          </Link>

          <Link href="/admin/activity" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
                 onMouseEnter={(e) => e.currentTarget.style.borderColor = '#6a1b9a'}
                 onMouseLeave={(e) => e.currentTarget.style.borderColor = '#22284a'}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8, color: '#e6e8f2' }}>System Status</div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: '#81c784' }}>●</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, color: '#e6e8f2' }}>All systems operational</div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div style={{ background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Link href="/admin/users" style={{ padding: '0.75rem', background: '#0b1021', border: '1px solid #22284a', borderRadius: 8, textDecoration: 'none', color: '#e6e8f2', textAlign: 'center' }}>
              👥 Manage Users
            </Link>
            <Link href="/admin/oauth-clients" style={{ padding: '0.75rem', background: '#0b1021', border: '1px solid #22284a', borderRadius: 8, textDecoration: 'none', color: '#e6e8f2', textAlign: 'center' }}>
              🔑 Manage OAuth Clients
            </Link>
            <Link href="/admin/activity" style={{ padding: '0.75rem', background: '#0b1021', border: '1px solid #22284a', borderRadius: 8, textDecoration: 'none', color: '#e6e8f2', textAlign: 'center' }}>
              📊 View Activity Logs
            </Link>
            <Link href="/docs" style={{ padding: '0.75rem', background: '#0b1021', border: '1px solid #22284a', borderRadius: 8, textDecoration: 'none', color: '#e6e8f2', textAlign: 'center' }}>
              📚 API Documentation
            </Link>
          </div>
        </div>

        {/* Welcome Message */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#0e1733', border: '1px solid #24306b', borderRadius: 8 }}>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Welcome back, <strong>{admin.name || admin.email}</strong>! You have <strong>{admin.role}</strong> access.
          </p>
        </div>
      </div>
    </div>
  )
}
