# Phase 2: OAuth2/OIDC Implementation Plan

**Start Date**: 2025-10-02T12:27:01.000Z  
**Target Version**: 5.0.0 (Major Release)  
**Estimated Timeline**: 3-4 weeks  
**Goal**: Enable SSO for external domains (narimato.com) via OAuth2/OIDC  

---

## 🎯 Objectives

### Primary Goals:
1. ✅ Support authentication for **narimato.com** (different root domain)
2. ✅ Implement OAuth2 Authorization Code Flow with PKCE
3. ✅ Generate JWT access tokens (industry standard)
4. ✅ Implement OIDC for user identity
5. ✅ Add refresh token rotation for security
6. ✅ Create user consent flow

### Secondary Goals:
- OAuth2 client registration system
- Token introspection and revocation
- OIDC discovery endpoint
- JWKS endpoint for public key distribution
- Admin UI for OAuth client management

---

## 📊 Architecture Overview

### Current System (Phase 1):
```
Browser → sso.doneisbetter.com → Cookie (Domain=.doneisbetter.com)
         ↓
    Subdomain SSO ✅
         ↓
    cardmass.doneisbetter.com (same root domain)
    playmass.doneisbetter.com (same root domain)
```

### Target System (Phase 2):
```
┌─────────────────────────────────────────────────────────────┐
│  narimato.com (External Domain)                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Redirect to SSO authorization endpoint           │   │
│  │  2. User authenticates at sso.doneisbetter.com       │   │
│  │  3. User consents to narimato.com access             │   │
│  │  4. Receive authorization code                       │   │
│  │  5. Exchange code for JWT tokens                     │   │
│  │  6. Use access token for API calls                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌────────────────────────────────┐
              │  sso.doneisbetter.com (SSO)    │
              │                                 │
              │  OAuth2 Endpoints:              │
              │  • /oauth/authorize             │
              │  • /oauth/token                 │
              │  • /oauth/revoke                │
              │  • /oauth/userinfo (OIDC)       │
              │  • /.well-known/...             │
              └────────────────────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  MongoDB     │
                       │  • clients   │
                       │  • codes     │
                       │  • tokens    │
                       └──────────────┘
```

---

## 🗄️ Database Schema Design

### 1. oauthClients Collection
```javascript
{
  client_id: string,              // UUID
  client_secret: string,          // bcrypt hash
  name: string,                   // "Narimato", "CardMass", etc.
  description: string,
  redirect_uris: string[],        // Allowed redirect URIs
  allowed_scopes: string[],       // ["openid", "profile", "email", "read:cards"]
  grant_types: string[],          // ["authorization_code", "refresh_token"]
  token_endpoint_auth_method: string, // "client_secret_post", "client_secret_basic"
  status: string,                 // "active", "suspended"
  owner_user_id: string,          // Admin who created it
  logo_uri: string,               // Optional logo URL
  homepage_uri: string,           // App homepage
  created_at: string,             // ISO 8601 UTC
  updated_at: string,             // ISO 8601 UTC
}
```

### 2. authorizationCodes Collection
```javascript
{
  code: string,                   // Random secure token (32-hex)
  client_id: string,
  user_id: string,                // UUID of authenticated user
  redirect_uri: string,
  scope: string,                  // Space-separated scopes
  code_challenge: string,         // PKCE challenge
  code_challenge_method: string,  // "S256" or "plain"
  expires_at: string,             // ISO 8601 UTC (short-lived: 10 min)
  used_at: string | null,         // One-time use enforcement
  created_at: string,             // ISO 8601 UTC
}
```

### 3. refreshTokens Collection
```javascript
{
  token: string,                  // Hashed token (SHA-256)
  client_id: string,
  user_id: string,
  scope: string,
  access_token_jti: string,       // Link to current access token
  expires_at: string,             // ISO 8601 UTC (long-lived: 30 days)
  revoked_at: string | null,
  revoke_reason: string | null,
  parent_token: string | null,    // Token rotation tracking
  created_at: string,             // ISO 8601 UTC
  last_used_at: string | null,    // ISO 8601 UTC
}
```

### 4. userConsents Collection
```javascript
{
  user_id: string,                // UUID
  client_id: string,
  scope: string,                  // Space-separated scopes
  granted_at: string,             // ISO 8601 UTC
  expires_at: string | null,      // Optional expiration
  revoked_at: string | null,
}
```

---

## 🔑 JWT Token Structure

### Access Token (JWT):
```javascript
{
  // Header
  "alg": "RS256",
  "typ": "JWT",
  "kid": "sso-2025"
  
  // Payload
  "iss": "https://sso.doneisbetter.com",
  "sub": "user-uuid",
  "aud": "narimato",
  "exp": 1727956800,              // 1 hour from now
  "iat": 1727953200,
  "jti": "token-uuid",
  "scope": "openid profile email read:cards",
  "client_id": "narimato"
}
```

### ID Token (OIDC):
```javascript
{
  // Header (same as access token)
  
  // Payload
  "iss": "https://sso.doneisbetter.com",
  "sub": "user-uuid",
  "aud": "narimato",
  "exp": 1727956800,
  "iat": 1727953200,
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true,
  "picture": "https://...",
}
```

---

## 🔄 OAuth2 Flow Diagram

### Authorization Code Flow with PKCE:

```
┌─────────────┐                                      ┌──────────────┐
│ narimato.com│                                      │ SSO Server   │
│   (Client)  │                                      │              │
└──────┬──────┘                                      └──────┬───────┘
       │                                                     │
       │ 1. Generate code_verifier (random)                │
       │    code_challenge = SHA256(code_verifier)         │
       │                                                     │
       │ 2. Redirect to /oauth/authorize                   │
       │    + client_id, redirect_uri, scope               │
       │    + code_challenge, state                        │
       ├────────────────────────────────────────────────────>
       │                                                     │
       │                        3. User authenticates       │
       │                           (if not logged in)       │
       │                                                     │
       │                        4. Show consent screen      │
       │                           User approves            │
       │                                                     │
       │ 5. Redirect back with code                        │
       <────────────────────────────────────────────────────┤
       │    https://narimato.com/callback?code=xxx&state=  │
       │                                                     │
       │ 6. POST /oauth/token                              │
       │    + code, code_verifier                          │
       │    + client_id, client_secret                     │
       ├────────────────────────────────────────────────────>
       │                                                     │
       │                        7. Verify code_challenge    │
       │                           Generate tokens          │
       │                                                     │
       │ 8. Return tokens                                  │
       <────────────────────────────────────────────────────┤
       │    {                                               │
       │      access_token: "eyJhbGc...",                  │
       │      refresh_token: "...",                        │
       │      id_token: "eyJhbGc...",                      │
       │      token_type: "Bearer",                        │
       │      expires_in: 3600                             │
       │    }                                               │
       │                                                     │
       │ 9. Use access_token for API calls                │
       │    Authorization: Bearer eyJhbGc...               │
       ├────────────────────────────────────────────────────>
       │                                                     │
```

---

## 📋 Implementation Phases

### Week 1: Foundation (Days 1-5)
**Goal**: Set up OAuth2 infrastructure

- [ ] Day 1: Database schema + client registration module
- [ ] Day 2: JWT token generation + key management
- [ ] Day 3: Authorization endpoint + PKCE validation
- [ ] Day 4: Token endpoint (authorization_code grant)
- [ ] Day 5: Refresh token rotation

**Deliverable**: Basic OAuth2 flow working end-to-end

---

### Week 2: OIDC & User Experience (Days 6-10)
**Goal**: Add OIDC and improve UX

- [ ] Day 6: OIDC ID tokens + userinfo endpoint
- [ ] Day 7: User consent screen UI
- [ ] Day 8: User consent storage + retrieval
- [ ] Day 9: OIDC discovery endpoint
- [ ] Day 10: JWKS endpoint for public keys

**Deliverable**: OIDC-compliant SSO with consent flow

---

### Week 3: Management & Security (Days 11-15)
**Goal**: Admin tools and security features

- [ ] Day 11: Token introspection endpoint
- [ ] Day 12: Token revocation endpoint
- [ ] Day 13: Admin UI for OAuth client management
- [ ] Day 14: Scope-based access control
- [ ] Day 15: Security hardening + rate limiting

**Deliverable**: Complete OAuth2 management system

---

### Week 4: Testing & Documentation (Days 16-20)
**Goal**: Production readiness

- [ ] Day 16-17: End-to-end testing
- [ ] Day 18: Integration documentation
- [ ] Day 19: Example implementations
- [ ] Day 20: Version 5.0.0 release

**Deliverable**: Production-ready OAuth2/OIDC system

---

## 🔧 Technical Dependencies

### NPM Packages to Install:
```bash
# Already have jsonwebtoken from Phase 1
# May need to add:
npm install jose  # Modern JWT library with better TS support (optional)
```

### RSA Key Pair Generation:
```bash
# Generate private key (2048-bit RSA)
openssl genrsa -out keys/private.pem 2048

# Extract public key
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# For JWKS, we need the key in JWK format
# This will be handled programmatically in Node.js
```

### Environment Variables:
```bash
# JWT Configuration
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ISSUER=https://sso.doneisbetter.com
JWT_KEY_ID=sso-2025

# OAuth2 Configuration
OAUTH2_AUTHORIZATION_CODE_LIFETIME=600     # 10 minutes
OAUTH2_ACCESS_TOKEN_LIFETIME=3600          # 1 hour
OAUTH2_REFRESH_TOKEN_LIFETIME=2592000      # 30 days
OAUTH2_CONSENT_TTL=31536000                # 1 year
```

---

## 🎨 Scope Definitions

Standard scopes to implement:

| Scope | Description | Claims Included |
|-------|-------------|-----------------|
| `openid` | Required for OIDC | sub |
| `profile` | User profile info | name, picture, updated_at |
| `email` | Email access | email, email_verified |
| `read:cards` | Read card data (narimato-specific) | - |
| `write:cards` | Modify card data | - |
| `read:rankings` | View rankings | - |

---

## 🔒 Security Considerations

### 1. PKCE (Proof Key for Code Exchange)
- **Required** for all clients (public and confidential)
- Prevents authorization code interception attacks
- Use SHA-256 for code_challenge_method

### 2. State Parameter
- **Required** for CSRF protection in OAuth flow
- Client generates random state, validates on callback

### 3. Refresh Token Rotation
- Issue new refresh token on each use
- Revoke entire token family if old token reused (replay detection)

### 4. Token Hashing
- Store refresh tokens as SHA-256 hashes
- Never log or expose raw tokens

### 5. Client Secret
- Hash with bcrypt before storage
- Show once on creation, never again

### 6. Redirect URI Validation
- Exact match required (no wildcards)
- Prevents open redirect vulnerabilities

---

## 📈 Success Metrics

Phase 2 is complete when:
- [ ] narimato.com can authenticate users via OAuth2
- [ ] JWT tokens issued and validated correctly
- [ ] OIDC discovery endpoint working
- [ ] Refresh tokens rotate on use
- [ ] User consent flow functional
- [ ] Admin can manage OAuth clients
- [ ] All endpoints have rate limiting
- [ ] Integration documentation complete
- [ ] Build passes without errors
- [ ] Security Score: 75% → 95%

---

## 🚀 Quick Start (After Phase 2)

### For Client Apps (narimato.com):

1. **Register OAuth Client**:
   - Login to SSO admin
   - Create OAuth client
   - Save client_id and client_secret

2. **Implement OAuth Flow**:
   ```javascript
   // Redirect to authorize
   window.location = 'https://sso.doneisbetter.com/oauth/authorize?' +
     'client_id=narimato&' +
     'redirect_uri=https://narimato.com/callback&' +
     'response_type=code&' +
     'scope=openid profile email read:cards&' +
     'state=' + generateRandomState() + '&' +
     'code_challenge=' + generateCodeChallenge() +
     '&code_challenge_method=S256'
   ```

3. **Exchange Code for Token**:
   ```javascript
   const response = await fetch('https://sso.doneisbetter.com/oauth/token', {
     method: 'POST',
     body: JSON.stringify({
       grant_type: 'authorization_code',
       code: authorizationCode,
       redirect_uri: 'https://narimato.com/callback',
       client_id: 'narimato',
       client_secret: 'YOUR_CLIENT_SECRET',
       code_verifier: codeVerifier
     })
   })
   ```

---

## 📚 Resources

- **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749
- **PKCE RFC**: https://tools.ietf.org/html/rfc7636
- **OIDC Core**: https://openid.net/specs/openid-connect-core-1_0.html
- **JWT RFC**: https://tools.ietf.org/html/rfc7519
- **JWKS RFC**: https://tools.ietf.org/html/rfc7517

---

**Last Updated**: 2025-10-02T12:27:01.000Z
**Status**: Planning Complete - Ready to Begin Implementation
