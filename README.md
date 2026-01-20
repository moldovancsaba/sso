# SSO Service — Production-Ready Authentication with Advanced Security

Version: 5.30.0
Last updated: 2026-01-20T12:00:00.000Z

A production-ready OAuth2/OIDC authentication server for sso.doneisbetter.com with comprehensive security and user-friendly authentication options:
- **OAuth2/OIDC**: Authorization Code Flow with PKCE, JWT access tokens (RS256), refresh token rotation
- **Multiple authentication methods**: Password, Forgot Password, Magic Links, PIN verification, Social Login (Facebook, Google)
- **3-Role Permission System**: Simplified role hierarchy (none, user, admin) across all applications
- **Multi-App Authorization**: Centralized SSO with per-app permissions
- **Enterprise Security**: Rate limiting, CSRF protection, audit logging, session management
- **Developer-Friendly**: Complete OAuth2/OIDC compliance with comprehensive documentation

---

## ✨ Key Features

### 🔐 OAuth2/OIDC Server (Production Ready)
- **Standards Compliant**: Full OAuth 2.0 + OpenID Connect implementation
- **Authorization Code Flow**: With optional PKCE (configurable per client)
- **JWT Tokens**: RS256-signed access tokens with JWKS endpoint
- **Refresh Token Rotation**: Automatic rotation on every use for enhanced security
- **Complete Scopes Support**: `openid`, `profile`, `email`, `offline_access`, `roles`
- **Nonce Support**: Full OIDC nonce parameter support for replay attack prevention
- **Discovery Endpoints**: `/.well-known/openid-configuration` and `/.well-known/jwks.json`

### 👥 Simplified 3-Role System (Updated: 2026-01-20)
**Unified across all applications:**
- **`none`** - No access to the application
- **`user`** - Standard user access (read data, create own content)
- **`admin`** - Full administrative access (all permissions, manage users, app settings)

**Migration Complete:** All legacy roles (`super-admin`, `owner`, `superadmin`) consolidated to `admin`.

### 🎯 Multi-App Permission Management
- **Centralized SSO**: Single sign-on across all integrated applications
- **Per-App Authorization**: Users have different roles in different apps
- **Admin Approval Workflow**: New users request access, admins grant with specific role
- **Real-Time Sync**: Permission changes reflected immediately across apps
- **Comprehensive Audit Trail**: All permission changes logged with before/after state

### 🔒 Enterprise-Grade Security (5 Layers)
1. **Rate Limiting**: Brute force protection (3 attempts/15min for admin)
2. **Security Headers**: HSTS, CSP, X-Frame-Options, X-XSS-Protection, etc.
3. **Input Validation**: Zod schemas, HTML sanitization, filename sanitization
4. **Session Security**: 4-hour sessions, device fingerprinting, sliding expiration
5. **Audit Logging**: Complete audit trail in MongoDB for SOC 2/GDPR compliance

### 🚀 Authentication Methods
- **Email + Password**: bcrypt-hashed (12 rounds), minimum 8 characters
- **Magic Links**: Passwordless authentication via email (15-minute expiry)
- **Social Login**: Facebook and Google OAuth (Apple coming soon)
- **PIN Verification**: 6-digit PIN on 5th-10th login for enhanced security
- **Forgot Password**: Secure password reset via email

### 🔗 Account Linking
- **One Person, One Account**: Multiple login methods linked to single email
- **Automatic Linking**: Social and password logins automatically link by email
- **Manual Unlinking**: Users can remove login methods (prevents lockout with 2+ method requirement)
- **Cross-Method Security**: Email verification inherited across linked methods

---

## 📚 Documentation for Developers

### For Third-Party Integrators
**[→ docs/THIRD_PARTY_INTEGRATION_GUIDE.md](docs/THIRD_PARTY_INTEGRATION_GUIDE.md)**
Complete guide for integrating your application with SSO:
- OAuth2/OIDC flow implementation (with PKCE)
- Cookie-based SSO for subdomains
- Social login integration
- Code examples and best practices

### For Internal Teams
**[→ ARCHITECTURE.md](ARCHITECTURE.md)**
Technical architecture, database schemas, security layers, API reference

**[→ docs/MULTI_APP_PERMISSIONS.md](docs/MULTI_APP_PERMISSIONS.md)**
Multi-app permission system design and implementation

**[→ ROLE_SYSTEM_MIGRATION.md](ROLE_SYSTEM_MIGRATION.md)**
Role system consolidation details and migration guide

---

## 🚀 Quick Start

### Environment Variables

Required environment variables (`.env.local` or Vercel):

```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=sso

# Security
SESSION_SECRET=<generate with: openssl rand -base64 32>
CSRF_SECRET=<optional, falls back to SESSION_SECRET>

# SSO Configuration
SSO_COOKIE_DOMAIN=.doneisbetter.com
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com,https://yourapp.com

# Session Configuration
ADMIN_SESSION_COOKIE=admin-session
PUBLIC_SESSION_COOKIE=public-session

# Email (for password reset, magic links)
EMAIL_PROVIDER=resend  # or 'nodemailer'
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@doneisbetter.com

# Optional: Rate Limiting
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=900000  # 15 minutes in ms

# Optional: Social Login
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/facebook/callback

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/google/callback
```

### Installation

```bash
npm install
npm run dev
```

### Create First Admin User

```bash
# Option 1: Bootstrap endpoint (one-time use)
curl -X POST https://sso.doneisbetter.com/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-secure-password","name":"Admin User"}'

# Option 2: Magic link (development)
node scripts/generate-magic-link.mjs
```

---

## 📖 API Endpoints

### OAuth2/OIDC Endpoints (Public)

#### Authorization
```http
GET /authorize
GET /api/oauth/authorize

Query Parameters:
- response_type: "code" (required)
- client_id: OAuth client UUID (required)
- redirect_uri: Callback URL (required)
- scope: Space-separated scopes (required)
  Available: openid, profile, email, offline_access, roles
- state: CSRF token (required)
- nonce: Replay attack prevention (required for OIDC)
- code_challenge: PKCE challenge (optional, configurable per client)
- code_challenge_method: "S256" or "plain"
- prompt: "none" | "login" | "consent" | "select_account" (optional)
```

#### Token Exchange
```http
POST /token
POST /api/oauth/token

Body (Authorization Code):
{
  "grant_type": "authorization_code",
  "code": "authorization-code",
  "redirect_uri": "https://yourapp.com/callback",
  "client_id": "client-uuid",
  "client_secret": "client-secret",
  "code_verifier": "pkce-verifier"  // if PKCE used
}

Body (Refresh Token):
{
  "grant_type": "refresh_token",
  "refresh_token": "refresh-token",
  "client_id": "client-uuid",
  "client_secret": "client-secret"
}

Response:
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new-refresh-token",
  "id_token": "eyJhbGci...",
  "scope": "openid profile email roles"
}
```

#### Token Revocation
```http
POST /api/oauth/revoke

Body:
{
  "token": "refresh-token",
  "token_type_hint": "refresh_token",
  "client_id": "client-uuid",
  "client_secret": "client-secret"
}
```

#### User Info
```http
GET /userinfo
GET /api/oauth/userinfo

Headers:
Authorization: Bearer <access_token>

Response:
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "email_verified": true,
  "picture": "https://...",
  "user_type": "public",
  "role": "user"  // if 'roles' scope requested
}
```

#### Discovery & JWKS
```http
GET /.well-known/openid-configuration
GET /.well-known/jwks.json
```

#### Logout
```http
GET /api/oauth/logout?post_logout_redirect_uri=https://yourapp.com
```

---

### Admin Endpoints (Protected)

#### OAuth Client Management
```http
GET    /api/admin/oauth-clients              # List clients
POST   /api/admin/oauth-clients              # Create client (admin only)
GET    /api/admin/oauth-clients/:id          # Get client details
PATCH  /api/admin/oauth-clients/:id          # Update client (admin only)
DELETE /api/admin/oauth-clients/:id          # Delete client (admin only)
POST   /api/admin/oauth-clients/:id/regenerate-secret  # Regenerate secret (admin only)
```

#### User Management
```http
GET    /api/admin/users                      # List all users
POST   /api/admin/users                      # Create admin user (admin only)
GET    /api/admin/users/:id                  # Get user details
PATCH  /api/admin/users/:id                  # Update user (admin only)
DELETE /api/admin/users/:id                  # Delete user (admin only)
```

#### App Permission Management
```http
GET    /api/admin/users/:userId/apps/:clientId/permissions  # Get permission
PUT    /api/admin/users/:userId/apps/:clientId/permissions  # Grant/update (admin only)
DELETE /api/admin/users/:userId/apps/:clientId/permissions  # Revoke (admin only)
```

#### Audit Logs
```http
GET    /api/admin/audit-logs                 # Query audit logs (admin only)
```

---

### Public User Endpoints

```http
POST   /api/public/register                  # Create account
POST   /api/public/login                     # Email+password login
POST   /api/public/logout                    # Logout
GET    /api/public/session                   # Check session status
GET    /api/public/validate                  # Validate session (for subdomain SSO)
POST   /api/public/request-magic-link        # Request passwordless login
GET    /api/public/magic-login               # Consume magic link
POST   /api/public/forgot-password           # Request password reset
POST   /api/public/verify-pin                # Verify 6-digit PIN
PATCH  /api/public/profile                   # Update profile
POST   /api/public/change-password           # Change password
DELETE /api/public/account                   # Delete account
GET    /api/public/authorizations            # List connected OAuth apps
DELETE /api/public/authorizations/:id        # Revoke app access
```

---

### Social Login Endpoints

```http
GET    /api/auth/facebook/login              # Initiate Facebook OAuth
GET    /api/auth/facebook/callback           # Facebook callback

GET    /api/auth/google/login                # Initiate Google Sign-In
GET    /api/auth/google/callback             # Google callback
```

---

## 🎯 OAuth2 Scopes

| Scope | Description | Claims Included |
|-------|-------------|-----------------|
| `openid` | Required for OIDC | sub (user UUID) |
| `profile` | User profile information | name, picture, updated_at, user_type, role |
| `email` | Email address | email, email_verified |
| `offline_access` | Refresh token | - |
| `roles` | User role information | role (in profile if requested) |

**Note:** The `roles` scope includes the user's role in the `id_token` and `/userinfo` response. Role values: `user`, `admin`.

---

## 🔑 ID Token Claims

When `openid` scope is requested, the ID token includes:

```json
{
  "iss": "https://sso.doneisbetter.com",
  "sub": "user-uuid",
  "aud": "client-id",
  "exp": 1737468000,
  "iat": 1737464400,
  "nonce": "client-provided-nonce",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "picture": "https://...",
  "user_type": "public",
  "role": "user"
}
```

---

## 🛠️ Developer Tools

### Generate Magic Link (Development)
```bash
# Set environment variables
export MONGODB_URI="..."
export ADMIN_MAGIC_SECRET="your-secret"
export SSO_BASE_URL="https://sso.doneisbetter.com"
export NEW_MAGIC_EMAIL="admin@example.com"

# Generate link
node scripts/generate-magic-link.mjs

# Output: { url: "https://...", expiresAt: "..." }
```

### Dev Bypass (Development Only)
```bash
# In .env.local
ADMIN_DEV_BYPASS=true

# Visit /admin and enter email only (no password required)
# Hard-disabled in production
```

---

## 🔒 Security

### Authentication
- **Password Hashing**: bcrypt with 12 rounds
- **Session Management**: Server-side with MongoDB, HttpOnly cookies
- **Device Fingerprinting**: SHA-256 of IP + User-Agent
- **Session Timeout**: 4 hours for admin, 30 days for public (sliding)

### Authorization
- **3-Role System**: none, user, admin
- **Per-App Permissions**: Centralized SSO, distributed authorization
- **Admin Checks**: Every protected endpoint validates role
- **Audit Logging**: All permission changes logged

### Security Headers (All Routes)
```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: ...
Permissions-Policy: camera=(), microphone=(), geolocation=(), ...
```

### Rate Limiting
- **Admin Login**: 3 attempts per 15 minutes
- **Public Login**: 5 attempts per 15 minutes
- **Admin Mutations**: 20 requests per minute
- **Admin Queries**: 100 requests per minute

### OIDC Security
- **PKCE Support**: S256 or plain, configurable per client
- **State Validation**: CSRF protection required
- **Nonce Support**: Replay attack prevention
- **Token Rotation**: Refresh tokens rotated on every use
- **Signature Verification**: RS256 with JWKS

---

## 📊 Deployment

### Hosting: Vercel
- **Production**: https://sso.doneisbetter.com
- **Database**: MongoDB Atlas
- **Environment Variables**: Set in Vercel Project Settings

### Required Secrets
1. `MONGODB_URI` - MongoDB connection string
2. `SESSION_SECRET` - Session encryption key
3. `ADMIN_MAGIC_SECRET` - Magic link signing secret (optional)
4. Social login credentials (optional)

### Deployment Checklist
- [ ] All environment variables set in Vercel
- [ ] MongoDB IP allowlist updated
- [ ] CORS origins configured (`SSO_ALLOWED_ORIGINS`)
- [ ] Email provider configured (Resend or Nodemailer)
- [ ] Admin user created via bootstrap or magic link
- [ ] OAuth clients registered for integrated apps
- [ ] Security headers verified
- [ ] Rate limiting tested

---

## 🧪 Testing OAuth Integration

### Test Authorization Flow
```bash
# Generate PKCE challenge
code_verifier=$(openssl rand -base64 32 | tr -d '=' | tr '+/' '-_')
code_challenge=$(echo -n "$code_verifier" | openssl dgst -binary -sha256 | openssl base64 | tr -d '=' | tr '+/' '-_')

# Visit authorization URL (in browser)
https://sso.doneisbetter.com/authorize?\
  response_type=code&\
  client_id=YOUR_CLIENT_ID&\
  redirect_uri=https://yourapp.com/callback&\
  scope=openid%20profile%20email%20roles&\
  state=random-state-value&\
  nonce=random-nonce-value&\
  code_challenge=$code_challenge&\
  code_challenge_method=S256

# After redirect, exchange code for tokens
curl -X POST https://sso.doneisbetter.com/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE",
    "redirect_uri": "https://yourapp.com/callback",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "code_verifier": "'$code_verifier'"
  }'

# Verify ID token at https://jwt.io
```

---

## 📝 Change Log

### v5.30.0 (2026-01-20) - Role System Consolidation & OIDC Compliance
**BREAKING CHANGES:**
- **3-Role System**: All roles consolidated to `none`, `user`, `admin`
  - Removed: `super-admin`, `owner`, `superadmin`
  - Migration: All previous admin variants → `admin`
- **OIDC Compliance**: Added full `nonce` parameter support
- **Scopes Update**: Added `roles` scope to SCOPE_DEFINITIONS

**New Features:**
- Full nonce support across authorization flow
- Simplified permission checks (single `admin` role)
- Updated admin UI to reflect 3-role system

**Fixed:**
- `invalid_scope` error when requesting `roles` scope
- `invalid_nonce` error due to missing nonce in ID tokens
- Blank `/authorize` page (added Next.js rewrites)

**Documentation:**
- Complete rewrite of THIRD_PARTY_INTEGRATION_GUIDE.md
- Updated README.md with current features and API
- Created ROLE_SYSTEM_MIGRATION.md

### v5.29.0 (2025-12-21) - Enterprise Security Hardening
- 5-layer security architecture
- Comprehensive audit logging
- Account linking and unlinking
- Session device fingerprinting

### v5.24.0 (2025-11-10) - Multi-App Permissions
- Centralized app permission management
- Per-app role assignment
- Admin approval workflow

### v5.0.0 (2025-10-02) - OAuth2/OIDC Foundation
- Full OAuth 2.0 + OIDC implementation
- PKCE support
- JWT access tokens with RS256
- Refresh token rotation

---

## 🆘 Support & Resources

- **Admin Portal**: https://sso.doneisbetter.com/admin
- **User Account**: https://sso.doneisbetter.com/account
- **Documentation**: `/docs` directory
- **OAuth 2.0 RFC**: https://tools.ietf.org/html/rfc6749
- **PKCE RFC**: https://tools.ietf.org/html/rfc7636
- **OIDC Core**: https://openid.net/specs/openid-connect-core-1_0.html
- **OIDC Discovery**: https://openid.net/specs/openid-connect-discovery-1_0.html

---

## 📄 License

Proprietary - Done Is Better

---

**Production Status**: ✅ Ready  
**Last Major Update**: 2026-01-20 (Role System Consolidation)  
**Maintainer**: Done Is Better Team
