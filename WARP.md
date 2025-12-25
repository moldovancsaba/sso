# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

---

**Document**: WARP.md — SSO Service  
**Repository**: sso  
**Path**: `/Users/moldovancsaba/Library/Mobile Documents/com~apple~CloudDocs/Projects/sso/WARP.md`  
**Version**: 5.28.0 (auto-synced from package.json via `npm run sync:version`)  
**CreatedAt (UTC)**: 2025-10-02T10:45:49.000Z  
**LastUpdated (UTC)**: 2025-12-21T14:00:00.000Z
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
- **Authentication**: Cookie-based admin sessions (HttpOnly, base64 JSON tokens)
- **Collections**:
  - `users` — Admin users with UUID IDs, email, name, role ('admin'|'super-admin'), password (32-hex token)
  - `publicUsers` — End users with UUID IDs, email, name, passwordHash (bcrypt), socialProviders (Facebook, Google)
  - `organizations` — Multi-tenant organizations with UUID IDs, slug, domains, status
  - `orgUsers` — Organization users with UUID IDs, orgId, email, role, status
  - `resourcePasswords` — Resource-specific passwords with 32-hex tokens, usage tracking
  - `oauthClients` — OAuth2 clients with client_id, client_secret, redirect_uris, scopes
  - `appPermissions` — Multi-app permissions with userId, clientId, role, status
- **Timestamps**: All timestamps use ISO 8601 UTC with milliseconds (e.g., `2025-12-21T14:00:00.000Z`)
- **Password Convention**: Admin uses 32-hex tokens; Public users use bcrypt hashes
- **CORS**: Controlled via `SSO_ALLOWED_ORIGINS` environment variable
- **Security**: 5-layer defense-in-depth (rate limiting, security headers, input validation, session hardening, audit logging)

---

## CRITICAL: Industry Standards Only

**MANDATORY**: This project MUST use industry-standard practices ONLY. No custom implementations, no reinventing wheels, no creative solutions that deviate from established standards.

### Database
- **ONLY MongoDB Atlas production database** - NO local databases, NO development databases, NO test databases
- Production Vercel environment variables are the SINGLE SOURCE OF TRUTH
- All scripts, tests, and operations MUST use production database connection
- Local `.env` files are for reference only - Vercel production is authoritative

### OAuth & Authentication
- **ONLY standard OAuth 2.0 scopes**: `openid`, `profile`, `email`, `offline_access`
- NO custom scopes (e.g., `admin:users`, `admin:settings`) unless explicitly defined in OAuth 2.0 / OpenID Connect specifications
- Use RFC 6749 (OAuth 2.0) and RFC 7636 (PKCE) standards strictly
- Session management follows standard JWT/cookie patterns

### API Design
- RESTful endpoints following HTTP standards (RFC 7231)
- Standard HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- JSON responses following JSON API or HAL standards
- Standard authentication headers (Authorization: Bearer)

### Code & Architecture
- Follow Next.js official patterns and best practices
- Use standard npm packages - avoid custom implementations of standard features
- Follow MongoDB official driver patterns
- Use bcrypt for passwords, not custom hashing
- ISO 8601 for timestamps, not custom formats
- UUID v4 for IDs, not custom ID generation

### UI & UX
- Follow established design systems (Material Design, Apple HIG, or similar)
- Standard form validation patterns
- Standard error messages and user feedback
- Accessibility standards (WCAG 2.1 Level AA minimum)

### Variable Naming
- camelCase for JavaScript/TypeScript
- snake_case for database fields (MongoDB convention)
- UPPER_SNAKE_CASE for environment variables
- Standard naming from industry (userId, email, createdAt, etc.)

**VIOLATION POLICY**: Any deviation from industry standards must be explicitly justified and documented. If a standard exists, USE IT.

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
- All admin routes require a valid `admin-session` cookie validated via `lib/auth.mjs` `getAdminUser()`
- Resource password validation includes **admin bypass** — admin sessions automatically pass validation
- Session cookie format: base64-encoded JSON `{ token, expiresAt, userId, role }`

### UUID Identifiers
- Use `randomUUID()` from Node.js `crypto` module for all entity IDs
- Legacy MongoDB `_id` (ObjectId) is retained internally but not exposed in APIs
- All user-facing IDs are UUIDs

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

Use `npm run sync:version` to automate this.

---

## Environment Configuration

### Required Variables
```bash
MONGODB_URI=mongodb+srv://...
MONGODB_DB=sso
SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com
SSO_BASE_URL=https://sso.doneisbetter.com
SSO_COOKIE_DOMAIN=.doneisbetter.com
ADMIN_SESSION_COOKIE=admin-session
PUBLIC_SESSION_COOKIE=public-session
ADMIN_MAGIC_SECRET=<secure-random-string>
SESSION_SECRET=<secure-random-string>
CSRF_SECRET=<secure-random-string>
SSO_ADMIN_ALIAS_EMAIL=sso@doneisbetter.com
```

### Optional Variables
```bash
# Dev bypass (development only, hard-disabled in production)
ADMIN_DEV_BYPASS=true
NEXT_PUBLIC_ADMIN_DEV_BYPASS=true
ADMIN_DEV_ROLE=super-admin

# Magic link configuration
ADMIN_MAGIC_ALLOWED_EMAILS=<comma-separated-emails>
MAGIC_TTL_SECONDS=900

# Social login (optional)
FACEBOOK_APP_ID=<facebook-app-id>
FACEBOOK_APP_SECRET=<facebook-app-secret>
FACEBOOK_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/facebook/callback
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_REDIRECT_URI=https://sso.doneisbetter.com/api/auth/google/callback

# MongoDB timeouts
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_CONNECT_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=5000

# Rate limiting
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=900000
```

### Generating Secrets
```bash
# For SESSION_SECRET and ADMIN_MAGIC_SECRET
openssl rand -base64 32
```

---

## API Structure

### Admin Authentication
- `POST /api/admin/login` — Email + 32-hex password login
- `DELETE /api/admin/login` — Logout (clear session cookie)
- `POST /api/admin/dev-login` — Dev bypass (development only)
- `GET /api/admin/magic-link?t=<token>` — One-time magic link login

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

### Public User Authentication (v5.28.0)
- `POST /api/public/register` — Create new user account
- `POST /api/public/login` — Authenticate user (email+password)
- `POST /api/public/verify-pin` — Verify PIN during login (random 5th-10th login)
- `POST /api/public/request-magic-link` — Request passwordless login
- `GET /api/public/magic-login` — Consume magic link token
- `POST /api/public/forgot-password` — Request password reset
- `GET /api/public/session` — Check session status
- `PATCH /api/public/profile` — Update user profile
- `POST /api/public/change-password` — Change password
- `DELETE /api/public/account` — Delete user account
- `GET /api/public/authorizations` — List connected OAuth services
- `DELETE /api/public/authorizations/[id]` — Revoke service access

### Account Management (v5.29.0)
- `DELETE /api/public/account/unlink/[provider]` — User-initiated login method unlinking
  - Supports: `password`, `facebook`, `google`
  - Safety: Prevents unlinking last method (account lockout)
- `POST /api/admin/public-users/[id]/link` — Admin manual account linking
  - Supports: `facebook`, `google`
  - Body: `{ provider, providerId, email, name, picture }`
  - Validation: Email must match user's email
- `DELETE /api/admin/public-users/[id]/unlink/[provider]` — Admin-initiated unlinking
  - Supports: `password`, `facebook`, `google`
  - Safety: Prevents unlinking last method
- `GET /api/admin/activity` — Cross-app activity dashboard
  - Query params: `timeRange` (24h/7d/30d/all), `eventType` (access/permission/login)
  - Returns enriched audit logs with user/app names

### Social Login (v5.26.0 Facebook, v5.27.0 Google)
- `GET /api/auth/facebook/login` — Initiate Facebook OAuth
- `GET /api/auth/facebook/callback` — Facebook OAuth callback
- `GET /api/auth/google/login` — Initiate Google Sign-In
- `GET /api/auth/google/callback` — Google OAuth callback

### OAuth2/OIDC Server (v5.28.0)
- `GET /api/oauth/authorize` — OAuth2 authorization endpoint
- `POST /api/oauth/token` — Token exchange (authorization_code, refresh_token, client_credentials)
- `POST /api/oauth/revoke` — Token revocation
- `GET /api/oauth/logout` — Logout with redirect
- `GET /api/oauth/userinfo` — OIDC user info endpoint
- `GET /.well-known/openid-configuration` — OIDC discovery
- `GET /.well-known/jwks.json` — Public keys for JWT verification
- `GET /api/admin/oauth-clients` — List OAuth clients
- `POST /api/admin/oauth-clients` — Create OAuth client
- `PATCH /api/admin/oauth-clients/[clientId]` — Update client
- `DELETE /api/admin/oauth-clients/[clientId]` — Delete client

### Resource Passwords
- `POST /api/resource-passwords` — Generate/retrieve password + shareable link
  - Body: `{ resourceId, resourceType, regenerate?: boolean }`
- `PUT /api/resource-passwords` — Validate password (with admin bypass)
  - Body: `{ resourceId, resourceType, password }`

### Session Validation
- `GET /api/sso/validate` — Validates admin OR public cookie session, returns sanitized user info
- `GET /api/public/validate` — Validates public session (for subdomain SSO)

### Deprecated Endpoints
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

### Documentation
All changes must update relevant documentation:
- `README.md` — High-level overview and quickstart
- `ARCHITECTURE.md` — System design and component interactions
- `LEARNINGS.md` — Issues encountered and resolved (categorized)
- `ROADMAP.md` — Forward-looking development plans only
- `TASKLIST.md` — Active and upcoming tasks
- `RELEASE_NOTES.md` — Versioned changelog

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

---

## Data Model Snapshot

### users Collection
```javascript
{
  id: string,              // UUID (application-level identifier)
  _id: ObjectId,           // MongoDB internal ID (retained for compatibility)
  email: string,           // Lowercase, unique
  name: string,
  role: 'admin'|'super-admin',
  password: string,        // 32-hex token (NOT hashed)
  createdAt: string,       // ISO 8601 UTC with milliseconds
  updatedAt: string        // ISO 8601 UTC with milliseconds
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
  updatedAt: string        // ISO 8601 UTC with milliseconds
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
  updatedAt: string        // ISO 8601 UTC with milliseconds
}
```

### publicUsers Collection (v5.28.0)
```javascript
{
  id: string,              // UUID
  _id: ObjectId,
  email: string,           // Lowercase, unique
  name: string,
  passwordHash: string,    // bcrypt hash (optional - social login only users may not have)
  status: 'active'|'disabled',
  emailVerified: boolean,
  
  // Social login providers (v5.26.0 Facebook, v5.27.0 Google)
  socialProviders: {
    facebook: {
      id: string,
      email: string,
      name: string,
      picture: string,
      linkedAt: string,    // ISO 8601 UTC with milliseconds
      lastLoginAt: string
    },
    google: {
      id: string,
      email: string,
      name: string,
      picture: string,
      emailVerified: boolean,
      linkedAt: string,
      lastLoginAt: string
    }
  },
  
  createdAt: string,       // ISO 8601 UTC with milliseconds
  updatedAt: string,
  lastLoginAt: string,
  loginCount: number       // For PIN verification trigger (5th-10th login)
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

### oauthClients Collection (v5.28.0)
```javascript
{
  client_id: string,       // UUID
  client_secret: string,   // bcrypt hash
  name: string,
  redirect_uris: string[], // Allowed redirect URIs
  allowed_scopes: string[],// openid, profile, email, etc.
  grant_types: string[],   // authorization_code, refresh_token, client_credentials
  require_pkce: boolean,   // Enforce PKCE for this client
  status: 'active'|'disabled',
  created_at: string,      // ISO 8601 UTC with milliseconds
  updated_at: string
}
```

### appPermissions Collection (v5.28.0)
```javascript
{
  userId: string,          // UUID reference to publicUsers
  clientId: string,        // UUID reference to oauthClients
  hasAccess: boolean,
  role: 'user'|'admin'|'superadmin',
  status: 'pending'|'approved'|'revoked',
  grantedAt: string|null,  // ISO 8601 UTC with milliseconds
  grantedBy: string|null,  // UUID of admin who granted
  revokedAt: string|null,
  revokedBy: string|null
}
```

---

## Security and CORS

### Admin Session Cookie (v5.26.0 Hardened)
- **Name**: Configured via `ADMIN_SESSION_COOKIE` (default: `admin-session`)
- **Attributes**: HttpOnly, SameSite=Lax, Secure (production only)
- **Format**: Base64-encoded JSON containing `{ token, expiresAt, userId, role }`
- **Lifetime**: 4 hours (reduced from 7 days for security)
- **Device Fingerprinting**: SHA-256 of IP + User-Agent (detects session hijacking)
- **Sliding Expiration**: Extends on activity

### Public Session Cookie
- **Name**: Configured via `PUBLIC_SESSION_COOKIE` (default: `public-session`)
- **Attributes**: HttpOnly, SameSite=Lax/None, Secure (production only)
- **Format**: SHA-256 hashed token stored in MongoDB `publicSessions` collection
- **Lifetime**: 30 days with sliding expiration
- **Subdomain SSO**: Domain=.doneisbetter.com enables SSO across subdomains

### Admin Bypass
Resource password validation automatically passes when a valid admin session is present. This is server-side only and cannot be bypassed by clients.

### CORS Configuration
- Origins controlled via `SSO_ALLOWED_ORIGINS` (comma-separated list)
- Credentials: `true` (cookies allowed)
- Configured in `vercel.json` and `lib/cors.mjs`

### Password Formats
**Admin passwords** are **32-character lowercase hex strings** (MD5-style convention), NOT bcrypt hashes:

```javascript
// Generate admin password
import { randomBytes } from 'crypto'
const password = randomBytes(16).toString('hex') // 32-hex string
```

**Public user passwords** use bcrypt hashing (12 rounds):

```javascript
// Hash public user password
import bcrypt from 'bcryptjs'
const passwordHash = await bcrypt.hash(password, 12)
```

### Account Linking (v5.28.0)
Automatic account linking by email address:
- Users can login with Email+Password, Facebook, Google, or Magic Link
- **One person, one email = one account**
- System automatically merges accounts with same email
- Smart registration adds password to existing social-only accounts
- Helpful error messages guide users to correct login method
- Account dashboard shows all linked login methods

### Security Hardening (v5.26.0 - 5 Layers)
1. **Rate Limiting**: 3 admin login attempts/15min, 20 mutations/min, 100 queries/min
2. **Security Headers**: X-Frame-Options, CSP, HSTS, Permissions-Policy via Edge Middleware
3. **Input Validation**: Zod type-safe validation on all endpoints
4. **Session Security**: 4-hour timeout, device fingerprinting, sliding expiration
5. **Audit Logging**: Comprehensive audit trail in MongoDB with before/after state tracking

---

## Maintenance and Versioning

### Version Bump Protocol

**Before running dev:**
```bash
# Bump PATCH: 4.7.0 → 4.7.1
# Edit package.json manually or use npm version patch --no-git-tag-version
```

**Before committing:**
```bash
# Bump MINOR and reset PATCH: 4.7.1 → 4.8.0
npm version minor --no-git-tag-version
npm run sync:version
```

**Major release (explicit instruction only):**
```bash
# Bump MAJOR and reset MINOR/PATCH: 4.8.0 → 5.0.0
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
1. Changes verified in development environment
2. Version incremented per protocol
3. All documentation updated (README, ARCHITECTURE, LEARNINGS, ROADMAP, TASKLIST, RELEASE_NOTES)
4. Code committed with clear message
5. Changes pushed to main branch (or PR merged)

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

---

## File Structure Reference

```
/Users/moldovancsaba/Library/Mobile Documents/com~apple~CloudDocs/Projects/sso/
├── lib/
│   ├── db.mjs                    # MongoDB connection singleton (lazy init)
│   ├── auth.mjs                  # Admin session validation
│   ├── users.mjs                 # User CRUD operations
│   ├── organizations.mjs         # Organization CRUD operations
│   ├── orgUsers.mjs              # Org user CRUD operations
│   ├── resourcePasswords.mjs     # Resource password generation/validation
│   ├── magic.mjs                 # Magic link token generation
│   ├── cors.mjs                  # CORS middleware
│   └── config.js                 # Environment configuration
├── pages/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── login.js          # Admin authentication
│   │   │   ├── dev-login.js      # Dev bypass login
│   │   │   ├── magic-link.js     # Magic link handler
│   │   │   ├── users/            # Admin user endpoints
│   │   │   └── orgs/             # Organization endpoints
│   │   ├── resource-passwords/
│   │   │   └── index.js          # Resource password endpoints
│   │   └── sso/
│   │       └── validate.js       # Session validation
│   ├── admin/
│   │   └── index.js              # Admin UI
│   └── index.js                  # Landing page
├── scripts/
│   ├── bootstrap-admin.mjs       # Create first admin user
│   ├── generate-magic-link.mjs   # Generate magic login link
│   └── sync-version.mjs          # Sync version across docs
├── tools/
│   └── backfill-user-uuids.mjs   # UUID migration script
├── docs/                         # API reference documentation
├── README.md                     # Project overview
├── ARCHITECTURE.md               # System architecture
├── LEARNINGS.md                  # Lessons learned
├── ROADMAP.md                    # Future plans
├── TASKLIST.md                   # Active tasks
├── RELEASE_NOTES.md              # Version changelog
├── WARP.md                       # This file
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

**Last Updated**: 2025-12-21T14:00:00.000Z by moldovancsaba

---

## Recent Features (v5.26.0 - v5.28.0)

### v5.28.0 - Unified Account Linking System
- Automatic account linking across all authentication methods (Email+Password, Facebook, Google, Magic Link)
- One person, one email = one account
- Smart registration (adds password to social-only accounts instead of rejecting)
- Enhanced login error messages (guides users to correct method)
- Account dashboard with linked login methods display
- Migration tool for merging duplicate accounts
- Comprehensive documentation: `docs/ACCOUNT_LINKING.md`

### v5.27.0 - Google Sign-In Integration
- Google OAuth 2.0 implementation
- Automatic account linking by email
- Google profile pictures in admin dashboard
- Full OAuth flow preservation
- Setup guide: `docs/GOOGLE_LOGIN_SETUP.md`

### v5.26.0 - Enterprise Security Hardening
- 5-layer defense-in-depth architecture
- Enhanced rate limiting for admin endpoints
- Security headers via Next.js Edge Middleware
- Zod input validation
- Session hardening (4-hour timeout, device fingerprinting)
- Comprehensive audit logging in MongoDB

### v5.26.0 - Facebook Login Integration
- Facebook OAuth 2.0 implementation
- Automatic account linking by email
- Social provider data storage
- Facebook users in admin dashboard

### v5.25.0 - Multi-App Permission System
- Centralized permission management across OAuth apps
- Per-app role-based access control (user/admin/superadmin)
- Admin UI for permission management
- Bidirectional permission APIs
- Client credentials OAuth grant
- Audit logging for all permission changes
