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
// WHAT: Error handling guide for OAuth 2.0 and app permission errors
// WHY: Developers need practical error handling patterns for production apps
// HOW: Covers OAuth errors, app permission errors, and best practices

import DocsLayout from '../../components/DocsLayout';

export default function ErrorHandlingDocs() {
  return (
    <DocsLayout
      eyebrow="Integration Guide"
      lead="Production-safe handling of OAuth, session, and permission failures."
      title="Error Handling"
      versionLabel="SSO Version"
    >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              Proper error handling is critical for a robust OAuth 2.0 integration. This guide covers
              OAuth error codes, app permission errors, and best practices for graceful error recovery.
            </Text>
            <AccentPanel title="Reference note" tone="red" variant="soft-outline">
              <Text size="sm">
                For complete error code reference, see <Anchor component={Link} href="/docs/api/errors">API Error Codes</Anchor>.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">OAuth 2.0 Error Handling</Title>
            <Text size="sm">OAuth 2.0 errors occur during the authorization and token exchange flow:</Text>

            <Title order={3} mb="xs">Authorization Endpoint Errors</Title>
            <Text size="sm">These errors appear in the redirect URI query parameters:</Text>
            <Code block>
              {`// Example error redirect
https://yourapp.com/callback?error=access_denied&error_description=User+denied+access&state=abc123

// Handle in your callback
const params = new URLSearchParams(window.location.search);
const error = params.get('error');

if (error === 'access_denied') {
  showMessage('You declined to sign in. Please try again.');
} else if (error === 'unauthorized_client') {
  showMessage('Your application is not authorized. Contact support.');
}`}
            </Code>

            <Title order={3} mb="xs">Token Endpoint Errors</Title>
            <Text size="sm">These errors occur during token exchange on your backend:</Text>
            <Code block>
              {`// Backend token exchange error handling
try {
  const tokenResponse = await fetch(
    'https://sso.doneisbetter.com/api/oauth/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: process.env.SSO_REDIRECT_URI,
        client_id: process.env.SSO_CLIENT_ID,
        client_secret: process.env.SSO_CLIENT_SECRET
      })
    }
  );

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json();
    
    switch (error.error) {
      case 'invalid_grant':
        // Authorization code expired or already used
        console.error('Code expired. Redirect user to login again.');
        return res.redirect('/login');
      
      case 'invalid_client':
        // client_id or client_secret is wrong
        console.error('Invalid OAuth credentials. Check env vars.');
        return res.status(500).json({ error: 'Configuration error' });
      
      case 'unsupported_grant_type':
        // Wrong grant_type parameter
        console.error('Invalid grant_type. Should be authorization_code.');
        return res.status(500).json({ error: 'Configuration error' });
      
      default:
        console.error('Token exchange failed:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
  }

  const tokens = await tokenResponse.json();
  // Store tokens and proceed
} catch (error) {
  console.error('Token exchange error:', error);
  res.status(500).json({ error: 'Authentication failed' });
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">App Permission Errors</Title>
            <Text size="sm">After successful authentication, check the user&apos;s backend-derived permission status:</Text>

            <Code block>
              {`// Fetch canonical permission state from your backend session layer
import jwt from 'jsonwebtoken';

const idToken = req.cookies.id_token;
const decoded = jwt.decode(idToken);
const permission = await getPermissionForUserAndClient({
  userId: decoded.sub,
  clientId: process.env.SSO_CLIENT_ID
});
const role = permission?.role ?? decoded.role;

// Handle different permission statuses
if (permission?.status === 'pending') {
  return res.redirect('/access-pending');
} else if (permission?.status === 'revoked') {
  return res.redirect('/access-denied');
} else if (permission?.status !== 'approved') {
  return res.status(403).json({
    error: 'APP_ACCESS_DENIED',
    message: 'Access not approved',
    permissionStatus: permission?.status ?? 'unknown'
  });
}

// Check role requirements
if (requireAdmin && role !== 'admin') {
  return res.status(403).json({
    error: 'INSUFFICIENT_ROLE',
    message: 'Admin role required'
  });
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Common Error Scenarios</Title>

            <Title order={3} mb="xs">1. Token Expired</Title>
            <Text size="sm"><strong>Error:</strong> <code>TOKEN_EXPIRED</code> or <code>INVALID_TOKEN</code></Text>
            <Text size="sm"><strong>Solution:</strong> Implement automatic token refresh</Text>
            <Code block>
              {`// Check token expiry and refresh if needed
const decoded = jwt.decode(idToken);
if (decoded.exp * 1000 < Date.now()) {
  await refreshTokens(req, res);
}`}
            </Code>

            <Title order={3} mb="xs">2. Invalid Refresh Token</Title>
            <Text size="sm"><strong>Error:</strong> <code>invalid_grant</code> when refreshing</Text>
            <Text size="sm"><strong>Causes:</strong></Text>
            <List spacing="xs">
              <List.Item>Refresh token already used (they&apos;re single-use)</List.Item>
              <List.Item>Refresh token expired (30 day lifetime)</List.Item>
              <List.Item>User&apos;s access was revoked</List.Item>
            </List>
            <Text size="sm"><strong>Solution:</strong> Redirect to login</Text>
            <Code block>
              {`try {
  await refreshTokens(req, res);
} catch (error) {
  if (error.error === 'invalid_grant') {
    // Refresh token invalid, must re-authenticate
    res.clearCookie('access_token');
    res.clearCookie('id_token');
    res.clearCookie('refresh_token');
    return res.redirect('/login');
  }
}`}
            </Code>

            <Title order={3} mb="xs">3. CORS Errors</Title>
            <Text size="sm"><strong>Error:</strong> Browser console shows CORS error</Text>
            <Text size="sm"><strong>Solution:</strong> Register your origin with SSO admin</Text>
            <Code block>
              {`// Always include credentials in requests
fetch('https://sso.doneisbetter.com/api/public/session', {
  credentials: 'include' // Required for cookies
});`}
            </Code>

            <Title order={3} mb="xs">4. Rate Limiting</Title>
            <Text size="sm"><strong>Error:</strong> <code>429 Too Many Requests</code></Text>
            <Text size="sm"><strong>Solution:</strong> Implement exponential backoff</Text>
            <Code block>
              {`async function retryWithBackoff(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers.get('Retry-After') || Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">User-Friendly Error Messages</Title>
            <Text size="sm">Transform technical errors into user-friendly messages:</Text>
            <Code block>
              {`function getErrorMessage(error) {
  const messages = {
    // OAuth errors
    'access_denied': 'You declined to sign in. Please try again if this was a mistake.',
    'unauthorized_client': 'This application is not authorized. Please contact support.',
    'invalid_grant': 'Your session has expired. Please sign in again.',
    
    // App permission errors
    'APP_ACCESS_PENDING': 'Your access request is pending approval. You\\'ll receive an email when approved.',
    'APP_ACCESS_REVOKED': 'Your access has been revoked. Please contact an administrator.',
    'INSUFFICIENT_ROLE': 'You don\\'t have permission to access this feature.',
    
    // Token errors
    'TOKEN_EXPIRED': 'Your session has expired. Redirecting to login...',
    'INVALID_TOKEN': 'Invalid authentication. Please sign in again.',
    
    // Network errors
    'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
    'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.'
  };

  return messages[error.code] || 'An unexpected error occurred. Please try again.';
}

// Usage
try {
  await someOperation();
} catch (error) {
  showUserMessage(getErrorMessage(error));
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Error Logging Best Practices</Title>
            <List spacing="xs">
              <List.Item>✅ Log errors with full context (user ID, timestamp, request details)</List.Item>
              <List.Item>✅ Use structured logging (JSON format)</List.Item>
              <List.Item>✅ Include error codes and messages</List.Item>
              <List.Item>✅ Never log sensitive data (tokens, secrets, passwords)</List.Item>
              <List.Item>✅ Monitor error rates and patterns</List.Item>
            </List>
            <Code block>
              {`// Good error logging example
function logError(error, context) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      stack: error.stack
    },
    context: {
      userId: context.user?.userId,
      path: context.req.path,
      method: context.req.method,
      ip: context.req.ip
    }
    // Never log: tokens, client_secret, passwords
  }));
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Summary</Title>
            <List spacing="xs">
              <List.Item>☑️ Handle OAuth 2.0 errors in authorization and token exchange</List.Item>
              <List.Item>☑️ Check backend-derived permission status after authentication</List.Item>
              <List.Item>☑️ Implement token refresh with error handling</List.Item>
              <List.Item>☑️ Provide user-friendly error messages</List.Item>
              <List.Item>☑️ Implement rate limiting backoff</List.Item>
              <List.Item>☑️ Log errors with context (but never log secrets)</List.Item>
            </List>
            <AccentPanel title="Related Resources" tone="red" variant="soft-outline">
              <List spacing="xs">
                <List.Item><Anchor component={Link} href="/docs/api/errors">Complete Error Code Reference</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/authentication">OAuth 2.0 Authentication Flow</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/session-management">Token Refresh Implementation</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/app-permissions">App Permissions System</Anchor></List.Item>
              </List>
            </AccentPanel>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
