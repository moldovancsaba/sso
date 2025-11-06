# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

---

**Document**: WARP.md — SSO Service  
**Repository**: sso  
**Path**: `/Users/moldovancsaba/Projects/sso/WARP.md`  
**Version**: 5.16.0 (auto-synced from package.json via `npm run sync:version`)  
**CreatedAt (UTC)**: 2025-10-02T10:45:49.000Z  
**LastUpdated (UTC)**: 2025-11-05T10:39:12.000Z  
**Maintainer**: moldovancsaba  
**Status**: Authoritative Source of Truth  
**Sync**: `npm run sync:version` required after version changes  
**Timestamp Policy**: All timestamps are ISO 8601 UTC with milliseconds

---

## Essential Commands

**Development:**
```bash
npm run dev
```

**Build:**
```bash
npm run build
```

**Production start:**
```bash
npm start
```

**Linting:**
```bash
npm run lint
```

**Type checking:**
```bash
npm run type-check
```

**Version sync (after version bumps):**
```bash
npm run sync:version
```

**Bootstrap admin user:**
```bash
NEW_ADMIN_TOKEN=<32-hex-token> node scripts/bootstrap-admin.mjs
```

**Generate magic link for admin:**
```bash
NEW_MAGIC_EMAIL=<email> node scripts/generate-magic-link.mjs
```

**Backfill UUIDs (one-time migration):**
```bash
node tools/backfill-user-uuids.mjs
```

---

## High-Level Architecture

- **Framework**: Next.js Pages Router (no App Router) with API routes in `pages/api/`
- **Module System**: ESM modules (`package.json` has `"type": "module"`)
- **Database**: MongoDB Atlas with lazy connection pattern in `lib/db.mjs`
- **Authentication Types**:
  - **Admin Auth**: Cookie-based sessions (HttpOnly, base64 JSON tokens), 32-hex passwords
  - **Public User Auth**: Bcrypt-hashed passwords (SALT_ROUNDS=12), cookie-based sessions
  - **OAuth2/OIDC**: Authorization Code Flow with optional PKCE, JWT access tokens (RS256)
- **Collections**:
  - `users` — Admin users with UUID IDs, email, name, role ('admin'|'super-admin'), password (32-hex token)
  - `publicUsers` — Public users with UUID IDs, email, name, passwordHash (bcrypt), role ('user'), status ('active'|'invited'|'disabled')
  - `sessions` — Admin server-side sessions with token hashing (SHA-256)
  - `publicSessions` — Public user server-side sessions (sliding 30-day expiration)
  - `organizations` — Multi-tenant organizations with UUID IDs, slug, domains, status
  - `orgUsers` — Organization users with UUID IDs, orgId, email, role, status
  - `resourcePasswords` — Resource-specific passwords with 32-hex tokens, usage tracking
  - `oauthClients` — Registered OAuth2 clients with client_id, client_secret, redirect_uris, require_pkce
  - `oauthCodes` — Authorization codes with PKCE support
  - `oauthTokens` — Access and refresh tokens with rotation
  - `oauthAuthorizations` — User consent records
  - `appPermissions` — Multi-app permission system (userId, clientId, role, status)
  - `appAccessLogs` — Audit log for permission changes
  - `adminMagicTokens` / `publicMagicTokens` — Magic link authentication tokens (15-min TTL)
  - `loginPins` — 6-digit PIN verification (5-min TTL, 3 attempts max)
- **Timestamps**: All timestamps use ISO 8601 UTC with milliseconds (e.g., `2025-10-02T10:45:49.000Z`)
- **Password Conventions**:
  - **Admin users**: 32-hex tokens (MD5-style), NOT hashed
  - **Public users**: Bcrypt hashes with 12 salt rounds
- **CORS**: Controlled via `SSO_ALLOWED_ORIGINS` environment variable
- **Subdomain SSO**: Enabled via `SSO_COOKIE_DOMAIN=.doneisbetter.com`

---

## Critical Patterns

### Database Connection

**NEVER instantiate MongoClient at import time.** Use lazy initialization in `getDb()` to avoid serverless cold-start crashes. The client is created only when `getDb()` is called with a valid `MONGODB_URI`.

```javascript
// ❌ WRONG: Don't do this
import { MongoClient } from 'mongodb'
const client = new MongoClient(process.env.MONGODB_URI)

// ✅ CORRECT: Lazy initialization
export async function getDb() {
  if (!globalThis._sso_mongoClientPromise) {
    const client = new MongoClient(uri, { ...options })
    globalThis._sso_mongoClientPromise = client.connect()
  }
  const client = await globalThis._sso_mongoClientPromise
  return client.db(dbName)
}
```

### Authentication & Authorization

#### Admin Authentication
- All admin routes require a valid `admin-session` cookie validated via `lib/auth.mjs` `getAdminUser()`
- Session cookie format: base64-encoded JSON `{ token, expiresAt, userId, role }`
- Cookie has Domain attribute (`SSO_COOKIE_DOMAIN`) for subdomain sharing
- SameSite=None + Secure in production for cross-site SSO

#### Public User Authentication
- Bcrypt password hashing (SALT_ROUNDS=12)
- Server-side sessions in `publicSessions` collection
- Sliding expiration (30 days) - extends on each access
- UUID identifiers for all users
- Email verification supported

#### OAuth2/OIDC
- Authorization Code Flow with **optional PKCE** (configurable per client)
- Confidential clients (server-side): Can skip PKCE if `require_pkce: false`
- Public clients (mobile/SPA): Require PKCE for security
- JWT access tokens signed with RS256 (private key)
- Refresh token rotation with single-use enforcement
- OIDC discovery endpoint: `/.well-known/openid-configuration`
- JWKS endpoint: `/.well-known/jwks.json`

#### Resource Password Validation
- Resource password validation includes **admin bypass** — admin sessions automatically pass validation
- Used for page-level password protection

### UUID Identifiers

- Use `randomUUID()` from Node.js `crypto` module for all entity IDs
- Legacy MongoDB `_id` (ObjectId) is retained internally but not exposed in APIs
- All user-facing IDs are UUIDs
- Migration tool available: `tools/backfill-user-uuids.mjs`

### Versioning Protocol

**CRITICAL**: Follow this versioning workflow strictly:

1. **Before running `npm run dev`**: Bump PATCH version (+1)
2. **Before committing to GitHub**: Bump MINOR version (+1), reset PATCH to 0
3. **Major release** (explicit instruction only): Bump MAJOR (+1), reset MINOR and PATCH to 0
4. **After any version change**: Run `npm run sync:version` to update all documentation

### Documentation Sync

All version changes MUST be synchronized across:
- `package.json`
- `README.md`
- `ARCHITECTURE.md`
- `LEARNINGS.md`
- `ROADMAP.md`
- `TASKLIST.md`
- `RELEASE_NOTES.md`
- `WARP.DEV_AI_CONVERSATION.md`
- `WARP.md`

Use `npm run sync:version` to automate this.

---

## Environment Configuration

### Required Variables

```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=sso

# CORS and domains
SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_COOKIE_DOMAIN=.doneisbetter.com  # CRITICAL for subdomain SSO

# Session secrets (generate with: openssl rand -base64 32)
SESSION_SECRET=<secure-random-string>
ADMIN_SESSION_COOKIE=admin-session
CSRF_SECRET=<secure-random-string>  # Optional, falls back to SESSION_SECRET

# Admin configuration
SSO_ADMIN_ALIAS_EMAIL=sso@doneisbetter.com
ADMIN_MAGIC_SECRET=<secure-random-string>

# OAuth2/OIDC (Phase 2)
JWT_ISSUER=https://sso.doneisbetter.com
JWT_KEY_ID=sso-2025
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# Token lifetimes (seconds)
OAUTH2_AUTHORIZATION_CODE_LIFETIME=600       # 10 minutes
OAUTH2_ACCESS_TOKEN_LIFETIME=3600            # 1 hour
OAUTH2_REFRESH_TOKEN_LIFETIME=2592000        # 30 days
OAUTH2_CONSENT_TTL=31536000                  # 1 year

# Rate limiting
RATE_LIMIT_LOGIN_MAX=5                       # Max login attempts
RATE_LIMIT_LOGIN_WINDOW=900000               # 15 minutes in ms

# Email (Nodemailer + Resend)
# Configure one or both providers in code (see lib/email.mjs)

# MongoDB timeouts (optional, for serverless optimization)
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_CONNECT_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=5000
```

### Optional Variables (Development)

```bash
# Dev bypass (development only, hard-disabled in production)
ADMIN_DEV_BYPASS=true
NEXT_PUBLIC_ADMIN_DEV_BYPASS=true
ADMIN_DEV_ROLE=super-admin

# Magic link configuration
ADMIN_MAGIC_ALLOWED_EMAILS=<comma-separated-emails>
MAGIC_TTL_SECONDS=900  # 15 minutes

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=  # Optional: path to log file

# Collections (optional, defaults shown)
USERS_COLLECTION=users
SESSIONS_COLLECTION=sessions
```

### Generating Secrets

```bash
# For SESSION_SECRET, ADMIN_MAGIC_SECRET, CSRF_SECRET
openssl rand -base64 32

# For admin password tokens (32-hex)
openssl rand -hex 16
```

---

## API Structure

### Admin Authentication

- `POST /api/admin/login` — Email + 32-hex password login
- `DELETE /api/admin/login` — Logout (clear session cookie)
- `POST /api/admin/dev-login` — Dev bypass (development only)
- `POST /api/admin/request-magic-link` — Request magic link for admin
- `GET /api/admin/magic-login?t=<token>` — One-time magic link login
- `POST /api/admin/verify-pin` — Verify 6-digit PIN (5th-10th login)

### Admin Users Management

- `GET /api/admin/users` — List all admin users
- `POST /api/admin/users` — Create admin user (super-admin only)
- `GET /api/admin/users/[id]` — Get user by UUID
- `PATCH /api/admin/users/[id]` — Update user (name/role/password)
- `DELETE /api/admin/users/[id]` — Delete user

### Organizations Management

- `GET /api/admin/orgs` — List organizations
- `POST /api/admin/orgs` — Create organization
- `GET /api/admin/orgs/[id]` — Get organization by UUID
- `PATCH /api/admin/orgs/[id]` — Update organization
- `DELETE /api/admin/orgs/[id]` — Delete organization

### Organization Users Management

- `GET /api/admin/orgs/[orgId]/users` — List users in organization
- `POST /api/admin/orgs/[orgId]/users` — Create org user
- `GET /api/admin/orgs/[orgId]/users/[id]` — Get org user by UUID
- `PATCH /api/admin/orgs/[orgId]/users/[id]` — Update org user
- `DELETE /api/admin/orgs/[orgId]/users/[id]` — Delete org user

### Public User Endpoints (v5.16.0)

- `POST /api/public/register` — Create new user account
- `POST /api/public/login` — Authenticate user (with PIN trigger logic)
- `POST /api/public/verify-pin` — Verify PIN during login
- `POST /api/public/request-magic-link` — Request passwordless login
- `GET /api/public/magic-login` — Consume magic link token
- `POST /api/public/forgot-password` — Request password reset
- `GET /api/public/session` — Check session status
- `PATCH /api/public/profile` — Update user profile
- `POST /api/public/change-password` — Change password
- `DELETE /api/public/account` — Delete user account (GDPR compliant)
- `GET /api/public/authorizations` — List connected OAuth services
- `DELETE /api/public/authorizations/[id]` — Revoke service access

### OAuth2/OIDC Endpoints (Phase 2)

- `GET /api/oauth/authorize` — Authorization endpoint (consent screen)
- `POST /api/oauth/token` — Token endpoint (code exchange, refresh)
- `GET /api/oauth/userinfo` — UserInfo endpoint (OIDC)
- `GET /.well-known/openid-configuration` — OIDC discovery
- `GET /.well-known/jwks.json` — JSON Web Key Set
- `GET /api/admin/oauth-clients` — List OAuth clients (admin)
- `POST /api/admin/oauth-clients` — Register OAuth client (admin)

### Resource & Validation

- `POST /api/resource-passwords` — { resourceId, resourceType, regenerate? } -> token + shareableLink
- `PUT /api/resource-passwords` — { resourceId, resourceType, password } -> validate (admin bypass)
- `GET /api/sso/validate` — Returns session info if valid

### Multi-App Permissions (v5.16.0)

- `GET /api/users/{userId}/apps/{clientId}/permissions` — Get user's app permissions
- `POST /api/users/{userId}/apps/{clientId}/request-access` — Request app access
- `PUT /api/admin/users/{userId}/apps/{clientId}/permissions` — Grant/update permissions (admin)
- `DELETE /api/admin/users/{userId}/apps/{clientId}/permissions` — Revoke permissions (admin)
- `GET /api/admin/users/list-with-apps` — List users with app access overview

### Deprecated/Removed Endpoints

These endpoints are no longer supported and should not be used:
- `/api/auth/login`
- `/api/auth/logout`
- `/api/users/register`
- `/api/users/logout`
- `/api/users/[userId]`

---

## Project Conventions

### Code Quality

- **Tests are PROHIBITED** (MVP Factory policy)
- All code must have comments explaining **WHAT** it does and **WHY** it exists
- Follow existing patterns and idioms within the codebase
- Reuse before creation — always search for existing utilities before creating new ones

### UI/UX

- **No breadcrumbs** in UI (Navigation Design Policy)
- Clean, direct top-level navigation only
- Design system tokens in `styles/docs.module.css`

### Documentation

All changes must update relevant documentation:
- `README.md` — High-level overview and quickstart
- `ARCHITECTURE.md` — System design and component interactions
- `LEARNINGS.md` — Issues encountered and resolved (categorized)
- `ROADMAP.md` — Forward-looking development plans only (no historical entries)
- `TASKLIST.md` — Active and upcoming tasks
- `RELEASE_NOTES.md` — Versioned changelog (format: `## [vX.Y.Z] — YYYY-MM-DD`)

### Timestamps

- All timestamps MUST use ISO 8601 UTC with milliseconds
- Format: `YYYY-MM-DDTHH:MM:SS.sssZ`
- Example: `2025-10-02T10:45:49.000Z`

---

## Operational Runbooks

### Bootstrap First Admin User

1. Set `NEW_ADMIN_TOKEN` to a 32-hex token (generate with `openssl rand -hex 16`)
2. Ensure `MONGODB_URI` and `MONGODB_DB` are configured
3. Run:
   ```bash
   NEW_ADMIN_TOKEN=<32-hex-token> node scripts/bootstrap-admin.mjs
   ```
4. Verify output: `BOOTSTRAP_OK`
5. Login via `POST /api/admin/login` with email `sso@doneisbetter.com` and the token

### Generate Magic Link

1. Set `NEW_MAGIC_EMAIL` to target admin email
2. Ensure `MONGODB_URI`, `ADMIN_MAGIC_SECRET`, and `SSO_BASE_URL` are configured
3. Run:
   ```bash
   NEW_MAGIC_EMAIL=<email> node scripts/generate-magic-link.mjs
   ```
4. Copy the `url` from JSON output and open in browser
5. Link is single-use and expires after 15 minutes (default)

### Backfill UUIDs

For migrating legacy documents to use UUID identifiers:
```bash
node tools/backfill-user-uuids.mjs
```
This is idempotent and safe to run multiple times.

### Generate OAuth2 RSA Key Pair

For JWT token signing:
```bash
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

Set environment variables:
```bash
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
```

---

## Data Model Snapshot

### users Collection (Admin)

```javascript
{
  id: string,              // UUID (application-level identifier)
  _id: ObjectId,           // MongoDB internal ID (retained for compatibility)
  email: string,           // Lowercase, unique
  name: string,
  role: 'admin'|'super-admin',
  password: string,        // 32-hex token (NOT hashed)
  loginCount: number,      // For PIN trigger logic
  createdAt: string,       // ISO 8601 UTC with milliseconds
  updatedAt: string,       // ISO 8601 UTC with milliseconds
  lastLoginAt: string|null
}
```

### publicUsers Collection

```javascript
{
  id: string,              // UUID
  _id: ObjectId,
  email: string,           // Lowercase, unique
  name: string,
  passwordHash: string,    // Bcrypt hash (SALT_ROUNDS=12)
  role: 'user',
  status: 'active'|'invited'|'disabled',
  emailVerified: boolean,
  loginCount: number,      // For PIN trigger logic
  createdAt: string,       // ISO 8601 UTC with milliseconds
  updatedAt: string,
  lastLoginAt: string|null
}
```

### sessions Collection (Admin)

```javascript
{
  _id: ObjectId,
  token: string,           // SHA-256 hash of session token
  userId: string,          // UUID reference
  role: 'admin'|'super-admin',
  createdAt: string,       // ISO 8601 UTC with milliseconds
  expiresAt: string,       // ISO 8601 UTC with milliseconds (sliding)
  lastAccessedAt: string   // Updated on each request
}
```

### publicSessions Collection

```javascript
{
  _id: ObjectId,
  token: string,           // SHA-256 hash
  userId: string,          // UUID reference to publicUsers
  createdAt: string,       // ISO 8601 UTC with milliseconds
  expiresAt: string,       // ISO 8601 UTC with milliseconds (sliding 30 days)
  lastAccessedAt: string
}
```

### organizations Collection

```javascript
{
  id: string,              // UUID
  _id: ObjectId,
  name: string,
  slug: string,            // Unique, URL-safe
  domains: string[],       // Unique domain list
  status: 'active'|'suspended',
  plan: string|null,
  createdAt: string,       // ISO 8601 UTC with milliseconds
  updatedAt: string
}
```

### orgUsers Collection

```javascript
{
  id: string,              // UUID
  _id: ObjectId,
  orgId: string,           // UUID reference to organizations
  email: string,           // Unique within org
  name: string,
  role: 'org-admin'|'member',
  password: string|null,   // 32-hex token
  status: 'active'|'invited'|'disabled',
  createdAt: string,       // ISO 8601 UTC with milliseconds
  updatedAt: string
}
```

### resourcePasswords Collection

```javascript
{
  _id: ObjectId,
  resourceId: string,      // External resource identifier
  resourceType: string,    // Type of resource (e.g., 'page', 'document')
  password: string,        // 32-hex token
  createdAt: string,       // ISO 8601 UTC with milliseconds
  expiresAt: string|null,  // Optional expiration
  usageCount: number,
  lastUsedAt: string|null  // ISO 8601 UTC with milliseconds
}
```

### oauthClients Collection

```javascript
{
  _id: ObjectId,
  client_id: string,       // Unique identifier
  client_secret: string,   // Hashed with bcrypt
  name: string,
  redirect_uris: string[], // Allowed redirect URIs
  require_pkce: boolean,   // PKCE enforcement (default: false)
  createdAt: string,       // ISO 8601 UTC with milliseconds
  updatedAt: string
}
```

### appPermissions Collection

```javascript
{
  _id: ObjectId,
  userId: string,          // UUID reference to publicUsers
  clientId: string,        // OAuth client ID
  role: 'user'|'admin'|'superadmin',
  status: 'pending'|'active'|'denied',
  grantedAt: string|null,  // ISO 8601 UTC with milliseconds
  grantedBy: string|null,  // Admin user ID
  requestedAt: string,     // ISO 8601 UTC with milliseconds
  updatedAt: string
}
```

### loginPins Collection

```javascript
{
  _id: ObjectId,
  email: string,           // User email (lowercase)
  userType: 'admin'|'public',
  pin: string,             // 6-digit PIN
  attempts: number,        // Max 3 attempts
  createdAt: string,       // ISO 8601 UTC with milliseconds
  expiresAt: string        // 5-minute TTL
}
```

---

## Security and CORS

### Admin Session Cookie

- **Name**: Configured via `ADMIN_SESSION_COOKIE` (default: `admin-session`)
- **Attributes**: HttpOnly, SameSite=None (prod), Secure (prod), Domain (for subdomain SSO)
- **Format**: Base64-encoded JSON containing `{ token, expiresAt, userId, role }`
- **Lifetime**: 30 days with sliding expiration

### Public Session Cookie

- **Name**: `public-session`
- **Attributes**: HttpOnly, SameSite=Lax/None, Secure (prod), Domain (for subdomain SSO)
- **Lifetime**: 30 days with sliding expiration
- **Storage**: Server-side in `publicSessions` collection with SHA-256 hashed tokens

### Admin Bypass

Resource password validation automatically passes when a valid admin session is present. This is server-side only and cannot be bypassed by clients.

### CORS Configuration

- Origins controlled via `SSO_ALLOWED_ORIGINS` (comma-separated list)
- Credentials: `true` (cookies allowed)
- Configured in `vercel.json` and `lib/cors.mjs`

### Password Formats

**Admin passwords**: 32-character lowercase hex strings (MD5-style convention), NOT hashed. This is a project-specific convention for token-based authentication.

```javascript
// Generate admin password
import { randomBytes } from 'crypto'
const password = randomBytes(16).toString('hex') // 32-hex string
```

**Public user passwords**: Bcrypt hashes with 12 salt rounds.

```javascript
// Hash public user password
import bcrypt from 'bcryptjs'
const passwordHash = await bcrypt.hash(password, 12)
```

### Rate Limiting

- Login endpoints: 5 attempts per 15 minutes (default)
- Configured via `RATE_LIMIT_LOGIN_MAX` and `RATE_LIMIT_LOGIN_WINDOW`
- Prevents brute force attacks

### CSRF Protection

- Double-submit cookie pattern with HMAC
- Token validation on state-changing requests
- Configured via `CSRF_SECRET` (falls back to `SESSION_SECRET`)

### Audit Logging

- Structured logging with Winston
- Security events logged with ISO 8601 UTC timestamps
- Stored in `appAccessLogs` for permission changes

---

## Maintenance and Versioning

### Version Bump Protocol

**Before running dev:**
```bash
# Bump PATCH: 5.16.0 → 5.16.1
# Edit package.json manually or use npm version patch --no-git-tag-version
```

**Before committing:**
```bash
# Bump MINOR and reset PATCH: 5.16.1 → 5.17.0
npm version minor --no-git-tag-version
npm run sync:version
```

**Major release (explicit instruction only):**
```bash
# Bump MAJOR and reset MINOR/PATCH: 5.17.0 → 6.0.0
npm version major --no-git-tag-version
npm run sync:version
```

### Documentation Sync Workflow

1. Update version in `package.json`
2. Run `npm run sync:version` to propagate to all docs
3. Update `RELEASE_NOTES.md` with changelog entry
4. Commit all changes together

### Definition of Done

A task is complete when:
1. Changes verified in development environment (`npm run dev`)
2. Build passes (`npm run build`)
3. Version incremented per protocol
4. All documentation updated (README, ARCHITECTURE, LEARNINGS, ROADMAP, TASKLIST, RELEASE_NOTES)
5. Code committed with clear message
6. Changes pushed to main branch (or PR merged)

---

## Common Troubleshooting

### Empty reply from server / Cold start crashes

**Cause**: MongoClient instantiated at import time without valid URI  
**Fix**: Use lazy initialization in `getDb()` as shown in Critical Patterns section

### 401 from /api/sso/validate

**Cause**: No admin cookie or expired session  
**Fix**: Login via `POST /api/admin/login` to establish session

### CORS errors

**Cause**: Caller origin not in `SSO_ALLOWED_ORIGINS`  
**Fix**: Add origin to `SSO_ALLOWED_ORIGINS` environment variable (comma-separated)

### MongoDB timeouts

**Cause**: Network issues or wrong connection string  
**Fix**: 
- Verify `MONGODB_URI` format
- Check MongoDB Atlas network allowlist (IP whitelist)
- Adjust timeout environment variables if needed

### Admin login fails with correct credentials

**Cause**: User doesn't have UUID identifier  
**Fix**: Run `node tools/backfill-user-uuids.mjs` to add UUIDs to legacy users

### User can't access /account page after login

**Cause**: Session created with ObjectId instead of UUID  
**Fix**: Modern login flow automatically adds UUID to legacy users. Clear cookies and re-login.

### OAuth authorization flow breaks after admin login

**Cause**: `oauth_request` parameter lost during login redirect  
**Fix**: Modern admin page (`pages/admin/index.js`) automatically continues OAuth flow after login

### PIN verification not working

**Cause**: Email not configured or PIN expired  
**Fix**: 
- Configure email provider (Nodemailer or Resend) in `lib/email.mjs`
- PIN expires after 5 minutes
- Max 3 attempts before PIN expires

---

## File Structure Reference

```
/Users/moldovancsaba/Projects/sso/
├── lib/
│   ├── db.mjs                    # MongoDB connection singleton (lazy init)
│   ├── auth.mjs                  # Admin session validation
│   ├── users.mjs                 # Admin user CRUD operations
│   ├── publicUsers.mjs           # Public user CRUD (bcrypt passwords)
│   ├── publicSessions.mjs        # Public user session management (sliding)
│   ├── sessions.mjs              # Admin session management (sliding)
│   ├── organizations.mjs         # Organization CRUD operations
│   ├── orgUsers.mjs              # Org user CRUD operations
│   ├── resourcePasswords.mjs     # Resource password generation/validation
│   ├── magic.mjs                 # Magic link token generation
│   ├── loginPin.mjs              # PIN verification logic
│   ├── passwordReset.mjs         # Forgot password flow
│   ├── email.mjs                 # Email sending (Nodemailer + Resend)
│   ├── emailTemplates.mjs        # Email HTML templates
│   ├── emailVerification.mjs     # Email verification flow
│   ├── appPermissions.mjs        # Multi-app permission management
│   ├── appAccessLogs.mjs         # Audit logging
│   ├── cors.mjs                  # CORS middleware
│   ├── config.js                 # Environment configuration
│   ├── logger.mjs                # Winston structured logging
│   ├── middleware/
│   │   ├── csrf.mjs              # CSRF protection
│   │   ├── rateLimit.mjs         # Rate limiting
│   │   └── session.js            # Session middleware
│   └── oauth/
│       ├── clients.mjs           # OAuth client management
│       ├── codes.mjs             # Authorization code handling
│       ├── tokens.mjs            # Token generation/validation
│       ├── jwks.mjs              # JSON Web Key Set
│       ├── scopes.mjs            # OAuth scope handling
│       └── userLookup.mjs        # User lookup for OAuth
├── pages/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── login.js          # Admin authentication
│   │   │   ├── dev-login.js      # Dev bypass login
│   │   │   ├── request-magic-link.js  # Admin magic link request
│   │   │   ├── magic-login.js    # Admin magic link handler
│   │   │   ├── verify-pin.js     # Admin PIN verification
│   │   │   ├── users/            # Admin user endpoints
│   │   │   ├── orgs/             # Organization endpoints
│   │   │   └── oauth-clients/    # OAuth client management
│   │   ├── public/
│   │   │   ├── register.js       # Public user registration
│   │   │   ├── login.js          # Public user login (with PIN)
│   │   │   ├── verify-pin.js     # Public PIN verification
│   │   │   ├── request-magic-link.js  # Public magic link request
│   │   │   ├── magic-login.js    # Public magic link handler
│   │   │   ├── forgot-password.js # Password reset request
│   │   │   ├── session.js        # Session status check
│   │   │   ├── profile.js        # Profile update
│   │   │   ├── change-password.js # Password change
│   │   │   ├── account.js        # Account deletion
│   │   │   └── authorizations/   # OAuth authorization management
│   │   ├── oauth/
│   │   │   ├── authorize.js      # Authorization endpoint
│   │   │   ├── token.js          # Token endpoint
│   │   │   └── userinfo.js       # UserInfo endpoint
│   │   ├── resource-passwords/
│   │   │   └── index.js          # Resource password endpoints
│   │   └── sso/
│   │       └── validate.js       # Session validation
│   ├── .well-known/
│   │   ├── openid-configuration.js  # OIDC discovery
│   │   └── jwks.json.js          # JWKS endpoint
│   ├── admin/
│   │   ├── index.js              # Admin UI (OAuth redirect support)
│   │   ├── users.js              # Admin user management UI
│   │   └── oauth-clients.js      # OAuth client management UI
│   ├── account.js                # User account management dashboard
│   ├── login.js                  # Public login page (PIN modal)
│   ├── logout.js                 # Logout page
│   ├── forgot-password.js        # Forgot password page
│   └── index.js                  # Landing page
├── scripts/
│   ├── bootstrap-admin.mjs       # Create first admin user
│   ├── generate-magic-link.mjs   # Generate magic login link
│   ├── sync-version.mjs          # Sync version across docs
│   └── migrations/               # Database migration scripts
├── tools/
│   └── backfill-user-uuids.mjs   # UUID migration script
├── docs/                         # API reference documentation
├── styles/                       # CSS modules and design system
├── README.md                     # Project overview
├── ARCHITECTURE.md               # System architecture
├── LEARNINGS.md                  # Lessons learned
├── ROADMAP.md                    # Future plans
├── TASKLIST.md                   # Active tasks
├── RELEASE_NOTES.md              # Version changelog
├── WARP.md                       # This file
├── .env.example                  # Environment variable template
├── next.config.js                # Next.js configuration
├── vercel.json                   # Vercel deployment config
└── package.json                  # Dependencies and scripts
```

---

## Additional Resources

- **Production URL**: https://sso.doneisbetter.com
- **Repository**: https://github.com/moldovancsaba/sso
- **Hosting**: Vercel
- **Database**: MongoDB Atlas
- **Node Version**: >=18.0.0
- **NPM Version**: >=8.0.0

---

**Last Updated**: 2025-11-05T10:39:12.000Z by moldovancsaba
