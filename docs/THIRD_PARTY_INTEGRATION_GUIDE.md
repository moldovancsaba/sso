# Third-Party Integration Guide — SSO Service

**Version**: 5.23.1  
**Last Updated**: 2025-11-09T12:20:00.000Z  
**Service URL**: https://sso.doneisbetter.com  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Integration Methods](#integration-methods)
3. [Method 1: OAuth2/OIDC (Recommended for External Domains)](#method-1-oauth2oidc-recommended-for-external-domains)
4. [Method 2: Cookie-Based SSO (Subdomain Only)](#method-2-cookie-based-sso-subdomain-only)
5. [Method 3: Social Login Integration](#method-3-social-login-integration)
6. [API Reference](#api-reference)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

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

```javascript
function initiateOAuthLogin() {
  const state = generateRandomState(); // CSRF protection
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SSO_CLIENT_ID,
    redirect_uri: process.env.SSO_REDIRECT_URI,
    scope: 'openid profile email offline_access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Store state for validation
  sessionStorage.setItem('oauth_state', state);

  // Redirect to SSO
  window.location.href = `${process.env.SSO_BASE_URL}/api/oauth/authorize?${params}`;
}

function generateRandomState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}
```

#### 2.3 Handle OAuth Callback

User is redirected back with authorization code:

```
https://yourapp.com/auth/callback?code=abc123&state=xyz789
```

Backend handler:

```javascript
// Node.js/Express example
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  // 1. Validate state (CSRF protection)
  const savedState = req.session.oauth_state;
  if (!state || state !== savedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  // 2. Validate code
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // 3. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code, 
      req.session.pkce_verifier
    );

    // 4. Store tokens securely (server-side session)
    req.session.access_token = tokens.access_token;
    req.session.refresh_token = tokens.refresh_token;
    req.session.id_token = tokens.id_token;

    // 5. Parse user info from ID token
    const userInfo = parseIdToken(tokens.id_token);
    req.session.user = userInfo;

    // 6. Redirect to app
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/login?error=auth_failed');
  }
});
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
**Version**: 5.23.1  
**Last Updated**: 2025-11-09T12:20:00.000Z
