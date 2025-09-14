# SSO Service — DB-backed Admin Auth & Resource Passwords

Version: 4.3.0
Last updated: 2025-09-14T08:25:57.000Z

A production-ready authentication backend for sso.doneisbetter.com using:
- Admin login via email + 32-hex token (cookie-based sessions)
- Resource-specific passwords with usage tracking and admin-bypass
- MongoDB Atlas storage and strict CORS

## Features
- Admin authentication (HttpOnly cookie)
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
- ADMIN_SESSION_COOKIE=admin-session
- SSO_ADMIN_ALIAS_EMAIL=sso@doneisbetter.com
- SSO_ALLOWED_ORIGINS=https://sso.doneisbetter.com,https://doneisbetter.com
- SSO_BASE_URL=https://sso.doneisbetter.com

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
- Tokens are random 32-hex strings by convention (not password hashes), per team policy
- ISO 8601 timestamps with milliseconds in UTC across DB and docs
- CORS strict to production domains
- No tests included (MVP policy)

## Troubleshooting
- 401 from /api/sso/validate → no admin cookie; login via POST /api/admin/login
- CORS errors → verify SSO_ALLOWED_ORIGINS matches caller origin exactly
- MongoDB timeouts → check MONGODB_URI and network allowlist
