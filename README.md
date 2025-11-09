# SSO Service — Production-Ready Authentication with Advanced Security

Version: 5.23.1
Last updated: 2025-01-13T23:45:00.000Z

A production-ready authentication backend for sso.doneisbetter.com with comprehensive security and user-friendly authentication options:
- **Multiple authentication methods**: Password, Forgot Password, Magic Links, Random PIN verification
- Admin login via email + 32-hex token (cookie-based sessions with server-side validation)
- Public user authentication with bcrypt-hashed passwords
- Email infrastructure (Nodemailer + Resend) for password recovery
- OAuth2/OIDC authorization server for external applications
- Subdomain SSO support (*.doneisbetter.com)
- Rate limiting, CSRF protection, and structured audit logging
- Server-side session management with MongoDB

## Features
- **🔒 Security Hardened**:
  - Server-side session management with revocation
  - Rate limiting (brute force protection)
  - CSRF protection (double-submit cookie + HMAC)
  - Structured audit logging with Winston
  - Subdomain SSO support (*.doneisbetter.com)
- **🔑 Authentication Options** (v5.23.1):
  - Password-based login (admin + public users)
  - **Forgot password with email** (auto-generates secure passwords)
  - **Magic link authentication** (passwordless login for admin + public users)
  - **Random PIN verification** (6-digit PIN on 5th-10th login for enhanced security)
- **📧 Email System** (v5.23.1):
  - Dual provider support (Nodemailer + Resend)
  - Password reset via email
  - Email verification
  - Forgot password flow
- **OAuth2/OIDC** (v5.23.1):
  - Authorization Code Flow with **optional PKCE** (configurable per client)
  - JWT access tokens (RS256)
  - Refresh token rotation
  - OIDC discovery and JWKS endpoints
  - Confidential clients (server-side) can skip PKCE
  - Public clients (mobile/SPA) require PKCE
- Admin authentication (HttpOnly cookie with Domain attribute)
- Admin users CRUD (roles: admin, super-admin) — UUID identifiers
- Public user registration and authentication
- Resource password generation/validation (MD5-style 32-hex token)
- CORS per SSO_ALLOWED_ORIGINS

## User Account Management (v5.23.1)
- **Account Page**: `/account` — Comprehensive user dashboard
  - View and edit profile (name, email)
  - See connected services (OAuth apps)
  - Change password securely
  - Revoke access to individual services
  - Delete account permanently
- **Session Duration**: 30 days with sliding expiration (extends on each access)
- **After Login**: Users are automatically redirected to `/account` page

## API Endpoints

### Admin Endpoints
- POST /api/admin/login — body: { email, password }
- DELETE /api/admin/login — clears cookie session
- GET /api/admin/users — list admin users
- POST /api/admin/users — create user (super-admin)
- GET/PATCH/DELETE /api/admin/users/[id] — manage admin user
- GET/POST /api/admin/orgs — list/create organizations (UUID)
- GET/PATCH/DELETE /api/admin/orgs/[id] — manage organization
- GET/POST /api/admin/orgs/[orgId]/users — list/create org users (UUID)
- GET/PATCH/DELETE /api/admin/orgs/[orgId]/users/[id] — manage org user

### Public User Endpoints (v5.23.1)
- POST /api/public/register — Create new user account
- POST /api/public/login — Authenticate user
- POST /api/public/verify-pin — Verify PIN during login
- POST /api/public/request-magic-link — Request passwordless login
- GET /api/public/magic-login — Consume magic link token
- POST /api/public/forgot-password — Request password reset
- GET /api/public/session — Check session status
- PATCH /api/public/profile — Update user profile
- POST /api/public/change-password — Change password
- DELETE /api/public/account — Delete user account
- GET /api/public/authorizations — List connected OAuth services
- DELETE /api/public/authorizations/[id] — Revoke service access

### Resource & Validation
- POST /api/resource-passwords — { resourceId, resourceType, regenerate? } -> token + shareableLink
- PUT /api/resource-passwords — { resourceId, resourceType, password } -> validate
- GET /api/sso/validate — returns session info if valid

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
- **Phase 1 Hardening Complete** (v5.23.1):
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
