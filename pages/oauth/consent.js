import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function ConsentPage() {
  const router = useRouter()
  const [authRequest, setAuthRequest] = useState(null)
  const [scopeDetails, setScopeDetails] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkSessionAndLoadRequest()
  }, [router.query.request])

  async function checkSessionAndLoadRequest() {
    try {
      // WHAT: Check if user is authenticated (public or admin)
      // WHY: OAuth consent requires an authenticated user session
      // HOW: Redirect to public login page, not admin (users shouldn't see admin)
      const res = await fetch('/api/sso/validate', { credentials: 'include' })
      if (!res.ok) {
        // Not authenticated - redirect to public login page with OAuth request preserved
        const { request } = router.query
        if (request) {
          router.push(`/login?oauth_request=${encodeURIComponent(request)}`)
        } else {
          router.push('/login')
        }
        return
      }

      const data = await res.json()
      if (!data?.isValid) {
        const { request } = router.query
        if (request) {
          router.push(`/login?oauth_request=${encodeURIComponent(request)}`)
        } else {
          router.push('/login')
        }
        return
      }

      setUser(data.user)

      // Decode authorization request
      const { request } = router.query
      if (!request) {
        setError('Missing authorization request')
        setLoading(false)
        return
      }

      try {
        // WHAT: Decode base64url-encoded request
        // WHY: Browser doesn't have Buffer API, must use atob with base64url conversion
        // HOW: Convert base64url to base64, then decode with atob
        const base64 = request.replace(/-/g, '+').replace(/_/g, '/')
        const jsonString = atob(base64)
        const decodedRequest = JSON.parse(jsonString)
        setAuthRequest(decodedRequest)

        // Fetch scope details
        const scopes = decodedRequest.scope.split(' ')
        const details = await fetchScopeDetails(scopes)
        setScopeDetails(details)
      } catch (err) {
        setError('Invalid authorization request')
      }

      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function fetchScopeDetails(scopes) {
    // Map scopes to their details (hardcoded for now, could be fetched from API)
    const scopeMap = {
      openid: { name: 'OpenID', description: 'Required for authentication. Provides your user ID.', category: 'authentication' },
      profile: { name: 'Profile', description: 'Access to your basic profile information (name, picture).', category: 'user_info' },
      email: { name: 'Email', description: 'Access to your email address.', category: 'user_info' },
      offline_access: { name: 'Offline Access', description: 'Keep you signed in across sessions (refresh token).', category: 'authentication' },
      'read:cards': { name: 'Read Cards', description: 'View your card collection and rankings.', category: 'narimato' },
      'write:cards': { name: 'Manage Cards', description: 'Create, update, and delete cards in your collection.', category: 'narimato' },
      'read:rankings': { name: 'Read Rankings', description: 'View global and personal card rankings.', category: 'narimato' },
      'read:decks': { name: 'Read Decks', description: 'View your card decks.', category: 'cardmass' },
      'write:decks': { name: 'Manage Decks', description: 'Create, update, and delete your card decks.', category: 'cardmass' },
      'read:games': { name: 'Read Games', description: 'View your game history and statistics.', category: 'playmass' },
      'write:games': { name: 'Manage Games', description: 'Create and update game sessions.', category: 'playmass' },
    }

    return scopes.map(scope => scopeMap[scope] || { name: scope, description: scope, category: 'other' })
  }

  async function handleApprove() {
    if (!authRequest || !user) return

    setSubmitting(true)
    setError(null)

    try {
      // Store user consent
      const res = await fetch('/api/oauth/consent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: authRequest.client_id,
          scope: authRequest.scope,
          approved: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to store consent')
      }

      // Generate authorization code
      const codeRes = await fetch('/api/oauth/authorize/approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: authRequest.client_id,
          redirect_uri: authRequest.redirect_uri,
          scope: authRequest.scope,
          state: authRequest.state,
          code_challenge: authRequest.code_challenge,
          code_challenge_method: authRequest.code_challenge_method,
        }),
      })

      if (!codeRes.ok) {
        const data = await codeRes.json()
        throw new Error(data.error || 'Failed to generate authorization code')
      }

      const codeData = await codeRes.json()

      // Redirect back to client with authorization code
      const redirectUrl = new URL(authRequest.redirect_uri)
      redirectUrl.searchParams.set('code', codeData.code)
      redirectUrl.searchParams.set('state', authRequest.state)

      window.location.href = redirectUrl.toString()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  async function handleDeny() {
    if (!authRequest) return

    // Redirect back to client with error
    const redirectUrl = new URL(authRequest.redirect_uri)
    redirectUrl.searchParams.set('error', 'access_denied')
    redirectUrl.searchParams.set('error_description', 'User denied authorization')
    redirectUrl.searchParams.set('state', authRequest.state)

    window.location.href = redirectUrl.toString()
  }

  // Group scopes by category
  const groupedScopes = scopeDetails.reduce((acc, scope) => {
    const category = scope.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(scope)
    return acc
  }, {})

  const categoryNames = {
    authentication: 'Authentication',
    user_info: 'User Information',
    narimato: 'Narimato',
    cardmass: 'CardMass',
    playmass: 'PlayMass',
    other: 'Other Permissions',
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
        <div style={{ color: '#e6e8f2' }}>Loading...</div>
      </div>
    )
  }

  if (error || !authRequest) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
        <div style={{ maxWidth: 480, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '1.5rem', color: '#e6e8f2' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#e74c3c' }}>Authorization Error</h1>
          <p style={{ marginTop: '0.5rem' }}>{error || 'Invalid authorization request'}</p>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.8 }}>
            This authorization link is invalid or has expired. Please return to the application you were trying to access and try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0b1021' }}>
      <div style={{ width: '100%', maxWidth: 600, background: '#12172b', border: '1px solid #22284a', borderRadius: 12, padding: '2rem', color: '#e6e8f2' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {authRequest.client_logo && (
            <img src={authRequest.client_logo} alt={authRequest.client_name} style={{ width: 64, height: 64, marginBottom: '1rem' }} />
          )}
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Authorize Access</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>
            <strong>{authRequest.client_name}</strong> is requesting access to your account
          </p>
          {authRequest.client_homepage && (
            <a href={authRequest.client_homepage} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: '#4da6ff', marginTop: '0.25rem', display: 'inline-block' }}>
              {authRequest.client_homepage}
            </a>
          )}
        </div>

        {/* User Info */}
        {user && (
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: '#0e1733', border: '1px solid #24306b', borderRadius: 8, fontSize: '0.875rem' }}>
            Logged in as <strong>{user.email}</strong>
          </div>
        )}

        {/* Permissions */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>This application will be able to:</h2>
          
          {Object.entries(groupedScopes).map(([category, scopes]) => (
            <div key={category} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 'bold', opacity: 0.8, marginBottom: '0.5rem' }}>
                {categoryNames[category] || category}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {scopes.map((scope, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, padding: '0.75rem', background: '#0b1021', border: '1px solid #22284a', borderRadius: 6 }}>
                    <div style={{ fontSize: '1.25rem' }}>✓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{scope.name}</div>
                      <div style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.25rem' }}>{scope.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#211a0b', border: '1px solid #8b1919', borderRadius: 8, color: '#e74c3c' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleApprove}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: '#1e895a',
              color: 'white',
              border: 0,
              borderRadius: 8,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Authorizing...' : 'Authorize'}
          </button>
          <button
            onClick={handleDeny}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: '#24306b',
              color: 'white',
              border: 0,
              borderRadius: 8,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Deny
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#0e1733', border: '1px solid #24306b', borderRadius: 8, fontSize: '0.875rem', opacity: 0.8 }}>
          By authorizing, you allow this application to access the information listed above. You can revoke access at any time from your account settings.
        </div>
      </div>
    </div>
  )
}
