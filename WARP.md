# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

---

**Document**: WARP.md — SSO Service  
**Repository**: sso  
**Path**: `/Users/moldovancsaba/Library/Mobile Documents/com~apple~CloudDocs/Projects/sso/WARP.md`  
**Version**: 4.7.0 (auto-synced from package.json via `npm run sync:version`)  
**CreatedAt (UTC)**: 2025-10-02T10:45:49.000Z  
**LastUpdated (UTC)**: 2025-10-02T10:45:49.000Z  
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
  - `organizations` — Multi-tenant organizations with UUID IDs, slug, domains, status
  - `orgUsers` — Organization users with UUID IDs, orgId, email, role, status
  - `resourcePasswords` — Resource-specific passwords with 32-hex tokens, usage tracking
- **Timestamps**: All timestamps use ISO 8601 UTC with milliseconds (e.g., `2025-10-02T10:45:49.000Z`)
- **Password Convention**: 32-hex tokens (MD5-style), NOT bcrypt hashes
- **CORS**: Controlled via `SSO_ALLOWED_ORIGINS` environment variable

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
ADMIN_SESSION_COOKIE=admin-session
ADMIN_MAGIC_SECRET=<secure-random-string>
SESSION_SECRET=<secure-random-string>
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

# MongoDB timeouts
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_CONNECT_TIMEOUT_MS=5000
MONGO_SOCKET_TIMEOUT_MS=5000
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

### Resource Passwords
- `POST /api/resource-passwords` — Generate/retrieve password + shareable link
  - Body: `{ resourceId, resourceType, regenerate?: boolean }`
- `PUT /api/resource-passwords` — Validate password (with admin bypass)
  - Body: `{ resourceId, resourceType, password }`

### Session Validation
- `GET /api/sso/validate` — Validates admin cookie session, returns sanitized user info

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

---

## Security and CORS

### Admin Session Cookie
- **Name**: Configured via `ADMIN_SESSION_COOKIE` (default: `admin-session`)
- **Attributes**: HttpOnly, SameSite=Lax, Secure (production only)
- **Format**: Base64-encoded JSON containing `{ token, expiresAt, userId, role }`
- **Lifetime**: 7 days (configurable)

### Admin Bypass
Resource password validation automatically passes when a valid admin session is present. This is server-side only and cannot be bypassed by clients.

### CORS Configuration
- Origins controlled via `SSO_ALLOWED_ORIGINS` (comma-separated list)
- Credentials: `true` (cookies allowed)
- Configured in `vercel.json` and `lib/cors.mjs`

### Password Format
Passwords are **32-character lowercase hex strings** (MD5-style convention), NOT bcrypt hashes. This is a project-specific convention for token-based authentication.

```javascript
// Generate password
import { randomBytes } from 'crypto'
const password = randomBytes(16).toString('hex') // 32-hex string
```

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

**Last Updated**: 2025-10-02T10:45:49.000Z by moldovancsaba
