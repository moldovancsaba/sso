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
// WHAT: Integration guide for developers adding SSO to their applications
// WHY: Developers need clear steps to integrate OAuth 2.0 SSO into their apps
// HOW: Provides step-by-step setup, environment configuration, and verification

import DocsLayout from '../../components/DocsLayout';
import packageJson from '../../package.json';

export default function Installation() {
  return (
    <DocsLayout>
      <Stack gap="xl">
        <Box>
          <Title order={1} mb="xs">Integration Guide</Title>
          <Text size="sm" c="dimmed" fw={500} mb="xs">SSO Version: {packageJson.version}</Text>
        </Box>
        
          <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              This guide walks you through integrating the SSO service into your application using OAuth 2.0.
              Follow these steps to enable secure authentication for your users.
            </Text>
            <Paper withBorder p="md" shadow="sm" radius="md" style={{ borderLeft: "4px solid var(--mantine-color-red-6)" }} bg="var(--mantine-color-red-light)">
              <Text size="sm">
                <strong>⚠️ Important:</strong> This guide is for application developers integrating with the SSO service,
              not for deploying the SSO service itself.
              </Text>
            </Paper>
          </Box>

          <Box>
            <Title order={2} mb="sm">Prerequisites</Title>
            <List spacing="xs">
              <List.Item>Node.js 18.x or higher (for backend token exchange)</List.Item>
              <List.Item>A web application (React, Vue, vanilla JS, etc.)</List.Item>
              <List.Item>HTTPS-enabled domain (required for production)</List.Item>
              <List.Item>Email access to contact SSO admin</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Step 1: Register Your Application</Title>
            <Text size="sm">Before you can integrate, you must register your application with the SSO admin:</Text>
            <List spacing="xs" type="ordered">
              <List.Item>Contact SSO admin: <code>sso@doneisbetter.com</code></List.Item>
              <List.Item>Provide the following information:
                <List spacing="xs">
                  <List.Item><strong>Application Name:</strong> e.g., "MyApp Production"</List.Item>
                  <List.Item><strong>Redirect URIs:</strong> e.g., <code>https://myapp.com/api/auth/callback</code></List.Item>
                  <List.Item><strong>Allowed Origins:</strong> e.g., <code>https://myapp.com</code></List.Item>
                  <List.Item><strong>Application Description:</strong> Brief description of your app</List.Item>
                </List>
              </List.Item>
              <List.Item>Wait for approval (typically within 24 hours)</List.Item>
              <List.Item>Receive your <code>client_id</code> and <code>client_secret</code></List.Item>
            </List>
            <Paper withBorder p="md" shadow="sm" radius="md" style={{ borderLeft: "4px solid var(--mantine-color-red-6)" }} bg="var(--mantine-color-red-light)">
              <Text size="sm">
                <strong>📝 Note:</strong> For local development, use <code>http://localhost:PORT/api/auth/callback</code> as your redirect URI.
              Localhost origins are automatically allowed.
              </Text>
            </Paper>
          </Box>

          <Box>
            <Title order={2} mb="sm">Step 2: Install Dependencies</Title>
            <Text size="sm">Install required packages for OAuth 2.0 token handling:</Text>
            <Code block>
              {`# For Node.js/Express backend
npm install jsonwebtoken

# Optional: For making HTTP requests
npm install node-fetch  # or axios

# For Next.js projects (already includes fetch)
npm install jsonwebtoken`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Step 3: Configure Environment Variables</Title>
            <Text size="sm">Create a <code>.env</code> file in your project root (backend only):</Text>
            <Code block>
              {`# .env (Backend - NEVER commit this file!)

# OAuth 2.0 Credentials (from SSO admin)
SSO_CLIENT_ID=your_client_id_here
SSO_CLIENT_SECRET=your_client_secret_here
SSO_REDIRECT_URI=https://yourapp.com/api/auth/callback

# SSO Service Configuration
SSO_BASE_URL=https://sso.doneisbetter.com

# Session Configuration
SESSION_SECRET=your_random_secret_here
NODE_ENV=production

# Development override (optional)
# SSO_REDIRECT_URI=http://localhost:3000/api/auth/callback`}
            </Code>
            <Title order={3} mb="xs">Generate Session Secret</Title>
            <Code block>
              {`# Generate a secure random secret
openssl rand -base64 32`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Step 4: Implement OAuth 2.0 Flow</Title>
            <Text size="sm">Follow the implementation guide for your framework:</Text>
            <List spacing="xs">
              <List.Item><Anchor component={Link} href="/docs/examples/react">React Integration Example</Anchor></List.Item>
              <List.Item><Anchor component={Link} href="/docs/examples/vue">Vue.js Integration Example</Anchor></List.Item>
              <List.Item><Anchor component={Link} href="/docs/examples/vanilla">Vanilla JS Integration Example</Anchor></List.Item>
            </List>
            <Text size="sm">Or implement manually by following the <Anchor component={Link} href="/docs/authentication">OAuth 2.0 Authentication Flow</Anchor> guide.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">Step 5: Test Your Integration</Title>
            <Title order={3} mb="xs">Development Testing</Title>
            <List spacing="xs" type="ordered">
              <List.Item>Start your application: <code>npm run dev</code></List.Item>
              <List.Item>Navigate to your login page</List.Item>
              <List.Item>Click "Sign in with SSO"</List.Item>
              <List.Item>You should be redirected to <code>https://sso.doneisbetter.com</code></List.Item>
              <List.Item>Login with test credentials (provided by SSO admin)</List.Item>
              <List.Item>Verify you're redirected back to your app</List.Item>
              <List.Item>Check that user info is displayed correctly</List.Item>
            </List>

            <Title order={3} mb="xs">Verify Token Exchange</Title>
            <Code block>
              {`// Add logging to your OAuth callback handler
console.log('Authorization code received:', code);
console.log('Tokens received:', { access_token, id_token, refresh_token });

// Decode ID token to verify identity claims
const decoded = jwt.decode(id_token);
console.log('User info:', decoded);
console.log('Permission should come from your backend session endpoint, not directly from decoded ID token claims.');`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Step 6: Request Production Access</Title>
            <Text size="sm">Once testing is complete, request production access approval:</Text>
            <List spacing="xs" type="ordered">
              <List.Item>Test your application thoroughly in development</List.Item>
              <List.Item>Login and verify OAuth flow works correctly</List.Item>
              <List.Item>Test token refresh and logout</List.Item>
              <List.Item>Contact SSO admin to register your production domain</List.Item>
              <List.Item>Update environment variables with production values</List.Item>
              <List.Item>Deploy your application</List.Item>
              <List.Item>Request SSO admin to grant you "approved" permission status</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Common Integration Issues</Title>
            <Title order={3} mb="xs">Redirect URI Mismatch</Title>
            <Text size="sm"><strong>Error:</strong> <code>redirect_uri_mismatch</code></Text>
            <Text size="sm"><strong>Solution:</strong> Ensure your <code>SSO_REDIRECT_URI</code> exactly matches what you registered with SSO admin (including protocol and path).</Text>

            <Title order={3} mb="xs">Origin Not Allowed</Title>
            <Text size="sm"><strong>Error:</strong> CORS error in browser console</Text>
            <Text size="sm"><strong>Solution:</strong> Contact SSO admin to register your origin. See <Anchor component={Link} href="/docs/security/cors">CORS Configuration</Anchor>.</Text>

            <Title order={3} mb="xs">Invalid Client</Title>
            <Text size="sm"><strong>Error:</strong> <code>invalid_client</code></Text>
            <Text size="sm"><strong>Solution:</strong> Verify your <code>client_id</code> and <code>client_secret</code> are correct.</Text>

            <Title order={3} mb="xs">Token Exchange Fails</Title>
            <Text size="sm"><strong>Error:</strong> 401 from token endpoint</Text>
            <Text size="sm"><strong>Solutions:</strong></Text>
            <List spacing="xs">
              <List.Item>Ensure token exchange happens on backend (not frontend)</List.Item>
              <List.Item>Verify <code>client_secret</code> is not exposed in browser</List.Item>
              <List.Item>Check authorization code is used within 10 minutes</List.Item>
              <List.Item>Confirm code hasn't been used already (single-use)</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Next Steps</Title>
            <List spacing="xs">
              <List.Item>✅ Review <Anchor component={Link} href="/docs/security/best-practices">Security Best Practices</Anchor></List.Item>
              <List.Item>✅ Implement <Anchor component={Link} href="/docs/session-management">Token Refresh</Anchor> for seamless sessions</List.Item>
              <List.Item>✅ Handle <Anchor component={Link} href="/docs/app-permissions">App Permission Status</Anchor> (pending/approved/revoked)</List.Item>
              <List.Item>✅ Set up <Anchor component={Link} href="/docs/error-handling">Error Handling</Anchor> for production</List.Item>
              <List.Item>✅ Review <Anchor component={Link} href="/docs/api/endpoints">API Reference</Anchor> for additional endpoints</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Support</Title>
            <Text size="sm">Need help with integration?</Text>
            <List spacing="xs">
              <List.Item>Email: <code>sso@doneisbetter.com</code></List.Item>
              <List.Item>Documentation: <Anchor component={Link} href="/docs">SSO Documentation</Anchor></List.Item>
              <List.Item>API Reference: <Anchor component={Link} href="/docs/api">API Docs</Anchor></List.Item>
            </List>
          </Box>
        
      </Stack>
    </DocsLayout>
  );
}
