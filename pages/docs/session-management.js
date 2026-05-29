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
// WHAT: OAuth 2.0 token lifecycle and session management documentation
// WHY: Developers need to understand token types, expiry, and refresh mechanisms
// HOW: Explains access tokens, refresh tokens, ID tokens, and session validation

import DocsLayout from '../../components/DocsLayout';

export default function SessionManagementDocs() {
  return (
    <DocsLayout
      eyebrow="Integration Guide"
      lead="Token lifecycle, refresh behavior, and public-session expectations for SSO consumers."
      title="Session Management"
      versionLabel="SSO Version"
    >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              The SSO service uses OAuth 2.0 tokens to manage user sessions. Understanding token types,
              lifetimes, and refresh mechanisms is essential for building secure, seamless applications.
            </Text>
            <AccentPanel title="Application boundary" tone="red" variant="soft-outline">
              <Text size="sm">
                This guide focuses on session management from the application&apos;s perspective. All token operations should happen on your backend server, not in the browser.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">Token Types</Title>
            <Text size="sm">The SSO service issues three types of tokens during OAuth 2.0 authentication:</Text>

            <Title order={3} mb="xs">1. Access Token</Title>
            <List spacing="xs">
              <List.Item><strong>Purpose:</strong> Used to authenticate API requests</List.Item>
              <List.Item><strong>Lifetime:</strong> 1 hour (3600 seconds)</List.Item>
              <List.Item><strong>Format:</strong> JWT (JSON Web Token)</List.Item>
              <List.Item><strong>Usage:</strong> Include in <code>Authorization: Bearer TOKEN</code> header</List.Item>
              <List.Item><strong>Storage:</strong> HTTP-only cookie (backend) or secure storage (backend)</List.Item>
            </List>
            <Code block>
              {`// Example access token payload (decoded)
{
  "sub": "user-uuid-123",
  "iss": "https://sso.doneisbetter.com",
  "aud": "your-client-id",
  "exp": 1710000000,
  "iat": 1709996400,
  "scope": "openid profile email"
}`}
            </Code>

            <Title order={3} mb="xs">2. ID Token</Title>
            <List spacing="xs">
              <List.Item><strong>Purpose:</strong> Contains user identity and app permissions</List.Item>
              <List.Item><strong>Lifetime:</strong> 1 hour (3600 seconds)</List.Item>
              <List.Item><strong>Format:</strong> JWT (JSON Web Token)</List.Item>
              <List.Item><strong>Usage:</strong> Extract user identity claims; derive app permission status separately through your backend permission layer</List.Item>
              <List.Item><strong>Storage:</strong> HTTP-only cookie (backend)</List.Item>
            </List>
            <Code block>
              {`// Example ID token payload (decoded)
{
  "sub": "user-uuid-123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",  // Identity / broad role claim
  "iss": "https://sso.doneisbetter.com",
  "aud": "your-client-id",
  "exp": 1710000000,
  "iat": 1709996400
}`}
            </Code>

            <Title order={3} mb="xs">3. Refresh Token</Title>
            <List spacing="xs">
              <List.Item><strong>Purpose:</strong> Used to obtain new access and ID tokens</List.Item>
              <List.Item><strong>Lifetime:</strong> 30 days (2592000 seconds)</List.Item>
              <List.Item><strong>Format:</strong> Opaque string (not JWT)</List.Item>
              <List.Item><strong>Usage:</strong> Exchange for new tokens before access token expires</List.Item>
              <List.Item><strong>Storage:</strong> HTTP-only cookie (backend)</List.Item>
              <List.Item><strong>Security:</strong> Single-use (rotated on each refresh)</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Session Lifecycle</Title>
            <Text size="sm">Understanding the complete session lifecycle helps you implement reliable authentication:</Text>

            <Title order={3} mb="xs">Phase 1: Initial Authentication</Title>
            <List spacing="xs" type="ordered">
              <List.Item>User clicks &quot;Sign in with SSO&quot;</List.Item>
              <List.Item>Your app redirects to SSO authorization page</List.Item>
              <List.Item>User authenticates with SSO</List.Item>
              <List.Item>SSO redirects back to your app with authorization code</List.Item>
              <List.Item>Your backend exchanges code for tokens (access, ID, refresh)</List.Item>
              <List.Item>Your backend stores tokens in HTTP-only cookies</List.Item>
              <List.Item>Your backend redirects user to app</List.Item>
            </List>

            <Title order={3} mb="xs">Phase 2: Active Session</Title>
            <List spacing="xs">
              <List.Item>User makes requests to your app</List.Item>
              <List.Item>Your backend validates ID token for each request</List.Item>
              <List.Item>User identity is extracted from the ID token</List.Item>
              <List.Item>Your backend session layer derives app permission state from the permission APIs</List.Item>
              <List.Item>Access token is used for SSO API calls (if needed)</List.Item>
            </List>

            <Title order={3} mb="xs">Phase 3: Token Refresh (Automatic)</Title>
            <List spacing="xs">
              <List.Item>Access token expires after 1 hour</List.Item>
              <List.Item>Your backend detects expiry (checks <code>exp</code> claim)</List.Item>
              <List.Item>Your backend uses refresh token to get new tokens</List.Item>
              <List.Item>Old refresh token is invalidated (single-use)</List.Item>
              <List.Item>New tokens are stored in cookies</List.Item>
            </List>

            <Title order={3} mb="xs">Phase 4: Session End</Title>
            <List spacing="xs">
              <List.Item>User clicks &quot;Sign out&quot;</List.Item>
              <List.Item>Your backend revokes tokens with SSO</List.Item>
              <List.Item>Your backend clears cookies</List.Item>
              <List.Item>User is redirected to logout page</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Validating Tokens</Title>
            <Text size="sm">Your backend should validate tokens on every request to ensure session integrity:</Text>

            <Title order={3} mb="xs">Backend Session Validation</Title>
            <Code block>
              {`// Node.js/Express example
import jwt from 'jsonwebtoken';

// WHY: Middleware to validate session and extract user info
export function validateSession(req, res, next) {
  const idToken = req.cookies.id_token;
  const accessToken = req.cookies.access_token;

  // Check if tokens exist
  if (!idToken || !accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Decode ID token (contains user info)
    const decoded = jwt.decode(idToken);

    // WHY: Check token expiration
    if (decoded.exp * 1000 < Date.now()) {
      // Token expired, attempt refresh
      return refreshAndRetry(req, res, next);
    }

    const permission = getPermissionForUserAndClient({
      userId: decoded.sub,
      clientId: process.env.SSO_CLIENT_ID
    });

    // WHY: Check backend-derived app permission status
    if (permission?.status !== 'approved') {
      return res.status(403).json({
        error: 'APP_ACCESS_DENIED',
        permissionStatus: permission?.status ?? 'unknown'
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      permissionStatus: permission?.status ?? null
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Token Refresh Implementation</Title>
            <Text size="sm">Implement automatic token refresh to maintain seamless user sessions:</Text>

            <Title order={3} mb="xs">Proactive Refresh (Recommended)</Title>
            <Code block>
              {`// Refresh tokens 5 minutes before expiry
const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

async function ensureValidToken(req, res, next) {
  const idToken = req.cookies.id_token;
  
  if (!idToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const decoded = jwt.decode(idToken);
  const expiresAt = decoded.exp * 1000;
  const now = Date.now();

  // WHY: Refresh proactively before expiry
  if (expiresAt - now < REFRESH_BUFFER) {
    await refreshTokens(req, res);
  }

  next();
}

async function refreshTokens(req, res) {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // WHY: Exchange refresh token for new access and ID tokens
    const response = await fetch(
      'https://sso.doneisbetter.com/api/oauth/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.SSO_CLIENT_ID,
          client_secret: process.env.SSO_CLIENT_SECRET
        })
      }
    );

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();
    const { access_token, id_token, refresh_token: newRefreshToken } = tokens;

    // WHY: Update cookies with new tokens
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600000 // 1 hour
    });
    res.cookie('id_token', id_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 3600000
    });
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 2592000000 // 30 days
    });

    console.log('Tokens refreshed successfully');
  } catch (error) {
    console.error('Token refresh error:', error);
    // Clear invalid tokens
    res.clearCookie('access_token');
    res.clearCookie('id_token');
    res.clearCookie('refresh_token');
    throw error;
  }
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Session Termination</Title>
            <Text size="sm">Properly terminate sessions to ensure security:</Text>

            <Title order={3} mb="xs">Logout Implementation</Title>
            <Code block>
              {`// Backend logout endpoint
export async function logout(req, res) {
  const accessToken = req.cookies.access_token;

  try {
    // WHY: Revoke tokens with SSO server
    if (accessToken) {
      await fetch('https://sso.doneisbetter.com/api/oauth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: accessToken,
          client_id: process.env.SSO_CLIENT_ID,
          client_secret: process.env.SSO_CLIENT_SECRET
        })
      });
    }
  } catch (error) {
    console.error('Token revocation failed:', error);
    // Continue with logout even if revocation fails
  }

  // WHY: Clear all session cookies
  res.clearCookie('access_token');
  res.clearCookie('id_token');
  res.clearCookie('refresh_token');

  res.json({ success: true });
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Best Practices</Title>
            <List spacing="xs">
              <List.Item>✅ <strong>Store tokens in HTTP-only cookies</strong> (never in localStorage/sessionStorage)</List.Item>
              <List.Item>✅ <strong>Implement proactive token refresh</strong> (5 minutes before expiry)</List.Item>
              <List.Item>✅ <strong>Validate tokens on every request</strong> (check expiry and permission status)</List.Item>
              <List.Item>✅ <strong>Use refresh tokens correctly</strong> (they&apos;re single-use and rotate on refresh)</List.Item>
              <List.Item>✅ <strong>Revoke tokens on logout</strong> (prevent reuse even if intercepted)</List.Item>
              <List.Item>✅ <strong>Handle token expiry gracefully</strong> (redirect to login or show message)</List.Item>
              <List.Item>✅ <strong>Monitor token operations</strong> (log refresh failures for debugging)</List.Item>
              <List.Item>⚠️ <strong>Never expose tokens in URLs</strong> (use cookies or headers only)</List.Item>
              <List.Item>⚠️ <strong>Never decode tokens in frontend</strong> (keep user info extraction server-side)</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Troubleshooting</Title>
            <Title order={3} mb="xs">Token expired</Title>
            <Text size="sm"><strong>Symptom:</strong> 401 errors, user logged out unexpectedly</Text>
            <Text size="sm"><strong>Solution:</strong> Implement proactive token refresh (see above)</Text>

            <Title order={3} mb="xs">Refresh token invalid</Title>
            <Text size="sm"><strong>Symptom:</strong> Token refresh fails with 401 error</Text>
            <Text size="sm"><strong>Causes:</strong></Text>
            <List spacing="xs">
              <List.Item>Refresh token already used (they&apos;re single-use)</List.Item>
              <List.Item>Refresh token expired (30 day lifetime)</List.Item>
              <List.Item>User&apos;s access was revoked</List.Item>
            </List>
            <Text size="sm"><strong>Solution:</strong> Redirect user to login page</Text>

            <Title order={3} mb="xs">Permission status changed</Title>
            <Text size="sm"><strong>Symptom:</strong> User was approved but now gets 403 errors</Text>
            <Text size="sm"><strong>Cause:</strong> SSO admin changed user&apos;s permission status</Text>
            <Text size="sm"><strong>Solution:</strong> Check backend-derived permission status in your session layer and redirect accordingly</Text>

            <Title order={3} mb="xs">Session not persisting</Title>
            <Text size="sm"><strong>Symptom:</strong> User logged out on page refresh</Text>
            <Text size="sm"><strong>Solutions:</strong></Text>
            <List spacing="xs">
              <List.Item>Verify cookies are set with correct domain and path</List.Item>
              <List.Item>Ensure <code>SameSite</code> and <code>Secure</code> flags are set correctly</List.Item>
              <List.Item>Check CORS configuration (credentials must be included)</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Summary</Title>
            <List spacing="xs">
              <List.Item>☑️ Understand three token types: access, ID, and refresh</List.Item>
              <List.Item>☑️ Implement token validation middleware</List.Item>
              <List.Item>☑️ Implement proactive token refresh (5 min before expiry)</List.Item>
              <List.Item>☑️ Store tokens in HTTP-only cookies</List.Item>
              <List.Item>☑️ Revoke tokens on logout</List.Item>
              <List.Item>☑️ Check backend-derived permission status on every request</List.Item>
            </List>
            <AccentPanel title="Related Resources" tone="red" variant="soft-outline">
              <List spacing="xs">
                <List.Item><Anchor component={Link} href="/docs/authentication">OAuth 2.0 Authentication Flow</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/security/best-practices">Security Best Practices</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/app-permissions">App Permissions System</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/api/endpoints">API Reference</Anchor></List.Item>
              </List>
            </AccentPanel>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
