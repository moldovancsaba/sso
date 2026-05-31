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
import { AccentPanel, DocsPageShell, PublicShell } from '@doneisbetter/gds-core/server'
import { createDocsVersionMeta, getDocsShellProps } from '../../../lib/docs-shell-config'
// WHAT: CORS configuration documentation for SSO OAuth 2.0 integration
// WHY: Developers need to understand CORS setup for cross-origin SSO requests
// HOW: Explains SSO CORS policy, registration process, and client-side configuration

export default function SecurityCORS() {
  return (
    <PublicShell {...getDocsShellProps('/docs/security/cors')}>
      <DocsPageShell
        eyebrow="Security"
        lead="Allowed origin rules, browser behavior, and safe expectations for cross-origin SSO consumers."
        meta={createDocsVersionMeta('SSO Version')}
        title="CORS Configuration"
      >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              Cross-Origin Resource Sharing (CORS) allows your application to make secure requests to the SSO service
              from a different origin (domain). This is essential for OAuth 2.0 flows and API interactions.
            </Text>
            <AccentPanel title="Important" tone="red" variant="soft-outline">
              <Text size="sm">
                Your application&apos;s origin must be registered with the SSO admin before CORS requests will be allowed.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">SSO CORS Policy</Title>
            <Text size="sm">The SSO service implements the following CORS policy:</Text>
            <List spacing="xs">
              <List.Item>✅ <strong>Allowed Origins:</strong> Only pre-registered origins (no wildcards)</List.Item>
              <List.Item>✅ <strong>Credentials:</strong> Cookies are allowed (<code>Access-Control-Allow-Credentials: true</code>)</List.Item>
              <List.Item>✅ <strong>Methods:</strong> GET, POST, PUT, PATCH, DELETE, OPTIONS</List.Item>
              <List.Item>✅ <strong>Headers:</strong> Content-Type, Authorization, X-Requested-With</List.Item>
              <List.Item>⚠️ <strong>Preflight Caching:</strong> 24 hours (<code>Access-Control-Max-Age: 86400</code>)</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Registering Your Origin</Title>
            <Text size="sm">To enable CORS for your application, contact the SSO administrator to register your origin(s):</Text>
            <List spacing="xs" type="ordered">
              <List.Item>Determine your application&apos;s origin(s) (e.g., <code>https://myapp.com</code>)</List.Item>
              <List.Item>Contact SSO admin via email: <code>sso@doneisbetter.com</code></List.Item>
              <List.Item>Provide the following information:
                <List spacing="xs">
                  <List.Item>Your application name</List.Item>
                  <List.Item>Origin URL(s) (must be HTTPS in production)</List.Item>
                  <List.Item>OAuth <code>client_id</code> (if already issued)</List.Item>
                  <List.Item>Redirect URI(s) for OAuth callback</List.Item>
                </List>
              </List.Item>
              <List.Item>Wait for admin approval (typically within 24 hours)</List.Item>
            </List>
            <AccentPanel title="Local development note" tone="red" variant="soft-outline">
              <Text size="sm">
                For local development, <code>http://localhost</code> origins (any port) are automatically allowed.
              </Text>
            </AccentPanel>
          </Box>

          <Box>
            <Title order={2} mb="sm">CORS Headers in SSO Responses</Title>
            <Text size="sm">When your origin is registered, the SSO service will include these headers in responses:</Text>
            <Code block>
              {`// Example SSO Response Headers
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Vary: Origin

// If origin is NOT registered:
HTTP/1.1 403 Forbidden
{ "error": "Origin not allowed" }`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Client-Side CORS Configuration</Title>
            <Title order={3} mb="xs">Fetch API (Recommended)</Title>
            <Code block>
              {`// WHY: Include credentials (cookies) in cross-origin requests

const response = await fetch('https://sso.doneisbetter.com/api/public/session', {
  method: 'GET',
  credentials: 'include', // REQUIRED: Sends HTTP-only cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();`}
            </Code>

            <Title order={3} mb="xs">Axios</Title>
            <Code block>
              {`import axios from 'axios';

// Global configuration
axios.defaults.withCredentials = true;

// Per-request configuration
const response = await axios.get(
  'https://sso.doneisbetter.com/api/public/session',
  { withCredentials: true }
);`}
            </Code>

            <Title order={3} mb="xs">XMLHttpRequest (Legacy)</Title>
            <Code block>
              {`const xhr = new XMLHttpRequest();
xhr.withCredentials = true; // REQUIRED for cookies
xhr.open('GET', 'https://sso.doneisbetter.com/api/public/session');
xhr.send();`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Backend CORS Configuration (Your App)</Title>
            <Text size="sm">If your backend needs to call SSO APIs, no CORS configuration is needed—server-to-server requests bypass CORS entirely.</Text>
            <Text size="sm">However, if your frontend calls <em>your</em> backend, which then calls SSO, configure CORS on your backend:</Text>

            <Title order={3} mb="xs">Express.js</Title>
            <Code block>
              {`const cors = require('cors');

app.use(cors({
  origin: 'https://yourfrontend.com', // Your frontend origin
  credentials: true // Allow cookies
}));`}
            </Code>

            <Title order={3} mb="xs">Next.js API Routes</Title>
            <Code block>
              {`// pages/api/auth/[...].js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://yourfrontend.com');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle actual request
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Common CORS Errors</Title>
            <Title order={3} mb="xs">Error: &quot;Origin not allowed&quot;</Title>
            <Text size="sm"><strong>Cause:</strong> Your origin is not registered with the SSO service.</Text>
            <Text size="sm"><strong>Solution:</strong> Contact SSO admin to register your origin.</Text>

            <Title order={3} mb="xs">Error: &quot;Credentials flag not set&quot;</Title>
            <Text size="sm"><strong>Cause:</strong> You&apos;re not sending <code>credentials: &apos;include&apos;</code> in requests.</Text>
            <Text size="sm"><strong>Solution:</strong> Add <code>credentials: &apos;include&apos;</code> to fetch calls or <code>withCredentials: true</code> to Axios.</Text>

            <Title order={3} mb="xs">Error: &quot;Preflight request failed&quot;</Title>
            <Text size="sm"><strong>Cause:</strong> OPTIONS preflight request is being blocked.</Text>
            <Text size="sm"><strong>Solution:</strong> Ensure your origin is registered and you&apos;re using HTTPS (not HTTP) in production.</Text>
          </Box>

          <Box>
            <Title order={2} mb="sm">Testing CORS Configuration</Title>
            <Code block>
              {`// Test if your origin is allowed
fetch('https://sso.doneisbetter.com/api/health', {
  method: 'GET',
  credentials: 'include'
})
  .then(response => {
    console.log('CORS OK:', response.ok);
    console.log('Headers:', response.headers.get('Access-Control-Allow-Origin'));
  })
  .catch(error => {
    console.error('CORS Error:', error);
  });`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Summary</Title>
            <List spacing="xs">
              <List.Item>☑️ Contact SSO admin to register your origin</List.Item>
              <List.Item>☑️ Always use <code>credentials: &apos;include&apos;</code> for API requests</List.Item>
              <List.Item>☑️ Use HTTPS in production (HTTP only for localhost development)</List.Item>
              <List.Item>☑️ Test CORS configuration before going live</List.Item>
            </List>
            <AccentPanel title="Related Resources" tone="red" variant="soft-outline">
              <List spacing="xs">
                <List.Item><Anchor component={Link} href="/docs/quickstart">Quick Start Guide</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/security/best-practices">Security Best Practices</Anchor></List.Item>
                <List.Item><Anchor component={Link} href="/docs/api/endpoints">API Reference</Anchor></List.Item>
              </List>
            </AccentPanel>
          </Box>
        
      </Stack>
      </DocsPageShell>
    </PublicShell>
  );
}
