// WHAT: Vanilla JavaScript OAuth 2.0 integration example without frameworks
// WHY: Developers need pure JavaScript implementation for non-framework projects
// HOW: Provides complete OAuth flow using standard web APIs and server-side backend

import DocsLayout from '../../../components/DocsLayout';
import styles from '../../../styles/docs.module.css';
import packageJson from '../../../package.json';

export default function VanillaExample() {
  return (
    <DocsLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Vanilla JavaScript Integration Example</h1>
          <p className={styles.version}>SSO Version: {packageJson.version}</p>
        </header>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2>Overview</h2>
            <p>
              This guide demonstrates OAuth 2.0 Authorization Code Flow integration using pure JavaScript
              without any framework dependencies. The frontend handles authorization redirect while the backend
              manages token exchange securely.
            </p>
            <div className={styles.alert}>
              <strong>⚠️ Security Note:</strong> Never expose <code>client_secret</code> in your frontend code.
              All token operations must happen on your backend server.
            </div>
          </section>

          <section className={styles.section}>
            <h2>1. HTML Structure</h2>
            <p>Basic HTML setup with login and user profile sections:</p>
            <div className={styles.codeBlock}>
              <pre>
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
      <p>Loading...</p>
    </div>

    <!-- Login View -->
    <div id="login-view" class="hidden">
      <h1>Sign In</h1>
      <button id="login-btn">Sign in with SSO</button>
    </div>

    <!-- Access Pending View -->
    <div id="pending-view" class="hidden">
      <h1>Access Pending</h1>
      <p>Your access request is pending approval.</p>
      <p>An administrator will review your request shortly.</p>
      <button id="logout-btn-pending">Sign Out</button>
    </div>

    <!-- Access Denied View -->
    <div id="denied-view" class="hidden">
      <h1>Access Denied</h1>
      <p>Your access to this application has been revoked.</p>
      <button id="logout-btn-denied">Sign Out</button>
    </div>

    <!-- Dashboard View -->
    <div id="dashboard-view" class="hidden">
      <h1>Dashboard</h1>
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
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>2. Auth Module (auth.js)</h2>
            <p>Core authentication logic for OAuth 2.0 flow:</p>
            <div className={styles.codeBlock}>
              <pre>
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
        permissionStatus: data.permissionStatus
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
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>3. App Logic (app.js)</h2>
            <p>Main application logic and UI state management:</p>
            <div className={styles.codeBlock}>
              <pre>
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
      <p><strong>Name:</strong> \${user.name}</p>
      <p><strong>Email:</strong> \${user.email}</p>
      <p><strong>Role:</strong> \${user.role}</p>
      <p><strong>User ID:</strong> \${user.userId}</p>
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
  switch (session.permissionStatus) {
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
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>4. OAuth Callback Handler (Backend)</h2>
            <p>Server-side callback handler (Node.js/Express example):</p>
            <div className={styles.codeBlock}>
              <pre>
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

    // WHY: Decode ID token to get user info
    const decoded = jwt.decode(id_token);
    const { sub, email, name, role, permissionStatus } = decoded;

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

    // WHY: Redirect based on permission status
    if (permissionStatus === 'pending') {
      return res.redirect('/?status=pending');
    } else if (permissionStatus === 'revoked') {
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
    const { sub, email, name, role, permissionStatus } = decoded;

    if (decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.json({
      user: { userId: sub, email, name, role },
      permissionStatus
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
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>5. Environment Configuration</h2>
            <p>Backend environment variables:</p>
            <div className={styles.codeBlock}>
              <pre>
                {`# .env (Backend - NEVER commit this file)
SSO_CLIENT_ID=your_client_id_here
SSO_CLIENT_SECRET=your_client_secret_here
SSO_REDIRECT_URI=https://yourapp.com/api/auth/callback
SSO_BASE_URL=https://sso.doneisbetter.com
NODE_ENV=production
SESSION_SECRET=your_random_secret_here`}
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>6. Token Refresh (Optional)</h2>
            <p>Implement automatic token refresh:</p>
            <div className={styles.codeBlock}>
              <pre>
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
              </pre>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Summary</h2>
            <ul>
              <li>✅ Pure JavaScript OAuth 2.0 implementation (no frameworks)</li>
              <li>✅ Secure token handling with HTTP-only cookies</li>
              <li>✅ CSRF protection with state parameter</li>
              <li>✅ App permission status handling (pending/approved/revoked)</li>
              <li>✅ Clean separation of frontend and backend concerns</li>
              <li>✅ Token refresh capability</li>
            </ul>
            <div className={styles.alert}>
              <strong>🔗 Next Steps:</strong>
              <ul>
                <li>Review <a href="/docs/authentication">Authentication Flow</a> for detailed OAuth 2.0 explanation</li>
                <li>Check <a href="/docs/app-permissions">App Permissions</a> to understand permission lifecycle</li>
                <li>See <a href="/docs/api/endpoints">API Reference</a> for complete endpoint documentation</li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </DocsLayout>
  );
}
