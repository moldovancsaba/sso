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
                Only origins configured on the SSO deployment itself (via the <code>SSO_ALLOWED_ORIGINS</code> environment variable) receive a matching <code>Access-Control-Allow-Origin</code> header. If your origin isn&apos;t in that list, the browser will block your JavaScript from reading SSO API responses even though the request itself reaches the server.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">SSO CORS Policy</Title>
            <Text size="sm">The SSO service implements the following CORS policy:</Text>
            <List spacing="xs">
              <List.Item>✅ <strong>Allowed Origins:</strong> Only origins listed in the server&apos;s <code>SSO_ALLOWED_ORIGINS</code> configuration (wildcard support exists in the underlying config but is not enabled by default)</List.Item>
              <List.Item>✅ <strong>Credentials:</strong> Cookies are allowed (<code>Access-Control-Allow-Credentials: true</code>)</List.Item>
              <List.Item>✅ <strong>Methods:</strong> GET, POST, PUT, DELETE, OPTIONS</List.Item>
              <List.Item>✅ <strong>Headers:</strong> Content-Type, Authorization</List.Item>
            </List>
          </Box>

          <Box>
            <Title order={2} mb="sm">Registering Your Origin</Title>
            <Text size="sm">
              CORS origins are not self-service — they&apos;re set directly in the SSO deployment&apos;s <code>SSO_ALLOWED_ORIGINS</code> environment variable (a comma-separated list) by whoever operates that deployment. To get your origin added:
            </Text>
            <List spacing="xs" type="ordered">
              <List.Item>Determine your application&apos;s origin(s) (e.g., <code>https://myapp.com</code>) — must be HTTPS in production</List.Item>
              <List.Item>Ask the operator of your SSO deployment to add it to <code>SSO_ALLOWED_ORIGINS</code> and restart/redeploy the service</List.Item>
            </List>
            <AccentPanel title="Local development note" tone="red" variant="soft-outline">
              <Text size="sm">
                CORS has no automatic <code>localhost</code> allowance. The default <code>SSO_ALLOWED_ORIGINS</code> only includes the service&apos;s production domains, so a locally-run frontend needs its own origin (e.g. <code>http://localhost:3000</code>) added to that variable in the SSO instance it&apos;s calling — typically via <code>.env.local</code> on a local SSO instance.
              </Text>
            </AccentPanel>
          </Box>

          <Box>
            <Title order={2} mb="sm">CORS Headers in SSO Responses</Title>
            <Text size="sm">When your origin is in <code>SSO_ALLOWED_ORIGINS</code>, the SSO service includes these headers in responses:</Text>
            <Code block>
              {`// Example SSO Response Headers
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Vary: Origin`}
            </Code>
            <Text size="sm">
              <strong>If your origin is NOT in the allowlist</strong>, there is no distinct error response — the request is still processed by the server, and the response still comes back with a <code>200</code> (or whatever status the endpoint would normally return). The only difference is <code>Access-Control-Allow-Origin</code> won&apos;t match your origin, so the <strong>browser</strong> refuses to let your JavaScript read the response body. This shows up as a CORS error in the browser console, not as an HTTP error status.
            </Text>
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
            <Title order={3} mb="xs">Error: Browser console shows a CORS / cross-origin error</Title>
            <Text size="sm"><strong>Cause:</strong> Your origin is not in the SSO deployment&apos;s <code>SSO_ALLOWED_ORIGINS</code> configuration, so the response comes back without a matching <code>Access-Control-Allow-Origin</code> header and the browser withholds it from your JavaScript.</Text>
            <Text size="sm"><strong>Solution:</strong> Ask the operator of your SSO deployment to add your origin to <code>SSO_ALLOWED_ORIGINS</code>.</Text>

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
              <List.Item>☑️ Ask your SSO deployment&apos;s operator to add your origin to <code>SSO_ALLOWED_ORIGINS</code></List.Item>
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
