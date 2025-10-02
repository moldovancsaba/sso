# SSO Service — Production-Ready Authentication with Security Hardening

Version: 5.0.0
Last updated: 2025-10-02T11:54:33.000Z

A production-ready authentication backend for sso.doneisbetter.com with Phase 1 security hardening:
- Admin login via email + 32-hex token (cookie-based sessions with server-side validation)
- Subdomain SSO support (*.doneisbetter.com)
- Rate limiting, CSRF protection, and structured audit logging
- Server-side session management with MongoDB
- Resource-specific passwords with usage tracking and admin-bypass
- MongoDB Atlas storage and strict CORS

## Features
- **🔒 Security Hardened** (Phase 1 Complete):
  - Server-side session management with revocation
  - Rate limiting (brute force protection)
  - CSRF protection (double-submit cookie + HMAC)
  - Structured audit logging with Winston
  - Subdomain SSO support (*.doneisbetter.com)
- Admin authentication (HttpOnly cookie with Domain attribute)
- Admin users CRUD (roles: admin, super-admin) — UUID identifiers for users
- Resource password generation/validation (MD5-style 32-hex token)
- Shareable link helper (server provides token; consumers build final URLs)
- CORS per SSO_ALLOWED_ORIGINS

## API Endpoints
- POST /api/admin/login — body: { email, password }
- DELETE /api/admin/login — clears cookie session
- GET /api/admin/users — list users (admin)
- POST /api/admin/users — create user (super-admin)
- GET/PATCH/DELETE /api/admin/users/[id] — manage user
- GET/POST /api/admin/orgs — list/create organizations (UUID)
- GET/PATCH/DELETE /api/admin/orgs/[id] — manage organization
- GET/POST /api/admin/orgs/[orgId]/users — list/create org users (UUID)
- GET/PATCH/DELETE /api/admin/orgs/[orgId]/users/[id] — manage org user
- POST /api/resource-passwords — { resourceId, resourceType, regenerate? } -> token + shareableLink
- PUT /api/resource-passwords — { resourceId, resourceType, password } -> validate
- GET /api/sso/validate — returns admin session info if valid

Deprecated/Removed:
- /api/auth/login, /api/auth/logout, /api/users/register, /api/users/logout, /api/users/[userId]

## Quick Start
1) Configure environment (.env or Vercel env):
- MONGODB_URI, MONGODB_DB
- **SSO_COOKIE_DOMAIN=.doneisbetter.com** (NEW: Required for subdomain SSO)
- ADMIN_SESSION_COOKIE=admin-session
- SSO_ADMIN_ALIAS_EMAIL=sso@doneisbetter.com
- SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com
- SSO_BASE_URL=https://sso.doneisbetter.com
- SESSION_SECRET=<generate with: openssl rand -base64 32>
- CSRF_SECRET=<optional, falls back to SESSION_SECRET>
- RATE_LIMIT_LOGIN_MAX=5 (optional, default: 5)
- RATE_LIMIT_LOGIN_WINDOW=900000 (optional, default: 15 minutes)

2) Install deps and run dev:
- npm install
- npm run dev

3) Create first super-admin user:
- Call POST /api/admin/users with an authenticated super-admin (seed via DB insert if first-time)

## Deployment
- Hosting: Vercel
- Database: MongoDB Atlas
- Domain: sso.doneisbetter.com
- Set all env vars in Vercel Project Settings

## Security Notes
- **Phase 1 Hardening Complete** (v5.0.0):
  - ✅ Server-side session revocation
  - ✅ Rate limiting (5 login attempts per 15 minutes)
  - ✅ CSRF protection (double-submit cookie)
  - ✅ Structured audit logging
  - ✅ Subdomain SSO (*.doneisbetter.com)
- Tokens are random 32-hex strings by convention (not password hashes), per team policy
- ISO 8601 timestamps with milliseconds in UTC across DB and docs
- CORS strict to production domains
- No tests included (MVP policy)
- **Known Limitation**: External domains (e.g., narimato.com) require Phase 2 (OAuth2/OIDC)

## Dev Bypass (no password in development)
- To speed up local/dev work, enable passwordless admin login:
  - Server: ADMIN_DEV_BYPASS=true
  - Client: NEXT_PUBLIC_ADMIN_DEV_BYPASS=true
- Then, on /admin, you’ll see an email-only form. Submitting it will create a session via /api/admin/dev-login.
- Notes:
  - Dev bypass is hard-disabled in production, even if misconfigured.
  - A matching user will be created automatically if missing (role defaults to super-admin).

## Magic Link (one-time admin access)
- Generate a one-time URL for a specific admin email (expires default in 15 minutes):
  - Set env locally (do not print secrets):
    - MONGODB_URI, ADMIN_MAGIC_SECRET, SSO_BASE_URL
    - NEW_MAGIC_EMAIL (e.g., nimdasuper@doneisbetter.com)
  - Run:
    - node scripts/generate-magic-link.mjs
  - Output JSON contains { url, expiresAt }. Open the URL to get redirected to /admin with a valid session.
- To restrict magic links, set ADMIN_MAGIC_ALLOWED_EMAILS to a comma-separated list of allowed emails.

## Troubleshooting
- 401 from /api/sso/validate → no admin cookie; login via POST /api/admin/login
- CORS errors → verify SSO_ALLOWED_ORIGINS matches caller origin exactly
- MongoDB timeouts → check MONGODB_URI and network allowlist
