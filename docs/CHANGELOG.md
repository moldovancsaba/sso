# Changelog — SSO Service

All notable changes to the SSO service are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.31.1] - 2026-08-01

### 🐛 Fixed

**OAuth `prompt=login` infinite redirect loop**: `authorize.js` checks `prompt === 'login'` (force re-authentication) before it checks whether the user is now authenticated. The four places that reconstruct the authorize retry URL after a client completes re-authentication — the password-login and PIN-completion branches in `pages/login.js`, and the Facebook/Google OAuth callbacks — were forwarding `prompt` from the decoded `oauth_request` unconditionally, including `login`. A consuming app sending `prompt=login` (e.g. to force fresh credentials right after a user logs out) meant every successful login attempt looped straight back to the login form instead of ever completing authorization: the user's credentials were valid and their session really was being established each time, they just never saw it, because the retry immediately bounced them back to the login form again.

Fixed by dropping `prompt=login` specifically when rebuilding the retry URL at all four call sites, once re-authentication has just happened — that's the one job that value has, and it's done. Other `prompt` values (`consent`, `select_account`) still have meaning post-login and are preserved. Reported against a real consuming app (messmass): login → logout → immediate re-login failed silently every time; a full page reload before retrying "fixed" it only because it reset the client app's own in-memory "just logged out" flag that was the trigger for sending `prompt=login` in the first place.

### 🔧 Changed
- Bumped service version to `5.31.1` (patch: bug fix only, no new features or breaking changes)

---

## [5.31.0] - 2026-07-31

### 🔒 Security

Comprehensive security remediation covering authentication, authorization, CSRF, rate limiting, and error handling. All items below were found and fixed in the same pass; none were previously tracked as known issues.

**Critical fixes:**
- **Admin session identity resolution**: `getAdminUser()` (`lib/auth.mjs`) now resolves the acting admin's identity from the database-verified session record instead of the unsigned `userId` field carried in the session cookie payload, closing a path where a modified cookie field could impersonate a different admin
- **OAuth consent approval validation**: `/api/oauth/authorize/approve` previously performed no server-side validation of the authorization request it was approving; it now shares the same `validateAuthorizationRequest()` / `checkInternalClientAccess()` logic (`lib/oauth/authorizationValidation.mjs`) as `/api/oauth/authorize`, closing an account-authorization gap
- **CSRF enforcement**: added `validateRequestOrigin()` (`lib/middleware/csrf.mjs`), an Origin/Referer allowlist check, and wired it into all state-changing admin and public-session endpoints (previously unenforced anywhere in the codebase)
- **Admin password storage**: admin passwords are now stored as bcrypt hashes (`lib/users.mjs`); legacy stored values are compared in constant time (`lib/timingSafeCompare.mjs`) and transparently rehashed to bcrypt on next successful login
- **Open redirect**: `lib/redirects.mjs` `isSafeRedirectTarget()` no longer treats protocol-relative targets (`//evil.example`) as safe relative paths

**High-severity fixes:**
- Rate limiters (`lib/middleware/rateLimit.mjs`) are now actually applied across public login/register/forgot-password, magic-link and PIN endpoints (admin and public), and OAuth token/authorize endpoints — most were previously defined but never wired into a route; also fixed a hang bug where a limiter's own `429` response was never observed by the promisified wrapper (`applyRateLimiter()` in `lib/apiHelpers.mjs`), which affected the one limiter that was already live
- Fixed three admin login flows (`magic-login`, `verify-pin`, `magic-link`) that issued a session cookie the session reader could not parse, silently breaking those sign-in paths
- Constant-time comparison applied to magic-link tokens, password-reset tokens, login PINs, resource passwords, and PKCE code-verifier checks (`lib/timingSafeCompare.mjs`)

**Error handling:**
- Fixed the admin dashboard's error parser (`lib/adminAuthFlow.js`) to surface the server's actual error detail instead of always falling back to a generic message; this was the direct cause of a live "Internal server error" report when creating an OAuth client with `require_pkce` set (root cause: `require_pkce` was silently dropped by `registerClient()`, and the resulting validation error was discarded behind a generic string before reaching the UI)
- Extended real error detail to authenticated admin/API routes (audit logs, user management, app-permission management); left pre-auth and public-facing routes on generic messages intentionally, to avoid account/email enumeration

**Other:**
- Removed unauthenticated debug endpoints (`/api/debug/*`, `/api/admin/check-google-admin`) and other dead code
- Restored the `repo-guardrails` CI workflow, which had been dropped from `.github/workflows/`

### 🔧 Changed
- Bumped service version to `5.31.0` to reflect the current runtime state, including role-system simplification, OIDC scope/nonce work, and this security pass, none of which had been reflected past `docs/CHANGELOG.md` until now

---

## [5.30.0] - 2026-01-20

### 🎯 Major Changes

#### Role System Simplification
- **BREAKING**: Consolidated all admin roles into single `admin` role
- **Removed**: `super-admin`, `owner`, `superadmin` roles
- **New Structure**: `none`, `user`, `admin` (3 roles only)
- **Migration**: All existing admin-type roles automatically migrated to `admin`
- **Benefit**: Simplified permission management across all integrated applications

#### OAuth2/OIDC Scope Clarification
- **IMPORTANT**: Deprecated `roles` scope (not a standard OIDC scope)
- **Changed**: Role information now included in `profile` scope
- **Standard Scopes**: `openid`, `profile`, `email`, `offline_access`
- **ID Token**: `role` claim included when `profile` scope is requested
- **Compatibility**: Prevents `invalid_scope` errors in client applications

#### Enhanced Nonce Support
- **Added**: Full OIDC nonce parameter support throughout authorization flow
- **Flow**: Capture nonce in `/authorize` → Store with code → Return in ID token
- **Security**: Prevents replay attacks in OIDC flows
- **Compatibility**: Lenient validation (allows providers that don't return nonce)

### ✨ Added

**OAuth2/OIDC Improvements:**
- Nonce parameter support in `/api/oauth/authorize`
- Nonce storage in authorization code
- Nonce claim in ID token generation (`lib/oauth/tokens.mjs`)
- Nonce validation in token exchange
- Next.js rewrites for standard OAuth2 endpoints (`/authorize`, `/token`, `/userinfo`)

**Documentation:**
- Comprehensive integration troubleshooting guide in `THIRD_PARTY_INTEGRATION_GUIDE.md`
- Common integration issues and solutions section
- Production-tested integration requirements document
- Detailed scope and claim documentation
- Role system migration guide (`ROLE_SYSTEM_MIGRATION.md`)

**Admin Features:**
- "+ New OAuth Client" button on admin dashboard
- Improved OAuth client creation workflow
- Better permission validation throughout admin APIs

### 🔧 Changed

**Role System:**
- `admin` role now has all permissions previously held by `super-admin`
- Admin UI simplified (removed superadmin option from dropdowns)
- OAuth client management now requires `admin` role (not `super-admin`)
- User management requires `admin` role
- App permission management requires `admin` role

**OAuth2 Server:**
- Updated scope whitelist to use standard OIDC scopes
- Role information moved from `roles` scope to `profile` scope
- Improved error messages for scope validation
- Better handling of redirect URI validation

**API Endpoints:**
- `/api/admin/oauth-clients` - Create/update requires `admin` (was `super-admin`)
- `/api/admin/oauth-clients/[id]` - Update/delete requires `admin`
- `/api/admin/oauth-clients/[id]/regenerate-secret` - Requires `admin`
- `/api/admin/users` - Create/update requires `admin`
- `/api/admin/users/[id]/apps/[clientId]/permissions` - Requires `admin`
- `/api/admin/settings/pin-verification` - Requires `admin`

**Session Management:**
- Simplified role checks in `lib/auth.mjs`
- Updated `decodeSessionToken`, `getAdminUser`, `hasPermission` functions
- Removed complex role hierarchy logic

### 🐛 Fixed

**OAuth2 Flow:**
- Fixed missing nonce in ID token causing `invalid_nonce` errors
- Fixed `invalid_scope` errors when requesting non-standard scopes
- Fixed blank authorization page when using `prompt=login`
- Fixed redirect URI exact matching (case-sensitive, no trailing slash)

**Admin Access:**
- Fixed admin button visibility in OAuth clients page
- Fixed session validation in frontend components
- Fixed role propagation in admin APIs

**Permission System:**
- Fixed role validation across all admin endpoints
- Fixed permission checks for multi-app authorization

### 📚 Documentation

**Updated:**
- `README.md` - Clarified scopes, roles, and OAuth2 flow
- `THIRD_PARTY_INTEGRATION_GUIDE.md` - Added troubleshooting, updated examples
- `ARCHITECTURE.md` - Updated role system, OAuth2 endpoints
- `docs/MULTI_APP_PERMISSIONS.md` - Simplified for 3-role system

**Added:**
- `ROLE_SYSTEM_MIGRATION.md` - Technical migration details
- `MIGRATION_SUMMARY.md` - Executive summary of changes
- `CHANGELOG.md` - This file

**Client-Side Documentation:**
- Created integration guides for client applications
- Added Vercel environment variable setup guides
- Documented common integration issues and solutions

### 🔒 Security

**Enhanced:**
- Nonce validation prevents replay attacks in OIDC flows
- State parameter validation (unchanged, maintained)
- Token signature verification using JWKS (unchanged, maintained)
- HttpOnly cookie security (unchanged, maintained)

**Simplified:**
- Clearer role-based access control
- Reduced attack surface through role consolidation
- Better audit trail with unified admin role

### ⚠️ Breaking Changes

1. **Role Migration Required:**
   - All `super-admin`, `owner`, `superadmin` roles → `admin`
   - Database migration needed (automatic via scripts)
   - Session tokens regenerated on next login

2. **Scope Changes:**
   - `roles` scope deprecated (use `profile` instead)
   - Client applications requesting `roles` scope will get `invalid_scope` error
   - Update client configurations to use `openid profile email offline_access`

3. **API Permission Changes:**
   - Endpoints requiring `super-admin` now require `admin`
   - Role hierarchy removed (flat structure)

### 📋 Migration Guide

**For SSO Admins:**
1. Run migration script: `node scripts/migrate-roles.mjs`
2. Verify all users have correct roles in database
3. Test admin access in dashboard
4. Update any hardcoded role checks in custom scripts

**For Client Applications:**
1. Update `SSO_SCOPES` environment variable
   - ❌ Old: `openid profile email roles`
   - ✅ New: `openid profile email offline_access`
2. Update OAuth client configuration in SSO admin UI
   - Remove `roles` from allowed scopes
3. Update role extraction code:
   - Extract `role` claim from ID token (included in `profile` scope)
4. Test SSO login flow
5. Verify role information in session

**For Integrated Apps (e.g., Amanoba):**
1. Update environment variables in Vercel/production
2. Redeploy application
3. Clear browser cache
4. Test login and admin access
5. Monitor logs for role tracking

### 🧪 Testing

**Verified:**
- ✅ OAuth2 authorization code flow with nonce
- ✅ ID token includes role claim when profile scope requested
- ✅ Admin role has all necessary permissions
- ✅ Client applications can extract role from ID token
- ✅ Nonce validation works correctly
- ✅ State validation unchanged and working
- ✅ Token refresh flow unchanged and working

**Integration Testing:**
- ✅ Amanoba.com production integration successful
- ✅ Role preservation on login
- ✅ Admin access working correctly
- ✅ Error handling with locale detection

---

## [5.29.0] - 2026-01-18

### Added
- Security hardening with 5-layer approach
- Rate limiting for all endpoints
- Security headers (HSTS, CSP, etc.)
- Input validation with Zod schemas
- Session security improvements
- Audit logging for SOC 2/GDPR compliance

### Changed
- Enhanced session management with device fingerprinting
- Improved password security (bcrypt 12 rounds)
- Better error handling and logging

---

## [5.28.0] - 2026-01-15

### Added
- Multi-app permission management system
- Per-app authorization workflow
- Admin approval for new users
- Real-time permission sync

### Changed
- Updated appPermissions schema
- Improved OAuth2 client management UI
- Better permission audit trail

---

## [5.27.0] - 2026-01-10

### Added
- Google Sign-In integration
- PIN verification (6-digit code on 5th-10th login)
- Account linking across login methods

### Changed
- Improved social login workflow
- Better email verification flow

---

## [5.26.0] - 2026-01-05

### Added
- Facebook OAuth integration
- Magic link authentication
- Forgot password flow

### Changed
- Enhanced public user authentication
- Improved session management

---

## Earlier Versions

See Git history for changes before v5.26.0.

---

## Version Numbering

- **Major** (X.0.0): Breaking changes, major rewrites
- **Minor** (5.X.0): New features, non-breaking changes
- **Patch** (5.30.X): Bug fixes, documentation updates

---

**Maintained By:** SSO Development Team  
**Last Updated:** 2026-08-01  
**Current Version:** 5.31.1
