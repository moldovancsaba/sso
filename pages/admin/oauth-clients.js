import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function OAuthClientsPage() {
  const [admin, setAdmin] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newClientSecret, setNewClientSecret] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    redirect_uris: '',
    allowed_scopes: 'openid profile email offline_access',
    homepage_uri: '',
    logo_uri: '',
    require_pkce: false, // PKCE not required for confidential clients by default
  })

  useEffect(() => {
    checkSession()
    loadClients()
  }, [])

  async function checkSession() {
    try {
      const res = await fetch('/api/sso/validate', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data?.isValid) {
          setAdmin(data.user)
        }
      }
    } catch (e) {
      console.error('Session check error:', e)
    }
  }

  async function loadClients() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/oauth-clients', { credentials: 'include' })
      if (!res.ok) {
        throw new Error(`Failed to load clients: ${res.status}`)
      }
      const data = await res.json()
      setClients(data.clients || [])
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateClient(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setNewClientSecret(null)

    try {
      // Parse redirect URIs (comma or newline separated)
      const redirectUris = formData.redirect_uris
        .split(/[\n,]/)
        .map(u => u.trim())
        .filter(Boolean)

      if (redirectUris.length === 0) {
        throw new Error('At least one redirect URI is required')
      }

      // Parse scopes (space-separated)
      const allowedScopes = formData.allowed_scopes
        .split(/\s+/)
        .map(s => s.trim())
        .filter(Boolean)

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        redirect_uris: redirectUris,
        allowed_scopes: allowedScopes,
        homepage_uri: formData.homepage_uri.trim() || null,
        logo_uri: formData.logo_uri.trim() || null,
        require_pkce: formData.require_pkce, // Include PKCE requirement setting
      }

      const res = await fetch('/api/admin/oauth-clients', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to create client: ${res.status}`)
      }

      const data = await res.json()
      setNewClientSecret(data.client_secret) // Show secret only once
      setMessage('Client created successfully! Save the secret now.')
      setShowCreateForm(false)
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        redirect_uris: '',
        allowed_scopes: 'openid profile email offline_access',
        homepage_uri: '',
        logo_uri: '',
        require_pkce: false,
      })

      await loadClients()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteClient(clientId, clientName) {
    if (!confirm(`Are you sure you want to delete "${clientName}"? This will invalidate all tokens.`)) {
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/admin/oauth-clients/${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to delete client: ${res.status}`)
      }

      setMessage(`Client "${clientName}" deleted successfully`)
      await loadClients()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(clientId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'

    try {
      setLoading(true)
      const res = await fetch(`/api/admin/oauth-clients/${clientId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to update client: ${res.status}`)
      }

      setMessage(`Client status updated to ${newStatus}`)
      await loadClients()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setMessage('Copied to clipboard!')
    setTimeout(() => setMessage(''), 2000)
  }

  if (!admin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
        <div style={{ maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem', color: '#e6e8f2' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Unauthorized</h1>
          <p style={{ marginTop: '0.5rem' }}>Please <Link href="/admin" style={{ color: '#4da6ff' }}>login</Link> to access OAuth client management.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#0b1021', color: '#e6e8f2' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>OAuth2 Clients</h1>
            <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>Manage OAuth2 client applications</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/admin" style={{ padding: '0.5rem 0.75rem', background: '#24306b', color: 'white', borderRadius: 6, textDecoration: 'none' }}>← Admin Home</Link>
            {admin.role === 'super-admin' && (
              <button onClick={() => setShowCreateForm(!showCreateForm)} style={{ padding: '0.5rem 0.75rem', background: '#4054d6', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>
                {showCreateForm ? 'Cancel' : '+ New Client'}
              </button>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#0e1733', border: '1px solid #24306b', borderRadius: 8 }}>
            {message}
          </div>
        )}

        {/* New Client Secret Display */}
        {newClientSecret && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#211a0b', border: '1px solid #8a6d3b', borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffc107' }}>⚠️ Save Client Secret Now!</h3>
            <p style={{ marginBottom: '0.5rem' }}>This secret will not be shown again. Copy it now:</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ flex: 1, padding: '0.5rem', background: '#0b1021', borderRadius: 6, overflowX: 'auto' }}>{newClientSecret}</code>
              <button onClick={() => copyToClipboard(newClientSecret)} style={{ padding: '0.5rem 0.75rem', background: '#24306b', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>Copy</button>
            </div>
            <button onClick={() => setNewClientSecret(null)} style={{ marginTop: '0.5rem', padding: '0.25rem 0.5rem', background: '#8a6d3b', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}>I've saved it, close this</button>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && admin.role === 'super-admin' && (
          <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#12172b', border: '1px solid #22284a', borderRadius: 12 }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Create OAuth Client</h2>
            <form onSubmit={handleCreateClient} style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Client Name *</span>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Narimato"
                  required
                  style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6 }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Description</span>
                <input
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the application"
                  style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6 }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Redirect URIs * (one per line)</span>
                <textarea
                  value={formData.redirect_uris}
                  onChange={e => setFormData({ ...formData, redirect_uris: e.target.value })}
                  placeholder="https://narimato.com/auth/callback&#10;https://narimato.com/api/oauth/callback"
                  required
                  rows={3}
                  style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Allowed Scopes (space-separated)</span>
                <input
                  value={formData.allowed_scopes}
                  onChange={e => setFormData({ ...formData, allowed_scopes: e.target.value })}
                  placeholder="openid profile email read:cards write:cards"
                  style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.875rem' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Homepage URL</span>
                <input
                  value={formData.homepage_uri}
                  onChange={e => setFormData({ ...formData, homepage_uri: e.target.value })}
                  placeholder="https://narimato.com"
                  type="url"
                  style={{ padding: '0.5rem 0.75rem', background: '#0b1021', color: '#e6e8f2', border: '1px solid #22284a', borderRadius: 6 }}
                />
              </label>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.require_pkce}
                  onChange={e => setFormData({ ...formData, require_pkce: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, opacity: 0.8 }}>
                  Require PKCE (Proof Key for Code Exchange)
                  <br />
                  <span style={{ fontSize: 11, opacity: 0.6 }}>
                    Check this for public clients (mobile/SPA). Leave unchecked for confidential clients (server-side).
                  </span>
                </span>
              </label>

              <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
                <button type="submit" disabled={loading} style={{ padding: '0.65rem 0.75rem', background: '#4054d6', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>
                  {loading ? 'Creating…' : 'Create Client'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} style={{ padding: '0.65rem 0.75rem', background: '#24306b', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Clients List */}
        <div style={{ background: '#12172b', border: '1px solid #22284a', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #22284a' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Registered Clients ({clients.length})</h2>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>Loading clients...</div>
          ) : clients.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>No OAuth clients registered yet</div>
          ) : (
            <div>
              {clients.map((client) => (
                <div key={client.client_id} style={{ padding: '1.5rem', borderBottom: '1px solid #22284a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{client.name}</h3>
                      {client.description && (
                        <p style={{ margin: '0 0 0.5rem 0', opacity: 0.8, fontSize: '0.875rem' }}>{client.description}</p>
                      )}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.25rem 0.5rem', background: client.status === 'active' ? '#1e895a' : '#8a6d3b', borderRadius: 4 }}>
                          {client.status}
                        </span>
                        <span style={{ padding: '0.25rem 0.5rem', background: client.require_pkce ? '#4054d6' : '#666', borderRadius: 4 }}>
                          {client.require_pkce ? 'PKCE Required' : 'PKCE Optional'}
                        </span>
                        {client.homepage_uri && (
                          <a href={client.homepage_uri} target="_blank" rel="noopener noreferrer" style={{ color: '#4da6ff' }}>
                            🔗 Homepage
                          </a>
                        )}
                      </div>
                    </div>
                    {admin.role === 'super-admin' && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => alert('Edit feature coming soon')} style={{ padding: '0.25rem 0.5rem', background: '#24306b', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                          Edit
                        </button>
                        <button onClick={() => alert('Regenerate secret feature coming soon')} style={{ padding: '0.25rem 0.5rem', background: '#4054d6', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                          Regenerate Secret
                        </button>
                        <button onClick={() => handleToggleStatus(client.client_id, client.status)} style={{ padding: '0.25rem 0.5rem', background: '#24306b', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                          {client.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteClient(client.client_id, client.name)} style={{ padding: '0.25rem 0.5rem', background: '#8b1919', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gap: 8, fontSize: '0.875rem' }}>
                    <div>
                      <strong>Client ID:</strong>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                        <code style={{ flex: 1, padding: '0.25rem 0.5rem', background: '#0b1021', borderRadius: 4, overflowX: 'auto', fontSize: '0.8125rem' }}>
                          {client.client_id}
                        </code>
                        <button onClick={() => copyToClipboard(client.client_id)} style={{ padding: '0.25rem 0.5rem', background: '#24306b', color: 'white', border: 0, borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <strong>Redirect URIs:</strong>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.5rem' }}>
                        {client.redirect_uris.map((uri, idx) => (
                          <li key={idx} style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{uri}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <strong>Allowed Scopes:</strong>
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {client.allowed_scopes.map((scope) => (
                          <span key={scope} style={{ padding: '0.25rem 0.5rem', background: '#24306b', borderRadius: 4, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, opacity: 0.6 }}>
                      <span>Created: {new Date(client.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(client.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
