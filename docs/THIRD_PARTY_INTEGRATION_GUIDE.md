# Third-Party Integration Guide — SSO Service

**Version**: 5.24.0  
**Last Updated**: 2025-11-10T20:15:00.000Z  
**Service URL**: https://sso.doneisbetter.com  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Integration Methods](#integration-methods)
3. [Method 1: OAuth2/OIDC (Recommended for External Domains)](#method-1-oauth2oidc-recommended-for-external-domains)
4. [App-Level Permissions (Multi-App Authorization)](#app-level-permissions-multi-app-authorization)
5. [Method 2: Cookie-Based SSO (Subdomain Only)](#method-2-cookie-based-sso-subdomain-only)
6. [Method 3: Social Login Integration](#method-3-social-login-integration)
7. [API Reference](#api-reference)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The SSO Service (sso.doneisbetter.com) provides comprehensive authentication and authorization for third-party applications. This guide covers all integration methods available to external applications.

### What You Get

- ✅ **Single Sign-On**: Users login once, access all integrated apps
- ✅ **Multiple Auth Methods**: Password, Magic Link, PIN verification, Social Login (Facebook, Google, Apple - coming soon)
- ✅ **Secure Token Management**: JWT access tokens with RS256 signing
- ✅ **User Profile Access**: Name, email, verified status
- ✅ **Session Management**: 30-day sessions with sliding expiration
- ✅ **OAuth2/OIDC Compliance**: Standard protocol support
- ✅ **PKCE Support**: Enhanced security for public clients

### Choose Your Integration Method

| Method | Best For | Domain Requirement | Complexity |
|--------|----------|-------------------|------------|
| **OAuth2/OIDC** | External domains, mobile apps, SPAs | Any domain | Medium |
| **Cookie-Based SSO** | Subdomain apps only | *.doneisbetter.com | Low |
| **Social Login** | Adding Facebook/Google login to your app | Any domain | Low |

---

## Integration Methods

### Quick Comparison

**OAuth2/OIDC:**
- Works with any domain (narimato.com, yourapp.com)
- Full OAuth2 Authorization Code Flow with PKCE
- JWT access tokens (1 hour) + refresh tokens (30 days)
- Requires client registration and secret management
- Best for: Production applications, mobile apps

**Cookie-Based SSO:**
- Only works on *.doneisbetter.com subdomains
- Shared cookie across subdomains
- No OAuth complexity
- Simple session validation
- Best for: Internal tools, microservices within doneisbetter.com

**Social Login:**
- Integrate Facebook/Google/Apple login
- OAuth provider handles authentication
- User accounts created automatically
- Best for: Consumer apps, rapid onboarding

---

## Method 1: OAuth2/OIDC (Recommended for External Domains)

Complete OAuth2/OIDC integration for external applications.

### Step 1: Register Your OAuth Client

#### Via Admin UI

1. Login to SSO admin: https://sso.doneisbetter.com/admin
2. Navigate to **"OAuth Clients"**
3. Click **"+ New Client"**
4. Fill in the form:

```
Client Name: Your App Name
Description: Brief description of your app
Redirect URIs:
  https://yourapp.com/auth/callback
  https://yourapp.com/api/oauth/callback
Allowed Scopes: openid profile email offline_access
Homepage URL: https://yourapp.com
```

5. Click **"Create Client"**
6. **⚠️ CRITICAL**: Save the `client_secret` immediately (shown only once!)

#### Client Credentials

You'll receive:
- **Client ID**: UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **Client Secret**: UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

Store these securely in environment variables:

```bash
# .env
SSO_CLIENT_ID=550e8400-e29b-41d4-a716-446655440000
SSO_CLIENT_SECRET=a1b2c3d4-e5f6-7890-abcd-ef1234567890
SSO_REDIRECT_URI=https://yourapp.com/auth/callback
SSO_BASE_URL=https://sso.doneisbetter.com
```

**⚠️ Never commit credentials to git!**

---

### Step 2: Implement OAuth2 Flow

#### 2.1 Generate PKCE Parameters

PKCE (Proof Key for Code Exchange) prevents authorization code interception:

```javascript
// Generate random code_verifier (43-128 characters)
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate SHA-256 hash of verifier
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Usage
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// Store verifier for later use in token exchange
sessionStorage.setItem('pkce_verifier', codeVerifier);
```

#### 2.2 Redirect User to Authorization Endpoint

See section 2.3 below for complete OAuth initiation code with return URL support.

#### 2.3 Handle OAuth Callback & Return to Original Page

**Problem**: User was on `/settings/integrations`, clicked "Login", completed OAuth, but you want them back on `/settings/integrations` (not just `/dashboard`).

**Solution**: Use the `state` parameter or sessionStorage to preserve the return URL.

##### Option 1: Encode Return URL in State Parameter (Recommended)

**Why recommended**: Works across tabs/windows, survives page refreshes, more robust.

```javascript
// Before initiating OAuth (on "Login" button click)
function initiateOAuthLogin() {
  // WHAT: Store current page in state parameter
  // WHY: Ensures user returns to exact page after OAuth completes
  const state = {
    csrf: generateRandomString(32), // CSRF protection (required)
    return_to: window.location.pathname + window.location.search, // e.g., "/settings/integrations?tab=sso"
    timestamp: Date.now() // Optional: detect expired states
  }
  
  // Encode state as base64url JSON
  const encodedState = base64URLEncode(JSON.stringify(state))
  
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  // Store verifier (needed for token exchange)
  sessionStorage.setItem('pkce_verifier', codeVerifier)
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SSO_CLIENT_ID,
    redirect_uri: process.env.SSO_REDIRECT_URI,
    scope: 'openid profile email offline_access',
    state: encodedState, // Contains both CSRF token and return URL
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  
  window.location.href = `${process.env.SSO_BASE_URL}/api/oauth/authorize?${params}`
}

function generateRandomString(length) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}
```

##### Option 2: Use SessionStorage (Simpler, but less robust)

**Limitations**: Doesn't work across tabs, lost on page refresh during OAuth flow.

```javascript
// Before initiating OAuth
function initiateOAuthLogin() {
  // Store current page
  sessionStorage.setItem('oauth_return_to', window.location.pathname + window.location.search)
  sessionStorage.setItem('oauth_state', generateRandomState())
  
  // ... continue with OAuth redirect
}
```

##### Backend OAuth Callback Handler

User is redirected back with authorization code:

```
https://yourapp.com/auth/callback?code=abc123&state=eyJjc3JmIjoi...
```

Backend handler:

```javascript
// Node.js/Express example with return URL support
app.get('/auth/callback', async (req, res) => {
  const { code, state: encodedState } = req.query

  // 1. Decode and validate state parameter
  if (!encodedState) {
    return res.status(400).json({ error: 'Missing state parameter' })
  }

  let state
  try {
    // Decode state from base64url JSON
    const stateJson = Buffer.from(encodedState, 'base64url').toString('utf-8')
    state = JSON.parse(stateJson)
  } catch (err) {
    console.error('Failed to decode state:', err)
    return res.status(400).json({ error: 'Invalid state parameter' })
  }

  // 2. Validate CSRF token (compare with stored value)
  // IMPORTANT: In production, store the expected state.csrf in server-side session
  // For this example, we'll just check if it exists
  if (!state.csrf || typeof state.csrf !== 'string') {
    return res.status(400).json({ error: 'Invalid CSRF token in state' })
  }

  // 3. Optional: Check state timestamp (prevent replay attacks)
  if (state.timestamp) {
    const age = Date.now() - state.timestamp
    if (age > 10 * 60 * 1000) { // 10 minutes
      return res.status(400).json({ error: 'State parameter expired' })
    }
  }

  // 4. Validate authorization code
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    // 5. Retrieve PKCE verifier from session
    const codeVerifier = req.session.pkce_verifier
    if (!codeVerifier) {
      throw new Error('Missing PKCE verifier in session')
    }

    // 6. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier)

    // 7. Store tokens securely (server-side session only)
    req.session.access_token = tokens.access_token
    req.session.refresh_token = tokens.refresh_token
    req.session.id_token = tokens.id_token

    // 8. Parse user info from ID token
    const userInfo = parseIdToken(tokens.id_token)
    req.session.user = userInfo

    // 9. Clean up one-time-use values
    delete req.session.pkce_verifier

    // 10. Redirect to original page (from state.return_to)
    const returnTo = state.return_to || '/dashboard'
    
    // Security: Validate return URL to prevent open redirects
    if (!isValidReturnUrl(returnTo)) {
      console.warn('Invalid return URL, using default:', returnTo)
      return res.redirect('/dashboard')
    }

    console.log('OAuth successful, redirecting to:', returnTo)
    res.redirect(returnTo)
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.redirect('/login?error=auth_failed')
  }
})

// WHAT: Validate return URL to prevent open redirect attacks
// WHY: Malicious actors could craft state with external URLs
function isValidReturnUrl(url) {
  // Only allow relative URLs (starting with /)
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('/')) return false
  if (url.startsWith('//')) return false // Protocol-relative URLs are dangerous
  
  // Optional: Disallow suspicious patterns
  if (url.includes('<') || url.includes('>')) return false
  
  return true
}
```

**Key Security Improvements:**

1. ✅ **State Decoding**: Properly decode base64url JSON from state parameter
2. ✅ **CSRF Validation**: Verify state contains valid CSRF token
3. ✅ **Timestamp Check**: Prevent replay attacks with state expiration
4. ✅ **Return URL Validation**: Prevent open redirect attacks
5. ✅ **Session Cleanup**: Remove one-time PKCE verifier after use

**SessionStorage Alternative (if you used Option 2):**

```javascript
// Frontend: After OAuth callback, check sessionStorage
window.addEventListener('DOMContentLoaded', () => {
  const returnTo = sessionStorage.getItem('oauth_return_to')
  if (returnTo && window.location.pathname === '/') {
    sessionStorage.removeItem('oauth_return_to')
    window.location.href = returnTo
  }
})
```

#### 2.4 Exchange Code for Tokens

```javascript
async function exchangeCodeForTokens(code, codeVerifier) {
  const response = await fetch(`${process.env.SSO_BASE_URL}/api/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.SSO_REDIRECT_URI,
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description}`);
  }

  return await response.json();
  /* Returns:
  {
    access_token: "eyJhbGciOiJSUzI1NiIs...",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "a1b2c3d4...",
    id_token: "eyJhbGciOiJSUzI1NiIs...",
    scope: "openid profile email offline_access"
  }
  */
}
```

---

### Step 3: Token Management

#### Access Token Usage

Access tokens grant API access for 1 hour:

```javascript
async function makeApiCall(endpoint, accessToken) {
  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    // Token expired, refresh it
    const newTokens = await refreshAccessToken();
    // Retry with new token
    return makeApiCall(endpoint, newTokens.access_token);
  }

  return response.json();
}
```

#### ID Token Parsing

ID tokens contain user information:

```javascript
function parseIdToken(idToken) {
  const [header, payload, signature] = idToken.split('.');
  const decoded = JSON.parse(atob(payload));
  
  return {
    userId: decoded.sub,          // User UUID
    name: decoded.name,            // Full name
    email: decoded.email,          // Email address
    emailVerified: decoded.email_verified,
    picture: decoded.picture,      // Profile picture URL (if available)
  };
}
```

#### Token Refresh

Refresh tokens last 30 days and are automatically rotated:

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${process.env.SSO_BASE_URL}/api/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    // Refresh token expired or revoked, user must re-authenticate
    throw new Error('Refresh failed, please login again');
  }

  const tokens = await response.json();
  
  // ⚠️ IMPORTANT: Store the NEW refresh token (rotation)
  // The old refresh token is now invalid
  return tokens;
}
```

#### Token Revocation (Logout)

```javascript
async function logout(refreshToken) {
  // Revoke refresh token
  await fetch(`${process.env.SSO_BASE_URL}/api/oauth/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: refreshToken,
      token_type_hint: 'refresh_token',
      client_id: process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET,
    }),
  });

  // Clear local session
  sessionStorage.clear();
  localStorage.clear();

  // Redirect to SSO logout to clear SSO cookie
  window.location.href = `${process.env.SSO_BASE_URL}/api/oauth/logout?post_logout_redirect_uri=${encodeURIComponent('https://yourapp.com')}`;
}
```

**Security Best Practice: Force Re-Authentication After Logout**

When user logs out and clicks login again, add `prompt=login` to force credential entry:

```javascript
// After logout, when user clicks "Login" again
async function handleLoginAfterLogout() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  sessionStorage.setItem('pkce_verifier', codeVerifier);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SSO_CLIENT_ID,
    redirect_uri: process.env.SSO_REDIRECT_URI,
    scope: 'openid profile email offline_access',
    state: generateRandomState(),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'login', // ⚠️ IMPORTANT: Force re-authentication
  });
  
  sessionStorage.setItem('oauth_state', params.get('state'));
  window.location.href = `${process.env.SSO_BASE_URL}/api/oauth/authorize?${params}`;
}
```

---

## App-Level Permissions (Multi-App Authorization)

**New in v5.24.0**: SSO now provides centralized permission management for all integrated applications.

### Overview

**Problem**: OAuth provides user authentication, but doesn't manage **app-specific roles** (user vs admin within your app).

**Solution**: SSO's app permissions system provides:
- ✅ Centralized role management per app
- ✅ Roles: `none`, `user`, `admin`, `superadmin`
- ✅ Admin approval workflow for new users
- ✅ Single source of truth for permissions
- ✅ Real-time permission sync

### Key Concepts

**SSO-Level Authentication** vs **App-Level Authorization**:

```
SSO Authentication → Who is this user? (identity)
App Authorization → What can they do in THIS app? (permissions)
```

**Example**: User `john@example.com` might be:
- ✅ **Authenticated** via SSO (has valid access token)
- ✅ **Admin** in Camera app (appPermissions.role = 'admin')
- ✅ **User** in Launchmass app (appPermissions.role = 'user')
- ❌ **No Access** in Messmass app (appPermissions.role = 'none')

### Permission Statuses

| Status | hasAccess | Meaning |
|--------|-----------|----------|
| `approved` | `true` | User can access app |
| `pending` | `false` | Awaiting admin approval |
| `revoked` | `false` | Access was removed |
| (none) | `false` | User never requested access |

### Role Hierarchy

| Role | Meaning | Typical Permissions |
|------|---------|--------------------|
| `none` | No access | Cannot login |
| `user` | Basic access | Read data, create own content |
| `admin` | Organization admin | Manage team, moderate content |
| `superadmin` | App superadmin | Manage all users, app settings |

---

### Step 4: Query User's App Permission

After OAuth callback (after token exchange), query SSO for app-specific permission:

```javascript
// In your OAuth callback handler (after exchanging code for tokens)
async function handleOAuthCallback(code, state) {
  // 1. Exchange code for tokens (as shown in Step 2.4)
  const tokens = await exchangeCodeForTokens(code, codeVerifier);
  
  // 2. Parse user info from ID token
  const user = parseIdToken(tokens.id_token);
  
  // 3. Query SSO for app-specific permission
  const permission = await getAppPermission(user.userId, tokens.access_token);
  
  // 4. Check if user has access
  if (!permission.hasAccess) {
    // User doesn't have access yet
    if (permission.status === 'pending') {
      return redirectTo('/access-pending'); // Show "waiting for approval" page
    } else {
      // No permission record - create one
      await requestAppAccess(user.userId, tokens.access_token);
      return redirectTo('/access-pending');
    }
  }
  
  // 5. Store app role in session
  req.session.user = {
    ...user,
    appRole: permission.role,  // 'user', 'admin', or 'superadmin'
    appAccess: permission.hasAccess,
  };
  
  // 6. Redirect to app
  return redirectTo('/dashboard');
}
```

#### Get App Permission Endpoint

```javascript
/**
 * Get user's permission for your app
 * 
 * @param userId - User's SSO ID (from id_token.sub)
 * @param accessToken - OAuth access token
 * @returns App permission with role and access status
 */
async function getAppPermission(userId, accessToken) {
  const response = await fetch(
    `${process.env.SSO_BASE_URL}/api/users/${userId}/apps/${process.env.SSO_CLIENT_ID}/permissions`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  if (response.status === 404) {
    // No permission record exists yet
    return {
      userId,
      clientId: process.env.SSO_CLIENT_ID,
      hasAccess: false,
      status: 'none',
      role: 'none',
    };
  }
  
  if (!response.ok) {
    throw new Error(`Failed to get permission: ${response.status}`);
  }
  
  return await response.json();
  /* Returns:
  {
    userId: "user-uuid",
    clientId: "your-client-id",
    appName: "YourApp",
    hasAccess: true,
    status: "approved",
    role: "admin",
    requestedAt: "2025-11-09T10:00:00.000Z",
    grantedAt: "2025-11-09T10:05:00.000Z",
    grantedBy: "admin-uuid",
    lastAccessedAt: "2025-11-09T13:50:00.000Z"
  }
  */
}
```

#### Request App Access Endpoint

```javascript
/**
 * Request access to your app (creates pending permission)
 * Admin will approve/deny via SSO admin UI
 * 
 * @param userId - User's SSO ID
 * @param accessToken - OAuth access token
 * @returns Created permission (status will be 'pending')
 */
async function requestAppAccess(userId, accessToken) {
  const response = await fetch(
    `${process.env.SSO_BASE_URL}/api/users/${userId}/apps/${process.env.SSO_CLIENT_ID}/request-access`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Optional: SSO will auto-fill from access token
        email: '',
        name: '',
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to request access: ${response.status}`);
  }
  
  return await response.json();
  /* Returns:
  {
    userId: "user-uuid",
    clientId: "your-client-id",
    appName: "YourApp",
    hasAccess: false,
    status: "pending",
    role: "none",
    requestedAt: "2025-11-09T14:00:00.000Z"
  }
  */
}
```

---

### Step 5: Use App Role for Authorization

In your app, check the stored `appRole` to control access:

#### Example: Protected Admin Route

```javascript
// middleware/requireAdmin.js
export function requireAdmin(req, res, next) {
  const session = req.session;
  
  // Check if user is authenticated
  if (!session?.user?.appAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Check if user is admin or superadmin
  if (session.user.appRole !== 'admin' && session.user.appRole !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

// Usage in routes
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  // Only admins can access this
  const users = await getAllUsers();
  res.json({ users });
});
```

#### Example: Conditional UI Rendering

```jsx
// React component
function Dashboard({ session }) {
  const isAdmin = session.user.appRole === 'admin' || session.user.appRole === 'superadmin';
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* All users see this */}
      <UserContent />
      
      {/* Only admins see this */}
      {isAdmin && (
        <AdminPanel>
          <button>Manage Users</button>
          <button>View Analytics</button>
        </AdminPanel>
      )}
    </div>
  );
}
```

---

### Step 6: Periodic Permission Sync

**Important**: SSO admin can change user permissions at any time. Apps should periodically re-check permissions.

#### Option 1: Sync on Session Refresh

```javascript
// When refreshing access token, also refresh permissions
async function refreshSession(session) {
  // 1. Refresh access token
  const newTokens = await refreshAccessToken(session.refreshToken);
  
  // 2. Re-query app permission
  const permission = await getAppPermission(session.user.userId, newTokens.access_token);
  
  // 3. Update session
  session.accessToken = newTokens.access_token;
  session.user.appRole = permission.role;
  session.user.appAccess = permission.hasAccess;
  
  // 4. If access was revoked, logout user
  if (!permission.hasAccess) {
    await logout(session);
    return redirectTo('/access-revoked');
  }
  
  return session;
}
```

#### Option 2: Background Sync (Recommended)

```javascript
// Run every 5 minutes for active sessions
setInterval(async () => {
  const activeSessions = await getActiveSessions();
  
  for (const session of activeSessions) {
    try {
      const permission = await getAppPermission(
        session.user.userId,
        session.accessToken
      );
      
      // Update stored permission
      await updateSessionPermission(session.id, permission);
      
      // If access revoked, invalidate session
      if (!permission.hasAccess) {
        await invalidateSession(session.id);
      }
    } catch (error) {
      console.error('Permission sync failed:', error);
    }
  }
}, 5 * 60 * 1000); // 5 minutes
```

---

### Access Denied Pages

Provide clear UX for users without access:

#### Pending Approval Page

```html
<!-- /access-pending -->
<div class="access-pending">
  <h1>⏳ Access Pending</h1>
  <p>Your access request has been submitted to the administrator.</p>
  <p>You'll receive an email once approved.</p>
  <p>Email: support@yourapp.com for urgent access.</p>
</div>
```

#### Access Revoked Page

```html
<!-- /access-revoked -->
<div class="access-revoked">
  <h1>🚫 Access Revoked</h1>
  <p>Your access to this application has been removed.</p>
  <p>Contact: support@yourapp.com for assistance.</p>
</div>
```

---

### Admin Workflow (SSO Admin UI)

SSO admins manage app permissions via the admin UI:

1. Login to **https://sso.doneisbetter.com/admin**
2. Navigate to **"Users"**
3. Click **"Manage"** on any user
4. View **"Application Access"** section
5. For each app:
   - **Grant Access** (pending → approved)
   - **Change Role** (user ↔ admin)
   - **Revoke Access** (approved → revoked)

**All changes are logged** in `appAccessLogs` for audit trail.

---

### Complete Integration Example

Here's a complete example integrating app permissions:

```javascript
// lib/auth/sso-permissions.js
import { SSO_BASE_URL, SSO_CLIENT_ID } from './config';

export async function getAppPermission(userId, accessToken) {
  const response = await fetch(
    `${SSO_BASE_URL}/api/users/${userId}/apps/${SSO_CLIENT_ID}/permissions`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );
  
  if (response.status === 404) {
    return {
      userId,
      clientId: SSO_CLIENT_ID,
      hasAccess: false,
      status: 'none',
      role: 'none',
    };
  }
  
  if (!response.ok) {
    throw new Error(`Failed to get permission: ${response.status}`);
  }
  
  return await response.json();
}

export async function requestAppAccess(userId, accessToken) {
  const response = await fetch(
    `${SSO_BASE_URL}/api/users/${userId}/apps/${SSO_CLIENT_ID}/request-access`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to request access: ${response.status}`);
  }
  
  return await response.json();
}

export function hasAppAccess(permission) {
  return permission.hasAccess && permission.status === 'approved';
}

export function isAppAdmin(permission) {
  return hasAppAccess(permission) && 
         (permission.role === 'admin' || permission.role === 'superadmin');
}
```

```javascript
// app/api/auth/callback/route.js
import { exchangeCodeForToken, decodeIdToken } from '@/lib/auth/sso';
import { getAppPermission, requestAppAccess, hasAppAccess } from '@/lib/auth/sso-permissions';
import { createSession } from '@/lib/auth/session';

export async function GET(request) {
  const { code, state } = request.nextUrl.searchParams;
  
  // Validate state (CSRF protection)
  // ...
  
  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeCodeForToken(code, codeVerifier);
    
    // 2. Extract user from ID token
    const user = decodeIdToken(tokens.id_token);
    
    // 3. Query SSO for app permission
    let permission;
    try {
      permission = await getAppPermission(user.id, tokens.access_token);
    } catch (error) {
      console.error('Failed to get app permission:', error);
      // Default to no access
      permission = { hasAccess: false, role: 'none', status: 'none' };
    }
    
    // 4. Check if user has access
    if (!hasAppAccess(permission)) {
      if (permission.status === 'pending') {
        // Already requested, waiting for approval
        return NextResponse.redirect(new URL('/access-pending', request.url));
      } else {
        // No permission record - create one
        try {
          await requestAppAccess(user.id, tokens.access_token);
        } catch (error) {
          console.error('Failed to request access:', error);
        }
        return NextResponse.redirect(new URL('/access-pending', request.url));
      }
    }
    
    // 5. Create session with app permission
    await createSession(user, tokens, {
      appRole: permission.role,
      appAccess: permission.hasAccess,
    });
    
    // 6. Redirect to app
    return NextResponse.redirect(new URL('/', request.url));
    
  } catch (error) {
    console.error('OAuth callback failed:', error);
    return NextResponse.redirect(
      new URL(`/?error=auth_failed&message=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
```

---

### Available Scopes

#### Standard OIDC Scopes

| Scope | Description | Claims Included |
|-------|-------------|-----------------|
| `openid` | Required for OIDC | sub (user ID) |
| `profile` | User profile | name, picture, updated_at |
| `email` | Email address | email, email_verified |
| `offline_access` | Refresh token | - |

#### Application-Specific Scopes

Request scopes based on your app's needs. Example: `openid profile email offline_access read:data write:data`

---

## Method 2: Cookie-Based SSO (Subdomain Only)

Simple integration for applications on *.doneisbetter.com subdomains.

### Prerequisites

✅ Your app MUST be on a *.doneisbetter.com subdomain  
✅ Example: `yourapp.doneisbetter.com`  
✅ Cookies with `Domain=.doneisbetter.com` are shared across subdomains

### Environment Variables

```bash
# .env
SSO_SERVER_URL=https://sso.doneisbetter.com
MONGODB_URI=your-mongodb-connection-string  # Optional for local user sync
DB_NAME=yourapp  # Optional
```

**⚠️ CRITICAL**: No trailing newlines! Use `printf` instead of `echo`:

```bash
# Good (no newline)
printf "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production

# Bad (adds newline)
echo "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production
```

---

### Implementation

#### Step 1: Create Authentication Library

Create `lib/auth.js`:

```javascript
/**
 * Validate SSO session by forwarding cookies to SSO service
 * Returns: { isValid: boolean, user?: Object }
 */
export async function validateSsoSession(req) {
  try {
    // Verify SSO_SERVER_URL is set
    if (!process.env.SSO_SERVER_URL) {
      console.error('[auth] SSO_SERVER_URL not configured');
      return { isValid: false };
    }
    
    const cookieHeader = req.headers.cookie || '';
    
    // Try public user validation first
    const publicUrl = `${process.env.SSO_SERVER_URL}/api/public/validate`;
    
    let resp = await fetch(publicUrl, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
        accept: 'application/json',
        'user-agent': req.headers['user-agent'] || 'your-app-client',
      },
      cache: 'no-store',
    });
    
    let data = await resp.json();
    
    // If public validation fails, try admin validation
    if (!data?.isValid) {
      const adminUrl = `${process.env.SSO_SERVER_URL}/api/sso/validate`;
      resp = await fetch(adminUrl, {
        method: 'GET',
        headers: {
          cookie: cookieHeader,
          accept: 'application/json',
          'user-agent': req.headers['user-agent'] || 'your-app-client',
        },
        cache: 'no-store',
      });
      data = await resp.json();
    }
    
    if (data?.isValid && data?.user?.id) {
      return { 
        isValid: true, 
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        }
      };
    }
    
    return { isValid: false };
  } catch (err) {
    console.error('[auth] SSO validation error:', err.message);
    return { isValid: false };
  }
}
```

#### Step 2: Protect Pages with Server-Side Validation

In your protected pages (e.g., `pages/admin/index.js`):

```javascript
import { validateSsoSession } from '../../lib/auth';

export async function getServerSideProps(context) {
  try {
    const { req, resolvedUrl } = context;
    
    // Validate session
    const { isValid, user } = await validateSsoSession(req);
    
    if (!isValid) {
      // Redirect to SSO login with return URL
      const ssoUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
      const returnUrl = `https://yourapp.doneisbetter.com${resolvedUrl}`;
      const loginUrl = `${ssoUrl}/login?redirect=${encodeURIComponent(returnUrl)}`;
      
      return {
        redirect: {
          destination: loginUrl,
          permanent: false,
        },
      };
    }
    
    // Pass user data to page component
    return {
      props: {
        user: {
          email: user.email || '',
          name: user.name || user.email || '',
          id: user.id || '',
          role: user.role || '',
        },
      },
    };
  } catch (err) {
    // Always redirect gracefully on error (never 500)
    console.error('[page] getServerSideProps error:', err.message);
    
    const ssoUrl = process.env.SSO_SERVER_URL || 'https://sso.doneisbetter.com';
    const returnUrl = `https://yourapp.doneisbetter.com${context.resolvedUrl || '/'}`;
    const loginUrl = `${ssoUrl}/login?redirect=${encodeURIComponent(returnUrl)}`;
    
    return {
      redirect: {
        destination: loginUrl,
        permanent: false,
      },
    };
  }
}

export default function YourPage({ user }) {
  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

#### Step 3: Add Logout Support

Create `pages/logout.js`:

```javascript
import { useEffect } from 'react';

export default function Logout() {
  useEffect(() => {
    async function logout() {
      try {
        // Call SSO logout (clears both public and admin cookies)
        await fetch('https://sso.doneisbetter.com/api/public/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
      
      // Redirect to SSO login
      window.location.href = 'https://sso.doneisbetter.com/login';
    }
    
    logout();
  }, []);
  
  return (
    <div style={{ textAlign: 'center', padding: '100px' }}>
      <h1>Logging out...</h1>
    </div>
  );
}
```

---

## Method 3: Social Login Integration

Enable Facebook, Google, or Apple login for your users.

### Facebook Login

Currently available. Google and Apple coming soon.

#### User Authentication Flow

Users can log in via Facebook:
1. Click "Continue with Facebook" on SSO login page
2. Authorize with Facebook
3. Automatically creates SSO account with Facebook profile data
4. Session created and shared across apps

#### Integration with Your App

If using **Cookie-Based SSO** (subdomain):
- No additional setup needed
- Users logged in via Facebook will have valid SSO cookie
- Use `validateSsoSession()` as shown in Method 2

If using **OAuth2** (external domain):
- Complete OAuth2 setup as shown in Method 1
- Users who logged in via Facebook can authorize your app
- Access token will include their SSO user ID and profile

#### User Data Available

Users authenticated via Facebook have:
- Name (from Facebook profile)
- Email (from Facebook, may be proxy email)
- Profile picture URL
- Verified status

Access this data via:
- Cookie-based: `user` object from `validateSsoSession()`
- OAuth2: Claims in `id_token` JWT

---

## API Reference

### OAuth2 Endpoints

#### Authorization Endpoint
```
GET /api/oauth/authorize

Parameters:
- response_type: "code" (required)
- client_id: Your client ID (required)
- redirect_uri: Your callback URL (required)
- scope: Space-separated scopes (required)
- state: CSRF token (required)
- code_challenge: PKCE challenge (required)
- code_challenge_method: "S256" or "plain" (required)
- prompt: (optional) "none" | "login" | "consent" | "select_account"
  - "login": Force re-authentication even if user has session
  - "consent": Force consent screen even if already granted
  - "none": No UI, return error if interaction required

Response: 302 redirect to redirect_uri with code and state
```

#### Token Endpoint
```
POST /api/oauth/token

Body (authorization_code):
{
  "grant_type": "authorization_code",
  "code": "authorization code",
  "redirect_uri": "callback URL",
  "client_id": "your client ID",
  "client_secret": "your client secret",
  "code_verifier": "PKCE verifier"
}

Body (refresh_token):
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh token",
  "client_id": "your client ID",
  "client_secret": "your client secret"
}

Response:
{
  "access_token": "JWT",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh token",
  "id_token": "OIDC ID token",
  "scope": "granted scopes"
}
```

#### Revoke Endpoint
```
POST /api/oauth/revoke

Body:
{
  "token": "token to revoke",
  "token_type_hint": "refresh_token",
  "client_id": "your client ID",
  "client_secret": "your client secret"
}

Response: 200 OK (always, per spec)
```

#### Logout Endpoint
```
GET /api/oauth/logout?post_logout_redirect_uri=https://yourapp.com

Clears public-session cookie and redirects to post_logout_redirect_uri
```

### Session Validation Endpoints

#### Public User Validation
```
GET /api/public/validate

Headers:
- Cookie: public-session cookie

Response:
{
  "isValid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": true
  }
}
```

#### Admin User Validation
```
GET /api/sso/validate

Headers:
- Cookie: admin-session cookie

Response:
{
  "isValid": true,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin Name",
    "role": "admin"
  }
}
```

### OIDC Discovery

```
GET /.well-known/openid-configuration

Response: OIDC discovery document with endpoints and capabilities
```

### JWKS (Public Keys)

```
GET /.well-known/jwks.json

Response: Public keys for JWT signature verification
```

---

## Security Best Practices

### 1. Always Use PKCE (OAuth2)
- ✅ Generate new code_verifier for each auth request
- ✅ Use S256 method (SHA-256), not plain
- ✅ Never reuse code_verifier

### 2. Validate State Parameter (OAuth2)
- ✅ Generate cryptographically random state
- ✅ Store in session before redirect
- ✅ Verify on callback (CSRF protection)

### 3. Secure Token Storage
- ✅ Store tokens server-side in session
- ✅ Use HttpOnly, Secure cookies
- ✅ Never store tokens in localStorage (XSS risk)

### 4. Handle Token Expiration
- ✅ Implement automatic refresh before expiration
- ✅ Gracefully handle refresh failures
- ✅ Redirect to login when refresh token expires

### 5. Use HTTPS Everywhere
- ✅ All OAuth endpoints must use HTTPS
- ✅ Redirect URIs must use HTTPS (except localhost)

### 6. Validate Redirect URIs
- ✅ Register exact redirect URIs (no wildcards)
- ✅ Validate on every request

### 7. Never Expose Secrets
- ✅ Store client_secret in environment variables
- ✅ Never commit secrets to git
- ✅ Never log secrets

### 8. Cookie-Based Integration (Subdomain)
- ✅ Wrap all auth code in try-catch
- ✅ Always redirect on error (never throw 500)
- ✅ Make database operations non-blocking
- ✅ Use `printf` for environment variables (no newlines)

---

## Troubleshooting

### OAuth2 Errors

#### Error: "invalid_client"
**Cause**: Invalid client_id or client_secret  
**Solution**: Verify credentials match what was registered

#### Error: "invalid_redirect_uri"
**Cause**: Redirect URI doesn't match registered URI  
**Solution**: Ensure exact match (including trailing slash)

#### Error: "invalid_grant" (code exchange)
**Cause**: Code expired, already used, or PKCE verification failed  
**Solution**: 
- Codes expire after 10 minutes
- Codes are single-use only
- Verify code_verifier matches code_challenge

#### Error: "invalid_grant" (refresh)
**Cause**: Refresh token expired or revoked  
**Solution**: User must re-authenticate

#### Access token validation fails
**Cause**: Token expired or signature invalid  
**Solution**: 
- Verify token hasn't expired (check `exp` claim)
- Fetch JWKS from `/.well-known/jwks.json`
- Validate signature using RS256 algorithm

---

### Cookie-Based SSO Errors

#### Error: 500 Internal Server Error
**Cause**: Environment variable has trailing newline or code throws errors  
**Solution**:
```bash
# Fix environment variable
vercel env rm SSO_SERVER_URL production
printf "https://sso.doneisbetter.com" | vercel env add SSO_SERVER_URL production

# Trigger redeploy
git commit --allow-empty -m "fix: Redeploy with clean SSO_SERVER_URL"
git push origin main
```

#### Error: "TypeError: Load failed"
**Cause**: Using `<form onSubmit>` wrapper on login form  
**Solution**: Use `<div>` with button onClick instead

#### Infinite page refresh
**Cause**: React useEffect with incorrect dependencies  
**Solution**: Check useEffect dependencies and router.isReady state

#### Redirect parameter lost
**Cause**: Links don't preserve `?redirect=` param  
**Solution**: Always preserve redirect in navigation:
```javascript
<Link href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}>
```

---

### CORS Errors

**Cause**: Your domain not in SSO_ALLOWED_ORIGINS  
**Solution**: Contact admin to add your domain to allowlist

---

## Complete Examples

### Next.js + OAuth2 (External Domain)

See `OAUTH2_INTEGRATION.md` for full Express.js and Next.js examples.

### Next.js + Cookie SSO (Subdomain)

See `docs/SSO_INTEGRATION_GUIDE.md` for complete implementation.

---

## Support & Resources

- **Admin Portal**: https://sso.doneisbetter.com/admin
- **Documentation**: All docs in `/docs` directory
- **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749
- **PKCE RFC**: https://tools.ietf.org/html/rfc7636
- **OIDC Core**: https://openid.net/specs/openid-connect-core-1_0.html

---

## Version History

- **5.23.1** (2025-11-09): Added comprehensive third-party integration guide
- **5.23.0** (2025-11-09): Facebook Login integration, OAuth client management UI
- **5.19.0** (2025-11-08): OAuth logout endpoint
- **5.0.0** (2025-10-02): OAuth2/OIDC foundation complete

---

**End of Third-Party Integration Guide**  
**Version**: 5.24.0  
**Last Updated**: 2025-11-09T14:20:00.000Z
