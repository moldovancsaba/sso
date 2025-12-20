// WHAT: Documentation for handling return URLs in OAuth flow
// WHY: Developers need guidance on preserving user's location through OAuth redirects
// HOW: Encode return URL in state parameter or use sessionStorage

import DocsLayout from '../../components/DocsLayout';
import styles from '../../styles/docs.module.css';
import packageJson from '../../package.json';

export default function ReturnUrlHandling() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Return URL Handling</h1>
          <p className={styles.version}>API Version: {packageJson.version}</p>
          <p className={styles.subtitle}>Returning users to their original page after OAuth</p>
        </header>

        <main className={styles.main}>
          {/* Problem Statement */}
          <section className={styles.section}>
            <h2>The Problem</h2>
            <p>
              When users click "Login" from a specific page in your app (e.g., <code>/settings/integrations</code>),
              they go through the OAuth flow at the SSO service. After successfully authenticating, you want them
              to return to that exact page—not just your homepage or dashboard.
            </p>
            <div className={styles.infoBox}>
              <p>
                <strong>Example Flow:</strong>
              </p>
              <ol>
                <li>User is on <code>https://yourapp.com/settings/integrations?tab=sso</code></li>
                <li>Clicks "Login" → Redirected to SSO</li>
                <li>Completes authentication (may register new account)</li>
                <li>OAuth redirects to <code>https://yourapp.com/auth/callback?code=...</code></li>
                <li><strong>Goal:</strong> Redirect user back to <code>/settings/integrations?tab=sso</code></li>
              </ol>
            </div>
          </section>

          {/* Solution Overview */}
          <section className={styles.section}>
            <h2>The Solution</h2>
            <p>
              The <code>state</code> parameter in OAuth 2.0 serves two purposes:
            </p>
            <ul>
              <li><strong>CSRF Protection</strong> (required): Prevents cross-site request forgery attacks</li>
              <li><strong>App State Preservation</strong> (optional): Store return URL, UI state, etc.</li>
            </ul>
            <p>
              You can encode <strong>both</strong> the CSRF token and return URL in the state parameter.
            </p>
          </section>

          {/* Method 1: State Parameter */}
          <section className={styles.section}>
            <h2>Method 1: State Parameter (Recommended)</h2>
            <p className={styles.successText}>
              ✅ <strong>Recommended:</strong> Works across tabs, survives page refreshes, fully stateless
            </p>

            <h3>Step 1: Encode State When Initiating OAuth</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Frontend: When user clicks "Login"
async function handleLogin() {
  // WHAT: Capture current page location
  const currentUrl = window.location.pathname + window.location.search
  // Example: "/settings/integrations?tab=sso"
  
  // WHAT: Create state object with CSRF token and return URL
  const state = {
    csrf: generateRandomString(32),  // Required: CSRF protection
    return_to: currentUrl,            // Optional: Where to return after OAuth
    timestamp: Date.now()              // Optional: Detect expired states
  }
  
  // WHAT: Encode state as base64url JSON
  const encodedState = base64URLEncode(JSON.stringify(state))
  
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  sessionStorage.setItem('pkce_verifier', codeVerifier)
  
  // Build authorization URL
  const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_SSO_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', process.env.NEXT_PUBLIC_SSO_REDIRECT_URI)
  authUrl.searchParams.set('scope', 'openid profile email offline_access')
  authUrl.searchParams.set('state', encodedState)  // Contains CSRF + return URL
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  
  // Redirect to SSO
  window.location.href = authUrl.toString()
}

function generateRandomString(length) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

function base64URLEncode(buffer) {
  const base64 = typeof buffer === 'string' 
    ? btoa(buffer)
    : btoa(String.fromCharCode(...new Uint8Array(buffer)))
  return base64.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '')
}`}
              </pre>
            </div>

            <h3>Step 2: Decode State in OAuth Callback</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Backend: /auth/callback endpoint
app.get('/auth/callback', async (req, res) => {
  const { code, state: encodedState } = req.query
  
  // WHAT: Decode state parameter
  if (!encodedState) {
    return res.status(400).json({ error: 'Missing state parameter' })
  }
  
  let state
  try {
    const stateJson = Buffer.from(encodedState, 'base64url').toString('utf-8')
    state = JSON.parse(stateJson)
  } catch (err) {
    console.error('Failed to decode state:', err)
    return res.status(400).json({ error: 'Invalid state parameter' })
  }
  
  // WHAT: Validate CSRF token
  // WHY: Prevents cross-site request forgery attacks
  if (!state.csrf || typeof state.csrf !== 'string') {
    return res.status(400).json({ error: 'Invalid CSRF token' })
  }
  
  // Optional: Check state timestamp (prevent replay attacks)
  if (state.timestamp) {
    const age = Date.now() - state.timestamp
    if (age > 10 * 60 * 1000) { // 10 minutes
      return res.status(400).json({ error: 'State expired' })
    }
  }
  
  // Exchange code for tokens (standard OAuth flow)
  const codeVerifier = req.session.pkce_verifier
  const tokens = await exchangeCodeForTokens(code, codeVerifier)
  
  // Store tokens in session
  req.session.access_token = tokens.access_token
  req.session.refresh_token = tokens.refresh_token
  req.session.user = parseIdToken(tokens.id_token)
  
  // Clean up
  delete req.session.pkce_verifier
  
  // WHAT: Extract return URL from state
  const returnTo = state.return_to || '/dashboard'
  
  // WHAT: Validate return URL (security: prevent open redirects)
  if (!isValidReturnUrl(returnTo)) {
    console.warn('Invalid return URL, using default:', returnTo)
    return res.redirect('/dashboard')
  }
  
  // Redirect to original page
  console.log('OAuth successful, redirecting to:', returnTo)
  res.redirect(returnTo)
})

// WHAT: Validate return URL to prevent open redirect attacks
// WHY: Malicious actors could craft state with external URLs
function isValidReturnUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('/')) return false        // Must be relative
  if (url.startsWith('//')) return false        // No protocol-relative
  if (url.includes('<') || url.includes('>')) return false
  return true
}`}
              </pre>
            </div>
          </section>

          {/* Method 2: SessionStorage */}
          <section className={styles.section}>
            <h2>Method 2: SessionStorage (Alternative)</h2>
            <p className={styles.warningText}>
              ⚠️ <strong>Limitations:</strong> Doesn't work across tabs, lost on page refresh
            </p>

            <h3>Frontend Implementation</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// Store return URL before OAuth redirect
function handleLogin() {
  const currentUrl = window.location.pathname + window.location.search
  sessionStorage.setItem('oauth_return_to', currentUrl)
  
  // Continue with OAuth redirect...
}

// After OAuth callback, check for stored URL
window.addEventListener('DOMContentLoaded', () => {
  const returnTo = sessionStorage.getItem('oauth_return_to')
  if (returnTo && window.location.pathname === '/') {
    // User just completed OAuth, redirect to original page
    sessionStorage.removeItem('oauth_return_to')
    window.location.href = returnTo
  }
})`}
              </pre>
            </div>
          </section>

          {/* Security Best Practices */}
          <section className={styles.section}>
            <h2>Security Best Practices</h2>
            
            <h3>1. Always Validate Return URLs</h3>
            <div className={styles.dangerBox}>
              <p>
                <strong>⚠️ Critical Security Warning:</strong><br />
                Never blindly redirect to user-supplied URLs. This opens your app to <strong>open redirect attacks</strong>.
              </p>
            </div>
            <p>
              Malicious actors can craft URLs like:
            </p>
            <div className={styles.codeBlock}>
              <code>
                https://yourapp.com/login?return_to=https://evil.com/phishing
              </code>
            </div>
            <p>
              <strong>Always validate:</strong>
            </p>
            <ul>
              <li>✅ Only allow relative URLs (starting with <code>/</code>)</li>
              <li>✅ Reject protocol-relative URLs (<code>//evil.com</code>)</li>
              <li>✅ Reject URLs with suspicious characters</li>
              <li>✅ Use an allowlist of valid paths if possible</li>
            </ul>

            <h3>2. State Parameter Best Practices</h3>
            <ul>
              <li><strong>Always include CSRF token</strong> - Required for security</li>
              <li><strong>Add timestamp</strong> - Detect and reject expired states</li>
              <li><strong>Keep it small</strong> - Some browsers limit URL length to ~2000 chars</li>
              <li><strong>Use base64url encoding</strong> - Safe for URLs (not standard base64)</li>
            </ul>

            <h3>3. Don't Store Sensitive Data in State</h3>
            <div className={styles.warningBox}>
              <p>
                The <code>state</code> parameter is visible in browser history, logs, and analytics.
                Never include:
              </p>
              <ul>
                <li>❌ Passwords or tokens</li>
                <li>❌ Personal information (SSN, credit cards)</li>
                <li>❌ Session IDs</li>
                <li>✅ Only non-sensitive navigation state</li>
              </ul>
            </div>
          </section>

          {/* Complete Working Example */}
          <section className={styles.section}>
            <h2>Complete Working Example</h2>
            <p>
              Here's a full implementation using Next.js (adaptable to any framework):
            </p>

            <h3>Frontend Component</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// components/LoginButton.jsx
export default function LoginButton() {
  const handleLogin = async () => {
    try {
      // Capture current location
      const state = {
        csrf: generateRandomString(32),
        return_to: window.location.pathname + window.location.search,
        timestamp: Date.now()
      }
      
      // Generate PKCE
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      sessionStorage.setItem('pkce_verifier', verifier)
      
      // Build auth URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.NEXT_PUBLIC_SSO_CLIENT_ID,
        redirect_uri: process.env.NEXT_PUBLIC_SSO_REDIRECT_URI,
        scope: 'openid profile email offline_access',
        state: btoa(JSON.stringify(state)).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, ''),
        code_challenge: challenge,
        code_challenge_method: 'S256'
      })
      
      window.location.href = \`https://sso.doneisbetter.com/api/oauth/authorize?\${params}\`
    } catch (err) {
      console.error('Login failed:', err)
    }
  }
  
  return <button onClick={handleLogin}>Login with SSO</button>
}

// Utility functions...
function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(hash))
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '')
}

function generateRandomString(length) {
  return base64URLEncode(crypto.getRandomValues(new Uint8Array(length)))
}`}
              </pre>
            </div>

            <h3>Backend OAuth Callback</h3>
            <div className={styles.codeBlock}>
              <pre>
                {`// pages/api/auth/callback.js (Next.js API route)
export default async function handler(req, res) {
  const { code, state: encodedState } = req.query
  
  // Decode and validate state
  let state
  try {
    const stateJson = Buffer.from(encodedState, 'base64url').toString('utf-8')
    state = JSON.parse(stateJson)
    
    if (!state.csrf) throw new Error('Missing CSRF token')
    if (state.timestamp && Date.now() - state.timestamp > 600000) {
      throw new Error('State expired')
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid state' })
  }
  
  // Exchange code for tokens
  const tokenRes = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET,
      redirect_uri: process.env.SSO_REDIRECT_URI,
      code_verifier: req.cookies.pkce_verifier
    })
  })
  
  if (!tokenRes.ok) {
    return res.status(400).json({ error: 'Token exchange failed' })
  }
  
  const tokens = await tokenRes.json()
  
  // Store in session (use your session library)
  req.session.user = decodeIdToken(tokens.id_token)
  req.session.accessToken = tokens.access_token
  req.session.refreshToken = tokens.refresh_token
  await req.session.save()
  
  // Validate and redirect to return URL
  const returnTo = state.return_to || '/dashboard'
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return res.redirect(returnTo)
  }
  
  res.redirect('/dashboard')
}`}
              </pre>
            </div>
          </section>

          {/* Common Issues */}
          <section className={styles.section}>
            <h2>Troubleshooting</h2>
            
            <h3>Issue: User Always Redirected to Homepage</h3>
            <p><strong>Cause:</strong> Return URL not preserved in state parameter</p>
            <p><strong>Solution:</strong> Check that you're encoding <code>return_to</code> in state before OAuth redirect</p>

            <h3>Issue: "Invalid state parameter" Error</h3>
            <p><strong>Cause:</strong> State decoding failed or CSRF token missing</p>
            <p><strong>Solution:</strong> Ensure you're using base64url encoding (not standard base64) and including CSRF token</p>

            <h3>Issue: Return URL Lost After Registration</h3>
            <p><strong>Cause:</strong> SSO preserves OAuth parameters during registration flow</p>
            <p><strong>Solution:</strong> This is now fixed in v5.24.0+. The return URL in state is preserved through registration.</p>

            <h3>Issue: Open Redirect Warning</h3>
            <p><strong>Cause:</strong> Not validating return URLs</p>
            <p><strong>Solution:</strong> Always validate that return URL is relative and safe before redirecting</p>
          </section>

          {/* Next Steps */}
          <section className={styles.section}>
            <h2>Next Steps</h2>
            <ul>
              <li><a href="/docs/authentication">Full Authentication Guide</a></li>
              <li><a href="/docs/quickstart">Quick Start Guide</a></li>
              <li><a href="/docs/security/best-practices">Security Best Practices</a></li>
              <li><a href="/docs/api">API Reference</a></li>
            </ul>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
