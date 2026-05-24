import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Paper,
  Code,
  List,
  Box,
  Anchor,
  Container,
  Divider,
  Group,
} from '@mantine/core';
// WHAT: Documentation for handling return URLs in OAuth flow
// WHY: Developers need guidance on preserving user's location through OAuth redirects
// HOW: Encode return URL in state parameter or use sessionStorage

import DocsLayout from '../../components/DocsLayout';
import packageJson from '../../package.json';

export default function ReturnUrlHandling() {
  return (
    <DocsLayout>
      <Stack gap="xl">
        <Box>
          <Title order={1} mb="xs">Return URL Handling</Title>
          <Text size="sm" c="dimmed" fw={500} mb="xs">API Version: {packageJson.version}</Text>
          <Text size="lg" c="dimmed">Returning users to their original page after OAuth</Text>
        </Box>

        
          {/* Problem Statement */}
          <Box>
            <Title order={2} mb="sm">The Problem</Title>
            <Text size="sm">
              When users click "Login" from a specific page in your app (e.g., <code>/settings/integrations</code>),
              they go through the OAuth flow at the SSO service. After successfully authenticating, you want them
              to return to that exact page—not just your homepage or dashboard.
            </Text>
            <div>
              <Text size="sm">
                <strong>Example Flow:</strong>
              </Text>
              <List spacing="xs" type="ordered">
                <List.Item>User is on <code>https://yourapp.com/settings/integrations?tab=sso</code></List.Item>
                <List.Item>Clicks "Login" → Redirected to SSO</List.Item>
                <List.Item>Completes authentication (may register new account)</List.Item>
                <List.Item>OAuth redirects to <code>https://yourapp.com/auth/callback?code=...</code></List.Item>
                <List.Item><strong>Goal:</strong> Redirect user back to <code>/settings/integrations?tab=sso</code></List.Item>
              </List>
            </div>
          </Box>

          {/* Solution Overview */}
          <Box>
            <Title order={2} mb="sm">The Solution</Title>
            <Text size="sm">
              The <code>state</code> parameter in OAuth 2.0 serves two purposes:
            </Text>
            <List spacing="xs">
              <List.Item><strong>CSRF Protection</strong> (required): Prevents cross-site request forgery attacks</List.Item>
              <List.Item><strong>App State Preservation</strong> (optional): Store return URL, UI state, etc.</List.Item>
            </List>
            <Text size="sm">
              You can encode <strong>both</strong> the CSRF token and return URL in the state parameter.
            </Text>
          </Box>

          {/* Method 1: State Parameter */}
          <Box>
            <Title order={2} mb="sm">Method 1: State Parameter (Recommended)</Title>
            <Text size="sm">
              ✅ <strong>Recommended:</strong> Works across tabs, survives page refreshes, fully stateless
            </Text>

            <Title order={3} mb="xs">Step 1: Encode State When Initiating OAuth</Title>
            <Code block>
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
            </Code>

            <Title order={3} mb="xs">Step 2: Decode State in OAuth Callback</Title>
            <Code block>
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
            </Code>
          </Box>

          {/* Method 2: SessionStorage */}
          <Box>
            <Title order={2} mb="sm">Method 2: SessionStorage (Alternative)</Title>
            <Text size="sm">
              ⚠️ <strong>Limitations:</strong> Doesn't work across tabs, lost on page refresh
            </Text>

            <Title order={3} mb="xs">Frontend Implementation</Title>
            <Code block>
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
            </Code>
          </Box>

          {/* Security Best Practices */}
          <Box>
            <Title order={2} mb="sm">Security Best Practices</Title>
            
            <Title order={3} mb="xs">1. Always Validate Return URLs</Title>
            <div>
              <Text size="sm">
                <strong>⚠️ Critical Security Warning:</strong><br />
                Never blindly redirect to user-supplied URLs. This opens your app to <strong>open redirect attacks</strong>.
              </Text>
            </div>
            <Text size="sm">
              Malicious actors can craft URLs like:
            </Text>
            <div>
              <code>
                https://yourapp.com/login?return_to=https://evil.com/phishing
              </code>
            </div>
            <Text size="sm">
              <strong>Always validate:</strong>
            </Text>
            <List spacing="xs">
              <List.Item>✅ Only allow relative URLs (starting with <code>/</code>)</List.Item>
              <List.Item>✅ Reject protocol-relative URLs (<code>//evil.com</code>)</List.Item>
              <List.Item>✅ Reject URLs with suspicious characters</List.Item>
              <List.Item>✅ Use an allowlist of valid paths if possible</List.Item>
            </List>

            <Title order={3} mb="xs">2. State Parameter Best Practices</Title>
            <List spacing="xs">
              <List.Item><strong>Always include CSRF token</strong> - Required for security</List.Item>
              <List.Item><strong>Add timestamp</strong> - Detect and reject expired states</List.Item>
              <List.Item><strong>Keep it small</strong> - Some browsers limit URL length to ~2000 chars</List.Item>
              <List.Item><strong>Use base64url encoding</strong> - Safe for URLs (not standard base64)</List.Item>
            </List>

            <Title order={3} mb="xs">3. Don't Store Sensitive Data in State</Title>
            <Paper withBorder p="md" shadow="sm" radius="md" style={{ borderLeft: "4px solid var(--mantine-color-yellow-6)" }} bg="var(--mantine-color-yellow-light)">
              <Stack gap="xs">
                <Text size="sm">
                The <code>state</code> parameter is visible in browser history, logs, and analytics.
                Never include:
              </Text>
              <List spacing="xs">
                <List.Item>❌ Passwords or tokens</List.Item>
                <List.Item>❌ Personal information (SSN, credit cards)</List.Item>
                <List.Item>❌ Session IDs</List.Item>
                <List.Item>✅ Only non-sensitive navigation state</List.Item>
              </List>
              </Stack>
            </Paper>
          </Box>

          {/* Complete Working Example */}
          <Box>
            <Title order={2} mb="sm">Complete Working Example</Title>
            <Text size="sm">
              Here's a full implementation using Next.js (adaptable to any framework):
            </Text>

            <Title order={3} mb="xs">Frontend Component</Title>
            <Code block>
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
            </Code>

            <Title order={3} mb="xs">Backend OAuth Callback</Title>
            <Code block>
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
            </Code>
          </Box>

          {/* Common Issues */}
          <Box>
            <Title order={2} mb="sm">Troubleshooting</Title>
            
            <Title order={3} mb="xs">Issue: User Always Redirected to Homepage</Title>
            <Text size="sm"><strong>Cause:</strong> Return URL not preserved in state parameter</Text>
            <Text size="sm"><strong>Solution:</strong> Check that you're encoding <code>return_to</code> in state before OAuth redirect</Text>

            <Title order={3} mb="xs">Issue: "Invalid state parameter" Error</Title>
            <Text size="sm"><strong>Cause:</strong> State decoding failed or CSRF token missing</Text>
            <Text size="sm"><strong>Solution:</strong> Ensure you're using base64url encoding (not standard base64) and including CSRF token</Text>

            <Title order={3} mb="xs">Issue: Return URL Lost After Registration</Title>
            <Text size="sm"><strong>Cause:</strong> SSO preserves OAuth parameters during registration flow</Text>
            <Text size="sm"><strong>Solution:</strong> The current login and registration flow preserves the encoded return target through the auth round-trip. If this breaks, treat it as a regression.</Text>

            <Title order={3} mb="xs">Issue: Open Redirect Warning</Title>
            <Text size="sm"><strong>Cause:</strong> Not validating return URLs</Text>
            <Text size="sm"><strong>Solution:</strong> Always validate that return URL is relative and safe before redirecting</Text>
          </Box>

          {/* Next Steps */}
          <Box>
            <Title order={2} mb="sm">Next Steps</Title>
            <List spacing="xs">
              <List.Item><Anchor component={Link} href="/docs/authentication">Full Authentication Guide</Anchor></List.Item>
              <List.Item><Anchor component={Link} href="/docs/quickstart">Quick Start Guide</Anchor></List.Item>
              <List.Item><Anchor component={Link} href="/docs/security/best-practices">Security Best Practices</Anchor></List.Item>
              <List.Item><Anchor component={Link} href="/docs/api">API Reference</Anchor></List.Item>
            </List>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
