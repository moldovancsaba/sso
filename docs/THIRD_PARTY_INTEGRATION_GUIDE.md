# Third-Party Integration Guide — SSO Service

**Version**: 5.30.0  
**Last Updated**: 2026-01-20T12:00:00.000Z  
**Service URL**: https://sso.doneisbetter.com  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Integration Methods](#integration-methods)
3. [Method 1: OAuth2/OIDC (Recommended)](#method-1-oauth2oidc-recommended)
4. [App-Level Permissions](#app-level-permissions)
5. [Method 2: Cookie-Based SSO (Subdomain Only)](#method-2-cookie-based-sso-subdomain-only)
6. [Method 3: Social Login Integration](#method-3-social-login-integration)
7. [API Reference](#api-reference)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The SSO Service (sso.doneisbetter.com) provides comprehensive OAuth2/OIDC authentication and multi-app authorization for third-party applications.

### What You Get

- ✅ **Single Sign-On**: Users login once, access all integrated apps
- ✅ **Multiple Auth Methods**: Password, Magic Link, PIN verification, Social Login (Facebook, Google)
- ✅ **OAuth2/OIDC Compliance**: Standards-based authentication
- ✅ **3-Role Permission System**: Simplified roles (none, user, admin)
- ✅ **Per-App Authorization**: Centralized SSO with distributed app permissions
- ✅ **Secure Token Management**: RS256-signed JWT access tokens
- ✅ **User Profile Access**: Name, email, role, verified status
- ✅ **30-Day Sessions**: With sliding expiration

### Integration Methods

| Method | Best For | Domain Requirement | Complexity |
|--------|----------|-------------------|------------|
| **OAuth2/OIDC** | External domains, mobile apps, SPAs | Any domain | Medium |
| **Cookie-Based SSO** | Subdomain apps only | *.doneisbetter.com | Low |
| **Social Login** | Adding Facebook/Google login | Any domain | Low |

---

## Method 1: OAuth2/OIDC (Recommended)

Complete OAuth2/OIDC integration for external applications.

### ⚠️ Common Integration Issues & Solutions

**Before you start**, review these common issues to avoid integration problems:

#### 1. invalid_scope Error

**Problem:** Requesting non-standard OIDC scopes  
**Symptoms:** Error page shows `invalid_scope`  
**Solution:** Use **only** standard OIDC scopes:
```
openid profile email offline_access
```
**❌ DO NOT USE:** `roles` scope (not a standard OIDC scope)  
**✅ INSTEAD:** Role information is included in ID token's `role` claim when `profile` scope is requested

#### 2. Empty/Blank Authorization Page

**Problem:** Authorization page shows empty white screen  
**Possible Causes:**
- `prompt=login` parameter not supported by provider
- Redirect URI not whitelisted exactly
- Client ID incorrect

**Solution:**
- Remove `prompt=login` parameter from authorization request
- Verify redirect URI matches exactly (case-sensitive, no trailing slashes)
- Confirm client ID and application is active

#### 3. Redirect URI Mismatch

**Problem:** Error says redirect_uri doesn't match  
**Requirements:**
- ✅ Exact match required (case-sensitive)
- ✅ Include protocol (`https://`)
- ✅ No trailing slashes
- ✅ Whitelist both `amanoba.com` and `www.amanoba.com` if using both

**Example correct URIs:**
```
https://www.amanoba.com/api/auth/sso/callback
https://amanoba.com/api/auth/sso/callback
http://localhost:3000/api/auth/sso/callback
```

#### 4. Nonce Validation Fails

**Problem:** `invalid_nonce` error during login  
**Cause:** SSO provider not returning nonce in ID token claims  
**Solution:** Implement lenient nonce validation (see Step 2.4)  
**Best Practice:** SSO provider should return nonce if sent in authorization request

#### 5. Role Information Missing

**Problem:** User role is always 'user', even for admins  
**Causes:**
- `profile` scope not requested
- SSO provider not including `role` claim in ID token
- Client app not extracting role from claims correctly

**Solution:**
- ✅ Request `profile` scope
- ✅ Check for `role` claim in ID token (`claims.role` or `claims.roles`)
- ✅ Preserve database role if SSO returns default 'user'

---

### Step 1: Register Your OAuth Client

#### Via Admin UI

1. Login to SSO admin: https://sso.doneisbetter.com/admin
2. Navigate to **"OAuth Clients"**
3. Click **"+ New Client"** (admin role required)
4. Fill in the form:

```
Client Name: Your App Name
Description: Brief description of your app
Redirect URIs (one per line):
  https://yourapp.com/auth/callback
  https://yourapp.com/api/oauth/callback
  http://localhost:3000/api/auth/callback
Allowed Scopes: openid profile email offline_access
Homepage URL: https://yourapp.com
Require PKCE: false (for server-side apps) or true (for mobile/SPA)
```

5. Click **"Create Client"**
6. **⚠️ CRITICAL**: Save the `client_secret` immediately (shown only once!)

#### Client Credentials

You'll receive:
- **Client ID**: UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **Client Secret**: UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

Store these securely:

```bash
# .env or .env.local
SSO_CLIENT_ID=550e8400-e29b-41d4-a716-446655440000
SSO_CLIENT_SECRET=a1b2c3d4-e5f6-7890-abcd-ef1234567890
SSO_REDIRECT_URI=https://yourapp.com/auth/callback

# SSO Endpoints
SSO_AUTH_URL=https://sso.doneisbetter.com/authorize
SSO_TOKEN_URL=https://sso.doneisbetter.com/token
SSO_USERINFO_URL=https://sso.doneisbetter.com/userinfo
SSO_JWKS_URL=https://sso.doneisbetter.com/.well-known/jwks.json
SSO_ISSUER=https://sso.doneisbetter.com

# Scopes (space-separated) - Use only standard OIDC scopes
SSO_SCOPES=openid profile email offline_access
```

**⚠️ Never commit credentials to git!**

---

### Step 2: Implement OAuth2 Flow

#### 2.1 Generate PKCE Parameters (Recommended)

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

#### 2.2 Generate State and Nonce

```javascript
function generateRandomString(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate state (CSRF protection)
const state = generateRandomString(32);

// Generate nonce (replay attack prevention)
const nonce = generateRandomString(32);

// Store for validation
sessionStorage.setItem('oauth_state', state);
sessionStorage.setItem('oauth_nonce', nonce);
```

#### 2.3 Redirect User to Authorization Endpoint

```javascript
function initiateOAuthLogin(returnTo = '/dashboard') {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SSO_CLIENT_ID,
    redirect_uri: process.env.SSO_REDIRECT_URI,
    // ⚠️ CRITICAL: Use only standard OIDC scopes
    // Role information is included in 'profile' scope
    scope: 'openid profile email offline_access',
    state: sessionStorage.getItem('oauth_state'),
    nonce: sessionStorage.getItem('oauth_nonce'),        // Required for OIDC
    code_challenge: codeChallenge,                       // Optional if client requires PKCE
    code_challenge_method: 'S256',
    // prompt: 'login',  // ⚠️ Some providers don't support this - may cause blank page
  });
  
  // Store return URL for post-login redirect
  sessionStorage.setItem('oauth_return_to', returnTo);
  
  window.location.href = `${process.env.SSO_AUTH_URL}?${params}`;
}
```

**Available Prompt Values:**
- `login` - Force re-authentication (useful after logout)
- `consent` - Force consent screen
- `select_account` - Show account selection
- `none` - No UI, error if interaction required

#### 2.4 Handle OAuth Callback

User is redirected back with authorization code:

```
https://yourapp.com/auth/callback?code=abc123&state=xyz789
```

Backend handler:

```javascript
// Node.js/Express example
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  // 1. Validate state parameter (CSRF protection)
  const storedState = req.session.oauth_state;
  if (!state || state !== storedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  // 2. Validate authorization code
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // 3. Retrieve PKCE verifier from session
    const codeVerifier = req.session.pkce_verifier;

    // 4. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    // 5. Validate nonce in ID token
    const storedNonce = req.session.oauth_nonce;
    const idTokenClaims = parseIdToken(tokens.id_token);
    
    // ⚠️ IMPORTANT: SSO provider should return nonce in ID token
    // If provider doesn't return nonce, log warning but allow login for compatibility
    if (storedNonce && idTokenClaims.nonce) {
      // Both present - must match
      if (idTokenClaims.nonce !== storedNonce) {
        throw new Error('Nonce mismatch - possible replay attack');
      }
    } else if (storedNonce && !idTokenClaims.nonce) {
      // Nonce sent but not returned - log warning
      console.warn('Nonce was sent but not returned by SSO provider');
    }

    // 6. Store tokens securely (server-side session only)
    req.session.access_token = tokens.access_token;
    req.session.refresh_token = tokens.refresh_token;
    req.session.id_token = tokens.id_token;

    // 7. Extract user info from ID token
    const userInfo = {
      userId: idTokenClaims.sub,
      email: idTokenClaims.email,
      name: idTokenClaims.name,
      emailVerified: idTokenClaims.email_verified,
      role: idTokenClaims.role,  // 'user' or 'admin' if 'roles' scope requested
    };
    
    req.session.user = userInfo;

    // 8. Clean up one-time-use values
    delete req.session.oauth_state;
    delete req.session.oauth_nonce;
    delete req.session.pkce_verifier;

    // 9. Redirect to original page
    const returnTo = req.session.oauth_return_to || '/dashboard';
    delete req.session.oauth_return_to;
    
    res.redirect(returnTo);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/login?error=auth_failed');
  }
});
```

#### 2.5 Exchange Code for Tokens

```javascript
async function exchangeCodeForTokens(code, codeVerifier) {
  const response = await fetch(process.env.SSO_TOKEN_URL, {
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
      code_verifier: codeVerifier,  // If PKCE used
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description}`);
  }

  return await response.json();
  /* Returns:
  {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "a1b2c3d4...",
    "id_token": "eyJhbGciOiJSUzI1NiIs...",
    "scope": "openid profile email offline_access roles"
  }
  */
}
```

---

### Step 3: Parse ID Token

The ID token contains user information:

```javascript
function parseIdToken(idToken) {
  const [header, payload, signature] = idToken.split('.');
  const decoded = JSON.parse(atob(payload));
  
  return {
    // Standard OIDC claims
    sub: decoded.sub,              // User UUID
    iss: decoded.iss,              // Issuer (https://sso.doneisbetter.com)
    aud: decoded.aud,              // Audience (your client_id)
    exp: decoded.exp,              // Expiration timestamp
    iat: decoded.iat,              // Issued at timestamp
    nonce: decoded.nonce,          // Nonce for validation
    
    // User info (if scopes requested)
    email: decoded.email,          // Email address
    email_verified: decoded.email_verified,
    name: decoded.name,            // Full name
    picture: decoded.picture,      // Profile picture URL
    updated_at: decoded.updated_at,
    
    // SSO-specific claims
    user_type: decoded.user_type,  // 'admin' or 'public'
    role: decoded.role,            // 'user' or 'admin' (if 'roles' scope requested)
  };
}

// For production, verify signature using JWKS
async function verifyIdToken(idToken) {
  const jwksResponse = await fetch(process.env.SSO_JWKS_URL);
  const jwks = await jwksResponse.json();
  
  // Use a JWT library like 'jsonwebtoken' or 'jose'
  const verified = await jwt.verify(idToken, jwks, {
    issuer: process.env.SSO_ISSUER,
    audience: process.env.SSO_CLIENT_ID,
  });
  
  return verified;
}
```

---

### Step 4: Token Management

#### Refresh Access Token

Access tokens expire after 1 hour. Use refresh token to get new tokens:

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch(process.env.SSO_TOKEN_URL, {
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

#### Use Access Token

```javascript
async function makeApiCall(endpoint, accessToken) {
  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    // Token expired, refresh it
    const newTokens = await refreshAccessToken(session.refresh_token);
    session.access_token = newTokens.access_token;
    session.refresh_token = newTokens.refresh_token;
    
    // Retry with new token
    return makeApiCall(endpoint, newTokens.access_token);
  }

  return response.json();
}
```

#### Revoke Tokens (Logout)

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
  req.session.destroy();

  // Redirect to SSO logout to clear SSO cookie
  res.redirect(
    `${process.env.SSO_BASE_URL}/api/oauth/logout?post_logout_redirect_uri=${encodeURIComponent('https://yourapp.com')}`
  );
}
```

---

## App-Level Permissions

**Updated for 3-Role System (2026-01-20)**

SSO provides centralized permission management with a simplified 3-role system.

### Role Definitions

| Role | Meaning | Typical Permissions |
|------|---------|---------------------|
| `none` | No access | Cannot login to app |
| `user` | Standard access | Read data, create own content |
| `admin` | Full access | Manage users, app settings, all permissions |

**Note:** All legacy roles (`super-admin`, `owner`, `superadmin`) have been consolidated to `admin`.

### Permission Workflow

```
1. User completes OAuth login
2. App receives authorization code
3. App exchanges code for tokens
4. App parses ID token → gets user.sub and user.role
5. App queries SSO: GET /api/users/{sub}/apps/{clientId}/permissions
6. Response includes:
   - hasAccess: boolean
   - role: 'none' | 'user' | 'admin'
   - status: 'pending' | 'active' | 'revoked'
7. If hasAccess == false:
   → Show "Access Pending" page or auto-request access
8. If hasAccess == true:
   → Create session with app role
   → Grant access based on role
```

### Query User's App Permission

```javascript
/**
 * Get user's permission for your app
 * 
 * @param userId - User's SSO ID (from id_token.sub)
 * @param accessToken - OAuth access token
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
    "userId": "user-uuid",
    "clientId": "your-client-id",
    "appName": "YourApp",
    "hasAccess": true,
    "status": "approved",
    "role": "admin",  // 'none', 'user', or 'admin'
    "requestedAt": "2026-01-20T10:00:00.000Z",
    "grantedAt": "2026-01-20T10:05:00.000Z",
    "grantedBy": "admin-uuid",
    "lastAccessedAt": "2026-01-20T13:50:00.000Z"
  }
  */
}
```

### Request App Access (If User Has None)

```javascript
async function requestAppAccess(userId, accessToken) {
  const response = await fetch(
    `${process.env.SSO_BASE_URL}/api/users/${userId}/apps/${process.env.SSO_CLIENT_ID}/request-access`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to request access: ${response.status}`);
  }
  
  return await response.json();
  /* Returns:
  {
    "userId": "user-uuid",
    "clientId": "your-client-id",
    "appName": "YourApp",
    "hasAccess": false,
    "status": "pending",
    "role": "none",
    "requestedAt": "2026-01-20T14:00:00.000Z"
  }
  */
}
```

### Complete OAuth Callback with Permissions

```javascript
async function handleOAuthCallback(code, state) {
  // 1. Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, codeVerifier);
  
  // 2. Parse user info from ID token
  const user = parseIdToken(tokens.id_token);
  
  // 3. Query SSO for app-specific permission
  let permission;
  try {
    permission = await getAppPermission(user.sub, tokens.access_token);
  } catch (error) {
    console.error('Failed to get app permission:', error);
    permission = { hasAccess: false, role: 'none', status: 'none' };
  }
  
  // 4. Check if user has access
  if (!permission.hasAccess) {
    if (permission.status === 'pending') {
      // Already requested, waiting for approval
      return redirectTo('/access-pending');
    } else {
      // No permission record - create one
      await requestAppAccess(user.sub, tokens.access_token);
      return redirectTo('/access-pending');
    }
  }
  
  // 5. Store app role in session
  req.session.user = {
    ...user,
    appRole: permission.role,      // 'user' or 'admin'
    appAccess: permission.hasAccess,
  };
  
  // 6. Redirect to app
  return redirectTo('/dashboard');
}
```

### Use App Role for Authorization

```javascript
// Middleware: Require admin role
function requireAdmin(req, res, next) {
  const session = req.session;
  
  if (!session?.user?.appAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (session.user.appRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

// Usage
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const users = await getAllUsers();
  res.json({ users });
});
```

### Periodic Permission Sync

```javascript
// Refresh permissions on token refresh
async function refreshSession(session) {
  // 1. Refresh access token
  const newTokens = await refreshAccessToken(session.refreshToken);
  
  // 2. Re-query app permission
  const permission = await getAppPermission(session.user.userId, newTokens.access_token);
  
  // 3. Update session
  session.accessToken = newTokens.access_token;
  session.refreshToken = newTokens.refresh_token;
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

---

## Method 2: Cookie-Based SSO (Subdomain Only)

Simple integration for applications on `*.doneisbetter.com` subdomains.

### Prerequisites

✅ Your app MUST be on a `*.doneisbetter.com` subdomain  
✅ Example: `yourapp.doneisbetter.com`  
✅ Cookies with `Domain=.doneisbetter.com` are shared across subdomains

### Implementation

#### Step 1: Create Authentication Library

```javascript
// lib/auth.js

/**
 * Validate SSO session by forwarding cookies to SSO service
 */
export async function validateSsoSession(req) {
  try {
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

#### Step 2: Protect Pages

```javascript
// Next.js Pages Router example
import { validateSsoSession } from '../../lib/auth';

export async function getServerSideProps(context) {
  try {
    const { req, resolvedUrl } = context;
    
    // Validate session
    const { isValid, user } = await validateSsoSession(req);
    
    if (!isValid) {
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
      <p>Role: {user.role}</p>
    </div>
  );
}
```

---

## Method 3: Social Login Integration

SSO supports Facebook and Google login. Users authenticated via social providers can authorize your app via OAuth2.

### For OAuth2 Apps

No additional setup needed:
1. Users login via Facebook/Google on SSO
2. Complete OAuth flow as normal
3. Access token includes their SSO user ID and profile
4. User data available via ID token claims

### For Subdomain Apps

Cookie-based SSO works automatically:
1. Users login via Facebook/Google
2. SSO cookie is set
3. `validateSsoSession()` returns user info
4. No difference from password login

---

## API Reference

### OAuth2 Endpoints

#### Authorization
```http
GET /authorize

Parameters:
- response_type: "code" (required)
- client_id: Client UUID (required)
- redirect_uri: Callback URL (required)
- scope: Space-separated scopes (required)
  Available: openid, profile, email, offline_access, roles
- state: CSRF token (required)
- nonce: Replay attack prevention (required)
- code_challenge: PKCE challenge (optional)
- code_challenge_method: "S256" or "plain"
- prompt: "login" | "consent" | "none" | "select_account"

Response: 302 redirect with code and state
```

#### Token Exchange
```http
POST /token

Body (Authorization Code):
{
  "grant_type": "authorization_code",
  "code": "authorization-code",
  "redirect_uri": "callback-url",
  "client_id": "client-id",
  "client_secret": "client-secret",
  "code_verifier": "pkce-verifier"  // if PKCE used
}

Body (Refresh Token):
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh-token",
  "client_id": "client-id",
  "client_secret": "client-secret"
}

Response:
{
  "access_token": "JWT",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token",
  "id_token": "OIDC ID token",
  "scope": "granted scopes"
}
```

### Scope Details

| Scope | Claims Included |
|-------|-----------------|
| `openid` | sub (user UUID) |
| `profile` | name, picture, updated_at, user_type, role |
| `email` | email, email_verified |
| `offline_access` | Enables refresh token |
| `roles` | role (in profile claims) |

### ID Token Claims

```json
{
  "iss": "https://sso.doneisbetter.com",
  "sub": "user-uuid",
  "aud": "client-id",
  "exp": 1737468000,
  "iat": 1737464400,
  "nonce": "client-nonce",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "picture": "https://...",
  "user_type": "public",
  "role": "user"
}
```

---

## Security Best Practices

### 1. Always Use HTTPS
- ✅ All OAuth endpoints must use HTTPS
- ✅ Redirect URIs must use HTTPS (except localhost)

### 2. Implement PKCE
- ✅ Generate new code_verifier for each auth request
- ✅ Use S256 method (SHA-256), not plain
- ✅ Never reuse code_verifier

### 3. Validate State Parameter
- ✅ Generate cryptographically random state
- ✅ Store in session before redirect
- ✅ Verify on callback (CSRF protection)

### 4. Validate Nonce Parameter
- ✅ Generate cryptographically random nonce
- ✅ Store before redirecting to authorization
- ✅ Verify in ID token on callback
- ✅ Prevents replay attacks

### 5. Secure Token Storage
- ✅ Store tokens server-side in session
- ✅ Use HttpOnly, Secure cookies
- ✅ Never store tokens in localStorage (XSS risk)

### 6. Verify ID Token Signature
- ✅ Fetch JWKS from `/.well-known/jwks.json`
- ✅ Verify signature using RS256 algorithm
- ✅ Validate issuer and audience claims

### 7. Handle Token Expiration
- ✅ Implement automatic refresh before expiration
- ✅ Gracefully handle refresh failures
- ✅ Redirect to login when refresh token expires

### 8. Never Expose Secrets
- ✅ Store client_secret in environment variables
- ✅ Never commit secrets to git
- ✅ Never log secrets

---

## Troubleshooting

### `invalid_scope` Error
**Cause:** Requesting a scope not in client's allowed_scopes  
**Solution:** Add the scope to your OAuth client configuration in SSO admin panel

### `invalid_nonce` Error
**Cause:** Nonce in ID token doesn't match stored nonce  
**Solution:** 
- Ensure you're sending `nonce` parameter in authorization request
- Verify you're comparing against the correct stored nonce
- Check nonce is not being reused across requests

### `invalid_grant` (Code Exchange)
**Cause:** Code expired, already used, or PKCE verification failed  
**Solution:** 
- Codes expire after 10 minutes
- Codes are single-use only
- Verify code_verifier matches code_challenge

### `invalid_grant` (Refresh)
**Cause:** Refresh token expired or revoked  
**Solution:** User must re-authenticate

### Access Token Validation Fails
**Cause:** Token expired or signature invalid  
**Solution:** 
- Check token expiration (`exp` claim)
- Fetch JWKS and verify signature
- Ensure using RS256 algorithm

---

## Complete Example: Next.js App Router

See `/Users/moldovancsaba/Projects/amanoba` for a working implementation of SSO integration with:
- OAuth2 authorization flow
- PKCE implementation
- Nonce validation
- App permission checking
- Role-based access control

---

## Support & Resources

- **Admin Portal**: https://sso.doneisbetter.com/admin
- **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749
- **PKCE RFC**: https://tools.ietf.org/html/rfc7636
- **OIDC Core**: https://openid.net/specs/openid-connect-core-1_0.html

---

**Version**: 5.30.0  
**Last Updated**: 2026-01-20T12:00:00.000Z  
**Status**: Production Ready ✅
