# PKCE Configuration Guide

## 📋 Overview

**PKCE (Proof Key for Code Exchange)** is a security extension for OAuth 2.0 that protects against authorization code interception attacks. However, not all client types need PKCE.

This guide explains when to use PKCE and how to configure it for your OAuth clients.

---

## 🔐 When is PKCE Required?

### ✅ PKCE is **REQUIRED** for:
- **Public Clients** (mobile apps, single-page applications)
  - These clients cannot securely store `client_secret`
  - Examples: React apps, Vue apps, mobile apps (iOS/Android)
  - Set `require_pkce: true`

### ⚙️ PKCE is **OPTIONAL** for:
- **Confidential Clients** (server-side applications)
  - These clients can securely store `client_secret`
  - Examples: Node.js servers, PHP backends, Python services
  - Can set `require_pkce: false`

---

## 🎯 How It Works

### With PKCE Disabled (`require_pkce: false`)
1. Client requests authorization with just `client_id`, `redirect_uri`, `scope`, `state`
2. User authenticates and grants consent
3. SSO returns `authorization_code`
4. Client exchanges code for tokens using `client_secret` (proves identity)

### With PKCE Enabled (`require_pkce: true`)
1. Client generates `code_verifier` (random string)
2. Client creates `code_challenge` = BASE64URL(SHA256(code_verifier))
3. Client requests authorization with `code_challenge` and `code_challenge_method: S256`
4. User authenticates and grants consent
5. SSO returns `authorization_code` (bound to `code_challenge`)
6. Client exchanges code for tokens using both `client_secret` AND `code_verifier`

---

## ⚙️ Configuration

### Creating a New OAuth Client

When creating a client via API or admin UI, set `require_pkce`:

```javascript
// Confidential client (server-side)
{
  "name": "My Backend App",
  "redirect_uris": ["https://myapp.com/callback"],
  "allowed_scopes": ["openid", "profile", "email"],
  "require_pkce": false  // ← PKCE not required
}

// Public client (SPA/mobile)
{
  "name": "My Mobile App",
  "redirect_uris": ["myapp://callback"],
  "allowed_scopes": ["openid", "profile"],
  "require_pkce": true  // ← PKCE required for security
}
```

### Updating an Existing Client

Update the `require_pkce` field:

```bash
# Using curl
curl -X PATCH https://sso.doneisbetter.com/api/admin/oauth-clients/CLIENT_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"require_pkce": false}'
```

---

## 🛠 Implementation Examples

### Server-Side Client (No PKCE)

```javascript
// Step 1: Redirect user to authorization endpoint
const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize')
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('redirect_uri', 'https://myapp.com/callback')
authUrl.searchParams.set('scope', 'openid profile email')
authUrl.searchParams.set('state', generateRandomString())
// No code_challenge needed!

res.redirect(authUrl.toString())

// Step 2: Exchange authorization code for tokens
const tokenResponse = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: 'https://myapp.com/callback',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
    // No code_verifier needed!
  })
})
```

### Client with PKCE (SPA/Mobile)

```javascript
import crypto from 'crypto'

// Step 1: Generate PKCE parameters
const code_verifier = crypto.randomBytes(32).toString('base64url')
const code_challenge = crypto
  .createHash('sha256')
  .update(code_verifier)
  .digest('base64url')

// Step 2: Redirect to authorization with PKCE
const authUrl = new URL('https://sso.doneisbetter.com/api/oauth/authorize')
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('client_id', CLIENT_ID)
authUrl.searchParams.set('redirect_uri', 'myapp://callback')
authUrl.searchParams.set('scope', 'openid profile')
authUrl.searchParams.set('state', generateRandomString())
authUrl.searchParams.set('code_challenge', code_challenge)  // ← PKCE
authUrl.searchParams.set('code_challenge_method', 'S256')   // ← PKCE

// Store code_verifier for later (in session storage, etc.)
sessionStorage.setItem('code_verifier', code_verifier)

window.location.href = authUrl.toString()

// Step 3: Exchange code with PKCE verifier
const tokenResponse = await fetch('https://sso.doneisbetter.com/api/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: 'myapp://callback',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: sessionStorage.getItem('code_verifier')  // ← PKCE
  })
})
```

---

## 🔍 Checking Client Configuration

To see if PKCE is required for your client:

```bash
# Get client details
curl https://sso.doneisbetter.com/api/oauth/clients/CLIENT_ID \
  -H "Authorization: Bearer TOKEN"

# Response includes:
{
  "client_id": "...",
  "name": "My App",
  "require_pkce": false,  // ← Check this field
  ...
}
```

---

## 🚨 Security Recommendations

| Client Type | `require_pkce` | Why |
|------------|---------------|-----|
| **Server-side** (Node, PHP, Python) | `false` | Client secret is sufficient |
| **Mobile app** (iOS, Android) | `true` | Cannot securely store secrets |
| **SPA** (React, Vue, Angular) | `true` | Cannot securely store secrets |
| **Desktop app** | `true` | Treat like mobile for safety |

---

## 📚 References

- [RFC 7636 - Proof Key for Code Exchange](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [OAuth 2.0 for Native Apps](https://tools.ietf.org/html/rfc8252)

---

## ❓ FAQ

### Q: I'm getting "code_challenge is required" error. What do I do?

**A:** Your OAuth client has `require_pkce: true`. Either:
1. Implement PKCE in your client (recommended for public clients)
2. Update your client to set `require_pkce: false` (if you're a confidential/server-side client)

### Q: Can I disable PKCE for an existing client?

**A:** Yes! Update the client via API:

```javascript
PATCH /api/admin/oauth-clients/{client_id}
{
  "require_pkce": false
}
```

### Q: What happens if I send code_verifier for a client with `require_pkce: false`?

**A:** The SSO server will ignore the PKCE parameters. They're optional, so including them won't cause errors.

### Q: Is it less secure to disable PKCE?

**A:** For **confidential clients** (server-side), no. The `client_secret` provides sufficient security. For **public clients** (mobile/SPA), yes - always use PKCE.

---

**Last Updated:** 2025-10-06  
**Version:** 5.2.0+
