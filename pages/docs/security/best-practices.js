import Link from 'next/link';
import {
  Stack,
  Title,
  Text,
  Code,
  List,
  Box,
  Anchor,
} from '@mantine/core';
import { AccentPanel } from '@doneisbetter/gds-core/server'
// WHAT: Security best practices documentation for OAuth 2.0 SSO integration
// WHY: Developers need comprehensive security guidance to avoid vulnerabilities
// HOW: Covers OAuth 2.0 security, token handling, CSRF protection, and app permissions

import DocsLayout from '../../../components/DocsLayout';

// WHAT: Disable SSG for this page to prevent NextRouter errors
// WHY: DocsLayout uses useRouter() which requires runtime router context
// HOW: getServerSideProps forces server-side rendering instead of static generation
export async function getServerSideProps() {
  return { props: {} }
}

export default function SecurityBestPractices() {
  return (
    <DocsLayout
      eyebrow="Security"
      lead="Security rules and implementation guidance for OAuth consumers and permission-aware integrations."
      title="Security Best Practices"
      versionLabel="SSO Version"
    >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              This guide covers security best practices for integrating with the SSO service using OAuth 2.0.
              Following these guidelines will help protect your application and users from common security vulnerabilities.
            </Text>
            <AccentPanel title="Critical" tone="red" variant="soft-outline">
              <Text size="sm">
                OAuth 2.0 security depends on proper implementation. Violations of these practices can lead to severe security breaches.
              </Text>
            </AccentPanel>
            <AccentPanel title="Current contract note" tone="amber" variant="soft-outline">
              <Text size="sm">
                Use ID tokens for identity claims and use permission APIs for app authorization state. If your backend surfaces a <code>permissionStatus</code> field, that should be derived from the permission APIs rather than assumed to be present in the raw ID token.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">1. Never Expose Client Secret</Title>
            <Text size="sm"><strong>Risk Level: CRITICAL 🔴</strong></Text>
            <Code block>
              {`// ❌ NEVER DO THIS - Exposing secret in frontend code
const CLIENT_SECRET = 'abc123secret'; // WRONG!

fetch('https://sso.doneisbetter.com/api/oauth/token', {
  body: JSON.stringify({
    client_id: 'myapp',
    client_secret: CLIENT_SECRET // DANGER: Secret exposed in browser!
  })
});

// ✅ CORRECT - Token exchange happens on backend only
// Frontend: Redirect to SSO authorization
window.location.href = \`https://sso.doneisbetter.com/api/oauth/authorize?client_id=myapp&...\`;

// Backend: Exchange code for tokens (secret stays server-side)
const tokenResponse = await fetch(
  'https://sso.doneisbetter.com/api/oauth/token',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: authorizationCode,
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET // Safe: Server-side only
    })
  }
);`}
            </Code>
            <Text size="sm"><strong>WHY:</strong> If <code>client_secret</code> is exposed in frontend code, anyone can impersonate your application and request tokens on behalf of any user.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">2. Always Use HTTPS</Title>
            <Text size="sm"><strong>Risk Level: CRITICAL 🔴</strong></Text>
            <List spacing="xs">
              <List.Item>✅ All OAuth 2.0 communications MUST use HTTPS</List.Item>
              <List.Item>✅ Redirect URIs must be HTTPS (no HTTP allowed in production)</List.Item>
              <List.Item>✅ Never transmit tokens over unencrypted connections</List.Item>
              <List.Item>⚠️ HTTP is only acceptable in local development (e.g., <code>http://localhost:3000</code>)</List.Item>
            </List>
            <Text size="sm"><strong>WHY:</strong> Without TLS/SSL encryption, tokens and authorization codes can be intercepted by attackers (man-in-the-middle attacks).</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">3. Implement CSRF Protection with State Parameter</Title>
            <Text size="sm"><strong>Risk Level: HIGH 🟠</strong></Text>
            <Code block>
              {`// WHY: Prevent Cross-Site Request Forgery (CSRF) attacks

// Step 1: Generate random state before redirecting to SSO
const state = crypto.randomBytes(32).toString('hex');
sessionStorage.setItem('oauth_state', state);

const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize');
authUrl.searchParams.append('state', state);
// ... other parameters
window.location.href = authUrl.toString();

// Step 2: Validate state in callback
const receivedState = req.query.state;
const expectedState = sessionStorage.getItem('oauth_state');

if (receivedState !== expectedState) {
  throw new Error('State mismatch - possible CSRF attack!');
}

// Step 3: Clear state after successful validation
sessionStorage.removeItem('oauth_state');`}
            </Code>
            <Text size="sm"><strong>WHY:</strong> The state parameter ensures the OAuth callback is responding to a request your application initiated, preventing CSRF attacks.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">4. Secure Token Storage</Title>
            <Text size="sm"><strong>Risk Level: CRITICAL 🔴</strong></Text>
            <Title order={3} mb="xs">Backend: Use HTTP-Only Cookies (Recommended)</Title>
            <Code block>
              {`// ✅ SECURE - HTTP-only cookies prevent XSS attacks
res.cookie('access_token', accessToken, {
  httpOnly: true,    // Cannot be accessed by JavaScript
  secure: true,      // Only transmitted over HTTPS
  sameSite: 'lax',   // CSRF protection
  maxAge: 3600000    // 1 hour expiry
});

res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 2592000000 // 30 days expiry
});`}
            </Code>
            <Title order={3} mb="xs">Frontend: Never Store Tokens in LocalStorage</Title>
            <Code block>
              {`// ❌ NEVER DO THIS - Vulnerable to XSS attacks
localStorage.setItem('access_token', token); // WRONG!
sessionStorage.setItem('access_token', token); // ALSO WRONG!

// ✅ CORRECT - Let backend manage tokens via cookies
// Frontend just makes authenticated requests:
fetch('/api/auth/session', {
  credentials: 'include' // Sends HTTP-only cookies automatically
});`}
            </Code>
            <Text size="sm"><strong>WHY:</strong> Tokens stored in localStorage or sessionStorage can be stolen via XSS attacks. HTTP-only cookies are inaccessible to JavaScript.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">5. Validate and Decode ID Tokens Properly</Title>
            <Text size="sm"><strong>Risk Level: HIGH 🟠</strong></Text>
            <Code block>
              {`// WHY: Ensure token integrity and extract user info safely

import jwt from 'jsonwebtoken';

// ✅ Option 1: Just decode (if you trust the SSO server)
const decoded = jwt.decode(idToken);
const { sub: userId, email, name, role } = decoded;

// ✅ Option 2: Verify signature (more secure, recommended)
const publicKey = await fetchSSOPublicKey(); // From /.well-known/jwks.json
const decoded = jwt.verify(idToken, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://sso.doneisbetter.com',
  audience: process.env.SSO_CLIENT_ID
});

// ⚠️ Always check token expiration
if (decoded.exp * 1000 < Date.now()) {
  throw new Error('Token expired');
}`}
            </Code>
            <Text size="sm"><strong>WHY:</strong> Verifying the ID token signature ensures it hasn&apos;t been tampered with and actually comes from the SSO server.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">6. Handle App Permission Status Securely</Title>
            <Text size="sm"><strong>Risk Level: MEDIUM 🟡</strong></Text>
            <Code block>
              {`// WHY: Enforce app-level permissions to prevent unauthorized access

const permission = await getPermissionForUserAndClient({ userId, clientId });
const role = permission?.role ?? 'member';

// ✅ Always check permission status before granting access
if (permission?.status !== 'approved') {
  if (permission?.status === 'pending') {
    return res.redirect('/access-pending');
  }
  if (permission?.status === 'revoked') {
    return res.redirect('/access-denied');
  }
  // Unknown status - deny access
  return res.status(403).json({ error: 'Access not approved' });
}

// ✅ Check role for admin-only features
if (role === 'admin') {
  // Grant admin access
} else {
  // Regular user access only
}`}
            </Code>
            <Text size="sm"><strong>WHY:</strong> A user may authenticate successfully but still lack app access. Always verify backend-derived permission state before granting access.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">7. Implement Token Refresh Before Expiry</Title>
            <Text size="sm"><strong>Risk Level: MEDIUM 🟡</strong></Text>
            <Code block>
              {`// WHY: Maintain session continuity without forcing re-login

// ✅ Refresh tokens proactively (e.g., 5 minutes before expiry)
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

async function ensureValidToken() {
  const decoded = jwt.decode(accessToken);
  const expiryTime = decoded.exp * 1000;
  const now = Date.now();

  if (expiryTime - now < TOKEN_REFRESH_BUFFER) {
    // Token expiring soon, refresh it
    await refreshAccessToken();
  }
}

async function refreshAccessToken() {
  const response = await fetch('/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  });

  const { access_token, id_token } = await response.json();
  // Update stored tokens
}`}
            </Code>
            <Text size="sm"><strong>WHY:</strong> Access tokens expire quickly (1 hour default). Proactive refresh prevents session interruptions.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">8. Secure Redirect URI Configuration</Title>
            <Text size="sm"><strong>Risk Level: HIGH 🟠</strong></Text>
            <List spacing="xs">
              <List.Item>✅ Register exact redirect URIs with SSO admin (no wildcards)</List.Item>
              <List.Item>✅ Use HTTPS for all redirect URIs in production</List.Item>
              <List.Item>⚠️ Avoid open redirects (validate redirect_uri parameter)</List.Item>
              <List.Item>⚠️ Never use dynamic redirect URIs from user input</List.Item>
            </List>
            <Code block>
              {`// ❌ DANGEROUS - Open redirect vulnerability
const redirectUri = req.query.redirect; // User-controlled!
window.location.href = \`https://sso.doneisbetter.com/api/oauth/authorize?redirect_uri=\${redirectUri}\`;

// ✅ SAFE - Use pre-registered, hardcoded redirect URI
const ALLOWED_REDIRECT_URI = 'https://myapp.com/api/auth/callback';
window.location.href = \`https://sso.doneisbetter.com/api/oauth/authorize?redirect_uri=\${ALLOWED_REDIRECT_URI}\`;`}
            </Code>
            <Text size="sm"><strong>WHY:</strong> Attackers can trick users into authorizing malicious applications by manipulating redirect URIs.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">9. Implement Rate Limiting</Title>
            <Text size="sm"><strong>Risk Level: MEDIUM 🟡</strong></Text>
            <Text size="sm">
              The SSO service implements rate limiting on all endpoints. Your application should handle rate limit errors gracefully:
            </Text>
            <Code block>
              {`// WHY: Prevent abuse and handle rate limit responses

const response = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
  // ... request config
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After'); // seconds
  console.error(\`Rate limited. Retry after \${retryAfter} seconds.\`);
  
  // ✅ Implement exponential backoff
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  // Retry request
}`}
            </Code>
            <Text size="sm"><strong>Current Rate Limits:</strong></Text>
            <List spacing="xs">
              <List.Item>Public endpoints: 100 requests/minute per IP</List.Item>
              <List.Item>OAuth endpoints: 50 requests/minute per client_id</List.Item>
              <List.Item>Admin endpoints: 200 requests/minute per admin session</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">10. Logout Securely</Title>
            <Text size="sm"><strong>Risk Level: MEDIUM 🟡</strong></Text>
            <Code block>
              {`// WHY: Ensure complete session termination

// Step 1: Revoke tokens with SSO server
await fetch('https://sso.doneisbetter.com/api/oauth/revoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: accessToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  })
});

// Step 2: Clear local session (cookies, etc.)
res.clearCookie('access_token');
res.clearCookie('refresh_token');
res.clearCookie('id_token');

// Step 3: Optionally redirect to SSO logout (for single logout)
window.location.href = 'https://sso.doneisbetter.com/api/public/logout';`}
            </Code>
            <Text size="sm"><strong>WHY:</strong> Revoking tokens at the SSO server ensures they can&apos;t be reused even if intercepted.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">Summary Checklist</Title>
            <List spacing="xs">
              <List.Item>☑️ Never expose <code>client_secret</code> in frontend code</List.Item>
              <List.Item>☑️ Always use HTTPS for OAuth endpoints</List.Item>
              <List.Item>☑️ Implement CSRF protection with <code>state</code> parameter</List.Item>
              <List.Item>☑️ Store tokens in HTTP-only cookies (never localStorage)</List.Item>
              <List.Item>☑️ Validate ID token signatures and expiration</List.Item>
              <List.Item>☑️ Check backend-derived permission status before granting access</List.Item>
              <List.Item>☑️ Implement token refresh before expiry</List.Item>
              <List.Item>☑️ Use exact, pre-registered redirect URIs</List.Item>
              <List.Item>☑️ Handle rate limiting with exponential backoff</List.Item>
              <List.Item>☑️ Revoke tokens on logout</List.Item>
            </List>
            <AccentPanel title="Related Resources" tone="red" variant="soft-outline">
              <List spacing="xs">
                <List.Item><Anchor component={Link} href="/docs/authentication">OAuth 2.0 Authentication Flow</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/security/cors">CORS Configuration</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/security/permissions">App Permissions System</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/api/errors">Error Handling</Anchor></List.Item>
              </List>
            </AccentPanel>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
