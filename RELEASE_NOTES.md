# Release Notes [![Version Badge](https://img.shields.io/badge/version-4.8.0-blue)](RELEASE_NOTES.md)

## [v4.8.0] — 2025-10-02T11:54:33.000Z

### 🔒 Phase 1: Critical Security Hardening

#### Added
- **Server-Side Session Management** (`lib/sessions.mjs`):
  - MongoDB-backed session storage in `adminSessions` collection
  - Session token hashing with SHA-256 (no raw tokens in database)
  - Server-side session validation and revocation
  - Session tracking with IP addresses and user agents
  - TTL index for automatic session expiration
  - Functions: `createSession()`, `validateSession()`, `revokeSession()`, `revokeUserSessions()`

- **Rate Limiting** (`lib/middleware/rateLimit.mjs`):
  - Login endpoint: 5 attempts per 15 minutes (brute force protection)
  - Strict rate limiter: 3 attempts per 15 minutes (magic links, sensitive operations)
  - API rate limiter: 100 requests per 15 minutes
  - Validate rate limiter: 60 requests per minute
  - Per-IP tracking with X-Forwarded-For support (Vercel/Cloudflare compatible)
  - Security event logging on rate limit exceeded

- **CSRF Protection** (`lib/middleware/csrf.mjs`):
  - Double-submit cookie pattern with HMAC signing
  - Constant-time comparison (timing attack protection)
  - 24-hour CSRF token lifetime
  - Middleware: `ensureCsrfToken()`, `validateCsrf()`, `getCsrfToken()`

- **Structured Security Logging** (`lib/logger.mjs`):
  - Winston-based logging with JSON output (production) and colored console (development)
  - Security event logging: login attempts, session creation/revocation, rate limit events
  - ISO 8601 UTC timestamps with milliseconds on all logs
  - Configurable log level via `LOG_LEVEL` environment variable

- **Documentation**:
  - `SSO_AUDIT_REPORT.md` - Complete security audit with gap analysis
  - `PHASE1_SUMMARY.md` - Implementation details and testing checklist
  - `WARP.md` - Updated operational guide

#### Changed
- **Subdomain SSO Support** (`lib/auth.mjs`):
  - Added `Domain=.doneisbetter.com` attribute to session cookies
  - Changed `SameSite=Lax` → `SameSite=None` in production
  - Added `Secure` flag in production
  - **Breaking**: Requires `SSO_COOKIE_DOMAIN` environment variable for subdomain SSO

- **Enhanced Login Endpoint** (`pages/api/admin/login.js`):
  - Integrated rate limiting middleware
  - Server-side session creation in MongoDB
  - CSRF token issuance on login
  - Comprehensive audit logging with IP and user-agent
  - Session revocation on logout
  - Returns CSRF token to client for subsequent requests

#### Security Improvements
- ✅ **Cookie Domain**: Now supports `*.doneisbetter.com` subdomain SSO
- ✅ **Session Revocation**: Stolen tokens can be invalidated server-side
- ✅ **Brute Force Protection**: Rate limiting blocks attacks at network layer
- ✅ **CSRF Protection**: Double-submit pattern prevents cross-site attacks
- ✅ **Audit Logging**: Full audit trail with structured logs
- ✅ **Session Storage**: MongoDB-backed with metadata tracking

#### Environment Variables (New)
```bash
# Required for subdomain SSO
SSO_COOKIE_DOMAIN=.doneisbetter.com

# Rate limiting (optional, defaults provided)
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=900000

# Logging (optional)
LOG_LEVEL=info
LOG_FILE_PATH=

# CSRF (optional, falls back to SESSION_SECRET)
CSRF_SECRET=<generate with: openssl rand -base64 32>
```

#### Dependencies Added
- `express-rate-limit@^7.0.0` - Rate limiting middleware
- `winston@^3.x` - Structured logging

#### Production Readiness
- Security Score: **30% → 75%**
- Subdomain SSO: ✅ Working (cardmass, playmass, etc.)
- External Domain SSO: ❌ Requires Phase 2 (OAuth2)

#### Migration Notes
1. Set `SSO_COOKIE_DOMAIN=.doneisbetter.com` in environment variables
2. Generate and set `CSRF_SECRET` (or it will use `SESSION_SECRET`)
3. Configure rate limiting if defaults don't suit your needs
4. Test login/logout flow after deployment
5. Verify cookies include correct `Domain` attribute in browser dev tools

---

## [v4.7.0] — 2025-09-17T11:43:02.000Z

### Added
- Development-only passwordless admin login:
  - NEXT_PUBLIC_ADMIN_DEV_BYPASS (client) + ADMIN_DEV_BYPASS (server) gates
  - POST/DELETE /api/admin/dev-login creates/clears session without password when enabled (non-production only)
- UI shows email-only form and warning banner when dev bypass is active

### Security
- Dev bypass is blocked in production regardless of flags; route returns 403

---

## [v4.8.0] — 2025-09-16T18:14:33.000Z

### Added
- Secure, single-use, time-limited admin magic link flow:
  - GET /api/admin/magic-link?t=... consumes a signed token, sets session cookie, redirects to /admin
  - scripts/generate-magic-link.mjs to generate one-time URLs
  - ADMIN_MAGIC_SECRET signing key; optional ADMIN_MAGIC_ALLOWED_EMAILS allowlist

### Changed
- Documentation updated with Magic Link usage

---

## [v4.8.0] — 2025-09-15T18:25:45.000Z

### Changed
- MongoDB client now uses fast-fail timeouts (serverSelection/connect/socket) to surface 503 quickly when DB is unreachable.
- Admin login and session validation now map DB config/availability issues to 503 with clear messages.

### Documentation
- Version sync across README, ARCHITECTURE, ROADMAP, TASKLIST, LEARNINGS.

---

## [v4.8.0] — 2025-09-15T17:36:07.000Z

### Changed
- MongoDB client initialization is now lazy in serverless functions to prevent import-time crashes (avoids “Empty reply from server”).
- Admin login/validate endpoints return stable HTTP errors if database env is missing.

### Documentation
- Synchronized versions across README, ARCHITECTURE, ROADMAP, TASKLIST, LEARNINGS.

---

## [v4.8.0] — 2025-09-14T08:25:57.000Z

### Added
- UUIDs as the primary identifier for admin users (with backfill for legacy users)
- Sparse-unique index on users.id for fast UUID lookups
- Organizations (UUID) admin endpoints:
  - GET/POST /api/admin/orgs
  - GET/PATCH/DELETE /api/admin/orgs/[id]
- Organization Users (UUID) admin endpoints:
  - GET/POST /api/admin/orgs/[orgId]/users
  - GET/PATCH/DELETE /api/admin/orgs/[orgId]/users/[id]
- tools/backfill-user-uuids.mjs utility

### Changed
- Admin session tokens now carry userId as UUID
- Admin users CRUD responses prefer UUID id (fallback to legacy _id only if needed)
- RBAC clarified: super-admin full access; admin read-only for org/org-user routes unless permissioned

---

## [v4.8.0] — 2025-09-11T14:28:29.000Z

### Added
- Admin login UI at /admin (email + 32‑hex token) with session display and logout
- Homepage updated to link to Admin Login and show current admin session state

### Changed
- Removed legacy username sign-in UI from homepage

---

## [v4.8.0] — 2025-09-11T13:57:38.000Z

### Changed
- Version bump to align with commit protocol; no functional changes since v4.8.0

## [v4.8.0] — 2025-09-11T13:35:02.000Z

### Added
- DB-backed admin authentication with HttpOnly cookie session (admin-session)
- New admin endpoints:
  - POST /api/admin/login (email + token)
  - DELETE /api/admin/login (logout)
  - GET/POST /api/admin/users (list/create)
  - GET/PATCH/DELETE /api/admin/users/[id] (manage)
- Resource password service with admin-session bypass and usage tracking:
  - POST /api/resource-passwords (generate/retrieve + shareable link)
  - PUT /api/resource-passwords (validate password)
- CORS helper and deployment guidance for sso.doneisbetter.com

### Changed
- /api/sso/validate now validates admin cookie sessions
- Secured /api/users to admin-only

### Removed
- Deprecated username-based endpoints: /api/auth/login, /api/auth/logout, /api/users/register, /api/users/logout, /api/users/[userId]
- Duplicate/insecure routes removed or deprecated with 410 Gone

---

## [v4.8.0] — 2025-07-23T10:00:00.000Z

### Removed
- Removed nested client package (@doneisbetter/sso-client)
- Removed client-related documentation and examples
- Simplified project structure

### Modified
- Updated documentation to focus on server-side implementation
- Streamlined API documentation
- Simplified configuration options
## [v4.8.0] — 2025-07-22T08:03:17Z

### Updated Dependencies
- Upgraded Next.js to ^15.4.2
- Upgraded React to ^19.1.0
- Upgraded MongoDB to ^6.3.0
- Added TypeScript >= 4.5.0 requirement
- Updated Node.js requirement to >= 14.0.0
- Updated all client dependencies:
  - axios ^1.6.0
  - jsonwebtoken ^9.0.0

### Technical Updates
- Enhanced build system stability
- Improved development environment setup
- Updated package overrides for better dependency management
- Optimized session handling and validation

## [v4.8.0]

### Major Changes
- Upgraded all dependencies to their latest stable versions
- Fixed deprecated package warnings
- Removed legacy dependencies
- Improved build system configuration

### Technical Updates
- Added lru-cache for better memory management
- Updated glob to version 10
- Updated rimraf to version 5
- Updated eslint to version 9
- Added package overrides for transitive dependencies
- Optimized Next.js configuration for Pages Router
- Added .npmrc for better dependency management

### Removed
- Deprecated inflight package
- Legacy glob versions
- Outdated eslint configuration

### Technical Details
- Configured proper versioning for all dependencies
- Enhanced build system stability
- Improved development environment setup
- Better memory management with lru-cache
- Stricter npm configuration

## [v4.8.0] — 2025-07-21T13:12:00.000Z

### Added
- User management features:
  - Rename users functionality
  - Toggle admin rights
  - Delete users capability
- Enhanced admin dashboard
- Real-time user list updates
- Improved error handling
- User manual documentation

### Modified
- Updated frontend interface
- Enhanced permission system
- Improved activity logging
- Updated all documentation

### Technical Updates
- React hooks for state management
- MongoDB integration
- Next.js API routes
- Session management

### Major Changes
- Migrated to Next.js framework
- Implemented serverless API routes
- Added MongoDB integration
- Created user management system
- Added session management
- Implemented activity logging
- Added admin dashboard
- Created permission system

### Removed
- Express server implementation
- Static file serving through Express
- Server-side session management
- Express routes

### Technical Details
- Updated to Next.js 15.4.2
- Updated to React 19.1.0
- Added MongoDB integration
- Implemented user authentication
- Added admin user management
- Created API routes for user operations

## [v4.8.0] — 2024-04-13T12:00:00.000Z

### Added
- Initial project setup
- Basic Express.js server configuration
- Static file serving
- SPA routing support
- Basic HTML structure
- CSS styling foundation
- Client-side JavaScript initialization

### Technical Details
- Express.js server implementation
- SPA structure with HTML5 history API support
- Static file middleware configuration
- Basic responsive styling
