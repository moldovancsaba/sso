# OAuth2/OIDC Integration Guide for Client Applications

**Document Version**: 5.0.0  
**Last Updated**: 2025-10-02T14:07:23.000Z  
**Status**: Production Ready  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Registration Process](#registration-process)
4. [Authorization Flow](#authorization-flow)
5. [Token Management](#token-management)
6. [Example Implementation](#example-implementation)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide shows you how to integrate your application with the SSO service using OAuth2/OIDC. After following this guide, users will be able to sign in to your app using their SSO credentials.

**Benefits:**
- ✅ Single sign-on across all applications
- ✅ Secure token-based authentication
- ✅ Automatic token refresh
- ✅ User profile information (name, email)
- ✅ Standardized OIDC protocol

---

## Prerequisites

### Required Knowledge
- Basic understanding of OAuth2 Authorization Code Flow
- HTTP/REST API concepts
- JWT (JSON Web Tokens)
- PKCE (Proof Key for Code Exchange)

### Required Information
You'll need from the SSO admin:
- **Client ID** (UUID)
- **Client Secret** (UUID)
- **Redirect URI** (your callback URL)

---

## Registration Process

### Step 1: Request OAuth Client Registration

Contact your SSO administrator or create a client yourself if you have admin access:

1. Login to SSO admin: https://sso.doneisbetter.com/admin
2. Navigate to "OAuth Clients"
3. Click "+ New Client"
4. Fill in the form:
   ```
   Client Name: Narimato
   Description: Card ranking and management platform
   Redirect URIs:
     https://narimato.com/auth/callback
     https://narimato.com/api/oauth/callback
   Allowed Scopes: openid profile email offline_access read:cards write:cards
   Homepage URL: https://narimato.com
   ```
5. Click "Create Client"
6. **IMPORTANT**: Save the `client_secret` immediately (shown only once!)

### Step 2: Save Credentials Securely

Store credentials in environment variables (never commit to git):

```bash
# .env
SSO_CLIENT_ID=550e8400-e29b-41d4-a716-446655440000
SSO_CLIENT_SECRET=a1b2c3d4-e5f6-7890-abcd-ef1234567890
SSO_REDIRECT_URI=https://narimato.com/auth/callback
SSO_BASE_URL=https://sso.doneisbetter.com
```

---

## Authorization Flow

### Complete OAuth2 Flow Diagram

```
┌─────────────┐                                      ┌──────────────┐
│   User      │                                      │ SSO Server   │
│  Browser    │                                      │              │
└──────┬──────┘                                      └──────┬───────┘
       │                                                     │
       │ 1. Click "Sign in with SSO"                       │
       ├──────────────────────────────────────────────────>│
       │ GET /api/oauth/authorize?...                      │
       │                                                     │
       │                        2. Show login/consent      │
       │<────────────────────────────────────────────────┤
       │                                                     │
       │ 3. User approves                                  │
       ├────────────────────────────────────────────────>│
       │                                                     │
       │ 4. Redirect with code                             │
       │<────────────────────────────────────────────────┤
       │ https://narimato.com/callback?code=abc&state=xyz  │
       │                                                     │
┌──────▼──────┐                                             │
│  Narimato   │                                             │
│   Server    │                                             │
└──────┬──────┘                                             │
       │ 5. Exchange code for tokens                       │
       │ POST /api/oauth/token                             │
       ├────────────────────────────────────────────────>│
       │                                                     │
       │                        6. Return tokens           │
       │<────────────────────────────────────────────────┤
       │ { access_token, id_token, refresh_token }         │
       │                                                     │
       │ 7. Store tokens & create session                  │
       │                                                     │
```

### Step 1: Generate PKCE Parameters

PKCE prevents authorization code interception attacks. Generate these on each authorization request:

```javascript
// Generate code_verifier (random 43-128 character string)
function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

// Generate code_challenge (SHA-256 hash of verifier)
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(hash))
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Usage
const codeVerifier = generateCodeVerifier()
const codeChallenge = await generateCodeChallenge(codeVerifier)

// Store codeVerifier in session for later use
sessionStorage.setItem('pkce_verifier', codeVerifier)
```

### Step 2: Redirect User to Authorization Endpoint

```javascript
function initiateOAuthLogin() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SSO_CLIENT_ID,
    redirect_uri: process.env.SSO_REDIRECT_URI,
    scope: 'openid profile email offline_access read:cards write:cards',
    state: generateRandomState(), // CSRF protection
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  // Store state for validation
  sessionStorage.setItem('oauth_state', state)

  // Redirect to SSO
  window.location.href = `${process.env.SSO_BASE_URL}/api/oauth/authorize?${params}`
}

function generateRandomState() {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}
```

### Step 3: Handle Callback

User is redirected back to your app with authorization code:

```
https://narimato.com/auth/callback?code=abc123...&state=xyz789
```

Backend handler:

```javascript
// Node.js/Express example
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query

  // Validate state parameter (CSRF protection)
  const savedState = req.session.oauth_state
  if (!state || state !== savedState) {
    return res.status(400).json({ error: 'Invalid state parameter' })
  }

  // Validate code
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, req.session.pkce_verifier)

    // Store tokens securely
    req.session.access_token = tokens.access_token
    req.session.refresh_token = tokens.refresh_token
    req.session.id_token = tokens.id_token

    // Parse user info from ID token
    const userInfo = parseIdToken(tokens.id_token)
    req.session.user = userInfo

    // Redirect to app
    res.redirect('/dashboard')
  } catch (error) {
    console.error('OAuth callback error:', error)
    res.redirect('/login?error=auth_failed')
  }
})
```

### Step 4: Exchange Code for Tokens

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
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Token exchange failed: ${error.error_description}`)
  }

  return await response.json()
  // Returns:
  // {
  //   access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNzby0yMDI1In0...",
  //   token_type: "Bearer",
  //   expires_in: 3600,
  //   refresh_token: "a1b2c3d4...",
  //   id_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNzby0yMDI1In0...",
  //   scope: "openid profile email offline_access read:cards write:cards"
  // }
}
```

---

## Token Management

### Access Token Usage

Access tokens are JWTs that grant API access for 1 hour:

```javascript
// Make API call with access token
async function makeApiCall(endpoint, accessToken) {
  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (response.status === 401) {
    // Token expired, refresh it
    const newTokens = await refreshAccessToken()
    // Retry with new token
    return makeApiCall(endpoint, newTokens.access_token)
  }

  return response.json()
}
```

### ID Token Parsing

ID tokens contain user information:

```javascript
function parseIdToken(idToken) {
  const [header, payload, signature] = idToken.split('.')
  const decoded = JSON.parse(atob(payload))
  
  return {
    userId: decoded.sub,
    name: decoded.name,
    email: decoded.email,
    emailVerified: decoded.email_verified,
  }
}
```

### Token Refresh

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
  })

  if (!response.ok) {
    // Refresh token expired or revoked, user must re-authenticate
    throw new Error('Refresh failed, please login again')
  }

  const tokens = await response.json()
  
  // IMPORTANT: Store the NEW refresh token (rotation)
  // The old refresh token is now invalid
  return tokens
}
```

### Token Revocation

Revoke tokens on logout:

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
  })

  // Clear local session
  sessionStorage.clear()
  localStorage.clear()

  // Redirect to login
  window.location.href = '/login'
}
```

---

## Example Implementation

### Full Express.js Integration

```javascript
// server.js
import express from 'express'
import session from 'express-session'
import fetch from 'node-fetch'

const app = express()

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 86400000 } // 24 hours
}))

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (!req.session.access_token) {
    return res.redirect('/login')
  }
  next()
}

// Login route - initiate OAuth flow
app.get('/auth/login', (req, res) => {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateRandomState()

  // Store in session
  req.session.pkce_verifier = codeVerifier
  req.session.oauth_state = state

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SSO_CLIENT_ID,
    redirect_uri: process.env.SSO_REDIRECT_URI,
    scope: 'openid profile email offline_access read:cards',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  res.redirect(`${process.env.SSO_BASE_URL}/api/oauth/authorize?${params}`)
})

// Callback route - handle OAuth response
app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query

  // Check for errors
  if (error) {
    return res.redirect(`/login?error=${error}`)
  }

  // Validate state
  if (state !== req.session.oauth_state) {
    return res.status(400).send('Invalid state')
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(`${process.env.SSO_BASE_URL}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.SSO_REDIRECT_URI,
        client_id: process.env.SSO_CLIENT_ID,
        client_secret: process.env.SSO_CLIENT_SECRET,
        code_verifier: req.session.pkce_verifier,
      }),
    })

    const tokens = await tokenResponse.json()

    // Store tokens
    req.session.access_token = tokens.access_token
    req.session.refresh_token = tokens.refresh_token
    req.session.id_token = tokens.id_token

    // Parse user info
    const userInfo = parseIdToken(tokens.id_token)
    req.session.user = userInfo

    res.redirect('/dashboard')
  } catch (error) {
    console.error('Token exchange error:', error)
    res.redirect('/login?error=auth_failed')
  }
})

// Protected route example
app.get('/dashboard', requireAuth, (req, res) => {
  res.json({
    user: req.session.user,
    message: 'Welcome to your dashboard!'
  })
})

// Logout route
app.post('/auth/logout', async (req, res) => {
  if (req.session.refresh_token) {
    // Revoke refresh token
    await fetch(`${process.env.SSO_BASE_URL}/api/oauth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: req.session.refresh_token,
        token_type_hint: 'refresh_token',
        client_id: process.env.SSO_CLIENT_ID,
        client_secret: process.env.SSO_CLIENT_SECRET,
      }),
    })
  }

  req.session.destroy()
  res.redirect('/login')
})

app.listen(3001, () => {
  console.log('App running on http://localhost:3001')
})
```

---

## Security Best Practices

### 1. Always Use PKCE
- ✅ Generate new code_verifier for each auth request
- ✅ Use S256 method (SHA-256), not plain
- ✅ Never reuse code_verifier

### 2. Validate State Parameter
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

---

## Troubleshooting

### Error: "invalid_client"
**Cause**: Invalid client_id or client_secret  
**Solution**: Verify credentials match what was registered

### Error: "invalid_redirect_uri"
**Cause**: Redirect URI doesn't match registered URI  
**Solution**: Ensure exact match (including trailing slash)

### Error: "invalid_grant" (code exchange)
**Cause**: Code expired, already used, or PKCE verification failed  
**Solution**: 
- Codes expire after 10 minutes
- Codes are single-use only
- Verify code_verifier matches code_challenge

### Error: "invalid_grant" (refresh)
**Cause**: Refresh token expired or revoked  
**Solution**: User must re-authenticate

### Access token validation fails
**Cause**: Token expired or signature invalid  
**Solution**: 
- Verify token hasn't expired (check `exp` claim)
- Fetch JWKS from `/.well-known/jwks.json`
- Validate signature using RS256 algorithm

### User sees consent screen every time
**Cause**: Consent not being stored  
**Solution**: Check that consent is properly saved in database

---

## API Reference

### Authorization Endpoint
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

Response: 302 redirect to redirect_uri with code and state
```

### Token Endpoint
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

### Revoke Endpoint
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

### OIDC Discovery
```
GET /.well-known/openid-configuration

Response: OIDC discovery document with endpoints and capabilities
```

### JWKS
```
GET /.well-known/jwks.json

Response: Public keys for JWT signature verification
```

---

## Support

For issues or questions:
- **Documentation**: https://sso.doneisbetter.com/docs
- **GitHub**: https://github.com/moldovancsaba/sso
- **Admin Portal**: https://sso.doneisbetter.com/admin

---

**End of Integration Guide**  
**Version**: 5.0.0  
**Last Updated**: 2025-10-02T14:07:23.000Z
