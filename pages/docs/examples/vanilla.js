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
// WHAT: Vanilla JavaScript OAuth 2.0 integration example without frameworks
// WHY: Developers need pure JavaScript implementation for non-framework projects
// HOW: Provides complete OAuth flow using standard web APIs and server-side backend

export default function VanillaExample() {
  return (
    <PublicShell {...getDocsShellProps('/docs/examples/vanilla')}>
      <DocsPageShell
        eyebrow="Examples"
        lead="Reference framework-free integration using OAuth Authorization Code flow with backend token exchange."
        meta={createDocsVersionMeta('SSO Version')}
        title="Vanilla JavaScript Integration Example"
      >
      <Stack gap="xl">
        <Box>
            <Title order={2} mb="sm">Overview</Title>
            <Text size="sm">
              This guide demonstrates OAuth 2.0 Authorization Code Flow integration using pure JavaScript
              without any framework dependencies. The frontend handles authorization redirect while the backend
              manages token exchange securely.
            </Text>
            <AccentPanel title="Security note" tone="red" variant="soft-outline">
              <Text size="sm">
                Never expose <code>client_secret</code> in your frontend code. All token operations must happen on your backend server.
              </Text>
            </AccentPanel>
            <AccentPanel title="Current contract note" tone="amber" variant="soft-outline">
              <Text size="sm">
                Your backend session layer should fetch canonical app-permission state from the permission APIs and return it to the frontend. Do not treat raw <code>id_token</code> claims as the source of truth for app approval status.
              </Text>
            </AccentPanel>
        </Box>

          <Box>
            <Title order={2} mb="sm">1. HTML Structure</Title>
            <Text size="sm">Basic HTML setup with login and user profile sections:</Text>
            <Code block>
              {`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSO Integration Example</title>
  <style>
    .hidden { display: none; }
    .loading { opacity: 0.5; pointer-events: none; }
    .error { color: red; margin: 10px 0; }
    .success { color: green; margin: 10px 0; }
  </style>
</head>
<body>
  <div id="app">
    <!-- Loading State -->
    <div id="loading" class="hidden">
      <Text size="sm">Loading...</Text>
    </div>

    <!-- Login View -->
    <div id="login-view" class="hidden">
      <Title order={1} mb="xs">Sign In</Title>
      <button id="login-btn">Sign in with SSO</button>
    </div>

    <!-- Access Pending View -->
    <div id="pending-view" class="hidden">
      <Title order={1} mb="xs">Access Pending</Title>
      <Text size="sm">Your access request is pending approval.</Text>
      <Text size="sm">An administrator will review your request shortly.</Text>
      <button id="logout-btn-pending">Sign Out</button>
    </div>

    <!-- Access Denied View -->
    <div id="denied-view" class="hidden">
      <Title order={1} mb="xs">Access Denied</Title>
      <Text size="sm">Your access to this application has been revoked.</Text>
      <button id="logout-btn-denied">Sign Out</button>
    </div>

    <!-- Dashboard View -->
    <div id="dashboard-view" class="hidden">
      <Title order={1} mb="xs">Dashboard</Title>
      <div id="user-info"></div>
      <button id="logout-btn">Sign Out</button>
    </div>

    <!-- Error Message -->
    <div id="error-message" class="error hidden"></div>
  </div>

  <script src="/js/auth.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">2. Auth Module (auth.js)</Title>
            <Text size="sm">Core authentication logic for OAuth 2.0 flow:</Text>
            <Code block>
              {`// js/auth.js

// WHY: Configuration for SSO OAuth 2.0
const SSO_CONFIG = {
  clientId: 'YOUR_CLIENT_ID_HERE', // Safe to expose
  baseUrl: 'https://sso.doneisbetter.com',
  redirectUri: window.location.origin + '/callback', // Adjust to your callback URL
  scope: 'openid profile email'
};

// WHY: Generate random string for CSRF protection
function generateState() {
  return Math.random().toString(36).substring(2) + 
         Math.random().toString(36).substring(2);
}

// WHY: Initiate OAuth 2.0 authorization flow
function login() {
  const state = generateState();
  sessionStorage.setItem('oauth_state', state);

  const authUrl = new URL(SSO_CONFIG.baseUrl + '/api/oauth/authorize');
  authUrl.searchParams.append('client_id', SSO_CONFIG.clientId);
  authUrl.searchParams.append('redirect_uri', SSO_CONFIG.redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SSO_CONFIG.scope);
  authUrl.searchParams.append('state', state);

  window.location.href = authUrl.toString();
}

// WHY: Check current session status with backend
async function checkSession() {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include' // Include cookies
    });

    if (response.ok) {
      const data = await response.json();
      return {
        isAuthenticated: true,
        user: data.user,
        permission: data.permission ?? null
      };
    } else {
      return { isAuthenticated: false };
    }
  } catch (error) {
    console.error('Session check failed:', error);
    return { isAuthenticated: false };
  }
}

// WHY: Clear session and logout
async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    // Optional: Also logout from SSO
    window.location.href = SSO_CONFIG.baseUrl + '/api/public/logout';
  } catch (error) {
    console.error('Logout failed:', error);
    window.location.href = '/';
  }
}`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">3. App Logic (app.js)</Title>
            <Text size="sm">Main application logic and UI state management:</Text>
            <Code block>
              {`// js/app.js

// WHY: View management helper functions
function hideAllViews() {
  document.querySelectorAll('#app > div').forEach(el => {
    el.classList.add('hidden');
  });
}

function showView(viewId) {
  hideAllViews();
  document.getElementById(viewId).classList.remove('hidden');
}

function showError(message) {
  const errorEl = document.getElementById('error-message');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

// WHY: Render user information in dashboard
function renderUserInfo(user) {
  const userInfoEl = document.getElementById('user-info');
  userInfoEl.innerHTML = \`
    <div>
      <Text size="sm"><strong>Name:</strong> \${user.name}</Text>
      <Text size="sm"><strong>Email:</strong> \${user.email}</Text>
      <Text size="sm"><strong>Role:</strong> \${user.role}</Text>
      <Text size="sm"><strong>User ID:</strong> \${user.userId}</Text>
    </div>
  \`;
}

// WHY: Initialize app and check session on page load
async function initApp() {
  showView('loading');

  const session = await checkSession();

  if (!session.isAuthenticated) {
    showView('login-view');
    return;
  }

  // WHY: Handle different permission statuses
  switch (session.permission?.status) {
    case 'approved':
      renderUserInfo(session.user);
      showView('dashboard-view');
      break;
    case 'pending':
      showView('pending-view');
      break;
    case 'revoked':
      showView('denied-view');
      break;
    default:
      showView('login-view');
  }
}

// WHY: Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Login button
  document.getElementById('login-btn')?.addEventListener('click', login);

  // Logout buttons
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  document.getElementById('logout-btn-pending')?.addEventListener('click', logout);
  document.getElementById('logout-btn-denied')?.addEventListener('click', logout);

  // Initialize app
  initApp();
});`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">4. OAuth Callback Handler (Backend)</Title>
            <Text size="sm">Server-side callback handler (Node.js/Express example):</Text>
            <Code block>
              {`// server.js or routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const router = express.Router();

const SSO_CONFIG = {
  clientId: process.env.SSO_CLIENT_ID,
  clientSecret: process.env.SSO_CLIENT_SECRET,
  redirectUri: process.env.SSO_REDIRECT_URI,
  baseUrl: process.env.SSO_BASE_URL || 'https://sso.doneisbetter.com'
};

// WHY: OAuth callback endpoint
router.get('/api/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  // WHY: Validate state parameter for CSRF protection
  const expectedState = req.cookies.oauth_state;
  if (state !== expectedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    // WHY: Exchange authorization code for tokens
    const tokenResponse = await fetch(
      \`\${SSO_CONFIG.baseUrl}/api/oauth/token\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SSO_CONFIG.redirectUri,
          client_id: SSO_CONFIG.clientId,
          client_secret: SSO_CONFIG.clientSecret
        })
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return res.status(tokenResponse.status).json(error);
    }

    const tokens = await tokenResponse.json();
    const { access_token, id_token, refresh_token } = tokens;

    // WHY: Decode ID token to get user identity claims
    const decoded = jwt.decode(id_token);
    const { sub, email, name, role } = decoded;

    // WHY: Ask your backend permission layer for canonical app access state
    const permission = await getPermissionForUserAndClient({
      userId: sub,
      clientId: SSO_CONFIG.clientId
    });

    // WHY: Store tokens in HTTP-only cookies
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000 // 1 hour
    });
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2592000000 // 30 days
    });
    res.cookie('id_token', id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000
    });

    // WHY: Redirect based on backend-derived permission status
    if (permission?.status === 'pending') {
      return res.redirect('/?status=pending');
    } else if (permission?.status === 'revoked') {
      return res.redirect('/?status=denied');
    }

    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// WHY: Session validation endpoint
router.get('/api/auth/session', (req, res) => {
  const { id_token, access_token } = req.cookies;

  if (!id_token || !access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.decode(id_token);
    const { sub, email, name, role } = decoded;

    if (decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }

    const permission = getPermissionForUserAndClient({
      userId: sub,
      clientId: SSO_CONFIG.clientId
    });

    res.json({
      user: { userId: sub, email, name, role },
      permission
    });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ error: 'Session validation failed' });
  }
});

// WHY: Logout endpoint
router.post('/api/auth/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('id_token');
  res.json({ success: true });
});

module.exports = router;`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">5. Environment Configuration</Title>
            <Text size="sm">Backend environment variables:</Text>
            <Code block>
              {`# .env (Backend - NEVER commit this file)
SSO_CLIENT_ID=your_client_id_here
SSO_CLIENT_SECRET=your_client_secret_here
SSO_REDIRECT_URI=https://yourapp.com/api/auth/callback
SSO_BASE_URL=https://sso.doneisbetter.com
NODE_ENV=production
SESSION_SECRET=your_random_secret_here`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">6. Token Refresh (Optional)</Title>
            <Text size="sm">Implement automatic token refresh:</Text>
            <Code block>
              {`// Add to auth.js

// WHY: Refresh access token before expiry
async function refreshToken() {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      return { success: true };
    } else {
      // Token refresh failed, redirect to login
      window.location.href = '/';
      return { success: false };
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    return { success: false };
  }
}

// Add to server
router.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.cookies;

  if (!refresh_token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const tokenResponse = await fetch(
      \`\${SSO_CONFIG.baseUrl}/api/oauth/token\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token,
          client_id: SSO_CONFIG.clientId,
          client_secret: SSO_CONFIG.clientSecret
        })
      }
    );

    if (!tokenResponse.ok) {
      return res.status(401).json({ error: 'Token refresh failed' });
    }

    const tokens = await tokenResponse.json();
    const { access_token, id_token } = tokens;

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000
    });
    res.cookie('id_token', id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});`}
            </Code>
          </Box>

          <Box>
            <Title order={2} mb="sm">Summary</Title>
            <List spacing="xs">
              <List.Item>✅ Pure JavaScript OAuth 2.0 implementation (no frameworks)</List.Item>
              <List.Item>✅ Secure token handling with HTTP-only cookies</List.Item>
              <List.Item>✅ CSRF protection with state parameter</List.Item>
              <List.Item>✅ App permission status handling (pending/approved/revoked)</List.Item>
              <List.Item>✅ Clean separation of frontend and backend concerns</List.Item>
              <List.Item>✅ Token refresh capability</List.Item>
            </List>
            <AccentPanel title="Next Steps" tone="red" variant="soft-outline">
              <List spacing="xs">
                <List.Item>Review <Anchor component={Link} href="/docs/authentication">Authentication Flow</Anchor> for detailed OAuth 2.0 explanation</List.Item>
                <List.Item>Check <Anchor component={Link} href="/docs/app-permissions">App Permissions</Anchor> to understand permission lifecycle</List.Item>
                <List.Item>See <Anchor component={Link} href="/docs/api/endpoints">API Reference</Anchor> for complete endpoint documentation</List.Item>
              </List>
            </AccentPanel>
          </Box>
        
      </Stack>
      </DocsPageShell>
    </PublicShell>
  );
}
