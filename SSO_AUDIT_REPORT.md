# SSO Service Security Audit & Production Readiness Report

**Document**: SSO_AUDIT_REPORT.md  
**Version**: 4.7.0  
**Audit Date**: 2025-10-02T11:20:00.000Z  
**Auditor**: AI Security Review  
**Target Deployment**: sso.doneisbetter.com  
**Client Applications**:
- cardmass.doneisbetter.com
- playmass.doneisbetter.com
- narimato.com
- Other doneisbetter.com subdomains

---

## Executive Summary

The current SSO service is a **custom authentication system** with admin-focused features. It is **NOT READY** for production SSO use across multiple applications without significant architectural changes. The system lacks standard SSO protocols (OAuth2/OIDC), has critical cross-domain limitations, and requires substantial security hardening.

**Risk Level**: 🔴 **HIGH** - Not production-ready for true SSO

**Estimated Development Time**: 4-6 weeks for production-grade SSO

---

## Critical Weaknesses

### 🔴 1. **No Standard SSO Protocol Implementation**

**Current State:**
- Custom cookie-based authentication system
- No OAuth2 or OpenID Connect (OIDC) implementation
- No authorization code flow, implicit flow, or PKCE support
- No standardized token format (uses custom base64 JSON)

**Impact:**
- Cannot integrate with standard OAuth2 clients
- No industry-standard security patterns
- Client apps must use custom integration code
- Difficult to audit and verify security compliance

**Required:**
- Implement OAuth2 Authorization Code Flow with PKCE
- Add OpenID Connect (OIDC) ID tokens with JWT format
- Support standard scopes (openid, profile, email)
- Implement token introspection endpoint
- Add discovery endpoint (/.well-known/openid-configuration)

---

### 🔴 2. **Cookie Domain Limitations (Cross-Domain Sessions)**

**Current State:**
```javascript
// lib/auth.mjs lines 51-60
const attrs = [
  `${COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Lax',
  `Max-Age=${maxAgeSeconds}`,
]
// NO Domain attribute set!
```

**Critical Issues:**
- **No `Domain` attribute**: Cookie is bound to exact domain (sso.doneisbetter.com)
- Cannot share sessions with `cardmass.doneisbetter.com` or `playmass.doneisbetter.com`
- **SameSite=Lax**: Prevents cross-site POST requests (breaks SSO flows)
- **Impossible to support `narimato.com`**: Different root domain, cookies cannot be shared

**Why This Breaks SSO:**
1. User logs in at sso.doneisbetter.com → cookie set for sso.doneisbetter.com
2. User navigates to cardmass.doneisbetter.com → cookie NOT sent (wrong domain)
3. cardmass calls `/api/sso/validate` → 401 Unauthorized (no cookie)
4. User forced to log in again at each subdomain

**Required:**
- **For subdomains**: Set `Domain=.doneisbetter.com` to share across all subdomains
- **For external domains (narimato.com)**: MUST use OAuth2 with JWT tokens (not cookies)
- Change `SameSite=None` for cross-origin SSO (requires HTTPS and Secure flag)
- Implement token-based authentication instead of cookies for true SSO

---

### 🔴 3. **No OAuth2 Token-Based Authentication**

**Current State:**
- Only cookie-based sessions exist
- No access tokens, refresh tokens, or ID tokens
- No JWT implementation
- Session validation requires cookie (breaks cross-domain)

**Required for True SSO:**
```javascript
// What clients need:
const response = await fetch('https://sso.doneisbetter.com/oauth/token', {
  method: 'POST',
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: 'cardmass',
    client_secret: '...',
    redirect_uri: 'https://cardmass.doneisbetter.com/callback',
    code_verifier: pkceVerifier
  })
});

// Response should be:
{
  access_token: "eyJhbGc...", // JWT
  refresh_token: "...",
  id_token: "eyJhbGc...", // OIDC ID token
  token_type: "Bearer",
  expires_in: 3600
}
```

**Missing Endpoints:**
- `GET /oauth/authorize` - Authorization endpoint
- `POST /oauth/token` - Token endpoint
- `POST /oauth/revoke` - Token revocation
- `GET /oauth/userinfo` - User info endpoint (OIDC)
- `POST /oauth/introspect` - Token introspection
- `GET /.well-known/openid-configuration` - Discovery document

---

### 🟡 4. **CORS Configuration Gaps**

**Current State (lib/cors.mjs):**
```javascript
export function runCors(req, res) {
  const allowed = (process.env.SSO_ALLOWED_ORIGINS || '...')
    .split(',').map(s => s.trim()).filter(Boolean)
  
  const origin = req.headers.origin || ''
  const allowOrigin = allowed.includes('*') || allowed.includes(origin) 
    ? origin : allowed[0] || '*'
  
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}
```

**Issues:**
- Fallback to `allowed[0]` breaks multi-origin setups
- No origin validation (allows wildcard if configured)
- `Access-Control-Allow-Credentials: true` with wildcard origin is invalid
- Missing `Access-Control-Expose-Headers` for custom headers

**Required:**
- Strict origin validation (no wildcards with credentials)
- Explicit allowlist for each client app
- Add `Access-Control-Max-Age` for preflight caching
- Implement proper error responses for disallowed origins

---

### 🔴 5. **No CSRF Protection**

**Current State:**
- No CSRF tokens implemented
- No state parameter validation in auth flows
- Cookie-based auth without anti-CSRF measures
- `SameSite=Lax` provides partial protection but is insufficient

**Vulnerability:**
```html
<!-- Malicious site could trigger actions -->
<img src="https://sso.doneisbetter.com/api/admin/users/delete/uuid-123" />
```

**Required:**
- Implement CSRF tokens for all state-changing operations
- Add `state` parameter to OAuth2 flows for CSRF protection
- Use double-submit cookie pattern or synchronizer tokens
- Implement `Origin` and `Referer` header validation

---

### 🟡 6. **Session/Token Security Gaps**

**Current Issues:**

1. **No Token Rotation:**
   - Session tokens never rotate
   - 7-day lifetime without refresh mechanism
   - Stolen tokens remain valid until expiration

2. **No Token Revocation:**
   - No way to invalidate sessions server-side
   - Logout only clears client cookie (token still valid if stolen)
   - No token blacklist or revocation list

3. **Weak Token Format:**
   ```javascript
   // Current token (base64 JSON):
   {
     token: "random-hex-64-chars",
     expiresAt: "2025-10-09T11:20:00.000Z",
     userId: "uuid",
     role: "admin"
   }
   ```
   - Not cryptographically signed (base64 is encoding, not signing)
   - Can be decoded by anyone (not encrypted)
   - No signature verification
   - Vulnerable to tampering if cookie is stolen

4. **No Rate Limiting:**
   - Login endpoint has basic delay (800ms) but no rate limiting
   - No account lockout after failed attempts
   - Vulnerable to brute force attacks

**Required:**
- Implement JWT with RS256 or ES256 signing
- Add refresh token rotation
- Implement server-side session/token revocation
- Add Redis/MongoDB-based session store with invalidation
- Implement rate limiting (express-rate-limit or similar)
- Add account lockout after N failed login attempts

---

### 🟡 7. **Password/Token Management Issues**

**Current Convention:**
- Passwords are 32-hex tokens (MD5-style) stored in plaintext
- No bcrypt, no hashing, no salting
- Justified as "tokens not passwords" but still a security risk

```javascript
// lib/users.mjs - passwords stored as plaintext!
password: user.password, // 32-hex token
```

**Issues:**
- If database is compromised, all passwords are exposed
- No defense in depth
- Violates security best practices

**Mitigation:**
- Even for "tokens," consider hashing with bcrypt or Argon2
- Or migrate to proper OAuth2 client credentials
- Implement secret rotation mechanism

---

### 🔴 8. **Multi-Tenant Isolation Incomplete**

**Current State:**
- Organizations and orgUsers collections exist
- BUT no OAuth2 client registration
- No per-app scopes or permissions
- No consent flow for users

**For SSO to work:**
Each client app (cardmass, playmass, narimato) needs:
1. **Client ID** and **Client Secret**
2. **Registered redirect URIs**
3. **Allowed scopes** (e.g., `read:profile`, `write:cards`)
4. **User consent screen** ("CardMass wants to access your profile")
5. **Per-app user context** (user may have different roles per app)

**Required:**
- Create `oauthClients` collection with:
  ```javascript
  {
    client_id: 'cardmass',
    client_secret: 'hashed-secret',
    redirect_uris: ['https://cardmass.doneisbetter.com/auth/callback'],
    allowed_scopes: ['openid', 'profile', 'email', 'read:cards'],
    grant_types: ['authorization_code', 'refresh_token'],
  }
  ```
- Implement consent flow UI
- Add scope-based access control
- Link orgUsers to OAuth clients for per-app permissions

---

### 🟡 9. **Logout Propagation Missing**

**Current State:**
- Logout only clears local cookie
- No way to logout from all apps simultaneously
- No back-channel logout or front-channel logout

**For True SSO:**
- User logs out from cardmass → should logout from playmass too
- Requires OIDC Back-Channel Logout or Front-Channel Logout
- Needs logout token propagation to all clients

**Required:**
- Implement OIDC Logout (RP-Initiated Logout)
- Add back-channel logout endpoint
- Maintain list of active sessions per user
- Implement logout notification mechanism

---

### 🟡 10. **No Audit Logging**

**Current State:**
- Basic console.error logging only
- No audit trail for:
  - Login attempts (success/failure)
  - Token generation
  - User creation/deletion
  - Permission changes
  - Session invalidation

**Required for Production:**
- Implement structured logging (Winston, Pino, or similar)
- Log all authentication events with timestamps
- Store security events in MongoDB for compliance
- Add monitoring and alerting for suspicious activity
- Implement log retention policy

---

## Architecture Comparison

### Current System (Custom Auth)
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ Cookie: admin-session=base64(...)
       ▼
┌─────────────────────────────┐
│  sso.doneisbetter.com       │
│  ┌─────────────────────┐    │
│  │ /api/admin/login    │    │
│  │ /api/sso/validate   │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
       │
       ▼
┌─────────────┐
│  MongoDB    │
│  - users    │
└─────────────┘

❌ Problem: Cookie cannot be shared with other domains
```

### Required System (OAuth2 + OIDC)
```
┌──────────────────────────────────────────────┐
│              User's Browser                   │
└────────┬────────────────┬────────────────────┘
         │                │
         ▼                ▼
┌─────────────────┐  ┌──────────────────────┐
│ cardmass.       │  │ playmass.            │
│ doneisbetter.com│  │ doneisbetter.com     │
└────────┬────────┘  └───────┬──────────────┘
         │                   │
         │  1. Redirect to authorize
         ▼                   ▼
    ┌────────────────────────────────────┐
    │   sso.doneisbetter.com (SSO)       │
    │                                     │
    │  /oauth/authorize                  │
    │  /oauth/token                      │
    │  /oauth/userinfo                   │
    │  /.well-known/openid-configuration │
    └────────────────────────────────────┘
         │
         ▼
    ┌────────────┐
    │  MongoDB   │
    │  - users   │
    │  - clients │
    │  - tokens  │
    └────────────┘

✅ Clients receive JWT tokens (not cookies)
✅ Tokens work across any domain
✅ Standard protocol (OAuth2/OIDC)
```

---

## Recommended Implementation Roadmap

### Phase 1: Critical Security Hardening (Week 1-2)
**Priority: P0 - Must have before ANY production use**

1. **Implement CSRF Protection**
   - Add CSRF token generation and validation
   - Implement double-submit cookie pattern
   - Validate Origin/Referer headers

2. **Add Rate Limiting**
   - Install and configure express-rate-limit
   - Add per-IP rate limits on /api/admin/login
   - Implement account lockout after failed attempts

3. **Enhance Cookie Security for Subdomains**
   - Add `Domain=.doneisbetter.com` to cookie attributes
   - Change `SameSite=None; Secure` for production
   - Test cookie sharing across cardmass/playmass subdomains

4. **Implement Session Revocation**
   - Create `adminSessions` collection in MongoDB
   - Store active sessions with token hash
   - Implement server-side session invalidation on logout
   - Add session cleanup job for expired sessions

5. **Add Security Logging**
   - Install Winston or Pino for structured logging
   - Log all login attempts (success/failure)
   - Log session creation/revocation
   - Store security events in MongoDB

**Deliverables:**
- CSRF middleware implemented
- Rate limiting active on auth endpoints
- Cookies work across *.doneisbetter.com subdomains
- Session revocation functional
- Security audit logs captured

---

### Phase 2: OAuth2 Foundation (Week 3-4)
**Priority: P1 - Required for external domain support (narimato.com)**

1. **OAuth2 Client Registration**
   - Create `oauthClients` collection
   - Add client CRUD endpoints (admin-only)
   - Implement client_id/client_secret generation
   - Store redirect URIs per client

2. **Authorization Endpoint**
   - Implement `/oauth/authorize` with:
     - Authorization code generation
     - State parameter validation (CSRF)
     - PKCE support (code_challenge, code_challenge_method)
     - User consent screen UI

3. **Token Endpoint**
   - Implement `/oauth/token` with:
     - Authorization code grant
     - Refresh token grant
     - Client authentication
     - JWT access token generation (RS256)

4. **JWT Implementation**
   - Generate RSA key pair for signing
   - Implement JWT token generation (access tokens)
   - Add token validation middleware
   - Store refresh tokens in MongoDB

5. **Discovery Endpoint**
   - Implement `/.well-known/openid-configuration`
   - Document supported grant types, scopes, endpoints

**Deliverables:**
- OAuth2 client registration working
- Authorization code flow functional
- JWT tokens issued and validated
- Discovery document available
- narimato.com can authenticate via OAuth2

---

### Phase 3: OIDC & User Management (Week 5)
**Priority: P2 - Enhanced SSO features**

1. **OpenID Connect ID Tokens**
   - Add ID token generation (JWT with user claims)
   - Implement `/oauth/userinfo` endpoint
   - Add standard OIDC claims (sub, name, email, picture)

2. **Scope-Based Access Control**
   - Implement scope validation in token endpoint
   - Add scope-based permission checks
   - Create scope management UI in admin

3. **User Consent Flow**
   - Build consent screen UI
   - Store user consent decisions
   - Allow users to revoke app access

4. **Refresh Token Rotation**
   - Implement refresh token rotation on use
   - Add refresh token expiration (30 days)
   - Implement refresh token family tracking

**Deliverables:**
- OIDC-compliant ID tokens
- Scope system functional
- User consent UI deployed
- Refresh tokens rotating securely

---

### Phase 4: Advanced Features (Week 6)
**Priority: P3 - Production polish**

1. **Logout Propagation**
   - Implement OIDC RP-Initiated Logout
   - Add back-channel logout endpoint
   - Test logout across all client apps

2. **Token Introspection & Revocation**
   - Implement `/oauth/introspect` endpoint
   - Implement `/oauth/revoke` endpoint
   - Add token revocation UI in admin

3. **Monitoring & Analytics**
   - Add Prometheus metrics or similar
   - Track login success/failure rates
   - Monitor token issuance rates
   - Set up alerts for suspicious activity

4. **Documentation & Integration Guides**
   - Write OAuth2 integration guide for client apps
   - Create Postman collection for testing
   - Document error codes and troubleshooting

**Deliverables:**
- Logout works across all apps
- Token introspection/revocation functional
- Monitoring dashboard deployed
- Complete integration documentation

---

## Immediate Action Items (This Week)

### 🔴 Critical (Do First)
1. **Add CSRF Protection**
   ```bash
   npm install csurf
   # Implement CSRF middleware in all state-changing endpoints
   ```

2. **Fix Cookie Domain for Subdomains**
   ```javascript
   // lib/auth.mjs - setAdminSessionCookie()
   const domain = process.env.SSO_COOKIE_DOMAIN || '.doneisbetter.com'
   attrs.push(`Domain=${domain}`)
   attrs.push('SameSite=None') // Required for cross-site
   ```

3. **Add Rate Limiting**
   ```bash
   npm install express-rate-limit
   # Add to /api/admin/login endpoint
   ```

4. **Implement Session Revocation**
   - Create `adminSessions` collection
   - Store session hash on login
   - Check session validity on validate
   - Delete session on logout

### 🟡 Important (This Sprint)
5. **Document Current Limitations**
   - Update README with "Not for production SSO yet"
   - List supported vs. unsupported scenarios

6. **Plan OAuth2 Migration**
   - Choose OAuth2 library (node-oauth2-server, oauth2orize)
   - Design database schema for clients and tokens
   - Create migration timeline

---

## Environment Variables to Add

```bash
# Cookie domain for subdomain sharing
SSO_COOKIE_DOMAIN=.doneisbetter.com

# JWT signing keys (generate with: openssl genrsa -out private.pem 2048)
JWT_PRIVATE_KEY_PATH=/path/to/private.pem
JWT_PUBLIC_KEY_PATH=/path/to/public.pem
JWT_ISSUER=https://sso.doneisbetter.com
JWT_AUDIENCE=doneisbetter-apps

# OAuth2 configuration
OAUTH2_AUTHORIZATION_CODE_LIFETIME=600  # 10 minutes
OAUTH2_ACCESS_TOKEN_LIFETIME=3600       # 1 hour
OAUTH2_REFRESH_TOKEN_LIFETIME=2592000   # 30 days

# Rate limiting
RATE_LIMIT_LOGIN_MAX=5           # Max attempts per window
RATE_LIMIT_LOGIN_WINDOW=900000   # 15 minutes

# Session management
SESSION_STORE_TYPE=mongodb       # Store sessions in DB
SESSION_CLEANUP_INTERVAL=3600000 # Clean expired sessions hourly
```

---

## Testing Checklist

### Pre-Production Testing
- [ ] CSRF protection works on all POST/PUT/DELETE endpoints
- [ ] Cookies shared correctly across cardmass/playmass subdomains
- [ ] Rate limiting prevents brute force attacks
- [ ] Sessions revoked on logout (server-side validation fails)
- [ ] Security events logged to MongoDB
- [ ] CORS configuration validated for all client origins
- [ ] XSS protection tested (no user input reflected unsafely)
- [ ] MongoDB injection attempts blocked

### OAuth2 Testing (Phase 2+)
- [ ] Authorization code flow completes successfully
- [ ] PKCE code challenge validation works
- [ ] JWT tokens valid and properly signed
- [ ] Refresh token rotation functional
- [ ] Token expiration handled correctly
- [ ] Invalid tokens rejected with proper error codes

### Cross-App Testing
- [ ] Login at sso.doneisbetter.com → access cardmass without re-login
- [ ] Login at sso.doneisbetter.com → access playmass without re-login
- [ ] Login at sso.doneisbetter.com → narimato.com receives valid OAuth2 token
- [ ] Logout from cardmass → playmass session also invalidated
- [ ] Token revoked at SSO → all apps reject it immediately

---

## Compliance & Standards

### Current Compliance: ❌
- ❌ OAuth 2.0 (RFC 6749)
- ❌ OpenID Connect 1.0
- ❌ PKCE (RFC 7636)
- ❌ JWT (RFC 7519)
- ❌ Token Revocation (RFC 7009)
- ❌ Token Introspection (RFC 7662)

### Target Compliance: ✅ (After Phase 1-3)
- ✅ OAuth 2.0 Authorization Code Flow
- ✅ PKCE for public clients
- ✅ OpenID Connect Core
- ✅ JWT (RS256 signing)
- ✅ OIDC Discovery
- ✅ Token Revocation
- ✅ Back-Channel Logout

---

## Security Best Practices Checklist

### Authentication
- [ ] Passwords hashed with bcrypt/Argon2 (even "tokens")
- [ ] Multi-factor authentication (MFA) support
- [ ] Account lockout after failed attempts
- [ ] Password complexity requirements
- [ ] Secure password reset flow

### Authorization
- [ ] Principle of least privilege enforced
- [ ] Role-based access control (RBAC)
- [ ] Scope-based access control for OAuth2
- [ ] Per-resource authorization checks

### Session Management
- [ ] Secure session generation (cryptographically random)
- [ ] Session timeout (idle and absolute)
- [ ] Session revocation on logout
- [ ] Concurrent session management
- [ ] Session fixation protection

### Transport Security
- [ ] HTTPS enforced in production
- [ ] HSTS headers set
- [ ] Secure cookie flags (Secure, HttpOnly, SameSite)
- [ ] Certificate pinning considered

### Input Validation
- [ ] All inputs validated server-side
- [ ] SQL/NoSQL injection prevention
- [ ] XSS protection (Content-Security-Policy)
- [ ] CSRF protection on all state-changing operations

### Monitoring & Incident Response
- [ ] Security event logging
- [ ] Anomaly detection
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled

---

## Conclusion

### Current State Summary
The SSO service is a well-structured **admin authentication system** but is **NOT a production-ready SSO solution**. It lacks:
- Standard OAuth2/OIDC protocols
- Cross-domain session support (except same-domain subdomains)
- Token-based authentication
- Critical security features (CSRF, rate limiting, session revocation)

### Production Readiness: 30%
- ✅ Database-backed user management
- ✅ Cookie-based admin sessions
- ✅ Basic CORS support
- ✅ Magic link authentication
- ❌ OAuth2/OIDC not implemented
- ❌ Cross-domain support incomplete
- ❌ Security hardening incomplete
- ❌ No audit logging

### Recommended Path Forward

**Option 1: Quick Fix for Subdomains Only (1 week)**
- Fix cookie domain to `.doneisbetter.com`
- Add CSRF protection and rate limiting
- Implement session revocation
- **Result**: Works for cardmass/playmass, NOT for narimato.com

**Option 2: Full OAuth2 Implementation (4-6 weeks)**
- Implement complete OAuth2/OIDC stack
- Supports all domains (subdomains + external)
- Industry-standard security
- Future-proof and extensible
- **Result**: Production-ready enterprise SSO

**Recommendation**: Proceed with **Option 2** for long-term viability. Option 1 is a temporary workaround that will need to be replaced eventually.

---

**Next Steps:**
1. Review this audit with the team
2. Prioritize security fixes from Phase 1
3. Allocate resources for OAuth2 implementation (Phase 2-3)
4. Set up development timeline and milestones
5. Begin security hardening immediately

**Contact:** For questions or clarifications, consult this document and WARP.md.

---

**Last Updated**: 2025-10-02T11:20:00.000Z
